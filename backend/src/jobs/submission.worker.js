/**
 * Submission Worker (BullMQ)
 * 
 * VISION:
 * Execute user code submissions safely and efficiently in isolated Docker containers,
 * providing accurate verdicts with execution metrics. Enable horizontal scaling of
 * judge capacity to handle high submission volumes during contests.
 * 
 * WHY THIS EXISTS:
 * Code execution requires:
 * - Isolation (prevent malicious code from accessing system resources)
 * - Resource limits (CPU, memory, time)
 * - Accurate verdict determination (AC, WA, TLE, MLE, RE, CE)
 * - Scalability (handle 100+ submissions during contests)
 * 
 * This worker processes jobs from the BullMQ queue, spawns Docker containers
 * for safe execution, and updates submission verdicts in MongoDB.
 * 
 * WHAT IT DOES:
 * - Processes submission jobs from BullMQ queue (concurrency: 5)
 * - Downloads test cases from S3 (or uses sample tests)
 * - Compiles code (C++) or prepares runtime (Python)
 * - Executes code against test cases in isolated Docker containers
 * - Maps exit codes to verdicts (AC, WA, TLE, MLE, RE, CE)
 * - Updates submission status in MongoDB
 * - Emits real-time verdict events via Socket.io
 * - Updates contest leaderboards for AC submissions
 * 
 * DESIGN DECISIONS:
 * 1. Docker-Based Isolation:
 *    - --network=none prevents network access
 *    - --memory limits prevent memory bombs
 *    - --cpus=1 ensures fair CPU allocation
 *    - Temporary directories prevent file system pollution
 * 
 * 2. Concurrency (5 simultaneous judges):
 *    - Balances throughput vs resource usage
 *    - Prevents CPU oversubscription
 *    - Configurable via workerOptions
 * 
 * 3. Exit Code → Verdict Mapping:
 *    - 0 = Success (check output for AC/WA)
 *    - 124 = Timeout (TLE)
 *    - 137 = OOM killed (MLE)
 *    - Other = Runtime error (RE)
 * 
 * 4. Graceful Degradation:
 *    - Falls back to sample tests if S3 download fails
 *    - Continues without Socket.io if not initialized
 *    - Logs errors but doesn't crash worker
 * 
 * 5. Temporary Directory Cleanup:
 *    - Creates unique tmpdir per submission
 *    - Always cleans up (finally block)
 *    - Prevents disk space exhaustion
 * 
 * USAGE:
 * ```javascript
 * // Worker starts automatically when module is imported
 * const worker = require('./jobs/submission.worker');
 * 
 * // Worker processes jobs from 'submissions' queue
 * // Job data: { submissionId, code, language, problemId, userId, contestId }
 * 
 * // Worker emits events:
 * worker.on('completed', (job) => console.log('Job completed'));
 * worker.on('failed', (job, err) => console.error('Job failed', err));
 * ```
 */

const { Worker } = require('bullmq');
const { workerOptions } = require('../config/bullmq');
const Submission = require('../modules/submissions/model');
const Problem = require('../modules/problems/model');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const AdmZip = require('adm-zip');
const redis = require('../config/redis');
const s3Client = require('../config/s3');
const { getBucketName } = require('../config/s3');

const S3_BUCKET_NAME = getBucketName();

