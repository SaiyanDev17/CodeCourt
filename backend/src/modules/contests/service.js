/**
 * Contest Service
 * 
 * VISION:
 * Provide a complete contest management system that handles competitive programming
 * contests with ICPC-style scoring, real-time leaderboards, and participant management.
 * This service orchestrates the entire contest lifecycle from creation to completion.
 * 
 * WHY THIS EXISTS:
 * Competitive programming platforms need robust contest engines that can:
 * - Manage contest lifecycle (upcoming → ongoing → ended)
 * - Handle participant registration and validation
 * - Compute ICPC scores with penalty calculations
 * - Generate real-time leaderboards with caching
 * - Track per-problem statistics (attempts, solve time, penalties)
 * 
 * WHAT IT DOES:
 * - Creates contests with validation (minimum 30-minute duration)
 * - Manages participant registration (prevents duplicate registrations)
 * - Records submission results and updates scores in real-time
 * - Computes ICPC scores: 100 - (20 * wrong_attempts + solve_time_minutes)
 * - Generates cached leaderboards (10-second TTL for performance)
 * - Handles duplicate AC submissions (ignores after first solve)
 * 
 * DESIGN DECISIONS:
 * 1. ICPC Scoring Algorithm:
 *    - Base score: 100 points per problem
 *    - Penalty: 20 points per wrong attempt + solve time in minutes
 *    - Final score: 100 - penalty (can be negative for slow solves)
 *    - Rationale: Rewards both correctness and speed
 * 
 * 2. Leaderboard Caching (10-second TTL):
 *    - Prevents database overload during active contests
 *    - 10s is short enough for "real-time" feel
 *    - Cache invalidated on every submission for immediate updates
 *    - Fallback to database if Redis unavailable
 * 
 * 3. Duplicate AC Handling:
 *    - First AC submission counts for scoring
 *    - Subsequent AC submissions ignored (no score change)
 *    - Prevents gaming the system with multiple correct submissions
 * 
 * 4. Auto-Registration on First Submission:
 *    - Users can submit without explicit registration
 *    - Simplifies user flow (one less step)
 *    - ContestScore initialized automatically
 * 
 * 5. Minimum Contest Duration (30 minutes):
 *    - Prevents accidental creation of too-short contests
 *    - Ensures meaningful competitive experience
 *    - Industry standard for minimum contest length
 * 
 * USAGE:
 * ```javascript
 * const contestService = require('./service');
 * 
 * // Create a contest
 * const contest = await contestService.createContest(
 *   'Weekly Contest #42',
 *   new Date('2024-01-15T10:00:00Z'),
 *   new Date('2024-01-15T12:00:00Z'),
 *   [problemId1, problemId2, problemId3],
 *   adminUserId
 * );
 * 
 * // Register a participant
 * await contestService.registerForContest(contestId, userId);
 * 
 * // Record a submission result
 * await contestService.recordSubmission(
 *   contestId,
 *   userId,
 *   problemId,
 *   'AC', // or 'WA', 'TLE', etc.
 *   new Date()
 * );
 * 
 * // Get leaderboard (cached)
 * const leaderboard = await contestService.getLeaderboard(contestId);
 * // Returns: [{ rank: 1, username: 'alice', totalScore: 280, ... }, ...]
 * ```
 */

const { Contest, ContestScore } = require('./model');
const redis = require('../../config/redis');

// Leaderboard cache TTL: 10 seconds
// Short enough for "real-time" updates, long enough to reduce database load
const LEADERBOARD_CACHE_TTL = 10;

