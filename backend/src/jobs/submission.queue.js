/**
 * Submission Queue (BullMQ)
 * 
 * VISION:
 * Provide a reliable, scalable queue for asynchronous code execution jobs.
 * Enable horizontal scaling of judge workers while maintaining job ordering
 * and retry capabilities.
 * 
 * WHY THIS EXISTS:
 * Code execution is CPU-intensive and time-consuming (up to 10 seconds per submission).
 * Synchronous execution would block the API server and create poor user experience.
 * BullMQ provides:
 * - Asynchronous job processing (immediate API response)
 * - Horizontal scalability (multiple worker instances)
 * - Automatic retries on failure
 * - Job persistence (survives server restarts)
 * - Priority queuing (future: contest submissions first)
 * 
 * WHAT IT DOES:
 * - Creates a BullMQ Queue instance backed by Redis
 * - Enqueues submission jobs with unique job IDs
 * - Provides job status tracking
 * - Configures job options (attempts, backoff, TTL)
 * 
 * DESIGN DECISIONS:
 * 1. BullMQ over Bull:
 *    - Better TypeScript support
 *    - Improved performance (Redis streams)
 *    - Active maintenance and modern API
 * 
 * 2. Job ID = Submission ID:
 *    - Prevents duplicate job creation
 *    - Enables easy job lookup by submission ID
 *    - Simplifies debugging and monitoring
 * 
 * 3. Centralized Configuration:
 *    - Queue options imported from config/bullmq.js
 *    - Consistent settings across queue and worker
 *    - Easy to modify retry/backoff strategies
 * 
 * 4. Redis-Backed Persistence:
 *    - Jobs survive server restarts
 *    - Enables distributed worker architecture
 *    - Provides job history and metrics
 * 
 * USAGE:
 * ```javascript
 * const { enqueueSubmission } = require('./jobs/submission.queue');
 * 
 * // Enqueue a submission for judging
 * const job = await enqueueSubmission({
 *   submissionId: '507f1f77bcf86cd799439011',
 *   code: 'print("Hello World")',
 *   language: 'python',
 *   problemId: '507f1f77bcf86cd799439012',
 *   userId: '507f1f77bcf86cd799439013',
 *   contestId: '507f1f77bcf86cd799439014' // optional
 * });
 * 
 * // Check job status
 * const status = await getJobStatus(job.id);
 * // Returns: { state: 'completed', progress: 100 }
 * ```
 */

const { Queue } = require('bullmq');
const { queueOptions } = require('../config/bullmq');

// Create submission queue using centralized BullMQ configuration
// Queue name 'submissions' must match worker queue name
const submissionQueue = new Queue('submissions', queueOptions);

/**
 * Add submission to queue for asynchronous judging
 * 
 * Enqueues a submission job with a unique job ID (submission ID) to prevent
 * duplicate processing. The job will be picked up by a worker instance and
 * executed with automatic retries on failure.
 * 
 * @param {Object} submissionData - Submission details
 * @param {string} submissionData.submissionId - MongoDB ObjectId of submission
 * @param {string} submissionData.code - Source code to execute
 * @param {string} submissionData.language - Programming language ('cpp' or 'python')
 * @param {string} submissionData.problemId - MongoDB ObjectId of problem
 * @param {string} submissionData.userId - MongoDB ObjectId of user
 * @param {string} [submissionData.contestId] - Optional contest ID for scoring
 * @returns {Promise<Job>} BullMQ Job instance
 * 
 * @example
 * const job = await enqueueSubmission({
 *   submissionId: '507f1f77bcf86cd799439011',
 *   code: '#include <iostream>\nint main() { std::cout << "Hello"; }',
 *   language: 'cpp',
 *   problemId: '507f1f77bcf86cd799439012',
 *   userId: '507f1f77bcf86cd799439013',
 *   contestId: '507f1f77bcf86cd799439014'
 * });
 */
async function enqueueSubmission(submissionData) {
  // Use submissionId as jobId to prevent duplicate job creation
  // If a job with this ID already exists, BullMQ will reject the duplicate
  const job = await submissionQueue.add('judge', submissionData, {
    jobId: submissionData.submissionId
  });
  
  return job;
}

/**
 * Get job status and progress
 * 
 * Retrieves the current state and progress of a queued job. Useful for
 * polling job status from the API or debugging stuck jobs.
 * 
 * @param {string} jobId - BullMQ job ID (same as submission ID)
 * @returns {Promise<Object|null>} Job status object or null if not found
 * @returns {string} return.state - Job state ('waiting', 'active', 'completed', 'failed')
 * @returns {number} return.progress - Job progress (0-100)
 * 
 * @example
 * const status = await getJobStatus('507f1f77bcf86cd799439011');
 * // Returns: { state: 'completed', progress: 100 }
 * // Or: { state: 'active', progress: 50 }
 * // Or: null (job not found)
 */
async function getJobStatus(jobId) {
  const job = await submissionQueue.getJob(jobId);
  if (!job) return null;
  
  // Get current job state from Redis
  const state = await job.getState();
  return { state, progress: job.progress };
}

// Single unified export — queue instance + helper functions
module.exports = {
  submissionQueue,
  enqueueSubmission,
  getJobStatus
};