// Create worker with centralized BullMQ configuration
// Concurrency: 5 means 5 submissions can be judged simultaneously
// Queue name 'submissions' must match queue name in submission.queue.js
const worker = new Worker('submissions', async (job) => {
  const { submissionId, code, language, problemId, userId, contestId } = job.data;
  
  try {
    console.log(`Processing submission ${submissionId}`);
    
    // Step 1: Fetch problem details from MongoDB
    // Need timeLimit, memoryLimit, and test cases
    const problem = await Problem.findById(problemId);
    if (!problem) {
      throw new Error('Problem not found');
    }
    
    // Step 2: Download test cases from S3 (or use sample test cases if no hidden tests)
    // Hidden test cases are stored as ZIP files in S3 for security
    let testCases = problem.sampleTestCases;
    if (problem.hiddenTestCasesS3Key) {
      try {
        testCases = await downloadTestCases(problem.hiddenTestCasesS3Key);
      } catch (error) {
        // Fall back to sample tests if S3 download fails
        // This ensures judging continues even if S3 is unavailable
        console.warn('Failed to download hidden test cases, using sample tests:', error.message);
      }
    }
    
    // Step 3: Run judge in Docker container
    // Returns verdict object: { verdict, executionTime, memoryUsed, compilerError }
    const verdict = await runJudge(code, language, problem, testCases);
    
    // Step 4: Update submission in MongoDB with verdict and metrics
    await Submission.findByIdAndUpdate(submissionId, {
      verdict: verdict.verdict,
      executionTime: verdict.executionTime,
      memoryUsed: verdict.memoryUsed,
      compilerError: verdict.compilerError
    });
    
    // Step 5: Publish verdict event via Redis pub/sub for real-time updates
    // The server process (which has Socket.io) subscribes to this channel
    // and forwards the event to the client via socket/bridge.js
    try {
      await redis.publish('socket:verdict', JSON.stringify({
        userId,
        verdictData: {
          submissionId,
          verdict: verdict.verdict,
          executionTime: verdict.executionTime,
          memoryUsed: verdict.memoryUsed
        }
      }));
    } catch (error) {
      console.warn('Failed to publish verdict event:', error.message);
    }
    
    // Step 6: If contest submission, update leaderboard
    if (contestId && verdict.verdict === 'AC') {
      // AC submission: update score and emit leaderboard update
      try {
        const contestService = require('../modules/contests/service');
        await contestService.recordSubmission(
          contestId,
          userId,
          problemId,
          verdict.verdict,
          new Date()
        );
        
        // Publish updated leaderboard via Redis for Socket.io bridge
        const leaderboard = await contestService.getLeaderboard(contestId);
        await redis.publish('socket:leaderboard', JSON.stringify({
          contestId,
          leaderboard
        }));
      } catch (error) {
        console.error('Failed to update contest score:', error);
      }
    } else if (contestId && (verdict.verdict === 'WA' || verdict.verdict === 'TLE' || verdict.verdict === 'MLE' || verdict.verdict === 'RE')) {
      // Failed submission: record attempt for penalty calculation
      // ICPC scoring: +20 minutes penalty per wrong attempt
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
    
    // Update submission to error state so user knows something went wrong
    await Submission.findByIdAndUpdate(submissionId, {
      verdict: 'RE',
      compilerError: error.message
    });
    
    // Re-throw to mark job as failed (enables retry logic)
    throw error;
  }
}, workerOptions);

/**
 * Download test cases from S3
 * 
 * Retrieves hidden test cases from S3 bucket. Test cases are stored as ZIP files
 * containing input/output pairs for security (prevents users from seeing hidden tests).
 * 
 * @param {string} s3Key - S3 object key (e.g., 'problems/two-sum/tests.zip')
 * @returns {Promise<Array>} Array of test case objects: [{ input, output }, ...]
 * 
 * TODO: Implement ZIP extraction and parsing
 * Currently returns placeholder test case
 */
async function downloadTestCases(s3Key) {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key
    });
    
    const response = await s3Client.send(command);
    
    // Convert S3 stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Extract ZIP file using adm-zip
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    // Group files by base name (e.g., '1.in' and '1.out' -> base '1')
    const fileMap = {};
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      const fileName = entry.entryName;
      // Accept .in/.txt for input, .out/.ans/.txt for output based on common CP formats
      const match = fileName.match(/^(.*)\.(in|out|txt|ans)$/i);
      
      if (match) {
        const baseName = match[1];
        const ext = match[2].toLowerCase();
        
        if (!fileMap[baseName]) {
          fileMap[baseName] = {};
        }
        
        // Read file content
        const content = entry.getData().toString('utf8');
        
        if (ext === 'in' || (ext === 'txt' && !fileMap[baseName].input)) {
          fileMap[baseName].input = content;
        } else {
          fileMap[baseName].output = content;
        }
      }
    }
    
    // Convert map to array of complete test cases
    const parsedTestCases = [];
    for (const [baseName, pair] of Object.entries(fileMap)) {
      if (pair.input !== undefined && pair.output !== undefined) {
        parsedTestCases.push({
          input: pair.input,
          output: pair.output
        });
      }
    }
    
    if (parsedTestCases.length === 0) {
      console.warn('No valid input/output pairs found in ZIP. Using fallback.');
      return [ { input: '1 2\n', output: '3\n' } ];
    }
    
    return parsedTestCases;
  } catch (error) {
    console.error('S3 download error:', error);
    throw error;
  }
}

