/**
 * Submission Worker (BullMQ) - Kubernetes Native
 */

const { Worker } = require('bullmq');
const { workerOptions } = require('../config/bullmq');
const Submission = require('../modules/submissions/model');
const Problem = require('../modules/problems/model');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const redis = require('../config/redis');
const s3Client = require('../config/s3');
const { getBucketName } = require('../config/s3');
const AdmZip = require('adm-zip');

// Child process for running docker natively
const { spawn } = require('child_process');

const S3_BUCKET_NAME = getBucketName();
const JUDGE_IMAGE_CPP = process.env.JUDGE_IMAGE_CPP || '501588780051.dkr.ecr.us-east-1.amazonaws.com/codecourt-judge:cpp';
const JUDGE_IMAGE_PYTHON = process.env.JUDGE_IMAGE_PYTHON || '501588780051.dkr.ecr.us-east-1.amazonaws.com/codecourt-judge:python';

const worker = new Worker('submissions', async (job) => {
  const { submissionId, code, language, problemId, userId, contestId } = job.data;
  
  try {
    console.log(`Processing submission ${submissionId}`);
    
    const problem = await Problem.findById(problemId);
    if (!problem) throw new Error('Problem not found');
    
    let testCases = problem.sampleTestCases;
    if (problem.hiddenTestCasesS3Key) {
      try {
        testCases = await downloadTestCases(problem.hiddenTestCasesS3Key);
      } catch (error) {
        console.warn('Failed to download hidden test cases, using sample tests:', error.message);
      }
    }
    
    const verdict = await runJudge(code, language, problem, testCases);
    
    await Submission.findByIdAndUpdate(submissionId, {
      verdict: verdict.verdict,
      executionTime: verdict.executionTime,
      memoryUsed: verdict.memoryUsed,
      compilerError: verdict.compilerError,
      judgeMessage: verdict.judgeMessage,
      testCaseSummary: verdict.testCaseSummary,
      testCaseResults: verdict.testCaseResults
    });
    
    try {
      await redis.publish('socket:verdict', JSON.stringify({
        userId,
        verdictData: {
          submissionId,
          verdict: verdict.verdict,
          executionTime: verdict.executionTime,
          memoryUsed: verdict.memoryUsed,
          compilerError: verdict.compilerError,
          judgeMessage: verdict.judgeMessage,
          testCaseSummary: verdict.testCaseSummary,
          testCaseResults: verdict.testCaseResults
        }
      }));
    } catch (error) {
      console.warn('Failed to publish verdict event:', error.message);
    }
    
    if (contestId && verdict.verdict === 'AC') {
      try {
        const contestService = require('../modules/contests/service');
        await contestService.recordSubmission(contestId, userId, problemId, verdict.verdict, new Date());
        
        const leaderboard = await contestService.getLeaderboard(contestId);
        await redis.publish('socket:leaderboard', JSON.stringify({ contestId, leaderboard }));
      } catch (error) {
        console.error('Failed to update contest score:', error);
      }
    } else if (contestId && (verdict.verdict === 'WA' || verdict.verdict === 'TLE' || verdict.verdict === 'MLE' || verdict.verdict === 'RE')) {
      try {
        const contestService = require('../modules/contests/service');
        await contestService.recordSubmission(contestId, userId, problemId, verdict.verdict, new Date());
      } catch (error) {
        console.error('Failed to record contest attempt:', error);
      }
    }
    
    return verdict;
  } catch (error) {
    console.error('Worker error:', error);
    await Submission.findByIdAndUpdate(submissionId, {
      verdict: 'RE',
      compilerError: error.message,
      judgeMessage: error.message,
      testCaseSummary: { total: 0, passed: 0, failed: 0, firstFailedCase: null },
      testCaseResults: []
    });
    throw error;
  }
}, workerOptions);