class ContestService {
  /**
   * Create a new contest
   * 
   * Creates a contest with validation to ensure minimum duration requirements.
   * Contest starts in 'upcoming' status and transitions to 'ongoing' and 'ended'
   * via cron job (see backend/src/cron/contest.cron.js).
   * 
   * VALIDATION:
   * - Minimum duration: 30 minutes (industry standard)
   * - Prevents accidental creation of too-short contests
   * - Ensures meaningful competitive experience
   * 
   * @param {string} title - Contest title (e.g., "Weekly Contest #42")
   * @param {Date|string} startTime - Contest start time (ISO 8601 or Date object)
   * @param {Date|string} endTime - Contest end time (ISO 8601 or Date object)
   * @param {string[]} problemIds - Array of problem ObjectIds to include
   * @param {string} createdBy - Admin user ObjectId who created the contest
   * @returns {Promise<Object>} Created contest object
   * @throws {Error} 422 if duration < 30 minutes
   * 
   * @example
   * const contest = await createContest(
   *   'Weekly Contest #42',
   *   '2024-01-15T10:00:00Z',
   *   '2024-01-15T12:00:00Z',
   *   [problemId1, problemId2],
   *   adminUserId
   * );
   */
  async createContest(title, startTime, endTime, problemIds, createdBy) {
    // Convert to Date objects for validation
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    // Validate minimum duration: 30 minutes
    // This prevents accidental creation of too-short contests
    const minDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    if (endDate - startDate < minDuration) {
      const error = new Error('Contest duration must be at least 30 minutes');
      error.statusCode = 422; // Unprocessable Entity
      throw error;
    }
    
    // Create contest with initial status 'upcoming'
    // Status transitions: upcoming → ongoing → ended (via cron job)
    const contest = await Contest.create({
      title,
      startTime: startDate,
      endTime: endDate,
      problemIds,
      createdBy,
      status: 'upcoming',
      participants: [] // Empty initially, populated via registration
    });
    
    return contest.toObject();
  }

  /**
   * List all contests
   * 
   * Retrieves all contests sorted by start time (newest first) with populated
   * creator and problem details.
   * 
   * @returns {Promise<Object[]>} Array of contest objects with populated fields
   */
  async listContests() {
    const contests = await Contest.find()
      .populate('createdBy', 'username')
      .populate('problemIds', 'title slug difficulty')
      .sort({ startTime: -1 }) // Newest first
      .lean();
    
    return contests;
  }

  /**
   * Get contest by ID
   * 
   * Retrieves a single contest with full problem details (including description,
   * constraints, test cases). Used for contest detail page.
   * 
   * @param {string} contestId - Contest ObjectId
   * @returns {Promise<Object>} Contest object with populated fields
   * @throws {Error} 404 if contest not found
   */
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

