// Contest service
// Business logic for contest management: creation, registration, scoring, leaderboard

const { Contest, ContestScore } = require('./model');
const redis = require('../../config/redis');

const LEADERBOARD_CACHE_TTL = 10; // 10 seconds

class ContestService {
  async createContest(title, startTime, endTime, problemIds, createdBy) {
    // Validate endTime > startTime + 30min
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const minDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    if (endDate - startDate < minDuration) {
      const error = new Error('Contest duration must be at least 30 minutes');
      error.statusCode = 422;
      throw error;
    }
    
    // Create contest with status 'upcoming'
    const contest = await Contest.create({
      title,
      startTime: startDate,
      endTime: endDate,
      problemIds,
      createdBy,
      status: 'upcoming',
      participants: []
    });
    
    return contest.toObject();
  }

  async listContests() {
    const contests = await Contest.find()
      .populate('createdBy', 'username')
      .populate('problemIds', 'title slug difficulty')
      .sort({ startTime: -1 })
      .lean();
    
    return contests;
  }

  async getContestById(contestId) {
    const contest = await Contest.findById(contestId)
      .populate('createdBy', 'username')
      .populate('problemIds', 'title slug difficulty description constraints timeLimit memoryLimit sampleTestCases')
      .lean();
    
    if (!contest) {
      const error = new Error('Contest not found');
      error.statusCode = 404;
      throw error;
    }
    
    return contest;
  }

  async registerForContest(contestId, userId) {
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      const error = new Error('Contest not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Check contest status (can register for upcoming or ongoing)
    if (contest.status === 'ended') {
      const error = new Error('Cannot register for ended contest');
      error.statusCode = 400;
      throw error;
    }
    
    // Check if already registered
    if (contest.participants.includes(userId)) {
      return { message: 'Already registered' };
    }
    
    // Add userId to participants array
    contest.participants.push(userId);
    await contest.save();
    
    // Initialize ContestScore for user
    await ContestScore.create({
      contestId,
      userId,
      totalScore: 0,
      problemScores: contest.problemIds.map(problemId => ({
        problemId,
        solved: false,
        attempts: 0,
        firstAcTime: null,
        penalty: 0
      }))
    });
    
    return { message: 'Successfully registered for contest' };
  }

  async recordSubmission(contestId, userId, problemId, verdict, submittedAt) {
    // Fetch contest to get start time
    const contest = await Contest.findById(contestId);
    if (!contest) {
      throw new Error('Contest not found');
    }
    
    // Fetch or create ContestScore
    let contestScore = await ContestScore.findOne({ contestId, userId });
    
    if (!contestScore) {
      // User not registered, auto-register
      await this.registerForContest(contestId, userId);
      contestScore = await ContestScore.findOne({ contestId, userId });
    }
    
    // Find problem score
    let problemScore = contestScore.problemScores.find(
      ps => ps.problemId.toString() === problemId.toString()
    );
    
    if (!problemScore) {
      // Add problem score if not exists
      problemScore = {
        problemId,
        solved: false,
        attempts: 0,
        firstAcTime: null,
        penalty: 0
      };
      contestScore.problemScores.push(problemScore);
    }
    
    // If already solved, ignore duplicate AC
    if (problemScore.solved && verdict === 'AC') {
      return contestScore;
    }
    
    // Update based on verdict
    if (verdict === 'AC' && !problemScore.solved) {
      // Mark as solved
      problemScore.solved = true;
      
      // Calculate firstAcTime (minutes from contest start)
      const minutesElapsed = Math.floor((submittedAt - contest.startTime) / 60000);
      problemScore.firstAcTime = minutesElapsed;
      
      // Calculate penalty (20 * attempts + firstAcTime)
      problemScore.penalty = 20 * problemScore.attempts + minutesElapsed;
    } else if (verdict === 'WA') {
      // Increment attempts only if not solved
      if (!problemScore.solved) {
        problemScore.attempts += 1;
      }
    }
    
    // Recalculate total score
    contestScore.totalScore = this.computeIcpcScore(contestScore.problemScores);
    
    await contestScore.save();
    
    // Invalidate leaderboard cache
    try {
      await redis.del(`leaderboard:${contestId}`);
    } catch (error) {
      console.warn('Failed to invalidate leaderboard cache:', error.message);
    }
    
    return contestScore;
  }

  async getLeaderboard(contestId) {
    // Check Redis cache
    try {
      const cached = await redis.get(`leaderboard:${contestId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache read failed:', error.message);
    }
    
    // Fetch ContestScores for contestId
    const scores = await ContestScore.find({ contestId })
      .populate('userId', 'username')
      .sort({ totalScore: -1 }) // Sort by score descending
      .limit(50) // Top 50
      .lean();
    
    // Format leaderboard
    const leaderboard = scores.map((score, index) => ({
      rank: index + 1,
      username: score.userId.username,
      userId: score.userId._id,
      totalScore: score.totalScore,
      problemsSolved: score.problemScores.filter(ps => ps.solved).length,
      totalPenalty: score.problemScores.reduce((sum, ps) => sum + ps.penalty, 0)
    }));
    
    // Cache in Redis with TTL 10s
    try {
      await redis.setex(
        `leaderboard:${contestId}`,
        LEADERBOARD_CACHE_TTL,
        JSON.stringify(leaderboard)
      );
    } catch (error) {
      console.warn('Redis cache write failed:', error.message);
    }
    
    return leaderboard;
  }

  computeIcpcScore(problemScores) {
    return problemScores.reduce((total, ps) => {
      if (!ps.solved) return total;
      const penalty = 20 * ps.attempts + (ps.firstAcTime || 0);
      return total + 100 - penalty;
    }, 0);
  }
}

module.exports = new ContestService();