async function downloadTestCases(s3Key) {
  try {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: s3Key });
    const response = await s3Client.send(command);
    
    const chunks = [];
    for await (const chunk of response.Body) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    const fileMap = {};
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const entryPath = entry.entryName;
      const fileName = entryPath.split('/').pop();
      const match = fileName.match(/^(.*)\.(in|out|txt|ans)$/i);
      
      if (match) {
        const baseName = match[1];
        const ext = match[2].toLowerCase();
        
        if (!fileMap[baseName]) fileMap[baseName] = {};
        const content = entry.getData().toString('utf8');
        
        // Check directory path first (handles input/1.txt + output/1.txt structure)
        const pathLower = entryPath.toLowerCase();
        if (pathLower.includes('/input/') || pathLower.startsWith('input/')) {
          fileMap[baseName].input = content;
        } else if (pathLower.includes('/output/') || pathLower.startsWith('output/')) {
          fileMap[baseName].output = content;
        } else if (ext === 'in') {
          fileMap[baseName].input = content;
        } else if (ext === 'out' || ext === 'ans') {
          fileMap[baseName].output = content;
        } else if (ext === 'txt' && !fileMap[baseName].input) {
          fileMap[baseName].input = content;
        } else {
          fileMap[baseName].output = content;
        }
      }
    }
    
    const parsedTestCases = [];
    for (const [baseName, pair] of Object.entries(fileMap)) {
      if (pair.input !== undefined && pair.output !== undefined) {
        parsedTestCases.push({ input: pair.input, output: pair.output });
      }
    }
    
    if (parsedTestCases.length === 0) return [ { input: '1 2\n', output: '3\n' } ];
    return parsedTestCases;
  } catch (error) {
    throw error;
  }
}

