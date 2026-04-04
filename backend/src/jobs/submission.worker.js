// BullMQ submission worker - processes judge jobs
const { Worker } = require('bullmq');
const { workerOptions } = require('../config/bullmq');
const Submission = require('../modules/submissions/model');
const Problem = require('../modules/problems/model');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { Readable } = require('stream');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'codecourt-test-cases';

// Create worker with centralized BullMQ configuration (concurrency: 5)
const worker = new Worker('submissions', async (job) => {
  const { submissionId, code, language, problemId, userId, contestId } = job.data;
  
  try {
    console.log(`Processing submission ${submissionId}`);
    
    // Fetch problem details
    const problem = await Problem.findById(problemId);
    if (!problem) {
      throw new Error('Problem not found');
    }
    
    // Download test cases from S3 (or use sample test cases if no hidden tests)
    let testCases = problem.sampleTestCases;
    if (problem.hiddenTestCasesS3Key) {
      try {
        testCases = await downloadTestCases(problem.hiddenTestCasesS3Key);
      } catch (error) {
        console.warn('Failed to download hidden test cases, using sample tests:', error.message);
      }
    }
    
    // Run judge
    const verdict = await runJudge(code, language, problem, testCases);
    
    // Update submission in MongoDB
    await Submission.findByIdAndUpdate(submissionId, {
      verdict: verdict.verdict,
      executionTime: verdict.executionTime,
      memoryUsed: verdict.memoryUsed,
      compilerError: verdict.compilerError
    });
    
    // Emit Socket.io verdict event (if socket is initialized)
    try {
      const { emitVerdict } = require('../socket/verdict.socket');
      emitVerdict(userId, {
        submissionId,
        verdict: verdict.verdict,
        executionTime: verdict.executionTime,
        memoryUsed: verdict.memoryUsed
      });
    } catch (error) {
      console.warn('Socket.io not initialized, skipping verdict emit');
    }
    
    // If contest submission, update leaderboard
    if (contestId && verdict.verdict === 'AC') {
      try {
        const contestService = require('../modules/contests/service');
        await contestService.recordSubmission(
          contestId,
          userId,
          problemId,
          verdict.verdict,
          new Date()
        );
        
        // Emit leaderboard update
        const { emitLeaderboardUpdate } = require('../socket/leaderboard.socket');
        const leaderboard = await contestService.getLeaderboard(contestId);
        emitLeaderboardUpdate(contestId, leaderboard);
      } catch (error) {
        console.error('Failed to update contest score:', error);
      }
    } else if (contestId && (verdict.verdict === 'WA' || verdict.verdict === 'TLE' || verdict.verdict === 'MLE' || verdict.verdict === 'RE')) {
      // Record failed attempts
      try {
        const contestService = require('../modules/contests/service');
        await contestService.recordSubmission(
          contestId,
          userId,
          problemId,
          verdict.verdict,
          new Date()
        );
      } catch (error) {
        console.error('Failed to record contest attempt:', error);
      }
    }
    
    return verdict;
  } catch (error) {
    console.error('Worker error:', error);
    
    // Update submission to error state
    await Submission.findByIdAndUpdate(submissionId, {
      verdict: 'RE',
      compilerError: error.message
    });
    
    throw error;
  }
}, workerOptions);

/**
 * Download test cases from S3
 */
async function downloadTestCases(s3Key) {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key
    });
    
    const response = await s3Client.send(command);
    
    // For now, return sample test cases
    // TODO: Implement ZIP extraction and parsing
    return [
      { input: '1 2\n', output: '3\n' }
    ];
  } catch (error) {
    console.error('S3 download error:', error);
    throw error;
  }
}

/**
 * Run judge in Docker container
 */