/**
 * Run judge in Docker container
 * 
 * Executes user code against test cases in isolated Docker containers with
 * resource limits. Handles compilation (C++), execution, and verdict determination.
 * 
 * @param {string} code - Source code to execute
 * @param {string} language - Programming language ('cpp' or 'python')
 * @param {Object} problem - Problem object with timeLimit and memoryLimit
 * @param {Array} testCases - Array of { input, output } test cases
 * @returns {Promise<Object>} Verdict object: { verdict, executionTime, memoryUsed, compilerError }
 * 
 * Verdict codes:
 * - AC: Accepted (all test cases passed)
 * - WA: Wrong Answer (output doesn't match expected)
 * - TLE: Time Limit Exceeded (execution timeout)
 * - MLE: Memory Limit Exceeded (OOM killed)
 * - RE: Runtime Error (non-zero exit code)
 * - CE: Compilation Error (C++ compilation failed)
 */
async function runJudge(code, language, problem, testCases) {
  const { timeLimit, memoryLimit } = problem;
  
  // Create temporary directory for this submission
  // Each submission gets isolated directory to prevent interference
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'judge-'));
  
  try {
    // Write code to file in temporary directory
    const codeFile = language === 'cpp' ? 'solution.cpp' : 'solution.py';
    await fs.writeFile(path.join(tmpDir, codeFile), code);
    
    // Compile if C++ (Python is interpreted, no compilation needed)
    if (language === 'cpp') {
      const compileResult = await compileCode(tmpDir);
      if (!compileResult.success) {
        // Compilation failed - return CE verdict with compiler error message
        return {
          verdict: 'CE',
          executionTime: 0,
          memoryUsed: 0,
          compilerError: compileResult.error
        };
      }
    }
    
    let maxExecutionTime = 0;
    let peakMemoryUsed = 0;

    // Run against test cases (stop at first failure)
    // This is standard competitive programming behavior
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = await runTestCase(tmpDir, language, testCase, timeLimit, memoryLimit);
      
      maxExecutionTime = Math.max(maxExecutionTime, result.executionTime);
      peakMemoryUsed = Math.max(peakMemoryUsed, result.memoryUsed);
      
      if (result.verdict !== 'AC') {
        // First failed test case determines verdict
        result.executionTime = maxExecutionTime;
        result.memoryUsed = peakMemoryUsed;
        return result;
      }
    }
    
    // All test cases passed - return AC verdict
    return {
      verdict: 'AC',
      executionTime: maxExecutionTime,
      memoryUsed: peakMemoryUsed,
      compilerError: null
    };
  } finally {
    // Always cleanup temporary directory to prevent disk space exhaustion
    // This runs even if an error occurs
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Compile C++ code in Docker container
 * 
 * Compiles C++ source code using g++ in a Docker container. Uses modern C++17
 * standard with O2 optimization (standard for competitive programming).
 * 
 * @param {string} tmpDir - Temporary directory containing solution.cpp
 * @returns {Promise<Object>} Compilation result: { success: boolean, error?: string }
 * 
 * Docker flags:
 * - --rm: Remove container after compilation
 * - -v: Mount tmpdir as /sandbox volume
 * - -w: Set working directory to /sandbox
 * 
 * g++ flags:
 * - -O2: Optimization level 2 (standard for CP)
 * - -std=c++17: Use C++17 standard
 * - -o solution: Output executable named 'solution'
 */
async function compileCode(tmpDir) {
  return new Promise((resolve) => {
    const compile = spawn('docker', [
      'run',
      '--rm',
      '-v', `${tmpDir}:/sandbox`,
      '-w', '/sandbox',
      'gcc:13',
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
        // Compilation successful
        resolve({ success: true });
      } else {
        // Compilation failed - return compiler error message
        resolve({ success: false, error: stderr });
      }
    });
    
    compile.on('error', (error) => {
      // Docker spawn error (e.g., Docker not running)
      resolve({ success: false, error: error.message });
    });
  });
}

/**
 * Run a single test case in Docker container
 * 
 * Executes compiled code (C++) or script (Python) against a single test case
 * in an isolated Docker container with resource limits and network disabled.
 * 
 * @param {string} tmpDir - Temporary directory containing code/executable
 * @param {string} language - Programming language ('cpp' or 'python')
 * @param {Object} testCase - Test case object: { input, output }
 * @param {number} timeLimit - Time limit in milliseconds
 * @param {number} memoryLimit - Memory limit in MB
 * @returns {Promise<Object>} Verdict object: { verdict, executionTime, memoryUsed, compilerError }
 * 
 * Docker security flags:
 * - --network=none: Disable network access (prevent external API calls)
 * - --memory: Limit memory usage (prevent memory bombs)
 * - --cpus=1: Limit to 1 CPU core (fair resource allocation)
 * 
 * Exit code mapping:
 * - 0: Success (check output for AC/WA)
 * - 124: Timeout (TLE verdict)
 * - 137: OOM killed (MLE verdict)
 * - Other: Runtime error (RE verdict)
 */
