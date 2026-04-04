// Contest controller
// Handles HTTP request/response logic for contest endpoints

const contestService = require('./service');

class ContestController {
  async createContest(req, res, next) {
    try {
      const { title, startTime, endTime, problemIds } = req.body;
      const createdBy = req.user.id;
      
      const contest = await contestService.createContest(
        title,
        startTime,
        endTime,
        problemIds,
        createdBy
      );
      
      res.status(201).json({
        message: 'Contest created successfully',
        contest
      });
    } catch (error) {
      next(error);
    }
  }

  async listContests(req, res, next) {
    try {
      const contests = await contestService.listContests();
      
      res.json({
        count: contests.length,
        contests
      });
    } catch (error) {
      next(error);
    }
  }

  async getContest(req, res, next) {
    try {
      const { id } = req.params;
      
      const contest = await contestService.getContestById(id);
      
      res.json({ contest });
    } catch (error) {
      next(error);
    }
  }

  async registerForContest(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await contestService.registerForContest(id, userId);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLeaderboard(req, res, next) {
    try {
      const { id } = req.params;
      
      const leaderboard = await contestService.getLeaderboard(id);
      
      res.json({
        contestId: id,
        leaderboard
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContestController();