async function runJudge(code, language, problem, testCases) {
  const { timeLimit, memoryLimit } = problem;
  const timeLimitSeconds = Math.ceil(timeLimit / 1000) + 2;
  const memoryLimitMB = memoryLimit || 256;
  
  const containerName = `judge-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  const envArgs = [
    '-e', `CODE=${Buffer.from(code).toString('base64')}`,
    '-e', `LANG=${language}`,
    '-e', `TEST_CASES=${testCases.length}`,
    '-e', `TIME_LIMIT_S=${timeLimitSeconds}`
  ];
  
  testCases.forEach((tc, i) => {
    envArgs.push('-e', `INPUT_${i}=${Buffer.from(tc.input).toString('base64')}`);
  });
  
  const script = `
#!/bin/sh
ext="py"
if [ "$LANG" = "cpp" ]; then ext="cpp"; fi
echo "$CODE" | base64 -d > solution.$ext

if [ "$LANG" = "cpp" ]; then
  g++ -O2 -std=c++17 -o solution solution.cpp 2> compile_err.txt
  if [ $? -ne 0 ]; then
    echo "---COMPILE_ERROR---"
    cat compile_err.txt | base64
    exit 0
  fi
  CMD="./solution"
else
  CMD="python3 solution.py"
fi

echo "---COMPILE_SUCCESS---"

for i in $(seq 0 $(($TEST_CASES - 1))); do
  eval "echo \\$INPUT_$i" | base64 -d > input_$i.txt
  
  start=$(date +%s%3N)
  timeout ${timeLimitSeconds}s $CMD < input_$i.txt > out_$i.txt 2> err_$i.txt
  exit_code=$?
  end=$(date +%s%3N)
  time_ms=$((end - start))
  
  echo "---TEST_$i---"
  echo "EXIT_CODE: $exit_code"
  echo "TIME_MS: $time_ms"
  echo "STDOUT:"
  cat out_$i.txt | base64
  echo "STDERR:"
  cat err_$i.txt | base64
done
  `;

  const image = language === 'cpp' ? JUDGE_IMAGE_CPP : JUDGE_IMAGE_PYTHON;

  return new Promise((resolve, reject) => {
    const dockerArgs = [
      'run',
      '--rm',
      '-i',
      '--name', containerName,
      '--memory', `${memoryLimitMB}m`,
      '--cpus', '1',
      '--network', 'none',
      '--security-opt', 'no-new-privileges',
      '--entrypoint', '/bin/sh',
      '--workdir', '/tmp',
      '--user', '0',
      ...envArgs,
      image,
      '-c', script
    ];

    const child = spawn('docker', dockerArgs);

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      try {
        console.log(`Judge child process exited with code ${code}`);
        if (errorOutput) console.error('Judge docker stderr:', errorOutput);
        const result = parseJudgeLogs(output, problem, testCases, timeLimit, memoryLimitMB, errorOutput);
        resolve(result);
      } catch (err) {
        console.error('Judge Error Parsing Logs:', err);
        resolve({
          verdict: 'RE',
          executionTime: 0,
          memoryUsed: 0,
          compilerError: 'Internal Judge Error: ' + err.message,
          judgeMessage: 'Internal Judge Error: ' + err.message,
          testCaseSummary: { total: testCases.length, passed: 0, failed: testCases.length, firstFailedCase: 1 },
          testCaseResults: createRemainingTestResults(testCases.length, 0, 'RE')
        });
      }
    });

    child.on('error', (err) => {
      console.error('Docker Process Error:', err);
      resolve({
        verdict: 'RE',
        executionTime: 0,
        memoryUsed: 0,
        compilerError: 'Internal Judge Error: Failed to start docker container',
        judgeMessage: 'Internal Judge Error: Failed to start docker container',
        testCaseSummary: { total: testCases.length, passed: 0, failed: testCases.length, firstFailedCase: 1 },
        testCaseResults: createRemainingTestResults(testCases.length, 0, 'RE')
      });
    });

    // Cleanup container just in case process hangs
    setTimeout(() => {
      spawn('docker', ['rm', '-f', containerName]);
    }, (timeLimitSeconds * testCases.length * 1000) + 30000);
  });
}

function parseJudgeLogs(logs, problem, testCases, timeLimit, memoryLimit, stderrLog = '') {
  const lines = logs.split('\n');
  const results = [];
  
  if (lines.includes('---COMPILE_ERROR---')) {
    const idx = lines.indexOf('---COMPILE_ERROR---');
    const base64Err = lines.slice(idx + 1).join('').trim();
    const message = Buffer.from(base64Err, 'base64').toString('utf8');
    return {
      verdict: 'CE',
      executionTime: 0,
      memoryUsed: 0,
      compilerError: message,
      judgeMessage: message,
      testCaseSummary: { total: testCases.length, passed: 0, failed: testCases.length, firstFailedCase: null },
      testCaseResults: createRemainingTestResults(testCases.length, 0, 'FAILED')
    };
  }
  
  let maxExecutionTime = 0;
  let peakMemoryUsed = 0;
  
  for (let tcIndex = 0; tcIndex < testCases.length; tcIndex++) {
    const marker = `---TEST_${tcIndex}---`;
    const idx = lines.indexOf(marker);
    if (idx === -1) {
      console.error(`Marker ${marker} not found in logs:`, logs, 'stderr:', stderrLog);
      const message = stderrLog ? `Judge Error: ${stderrLog}` : 'Test case output not found in logs';
      return { 
        verdict: 'RE', 
        executionTime: 0, 
        memoryUsed: 0, 
        compilerError: message,
        judgeMessage: message,
        testCaseSummary: buildTestCaseSummary(testCases.length, results, tcIndex + 1),
        testCaseResults: [...results, ...createRemainingTestResults(testCases.length, results.length, 'RE')]
      };
    }
    
    const exitCodeStr = lines[idx + 1].split(': ')[1];
    const timeMsStr = lines[idx + 2].split(': ')[1];
    const exitCode = parseInt(exitCodeStr, 10);
    const timeMs = parseInt(timeMsStr, 10);
    
    maxExecutionTime = Math.max(maxExecutionTime, timeMs);
    const memoryUsedEst = 10; 
    peakMemoryUsed = Math.max(peakMemoryUsed, memoryUsedEst);
    
    const stdoutIdx = lines.indexOf('STDOUT:', idx);
    const stderrIdx = lines.indexOf('STDERR:', idx);
    
    const stdoutBase64 = lines.slice(stdoutIdx + 1, stderrIdx).join('');
    let nextMarkerIdx = lines.indexOf(`---TEST_${tcIndex + 1}---`);
    if (nextMarkerIdx === -1) nextMarkerIdx = lines.length;
    const stderrBase64 = lines.slice(stderrIdx + 1, nextMarkerIdx).join('');
    
    const actualOutput = Buffer.from(stdoutBase64, 'base64').toString('utf8').trim();
    const stderrOutput = Buffer.from(stderrBase64, 'base64').toString('utf8').trim();
    
    if (exitCode === 124) {
      results.push(createTestResult(tcIndex, 'TLE', timeLimit, memoryUsedEst));
      return {
        verdict: 'TLE',
        executionTime: timeLimit,
        memoryUsed: memoryUsedEst,
        compilerError: null,
        judgeMessage: `Time limit exceeded on test case ${tcIndex + 1}`,
        testCaseSummary: buildTestCaseSummary(testCases.length, results, tcIndex + 1),
        testCaseResults: [...results, ...createRemainingTestResults(testCases.length, results.length, 'FAILED')]
      };
    } else if (exitCode === 137) {
      results.push(createTestResult(tcIndex, 'MLE', timeMs, memoryLimit));
      return {
        verdict: 'MLE',
        executionTime: timeMs,
        memoryUsed: memoryLimit,
        compilerError: null,
        judgeMessage: `Memory limit exceeded on test case ${tcIndex + 1}`,
        testCaseSummary: buildTestCaseSummary(testCases.length, results, tcIndex + 1),
        testCaseResults: [...results, ...createRemainingTestResults(testCases.length, results.length, 'FAILED')]
      };
    } else if (exitCode !== 0) {
      results.push(createTestResult(tcIndex, 'RE', timeMs, memoryUsedEst));
      const message = stderrOutput || `Runtime error on test case ${tcIndex + 1}`;
      return {
        verdict: 'RE',
        executionTime: timeMs,
        memoryUsed: memoryUsedEst,
        compilerError: message,
        judgeMessage: message,
        testCaseSummary: buildTestCaseSummary(testCases.length, results, tcIndex + 1),
        testCaseResults: [...results, ...createRemainingTestResults(testCases.length, results.length, 'FAILED')]
      };
    } else {
      if (!isOutputCorrect(problem, testCases[tcIndex], actualOutput)) {
        results.push(createTestResult(tcIndex, 'FAILED', timeMs, memoryUsedEst));
        return {
          verdict: 'WA',
          executionTime: timeMs,
          memoryUsed: memoryUsedEst,
          compilerError: null,
          judgeMessage: `Wrong answer on test case ${tcIndex + 1}`,
          testCaseSummary: buildTestCaseSummary(testCases.length, results, tcIndex + 1),
          testCaseResults: [...results, ...createRemainingTestResults(testCases.length, results.length, 'FAILED')]
        };
      }
      results.push(createTestResult(tcIndex, 'PASSED', timeMs, memoryUsedEst));
    }
  }
  
  return {
    verdict: 'AC',
    executionTime: maxExecutionTime,
    memoryUsed: peakMemoryUsed,
    compilerError: null,
    judgeMessage: `Accepted. Passed ${testCases.length}/${testCases.length} test cases.`,
    testCaseSummary: buildTestCaseSummary(testCases.length, results, null),
    testCaseResults: results
  };
}

function createTestResult(tcIndex, status, executionTime, memoryUsed) {
  return {
    testNumber: tcIndex + 1,
    status,
    executionTime,
    memoryUsed
  };
}

function createRemainingTestResults(total, completedCount, status) {
  const remaining = [];
  for (let i = completedCount; i < total; i++) {
    remaining.push(createTestResult(i, status, null, null));
  }
  return remaining;
}

function buildTestCaseSummary(total, results, firstFailedCase) {
  const passed = results.filter((result) => result.status === 'PASSED').length;
  return {
    total,
    passed,
    failed: Math.max(0, total - passed),
    firstFailedCase
  };
}

function isOutputCorrect(problem, testCase, actualOutput) {
  if (problem && problem.slug === 'two-sum') {
    return isTwoSumOutputCorrect(testCase.input, actualOutput);
  }
  return actualOutput === testCase.output.trim();
}

function isTwoSumOutputCorrect(input, actualOutput) {
  const tokens = input.trim().split(/\s+/).map(Number);
  if (tokens.length < 3) return false;

  const n = tokens[0];
  const nums = tokens.slice(1, 1 + n);
  const target = tokens[1 + n];

  if (!Number.isInteger(n) || nums.length !== n || typeof target !== 'number') return false;

  const matches = actualOutput.match(/-?\d+/g);
  if (!matches || matches.length !== 2) return false;

  const i = Number(matches[0]);
  const j = Number(matches[1]);
  if (!Number.isInteger(i) || !Number.isInteger(j)) return false;

  if (i < 0 || j < 0 || i >= n || j >= n || i === j) return false;

  return nums[i] + nums[j] === target;
}

worker.on('completed', (job) => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));

module.exports = worker;
