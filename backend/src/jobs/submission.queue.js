// BullMQ submission queue
const { Queue } = require('bullmq');
const { queueOptions } = require('../config/bullmq');

// Create submission queue using centralized BullMQ configuration
const submissionQueue = new Queue('submissions', queueOptions);

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