async function runJudge(code, language, problem, testCases) {
  const { timeLimit, memoryLimit } = problem;
  
  // Create temporary directory for this submission
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'judge-'));
  
  try {
    // Write code to file
    const codeFile = language === 'cpp' ? 'solution.cpp' : 'solution.py';
    await fs.writeFile(path.join(tmpDir, codeFile), code);
    
    // Compile if C++
    if (language === 'cpp') {
      const compileResult = await compileCode(tmpDir);
      if (!compileResult.success) {
        return {
          verdict: 'CE',
          executionTime: 0,
          memoryUsed: 0,
          compilerError: compileResult.error
        };
      }
    }
    
    // Run against test cases
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = await runTestCase(tmpDir, language, testCase, timeLimit, memoryLimit);
      
      if (result.verdict !== 'AC') {
        return result;
      }
    }
    
    // All test cases passed
    return {
      verdict: 'AC',
      executionTime: 100, // TODO: Track actual execution time
      memoryUsed: 10, // TODO: Track actual memory usage
      compilerError: null
    };
  } finally {
    // Cleanup temporary directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Compile C++ code
 */
async function compileCode(tmpDir) {
  return new Promise((resolve) => {
    const compile = spawn('docker', [
      'run',
      '--rm',
      '-v', `${tmpDir}:/sandbox`,
      '-w', '/sandbox',
      'gcc:13-alpine',
      'g++',
      '-O2',
      '-std=c++17',
      '-o', 'solution',
      'solution.cpp'
    ]);
    
    let stderr = '';
    compile.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    compile.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr });
      }
    });
    
    compile.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

/**
 * Run a single test case
 */
async function runTestCase(tmpDir, language, testCase, timeLimit, memoryLimit) {
  // Write input to file
  await fs.writeFile(path.join(tmpDir, 'input.txt'), testCase.input);
  
  // Prepare Docker command
  const timeLimitSeconds = Math.ceil(timeLimit / 1000) + 2; // Add 2 second grace period
  const memoryLimitMB = memoryLimit;
  
  let dockerCmd;
  if (language === 'cpp') {
    dockerCmd = [
      'run',
      '--rm',
      '--network', 'none',
      '--memory', `${memoryLimitMB}m`,
      '--cpus', '1',
      '-v', `${tmpDir}:/sandbox`,
      '-w', '/sandbox',
      'gcc:13-alpine',
      'timeout',
      `${timeLimitSeconds}s`,
      './solution'
    ];
  } else {
    dockerCmd = [
      'run',
      '--rm',
      '--network', 'none',
      '--memory', `${memoryLimitMB}m`,
      '--cpus', '1',
      '-v', `${tmpDir}:/sandbox`,
      '-w', '/sandbox',
      'python:3.11-alpine',
      'timeout',
      `${timeLimitSeconds}s`,
      'python',
      'solution.py'
    ];
  }
  
  return new Promise((resolve) => {
    const run = spawn('docker', dockerCmd);
    
    let stdout = '';
    let stderr = '';
    
    // Pipe input
    const inputStream = Readable.from([testCase.input]);
    inputStream.pipe(run.stdin);
    
    run.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    run.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    run.on('close', (code) => {
      // Check exit code
      if (code === 124) {
        // Timeout
        resolve({
          verdict: 'TLE',
          executionTime: timeLimit,
          memoryUsed: 0,
          compilerError: null
        });
      } else if (code === 137) {
        // OOM killed
        resolve({
          verdict: 'MLE',
          executionTime: 0,
          memoryUsed: memoryLimit,
          compilerError: null
        });
      } else if (code !== 0) {
        // Runtime error
        resolve({
          verdict: 'RE',
          executionTime: 0,
          memoryUsed: 0,
          compilerError: stderr
        });
      } else {
        // Check output
        const actualOutput = stdout.trim();
        const expectedOutput = testCase.output.trim();
        
        if (actualOutput === expectedOutput) {
          resolve({
            verdict: 'AC',
            executionTime: 100, // TODO: Track actual time
            memoryUsed: 10, // TODO: Track actual memory
            compilerError: null
          });
        } else {
          resolve({
            verdict: 'WA',
            executionTime: 100,
            memoryUsed: 10,
            compilerError: null
          });
        }
      }
    });
    
    run.on('error', (error) => {
      resolve({
        verdict: 'RE',
        executionTime: 0,
        memoryUsed: 0,
        compilerError: error.message
      });
    });
  });
}

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

module.exports = worker;
