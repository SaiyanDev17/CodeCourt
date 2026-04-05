/**
 * Contest Controller
 * 
 * VISION:
 * Handle HTTP request/response logic for contest management endpoints, providing a clean
 * REST API interface for contest creation, registration, leaderboard access, and contest
 * lifecycle management.
 * 
 * WHY THIS EXISTS:
 * - Separation of Concerns: Controller handles HTTP, service handles business logic
 * - HTTP-Specific Logic: Status codes, response formatting, error delegation
 * - Access Control: Role-based restrictions enforced via middleware
 * - API Layer: Provides RESTful interface for competitive programming contests
 * 
 * WHAT IT DOES:
 * - createContest(): POST /api/contests (admin/problem_setter only)
 * - listContests(): GET /api/contests (public)
 * - getContest(): GET /api/contests/:id (public)
 * - registerForContest(): POST /api/contests/:id/register (authenticated users)
 * - getLeaderboard(): GET /api/contests/:id/leaderboard (public, cached)
 * 
 * DESIGN DECISIONS:
 * 1. Role-Based Contest Creation:
 *    - Only admin and problem_setter roles can create contests
 *    - Prevents spam and ensures quality control
 *    - Enforced via roleGuard middleware in routes
 * 
 * 2. Public Contest Listing:
 *    - Anyone can view contests and leaderboards
 *    - Encourages participation and transparency
 *    - No authentication required for GET endpoints
 * 
 * 3. HTTP Status Codes:
 *    - 200 OK: Successful GET/POST operations
 *    - 201 Created: Successful contest creation
 *    - 400 Bad Request: Invalid contest data (validation errors)
 *    - 403 Forbidden: Insufficient permissions
 *    - 404 Not Found: Contest not found
 *    - 409 Conflict: Already registered for contest
 * 
 * 4. Leaderboard Response Format:
 *    - Returns contestId + leaderboard array
 *    - Leaderboard cached in Redis (10s TTL)
 *    - Each entry: { rank, userId, username, totalScore, problemScores, solvedCount }
 *    - Sorted by totalScore descending
 * 
 * USAGE:
 * See routes.js for endpoint definitions and middleware composition
 */

const contestService = require('./service');

class ContestController {
  /**
   * Create a new contest
   * POST /api/contests
   * 
   * Requires: Authentication + admin or problem_setter role
   * 
   * Creates a contest with validation (minimum 30-minute duration enforced in service).
   * Contest starts in 'upcoming' status and transitions to 'ongoing' and 'ended'
   * via cron job (see backend/src/cron/contest.cron.js).
   * 
   * Role-based access control:
   * - Only admin and problem_setter roles can create contests
   * - Prevents spam and ensures quality control
   * - Regular users cannot create contests (403 Forbidden)
   * 
   * Request body:
   * - title: Contest name (3-200 characters)
   * - startTime: ISO 8601 date string (e.g., "2024-01-15T10:00:00Z")
   * - endTime: ISO 8601 date string (must be after startTime)
   * - problemIds: Array of problem IDs (at least 1)
   * 
   * Response (201 Created):
   * {
   *   message: "Contest created successfully",
   *   contest: { _id, title, startTime, endTime, status, problems, createdBy, ... }
   * }
   */
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

  /**
   * List all contests
   * GET /api/contests
   * 
   * Public endpoint (no authentication required)
   * 
   * Returns all contests regardless of status (upcoming, ongoing, ended).
   * Clients can filter by status on the frontend if needed.
   * 
   * Response (200 OK):
   * {
   *   count: 3,
   *   contests: [
   *     { _id, title, startTime, endTime, status, problems, participantCount, ... },
   *     ...
   *   ]
   * }
   */
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

  /**
   * Get contest details by ID
   * GET /api/contests/:id
   * 
   * Public endpoint (no authentication required)
   * 
   * Returns full contest details including problem list and participant count.
   * Useful for displaying contest information before registration.
   * 
   * Response (200 OK):
   * {
   *   contest: {
   *     _id, title, startTime, endTime, status,
   *     problems: [{ _id, title, slug, difficulty, ... }],
   *     participants: [userId1, userId2, ...],
   *     createdBy: { _id, username },
   *     ...
   *   }
   * }
   * 
   * Response (404 Not Found):
   * { error: "Contest not found" }
   */
  async getContest(req, res, next) {
    try {
      const { id } = req.params;
      
      const contest = await contestService.getContestById(id);
      
      res.json({ contest });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register for a contest
   * POST /api/contests/:id/register
   * 
   * Requires: Authentication (any authenticated user can register)
   * 
   * Registers the authenticated user for the specified contest.
   * Creates a ContestScore document to track the user's performance.
   * 
   * Duplicate registration handling:
   * - Returns 409 Conflict if user is already registered
   * - Prevents duplicate ContestScore documents
   * 
   * Response (200 OK):
   * {
   *   message: "Successfully registered for contest",
   *   contestId: "507f1f77bcf86cd799439011"
   * }
   * 
   * Response (409 Conflict):
   * { error: "Already registered for this contest" }
   */
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

  /**
   * Get contest leaderboard
   * GET /api/contests/:id/leaderboard
   * 
   * Public endpoint (no authentication required)
   * 
   * Returns the contest leaderboard with ICPC-style scoring.
   * Leaderboard is cached in Redis with 10-second TTL for performance.
   * 
   * Leaderboard response format:
   * {
   *   contestId: "507f1f77bcf86cd799439011",
   *   leaderboard: [
   *     {
   *       rank: 1,
   *       userId: "507f1f77bcf86cd799439012",
   *       username: "alice",
   *       totalScore: 280,
   *       solvedCount: 3,
   *       problemScores: [
   *         {
   *           problemId: "507f1f77bcf86cd799439013",
   *           score: 95,
   *           attempts: 1,
   *           solvedAt: "2024-01-15T10:45:00Z",
   *           penalty: 5
   *         },
   *         ...
   *       ]
   *     },
   *     ...
   *   ]
   * }
   * 
   * Scoring algorithm (ICPC-style):
   * - Base score: 100 points per problem
   * - Penalty: 20 points per wrong attempt + solve time in minutes
   * - Final score: 100 - penalty (can be negative for slow solves)
   * - Total score: Sum of all problem scores
   * - Sorted by totalScore descending
   * 
   * Caching strategy:
   * - Redis cache with 10-second TTL
   * - Cache invalidated on every submission
   * - Fallback to database if Redis unavailable
   */
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
