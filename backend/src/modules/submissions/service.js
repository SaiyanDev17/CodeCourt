// Submissions service
// Business logic for code submission, verdict retrieval, and judge queue integration

const Submission = require('./model');
const Problem = require('../problems/model');
const { enqueueSubmission } = require('../../jobs/submission.queue');

class SubmissionsService {
  async submit(userId, problemId, code, language, contestId = null) {
    // Validate problem exists and is published
    const problem = await Problem.findById(problemId);
    
    if (!problem) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }
    
    if (problem.status !== 'published') {
      const error = new Error('Problem is not published');
      error.statusCode = 400;
      throw error;
    }
    
    // Create Submission document with verdict: 'PENDING'
    const submission = await Submission.create({
      userId,
      problemId,
      code,
      language,
      contestId,
      verdict: 'PENDING'
    });
    
    // Enqueue job to BullMQ Queue
    await enqueueSubmission({
      submissionId: submission._id.toString(),
      code,
      language,
      problemId: problemId.toString(),
      userId: userId.toString(),
      contestId: contestId ? contestId.toString() : null
    });
    
    return {
      submissionId: submission._id.toString(),
      status: 'queued'
    };
  }

  async getSubmission(submissionId, userId) {
    const submission = await Submission.findById(submissionId)
      .populate('problemId', 'title slug')
      .lean();
    
    if (!submission) {
      const error = new Error('Submission not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Verify ownership
    if (submission.userId.toString() !== userId) {
      const error = new Error('Not authorized to view this submission');
      error.statusCode = 403;
      throw error;
    }
    
    return submission;
  }

  async getSubmissionsByProblem(userId, problemId) {
    const submissions = await Submission.find({
      userId,
      problemId
    })
      .sort({ createdAt: -1 })
      .select('-code') // Don't return code in list view
      .lean();
    
    return submissions;
  }

  async updateVerdict(submissionId, verdict, executionTime, memoryUsed, compilerError = null) {
    const submission = await Submission.findByIdAndUpdate(
      submissionId,
      {
        verdict,
        executionTime,
        memoryUsed,
        compilerError
      },
      { new: true }
    );
    
    return submission;
  }
}

module.exports = new SubmissionsService();
