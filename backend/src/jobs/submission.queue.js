// BullMQ submission queue
const { Queue } = require('bullmq');
const redis = require('../config/redis');

// Create submission queue
const submissionQueue = new Queue('submissions', {
  connection: redis,
  defaultJobOptions: {
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
  }
});

/**
 * Add submission to queue
 * @param {Object} submissionData - { submissionId, code, language, problemId, userId, contestId }
 */
exports.enqueueSubmission = async (submissionData) => {
  const job = await submissionQueue.add('judge', submissionData, {
    jobId: submissionData.submissionId
  });
  
  return job;
};

/**
 * Get job status
 */
exports.getJobStatus = async (jobId) => {
  const job = await submissionQueue.getJob(jobId);
  if (!job) return null;
  
  const state = await job.getState();
  return { state, progress: job.progress };
};

module.exports = submissionQueue;
