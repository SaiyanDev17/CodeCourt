// BullMQ submission worker - processes judge jobs
const { Worker } = require('bullmq');
const redis = require('../config/redis');
const Submission = require('../modules/submissions/model');
const Problem = require('../modules/problems/model');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { emitVerdict } = require('../socket/verdict.socket');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Create worker with concurrency limit of 5
const worker = new Worker('submissions', async (job) => {
  const { submissionId, code, language, problemId, userId, contestId } = job.data;
  
  try {
    // Fetch problem details
    const problem = await Problem.findById(problemId);
    if (!problem) {
      throw new Error('Problem not found');
    }
    
    // Download test cases from S3
    const testCases = await downloadTestCases(problem.hiddenTestCasesS3Key);
    
    // Run judge
    const verdict = await runJudge(code, language, problem, testCases);
    
    // Update submission in MongoDB
    await Submission.findByIdAndUpdate(submissionId, {
      verdict: verdict.verdict,
      executionTime: verdict.executionTime,
      memoryUsed: verdict.memoryUsed,
      compilerError: verdict.compilerError
    });
    
    // Emit Socket.io verdict event
    emitVerdict(userId, {
      submissionId,
      verdict: verdict.verdict,
      executionTime: verdict.executionTime,
      memoryUsed: verdict.memoryUsed
    });
    
    // If contest submission, update leaderboard
    if (contestId) {
      // TODO: Update contest score and emit leaderboard update
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
}, {
  connection: redis,
  concurrency: 5 // Process 5 submissions simultaneously
});

/**
 * Download test cases from S3
 */
async function downloadTestCases(s3Key) {
  // TODO: Implement S3 download and ZIP extraction
  // For now, return mock test cases
  return [
    { input: '1 2\n', output: '3\n' }
  ];
}

/**
 * Run judge in Docker container
 */
async function runJudge(code, language, problem, testCases) {
  const { timeLimit, memoryLimit } = problem;
  
  // TODO: Implement Docker judge execution
  // For now, return mock verdict
  return {
    verdict: 'AC',
    executionTime: 100,
    memoryUsed: 10,
    compilerError: null
  };
}

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

module.exports = worker;
