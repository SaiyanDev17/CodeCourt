/**
 * BullMQ Configuration Module
 * 
 * VISION:
 * Provide centralized, production-ready configuration for BullMQ job queues and workers.
 * This ensures consistent behavior across all queue operations (submission judging, email
 * notifications, etc.) with proper retry logic, error handling, and resource management.
 * 
 * WHY THIS EXISTS:
 * - Code submission judging is CPU-intensive and must be processed asynchronously
 * - Synchronous judging would block API responses and degrade user experience
 * - BullMQ provides reliable job processing with Redis-backed persistence
 * - Centralized configuration ensures consistent retry/backoff behavior
 * - Worker concurrency must be tuned to balance throughput vs resource usage
 * 
 * WHAT IT DOES:
 * 1. Exports shared Redis connection for BullMQ (reuses redis.js client)
 * 2. Defines default job options (retry attempts, backoff strategy, cleanup)
 * 3. Configures worker options (concurrency limit: 5 simultaneous judges)
 * 4. Provides queue options for consistent queue initialization
 * 
 * DESIGN DECISIONS:
 * - Reuses Redis client from redis.js (single connection pool, no overhead)
 * - 3 retry attempts with exponential backoff (2s → 4s → 8s)
 * - Keeps completed jobs for 1 hour (debugging recent submissions)
 * - Keeps failed jobs for 24 hours (troubleshooting judge errors)
 * - Concurrency: 5 (balances throughput vs CPU/memory usage)
 * - Exponential backoff prevents thundering herd on transient failures
 * 
 * USAGE:
 * ```javascript
 * const { Queue, Worker } = require('bullmq');
 * const { queueOptions, workerOptions } = require('./config/bullmq');
 * 
 * // Create submission queue
 * const submissionQueue = new Queue('submissions', queueOptions);
 * 
 * // Add job to queue
 * await submissionQueue.add('judge', {
 *   submissionId: '507f1f77bcf86cd799439011',
 *   problemId: '507f1f77bcf86cd799439012',
 *   language: 'cpp',
 *   code: 'int main() { ... }'
 * });
 * 
 * // Create worker to process jobs
 * const worker = new Worker('submissions', async (job) => {
 *   // Judge submission logic here
 *   console.log('Processing submission:', job.data.submissionId);
 * }, workerOptions);
 * ```
 */

const redis = require('./redis');

/**
 * BullMQ connection configuration
 * 
 * Reuses the shared Redis client from redis.js to avoid creating multiple
 * connection pools. This is more efficient and prevents connection exhaustion.
 * 
 * The Redis client is already configured with:
 * - maxRetriesPerRequest: null (required for BullMQ)
 * - Automatic reconnection logic
 * - Event handlers for monitoring
 */
const bullmqConnection = redis;

/**
 * Default job options for submission queue
 * 
 * These options are applied to every job added to the queue unless overridden.
 * They control retry behavior, job cleanup, and error handling.
 * 
 * Retry Strategy:
 * - Attempt 1: Immediate
 * - Attempt 2: After 2 seconds
 * - Attempt 3: After 4 seconds (2^2)
 * - Attempt 4: After 8 seconds (2^3)
 * 
 * Total max wait: 2 + 4 + 8 = 14 seconds before job fails permanently
 */
const defaultJobOptions = {
  // Number of retry attempts before marking job as failed
  // 3 attempts handles transient failures (network issues, temporary resource exhaustion)
  attempts: 3,
  
  // Exponential backoff strategy for retries
  // Prevents overwhelming the system during outages
  backoff: {
    type: 'exponential',  // Delay doubles with each retry: 2s → 4s → 8s
    delay: 2000           // Initial delay: 2 seconds
  },
  
  // Cleanup policy for completed jobs
  // Keeps recent jobs for debugging but prevents Redis memory bloat
  removeOnComplete: {
    age: 3600,    // Keep completed jobs for 1 hour (3600 seconds)
    count: 1000   // Keep at most 1000 completed jobs (FIFO eviction)
  },
  
  // Cleanup policy for failed jobs
  // Keeps failed jobs longer for troubleshooting
  removeOnFail: {
    age: 86400    // Keep failed jobs for 24 hours (86400 seconds)
    // No count limit - we want to investigate all failures
  }
};

/**
 * Worker options for submission processing
 * 
 * Controls how the worker processes jobs from the queue.
 * The concurrency setting is critical for balancing throughput vs resource usage.
 * 
 * Concurrency Tuning:
 * - Too low (1-2): Slow throughput, underutilized CPU
 * - Optimal (5): Good balance for typical 4-8 core servers
 * - Too high (20+): CPU thrashing, memory exhaustion, context switching overhead
 * 
 * Each concurrent job spawns a Docker container with:
 * - 256MB memory limit
 * - 2 second CPU time limit
 * - Isolated network (no internet access)
 * 
 * With concurrency=5, peak resource usage:
 * - Memory: 5 × 256MB = 1.28GB
 * - CPU: 5 cores (assuming 1 core per judge)
 */
const workerOptions = {
  connection: bullmqConnection,
  
  // Process 5 submissions simultaneously
  // This matches the requirement from design.md (Requirement 4.2)
  // Adjust based on server resources:
  // - 2-core server: concurrency=2
  // - 4-core server: concurrency=4
  // - 8-core server: concurrency=5-8
  concurrency: 5
};

/**
 * Queue options for submission queue
 * 
 * Used when initializing the Queue instance. Combines connection and default job options.
 * 
 * Example:
 * ```javascript
 * const { Queue } = require('bullmq');
 * const { queueOptions } = require('./config/bullmq');
 * 
 * const submissionQueue = new Queue('submissions', queueOptions);
 * ```
 */
const queueOptions = {
  connection: bullmqConnection,
  defaultJobOptions
};

module.exports = {
  connection: bullmqConnection,
  defaultJobOptions,
  workerOptions,
  queueOptions
};
