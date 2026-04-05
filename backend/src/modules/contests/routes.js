/**
 * Contest Routes
 * 
 * VISION:
 * Define RESTful API endpoints for contest management with proper authentication,
 * authorization, and validation. Provides a complete API for competitive programming
 * contests including creation, registration, and leaderboard access.
 * 
 * WHY THIS EXISTS:
 * - Route Definition: Maps HTTP methods and paths to controller handlers
 * - Middleware Composition: Applies auth, role guards, and validation
 * - Access Control: Different endpoints require different roles
 * - API Documentation: Serves as a reference for available contest endpoints
 * 
 * WHAT IT DOES:
 * - GET /api/contests: List all contests (public)
 * - GET /api/contests/:id: Get contest details (public)
 * - POST /api/contests: Create contest (admin/problem_setter only)
 * - POST /api/contests/:id/register: Register for contest (authenticated users)
 * - GET /api/contests/:id/leaderboard: Get leaderboard (public, cached)
 * 
 * DESIGN DECISIONS:
 * 1. Public vs Protected Endpoints:
 *    - GET / and GET /:id are public (no authGuard)
 *    - GET /:id/leaderboard is public (encourages transparency)
 *    - POST / requires admin or problem_setter role
 *    - POST /:id/register requires authentication only
 *    - Why? Users can browse contests and leaderboards without logging in
 * 
 * 2. Role-Based Access Control:
 *    - Create: admin or problem_setter only
 *    - Register: any authenticated user
 *    - View: public (no authentication required)
 *    - Rationale: Prevents spam while encouraging participation
 * 
 * 3. Validation Schemas:
 *    - createContest: Validates title, startTime, endTime, problemIds
 *    - Cross-field validation: endTime must be after startTime
 *    - Minimum duration (30 minutes) enforced in service layer
 * 
 * 4. Middleware Stack Order:
 *    - authGuard → Authenticates user (sets req.user)
 *    - roleGuard → Checks user role
 *    - validate → Validates request body
 *    - controller → Handles business logic
 * 
 * USAGE:
 * ```javascript
 * // Mount in Express app
 * const contestRoutes = require('./modules/contests/routes');
 * app.use('/api/contests', contestRoutes);
 * ```
 */

const express = require('express');
const router = express.Router();
const contestController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { roleGuard } = require('../../middleware/roleGuard');
const { validate, schemas } = require('../../middleware/validate');

/**
 * GET /api/contests
 * List all contests
 * 
 * Public endpoint (no authentication required)
 * 
 * Returns all contests regardless of status (upcoming, ongoing, ended).
 * Clients can filter by status on the frontend if needed.
 */
router.get('/', contestController.listContests);

/**
 * GET /api/contests/:id
 * Get contest details by ID
 * 
 * Public endpoint (no authentication required)
 * 
 * Returns full contest details including problem list and participant count.
 * Useful for displaying contest information before registration.
 */
router.get('/:id', contestController.getContest);

/**
 * POST /api/contests
 * Create a new contest
 * 
 * Requires: Authentication + admin or problem_setter role
 * 
 * Validation schema (schemas.createContest):
 * - title: string (3-200 characters)
 * - startTime: ISO 8601 date string
 * - endTime: ISO 8601 date string (must be after startTime)
 * - problemIds: array of MongoDB ObjectIds (at least 1)
 * 
 * Cross-field validation:
 * - endTime must be greater than startTime
 * 
 * Service-level validation:
 * - Minimum duration: 30 minutes (enforced in service layer)
 * 
 * Example request body:
 * {
 *   "title": "Weekly Contest #42",
 *   "startTime": "2024-01-15T10:00:00Z",
 *   "endTime": "2024-01-15T12:00:00Z",
 *   "problemIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 * }
 */
router.post(
  '/',
  authGuard,
  roleGuard(['admin', 'problem_setter']),
  validate(schemas.createContest),
  contestController.createContest
);

/**
 * POST /api/contests/:id/register
 * Register for a contest
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
 * No validation schema required (only :id param, no request body)
 */
router.post(
  '/:id/register',
  authGuard,
  contestController.registerForContest
);

/**
 * GET /api/contests/:id/leaderboard
 * Get contest leaderboard
 * 
 * Public endpoint (no authentication required)
 * 
 * Returns the contest leaderboard with ICPC-style scoring.
 * Leaderboard is cached in Redis with 10-second TTL for performance.
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
 * 
 * Response format:
 * {
 *   contestId: "507f1f77bcf86cd799439011",
 *   leaderboard: [
 *     {
 *       rank: 1,
 *       userId: "507f1f77bcf86cd799439012",
 *       username: "alice",
 *       totalScore: 280,
 *       solvedCount: 3,
 *       problemScores: [...]
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/:id/leaderboard', contestController.getLeaderboard);

module.exports = router;