  /**
   * Register user for contest
   * 
   * Adds user to contest participants and initializes their ContestScore.
   * Users can register for 'upcoming' or 'ongoing' contests, but not 'ended' contests.
   * 
   * PARTICIPANT MANAGEMENT:
   * - Prevents duplicate registrations (idempotent operation)
   * - Initializes ContestScore with empty problem scores
   * - Each problem starts with: solved=false, attempts=0, penalty=0
   * 
   * @param {string} contestId - Contest ObjectId
   * @param {string} userId - User ObjectId
   * @returns {Promise<Object>} Success message
   * @throws {Error} 404 if contest not found
   * @throws {Error} 400 if contest has ended
   * 
   * @example
   * await registerForContest(contestId, userId);
   * // Returns: { message: 'Successfully registered for contest' }
   * // or: { message: 'Already registered' }
   */
  async registerForContest(contestId, userId) {
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      const error = new Error('Contest not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Check contest status: can register for upcoming or ongoing, but not ended
    if (contest.status === 'ended') {
      const error = new Error('Cannot register for ended contest');
      error.statusCode = 400;
      throw error;
    }
    
    // Check if already registered (prevent duplicates)
    if (contest.participants.includes(userId)) {
      return { message: 'Already registered' };
    }
    
    // Add user to participants array
    contest.participants.push(userId);
    await contest.save();
    
    // Initialize ContestScore for user
    // Each problem starts with: solved=false, attempts=0, firstAcTime=null, penalty=0
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

  /**
   * Record submission result and update contest score
   * 
   * Updates ContestScore based on submission verdict. Handles ICPC scoring rules:
   * - First AC: Records solve time and calculates penalty
   * - Duplicate AC: Ignored (no score change)
   * - WA before AC: Increments attempt counter (adds 20-point penalty per attempt)
   * - WA after AC: Ignored (problem already solved)
   * 
   * DUPLICATE AC HANDLING:
   * Once a problem is solved (first AC), subsequent AC submissions are ignored.
   * This prevents gaming the system by submitting multiple correct solutions.
   * 
   * AUTO-REGISTRATION:
   * If user hasn't registered, automatically registers them on first submission.
   * Simplifies user flow (no explicit registration required).
   * 
   * @param {string} contestId - Contest ObjectId
   * @param {string} userId - User ObjectId
   * @param {string} problemId - Problem ObjectId
   * @param {string} verdict - Submission verdict ('AC', 'WA', 'TLE', 'MLE', 'RE', 'CE')
   * @param {Date} submittedAt - Submission timestamp
   * @returns {Promise<Object>} Updated ContestScore object
   * @throws {Error} If contest not found
   * 
   * @example
   * // First submission (WA)
   * await recordSubmission(contestId, userId, problemId, 'WA', new Date());
   * // problemScore: { solved: false, attempts: 1, penalty: 0 }
   * 
   * // Second submission (AC) at 45 minutes
   * await recordSubmission(contestId, userId, problemId, 'AC', new Date());
   * // problemScore: { solved: true, attempts: 1, firstAcTime: 45, penalty: 65 }
   * // penalty = 20 * 1 (attempts) + 45 (minutes) = 65
   * // score = 100 - 65 = 35 points
   * 
   * // Third submission (AC) - ignored
   * await recordSubmission(contestId, userId, problemId, 'AC', new Date());
   * // No change to score (duplicate AC)
   */
  async recordSubmission(contestId, userId, problemId, verdict, submittedAt) {
    // Fetch contest to get start time (needed for time calculations)
    const contest = await Contest.findById(contestId);
    if (!contest) {
      throw new Error('Contest not found');
    }
    
    // Fetch or create ContestScore
    let contestScore = await ContestScore.findOne({ contestId, userId });
    
    if (!contestScore) {
      // User not registered, auto-register them
      await this.registerForContest(contestId, userId);
      contestScore = await ContestScore.findOne({ contestId, userId });
    }
    
    // Find problem score in the array
    let problemScore = contestScore.problemScores.find(
      ps => ps.problemId.toString() === problemId.toString()
    );
    
    if (!problemScore) {
      // Add problem score if not exists (shouldn't happen if registration works correctly)
      problemScore = {
        problemId,
        solved: false,
        attempts: 0,
        firstAcTime: null,
        penalty: 0
      };
      contestScore.problemScores.push(problemScore);
    }
    
    // DUPLICATE AC HANDLING: If already solved, ignore subsequent AC submissions
    // This prevents gaming the system with multiple correct submissions
    if (problemScore.solved && verdict === 'AC') {
      return contestScore;
    }
    
    // Update based on verdict
    if (verdict === 'AC' && !problemScore.solved) {
      // First AC: Mark as solved and calculate penalty
      problemScore.solved = true;
      
      // Calculate firstAcTime: minutes elapsed from contest start
      const minutesElapsed = Math.floor((submittedAt - contest.startTime) / 60000);
      problemScore.firstAcTime = minutesElapsed;
      
      // Calculate penalty: 20 points per wrong attempt + solve time in minutes
      // Example: 2 WA + AC at 45min = 20*2 + 45 = 85 penalty
      problemScore.penalty = 20 * problemScore.attempts + minutesElapsed;
    } else if (verdict === 'WA') {
      // Wrong Answer: Increment attempts only if not already solved
      if (!problemScore.solved) {
        problemScore.attempts += 1;
      }
    }
    // Other verdicts (TLE, MLE, RE, CE) are ignored for scoring
    
    // Recalculate total score using ICPC algorithm
    contestScore.totalScore = this.computeIcpcScore(contestScore.problemScores);
    
    await contestScore.save();
    
    // Invalidate leaderboard cache to reflect new scores immediately
    try {
      await redis.del(`leaderboard:${contestId}`);
    } catch (error) {
      console.warn('Failed to invalidate leaderboard cache:', error.message);
      // Non-critical: Continue even if cache invalidation fails
    }
    
    return contestScore;
  }

  /**
   * Get contest leaderboard with Redis caching
   * 
   * Retrieves top 50 participants sorted by total score (descending).
   * Uses Redis cache with 10-second TTL to reduce database load during active contests.
   * 
   * CACHING STRATEGY:
   * - TTL: 10 seconds (short enough for "real-time" feel)
   * - Cache key: `leaderboard:{contestId}`
   * - Invalidated on every submission (via recordSubmission)
   * - Fallback to database if Redis unavailable
   * 
   * WHY 10 SECONDS?
   * - Balance between freshness and performance
   * - During active contests, leaderboard is queried frequently
   * - 10s prevents database overload while maintaining real-time feel
   * - Cache invalidation ensures immediate updates on submissions
   * 
   * @param {string} contestId - Contest ObjectId
   * @returns {Promise<Object[]>} Leaderboard array with rank, username, scores
   * 
   * @example
   * const leaderboard = await getLeaderboard(contestId);
   * // Returns:
   * // [
   * //   { rank: 1, username: 'alice', totalScore: 280, problemsSolved: 3, totalPenalty: 20 },
   * //   { rank: 2, username: 'bob', totalScore: 185, problemsSolved: 2, totalPenalty: 15 },
   * //   ...
   * // ]
   */
  async getLeaderboard(contestId) {
    // Check Redis cache first
    try {
      const cached = await redis.get(`leaderboard:${contestId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache read failed:', error.message);
      // Continue to database query (cache miss or Redis unavailable)
    }
    
    // Fetch ContestScores for contestId, sorted by total score
    const scores = await ContestScore.find({ contestId })
      .populate('userId', 'username')
      .sort({ totalScore: -1 }) // Highest score first
      .limit(50) // Top 50 participants
      .lean();
    
    // Format leaderboard with rank, username, and statistics
    const leaderboard = scores.map((score, index) => ({
      rank: index + 1,
      username: score.userId.username,
      userId: score.userId._id,
      totalScore: score.totalScore,
      problemsSolved: score.problemScores.filter(ps => ps.solved).length,
      totalPenalty: score.problemScores.reduce((sum, ps) => sum + ps.penalty, 0)
    }));
    
    // Cache in Redis with 10-second TTL
    try {
      await redis.setex(
        `leaderboard:${contestId}`,
        LEADERBOARD_CACHE_TTL,
        JSON.stringify(leaderboard)
      );
    } catch (error) {
      console.warn('Redis cache write failed:', error.message);
      // Non-critical: Return leaderboard even if caching fails
    }
    
    return leaderboard;
  }

  /**
   * Compute ICPC score for a set of problem scores
   * 
   * ICPC SCORING ALGORITHM:
   * - Base score: 100 points per solved problem
   * - Penalty: 20 points per wrong attempt + solve time in minutes
   * - Final score: 100 - penalty (can be negative for slow solves)
   * 
   * FORMULA:
   * For each solved problem:
   *   penalty = 20 * wrong_attempts + solve_time_minutes
   *   score = 100 - penalty
   * Total score = sum of all problem scores
   * 
   * EXAMPLES:
   * 1. Solved on first try at 10 minutes:
   *    penalty = 20 * 0 + 10 = 10
   *    score = 100 - 10 = 90 points
   * 
   * 2. Solved after 2 WA at 45 minutes:
   *    penalty = 20 * 2 + 45 = 85
   *    score = 100 - 85 = 15 points
   * 
   * 3. Solved after 5 WA at 120 minutes:
   *    penalty = 20 * 5 + 120 = 220
   *    score = 100 - 220 = -120 points (negative!)
   * 
   * 4. Three problems solved:
   *    Problem A: 90 points (0 WA, 10 min)
   *    Problem B: 15 points (2 WA, 45 min)
   *    Problem C: 50 points (1 WA, 30 min)
   *    Total: 90 + 15 + 50 = 155 points
   * 
   * WHY THIS ALGORITHM?
   * - Rewards both correctness (solving problems) and speed (fast solves)
   * - Penalizes wrong attempts (encourages careful coding)
   * - Negative scores possible (discourages brute-force submissions)
   * - Standard in competitive programming (ACM-ICPC, Codeforces)
   * 
   * @param {Object[]} problemScores - Array of problem score objects
   * @param {boolean} problemScores[].solved - Whether problem is solved
   * @param {number} problemScores[].attempts - Number of wrong attempts
   * @param {number} problemScores[].firstAcTime - Solve time in minutes from contest start
   * @returns {number} Total ICPC score (can be negative)
   * 
   * @example
   * const problemScores = [
   *   { solved: true, attempts: 0, firstAcTime: 10 },  // 90 points
   *   { solved: true, attempts: 2, firstAcTime: 45 },  // 15 points
   *   { solved: false, attempts: 3, firstAcTime: null } // 0 points
   * ];
   * const totalScore = computeIcpcScore(problemScores);
   * // Returns: 105 (90 + 15 + 0)
   */
  computeIcpcScore(problemScores) {
    return problemScores.reduce((total, ps) => {
      // Skip unsolved problems (contribute 0 points)
      if (!ps.solved) return total;
      
      // Calculate penalty: 20 points per wrong attempt + solve time in minutes
      const penalty = 20 * ps.attempts + (ps.firstAcTime || 0);
      
      // Calculate score: 100 - penalty (can be negative)
      return total + 100 - penalty;
    }, 0);
  }
}

module.exports = new ContestService();
