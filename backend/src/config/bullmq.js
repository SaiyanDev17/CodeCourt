/**
 * BullMQ Connection Configuration
 * Provides centralized connection settings for BullMQ Queue and Worker
 */

const redis = require('./redis');

/**
 * BullMQ connection configuration
 * Uses the shared Redis client from redis.js
 */
const bullmqConnection = redis;

/**
 * Default job options for submission queue
 */
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: {
    age: 3600, // Keep completed jobs for 1 hour
    count: 1000
  },
  removeOnFail: {
    age: 86400 // Keep failed jobs for 24 hours
  }
};

/**
 * Worker options for submission processing
 */
const workerOptions = {
  connection: bullmqConnection,
  concurrency: 5 // Process 5 submissions simultaneously (per Requirement 4.2)
};

/**
 * Queue options for submission queue
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
