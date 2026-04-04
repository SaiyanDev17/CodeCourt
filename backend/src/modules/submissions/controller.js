// Submissions controller
// Handles HTTP request/response logic for submission endpoints

const submissionsService = require('./service');

class SubmissionsController {
  async submit(req, res, next) {
    try {
      const { problemId, code, language, contestId } = req.body;
      const userId = req.user.id;
      
      const result = await submissionsService.submit(userId, problemId, code, language, contestId);
      
      res.status(202).json({
        message: 'Submission queued for judging',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubmission(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const submission = await submissionsService.getSubmission(id, userId);
      
      res.json({ submission });
    } catch (error) {
      next(error);
    }
  }

  async getSubmissionsByProblem(req, res, next) {
    try {
      const { problemId } = req.params;
      const userId = req.user.id;
      
      const submissions = await submissionsService.getSubmissionsByProblem(userId, problemId);
      
      res.json({
        count: submissions.length,
        submissions
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SubmissionsController();
