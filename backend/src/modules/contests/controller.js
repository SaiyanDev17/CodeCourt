// Contest controller
// Handles HTTP request/response logic for contest endpoints

class ContestController {
  async createContest(req, res, next) {
    try {
      // TODO: Validate request body (title, startTime, endTime, problemIds)
      // TODO: Check user role (admin or problem_setter)
      // TODO: Call ContestService.createContest()
      // TODO: Return 201 with contest object
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async listContests(req, res, next) {
    try {
      // TODO: Call ContestService.listContests()
      // TODO: Return 200 with contests array
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async getContest(req, res, next) {
    try {
      // TODO: Extract contestId from params
      // TODO: Call ContestService.getContestById()
      // TODO: Return 200 with contest object
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async registerForContest(req, res, next) {
    try {
      // TODO: Extract contestId from params
      // TODO: Extract userId from req.user (authenticated)
      // TODO: Call ContestService.registerForContest()
      // TODO: Return 200 with success message
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async getLeaderboard(req, res, next) {
    try {
      // TODO: Extract contestId from params
      // TODO: Call ContestService.getLeaderboard()
      // TODO: Return 200 with leaderboard array
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContestController();