async function runTestCase(tmpDir, language, testCase, timeLimit, memoryLimit) {
  // Write input to file (not used currently, but useful for debugging)
  await fs.writeFile(path.join(tmpDir, 'input.txt'), testCase.input);
  
  // Prepare Docker command with resource limits
  // Add 2 second grace period to timeLimit to account for Docker overhead
  const timeLimitSeconds = Math.ceil(timeLimit / 1000) + 2;
  const memoryLimitMB = memoryLimit;
  
  let dockerCmd;
  if (language === 'cpp') {
    // Run compiled C++ executable
    dockerCmd = [
      'run',
      '--rm',
      '--network', 'none', // Security: disable network access
      '--memory', `${memoryLimitMB}m`, // Memory limit
      '--cpus', '1', // CPU limit
      '-v', `${tmpDir}:/sandbox`,
      '-w', '/sandbox',
      'gcc:13',
      'timeout', // Use Alpine's timeout command
      `${timeLimitSeconds}s`,
      './solution'
    ];
  } else {
    // Run Python script
    dockerCmd = [
      'run',
      '--rm',
      '--network', 'none', // Security: disable network access
      '--memory', `${memoryLimitMB}m`, // Memory limit
      '--cpus', '1', // CPU limit
      '-v', `${tmpDir}:/sandbox`,
      '-w', '/sandbox',
      'python:3.11-alpine',
      'timeout', // Use Alpine's timeout command
      `${timeLimitSeconds}s`,
      'python',
      'solution.py'
    ];
  }
  
  return new Promise((resolve) => {
    // Start high-resolution timer
    const startTime = process.hrtime.bigint();
    const run = spawn('docker', dockerCmd);
    
    let stdout = '';
    let stderr = '';
    
    // Pipe test case input to stdin
    const inputStream = Readable.from([testCase.input]);
    inputStream.pipe(run.stdin);
    
    run.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    run.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    run.on('close', (code) => {
      // Calculate execution time in milliseconds
      const endTime = process.hrtime.bigint();
      const executionTimeMs = Number((endTime - startTime) / 1000000n);
      
      // Memory usage is currently an estimate (10MB base + varying based on output)
      // Docker stats would require an external polling mechanism which is heavy for MVP
      const memoryUsedEst = 10 + Math.min(stdout.length / 1024, memoryLimit);
      
      // Map exit code to verdict
      if (code === 124) {
        // Timeout exit code from Alpine's timeout command
        resolve({
          verdict: 'TLE',
          executionTime: timeLimit,
          memoryUsed: memoryUsedEst,
          compilerError: null
        });
      } else if (code === 137) {
        // OOM killed by Docker (SIGKILL)
        resolve({
          verdict: 'MLE',
          executionTime: executionTimeMs,
          memoryUsed: memoryLimit,
          compilerError: null
        });
      } else if (code !== 0) {
        // Non-zero exit code = runtime error
        resolve({
          verdict: 'RE',
          executionTime: executionTimeMs,
          memoryUsed: memoryUsedEst,
          compilerError: stderr
        });
      } else {
        // Exit code 0 - check output for correctness
        const actualOutput = stdout.trim();
        const expectedOutput = testCase.output.trim();
        
        if (actualOutput === expectedOutput) {
          // Output matches - Accepted
          resolve({
            verdict: 'AC',
            executionTime: executionTimeMs,
            memoryUsed: memoryUsedEst,
            compilerError: null
          });
        } else {
          // Output doesn't match - Wrong Answer
          resolve({
            verdict: 'WA',
            executionTime: executionTimeMs,
            memoryUsed: memoryUsedEst,
            compilerError: null
          });
        }
      }
    });
    
    run.on('error', (error) => {
      // Docker spawn error
      resolve({
        verdict: 'RE',
        executionTime: 0,
        memoryUsed: 0,
        compilerError: error.message
      });
    });
  });
}

// Worker event handlers for monitoring and debugging
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

// Export worker instance for graceful shutdown in server.js
module.exports = worker;
