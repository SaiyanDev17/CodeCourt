// Submissions controller
// Handles HTTP request/response logic for submission endpoints

class SubmissionsController {
  async submit(req, res, next) {
    try {
      // TODO: Validate request body (code, language, problemId, contestId?)
      // TODO: Call SubmissionsService.submit()
      // TODO: Return 202 with submissionId
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async getSubmission(req, res, next) {
    try {
      // TODO: Extract submissionId from params
      // TODO: Call SubmissionsService.getSubmission()
      // TODO: Verify ownership (req.user.id === submission.userId)
      // TODO: Return submission detail
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async getSubmissionsByProblem(req, res, next) {
    try {
      // TODO: Extract problemId from params
      // TODO: Call SubmissionsService.getSubmissionsByProblem(userId, problemId)
      // TODO: Return list of submissions
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SubmissionsController();
