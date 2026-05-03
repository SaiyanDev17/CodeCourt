/**
 * Submissions Routes
 * 
 * VISION:
 * Provide RESTful API endpoints for code submission and verdict retrieval.
 * Enable users to submit solutions to problems and track their execution results
 * in real-time through an asynchronous judge queue system.
 * 
 * WHY THIS EXISTS:
 * - Users need to submit code solutions to problems and receive verdicts (AC, WA, TLE, etc.)
 * - The judge system is asynchronous (BullMQ queue), so submissions return 202 Accepted immediately
 * - Users need to query submission status and view their submission history per problem
 * - Ownership validation ensures users can only view their own submissions (privacy)
 * 
 * WHAT IT DOES:
 * This module defines three submission-related routes:
 * 1. POST /api/submissions - Submit code for a problem (enqueues judge job)
 * 2. GET /api/submissions/:id - Get submission details and verdict (owner only)
 * 3. GET /api/submissions/problem/:problemId - List user's submissions for a specific problem
 * 
 * All routes require authentication (authGuard middleware).
 * 
 * DESIGN DECISIONS:
 * - **Async Processing**: POST returns 202 Accepted immediately, verdict arrives later via Socket.io
 *   - Alternative: Synchronous judging would block the request for 1-5 seconds (poor UX)
 *   - Trade-off: Requires WebSocket connection for real-time updates
 * 
 * - **Ownership Validation**: Users can only view their own submissions
 *   - Prevents cheating (viewing others' solutions during contests)
 *   - Controller enforces req.user.id === submission.userId check
 * 
 * - **No Pagination**: GET /problem/:problemId returns all submissions (acceptable for MVP)
 *   - Future: Add pagination when users have 100+ submissions per problem
 * 
 * - **Validation Schema**: createSubmission schema validates:
 *   - problemId (MongoDB ObjectId)
 *   - language (enum: 'cpp', 'python')
 *   - code (string, max 50KB)
 * 
 * USAGE:
 * ```javascript
 * // Mount in app.js
 * app.use('/api/submissions', submissionsRoutes);
 * 
 * // Client submits code
 * POST /api/submissions
 * Headers: { Authorization: 'Bearer <token>' }
 * Body: {
 *   problemId: '507f1f77bcf86cd799439011',
 *   language: 'cpp',
 *   code: '#include <iostream>\nint main() { ... }'
 * }
 * Response: 202 Accepted { submissionId: '...' }
 * 
 * // Client polls for verdict (or uses Socket.io)
 * GET /api/submissions/507f1f77bcf86cd799439012
 * Response: 200 OK {
 *   _id: '...',
 *   verdict: 'AC',
 *   executionTime: 123,
 *   memoryUsed: 2048,
 *   ...
 * }
 * 
 * // Client views submission history
 * GET /api/submissions/problem/507f1f77bcf86cd799439011
 * Response: 200 OK [{ verdict: 'WA', ... }, { verdict: 'AC', ... }]
 * ```
 * 
 * RELATED MODULES:
 * - Controller: backend/src/modules/submissions/controller.js (handles business logic)
 * - Service: backend/src/modules/submissions/service.js (database + queue operations)
 * - Queue: backend/src/jobs/submission.queue.js (BullMQ job enqueuing)
 * - Worker: backend/src/jobs/submission.worker.js (judge execution)
 * - Socket: backend/src/socket/verdict.socket.js (real-time verdict updates)
 */

const express = require('express');
const router = express.Router();
const submissionsController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { validate, schemas } = require('../../middleware/validate');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Joi Validation Schema: createSubmission
 * 
 * This route file uses the `schemas.createSubmission` Joi schema to validate
 * code submission requests. The schema is defined in backend/src/middleware/validate.js
 * and enforces strict validation rules to ensure data integrity and security.
 * 
 * SCHEMA DEFINITION:
 * ```javascript
 * createSubmission: Joi.object({
 *   problemId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
 *   contestId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
 *   language: Joi.string().valid('cpp', 'python').required(),
 *   code: Joi.string().min(1).max(50000).required()
 * })
 * ```
 * 
 * FIELD-BY-FIELD EXPLANATION:
 * 
 * 1. problemId (required)
 *    - Type: String matching MongoDB ObjectId pattern (24 hexadecimal characters)
 *    - Pattern: /^[0-9a-fA-F]{24}$/
 *    - Purpose: References the problem being solved
 *    - Why: Ensures the problemId is a valid MongoDB ObjectId format
 *    - Example: "507f1f77bcf86cd799439011"
 *    - Validation prevents: Invalid ObjectId formats, SQL injection attempts
 * 
 * 2. contestId (optional)
 *    - Type: String matching MongoDB ObjectId pattern (24 hexadecimal characters)
 *    - Pattern: /^[0-9a-fA-F]{24}$/
 *    - Purpose: Links submission to a contest (if submitted during a contest)
 *    - Why: Allows tracking contest submissions separately from practice submissions
 *    - Example: "507f1f77bcf86cd799439012"
 *    - Optional: Users can submit to problems outside of contests
 * 
 * 3. language (required)
 *    - Type: String enum
 *    - Valid values: 'cpp', 'python'
 *    - Purpose: Specifies which programming language the code is written in
 *    - Why: Determines which Docker judge image to use (cpp-judge or python-judge)
 *    - Example: "cpp"
 *    - Validation prevents: Unsupported languages, arbitrary code execution
 *    - Future: Can be extended to support more languages (java, javascript, etc.)
 * 
 * 4. code (required)
 *    - Type: String
 *    - Constraints: min(1), max(50000)
 *    - Purpose: The actual source code to be judged
 *    - Why min(1): Prevents empty submissions
 *    - Why max(50000): Prevents DoS attacks from huge submissions (50KB limit)
 *    - Example: "#include <iostream>\nint main() { std::cout << \"Hello\"; }"
 *    - Validation prevents: Empty submissions, excessively large payloads
 * 
 * VALIDATION BEHAVIOR:
 * - The validate() middleware runs BEFORE the controller
 * - If validation fails, returns 422 Unprocessable Entity with detailed errors
 * - If validation passes, req.body is replaced with sanitized/validated data
 * - Unknown fields are stripped (security: prevents mass assignment attacks)
 * - All validation errors are returned at once (abortEarly: false)
 * 
 * ERROR RESPONSE EXAMPLE (422):
 * ```json
 * {
 *   "error": "Validation Error",
 *   "details": [
 *     { "field": "problemId", "message": "\"problemId\" with value \"invalid\" fails to match the required pattern" },
 *     { "field": "language", "message": "\"language\" must be one of [cpp, python]" },
 *     { "field": "code", "message": "\"code\" length must be at least 1 characters long" }
 *   ]
 * }
 * ```
 * 
 * SECURITY CONSIDERATIONS:
 * - ObjectId pattern validation prevents NoSQL injection attacks
 * - Language enum validation prevents arbitrary code execution
 * - Code length limit (50KB) prevents DoS attacks from huge payloads
 * - stripUnknown: true prevents mass assignment (e.g., user setting verdict: 'AC')
 * - Type coercion is disabled (strict validation)
 * 
 * WHY JOI VALIDATION:
 * - Declarative schema definition (self-documenting)
 * - Centralized validation logic (DRY principle)
 * - Detailed error messages (better developer experience)
 * - Industry-standard library (battle-tested)
 * - Prevents invalid data from reaching the database
 * - First line of defense against malicious input
 * 
 * VALIDATION FLOW:
 * 1. Client sends POST /api/submissions with JSON body
 * 2. Express body parser parses JSON into req.body
 * 3. authGuard middleware validates JWT token
 * 4. validate(schemas.createSubmission) middleware validates req.body
 * 5. If validation fails, return 422 with errors (flow stops here)
 * 6. If validation passes, req.body is sanitized and passed to controller
 * 7. Controller creates submission record and enqueues judge job
 * 
 * RELATED FILES:
 * - Schema definition: backend/src/middleware/validate.js (exports.schemas.createSubmission)
 * - Validation middleware: backend/src/middleware/validate.js (exports.validate)
 * - Controller: backend/src/modules/submissions/controller.js (uses validated req.body)
 */

/**
 * POST /api/submissions
 * 
 * Submit code for a problem and enqueue it for asynchronous judging.
 * 
 * AUTHENTICATION: Required (authGuard)
 * - User must be logged in (any role: user, admin, problem_setter)
 * - JWT token must be valid and not blacklisted
 * - req.user is populated with { id, username, email, role }
 * 
 * VALIDATION: createSubmission schema
 * - problemId: MongoDB ObjectId (must reference existing published problem)
 * - language: enum ['cpp', 'python']
 * - code: string (max 50KB to prevent abuse)
 * 
 * REQUEST BODY:
 * {
 *   problemId: '507f1f77bcf86cd799439011',
 *   language: 'cpp',
 *   code: '#include <iostream>\nint main() { std::cout << "Hello"; }'
 * }
 * 
 * RESPONSE: 202 Accepted
 * {
 *   submissionId: '507f1f77bcf86cd799439012',
 *   status: 'PENDING',
 *   message: 'Submission queued for judging'
 * }
 * 
 * FLOW:
 * 1. authGuard validates JWT and attaches req.user
 * 2. validate() checks request body against createSubmission schema
 * 3. Controller creates submission record with status='PENDING'
 * 4. Controller enqueues job to BullMQ submission queue
 * 5. Returns 202 Accepted immediately (async processing)
 * 6. Worker picks up job, spawns Docker judge, updates verdict
 * 7. Socket.io emits verdict to user:{userId} room
 * 
 * ERROR RESPONSES:
 * - 401 Unauthorized: Missing/invalid JWT token
 * - 400 Bad Request: Invalid problemId, language, or code
 * - 404 Not Found: Problem doesn't exist or not published
 * - 500 Internal Server Error: Database or queue failure
 */
router.post(
  '/',
  authGuard,
  validate(schemas.createSubmission),
  submissionsController.submit
);

/**
 * GET /api/submissions/:id
 * 
 * Retrieve submission details including verdict, execution time, and memory usage.
 * 
 * AUTHENTICATION: Required (authGuard)
 * - User must be logged in
 * - Ownership validation: User can ONLY view their own submissions
 * - Controller checks: submission.userId.toString() === req.user.id
 * 
 * AUTHORIZATION: Owner only
 * - Prevents users from viewing others' solutions (anti-cheating)
 * - Admins do NOT have special access (fairness in contests)
 * 
 * URL PARAMETERS:
 * - id: MongoDB ObjectId of the submission
 * 
 * RESPONSE: 200 OK
 * {
 *   _id: '507f1f77bcf86cd799439012',
 *   userId: '507f1f77bcf86cd799439010',
 *   problemId: '507f1f77bcf86cd799439011',
 *   language: 'cpp',
 *   code: '#include <iostream>...',
 *   verdict: 'AC',  // or 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING'
 *   executionTime: 123,  // milliseconds
 *   memoryUsed: 2048,    // KB
 *   testCasesPassed: 10,
 *   totalTestCases: 10,
 *   errorMessage: null,
 *   createdAt: '2024-01-15T10:30:00Z'
 * }
 * 
 * USE CASES:
 * - User polls this endpoint after submission to check verdict
 * - User views submission history and clicks to see details
 * - Real-time updates via Socket.io (preferred over polling)
 * 
 * ERROR RESPONSES:
 * - 401 Unauthorized: Missing/invalid JWT token
 * - 403 Forbidden: Submission belongs to another user
 * - 404 Not Found: Submission doesn't exist
 * - 500 Internal Server Error: Database failure
 */
/**
 * GET /api/submissions/problem/:problemId
 * 
 * List all submissions by the authenticated user for a specific problem.
 * Useful for viewing submission history and tracking progress.
 * 
 * AUTHENTICATION: Required (authGuard)
 * - User must be logged in
 * - Returns ONLY the authenticated user's submissions (filtered by userId)
 * 
 * AUTHORIZATION: Self only
 * - Users can only see their own submissions for the problem
 * - Service filters: { userId: req.user.id, problemId }
 * 
 * URL PARAMETERS:
 * - problemId: MongoDB ObjectId of the problem
 * 
 * QUERY PARAMETERS: None (no pagination in MVP)
 * - Future: Add ?page=1&limit=20 for pagination
 * 
 * RESPONSE: 200 OK (array sorted by createdAt descending)
 * [
 *   {
 *     _id: '507f1f77bcf86cd799439013',
 *     verdict: 'WA',
 *     executionTime: 95,
 *     memoryUsed: 1024,
 *     createdAt: '2024-01-15T10:35:00Z'
 *   },
 *   {
 *     _id: '507f1f77bcf86cd799439012',
 *     verdict: 'AC',
 *     executionTime: 123,
 *     memoryUsed: 2048,
 *     createdAt: '2024-01-15T10:30:00Z'
 *   }
 * ]
 * 
 * USE CASES:
 * - User views submission history on problem detail page
 * - User tracks progress (how many attempts before AC)
 * - User compares execution times across submissions
 * 
 * DESIGN NOTE:
 * - No pagination in MVP (acceptable for <100 submissions per problem)
 * - Code is NOT included in list response (only in detail view)
 * - Sorted by createdAt descending (most recent first)
 * - IMPORTANT: This route is declared BEFORE /:id to prevent Express
 *   from matching "problem" as an :id parameter
 * 
 * ERROR RESPONSES:
 * - 401 Unauthorized: Missing/invalid JWT token
 * - 400 Bad Request: Invalid problemId format
 * - 404 Not Found: Problem doesn't exist
 * - 500 Internal Server Error: Database failure
 */
router.get(
  '/problem/:problemId',
  authGuard,
  submissionsController.getSubmissionsByProblem
);

/**
 * GET /api/submissions
 * 
 * Get all submissions by the authenticated user across all problems.
 * Returns submissions with problem details (title, slug) for the "All Submissions" page.
 * 
 * AUTHENTICATION: Required (authGuard)
 * AUTHORIZATION: Self only (returns only authenticated user's submissions)
 * 
 * RESPONSE FORMAT:
 * {
 *   count: number,
 *   submissions: SubmissionWithProblem[]
 * }
 * 
 * Each submission includes:
 * - Submission fields: _id, verdict, executionTime, memoryUsed, language, createdAt
 * - Problem fields: problemId, problemTitle, problemSlug
 * - Code field is EXCLUDED (security - only show code in detail view)
 * 
 * SORTING: Newest first (createdAt descending)
 * 
 * USE CASES:
 * - All Submissions page at /submissions route
 * - User's complete submission history across all problems
 * - Filtering by verdict (frontend can filter the results)
 * 
 * NOTE: This route is declared BEFORE /:id to prevent Express from matching
 * the root path as an :id parameter.
 * 
 * ERROR RESPONSES:
 * - 401 Unauthorized: Missing/invalid JWT token
 * - 500 Internal Server Error: Database failure
 */
router.get(
  '/',
  authGuard,
  submissionsController.getAllSubmissions
);

/**
 * GET /api/submissions/:id
 * 
 * Get a single submission by its MongoDB ObjectId.
 * Returns full submission details including source code, verdict, and execution metrics.
 * 
 * AUTHENTICATION: Required (authGuard)
 * AUTHORIZATION: Owner only (service layer validates submission.userId === req.user.id)
 * 
 * NOTE: This catch-all parameter route is declared AFTER /problem/:problemId and /
 * to prevent it from intercepting more specific paths.
 * 
 * ERROR RESPONSES:
 * - 401 Unauthorized: Missing/invalid JWT token
 * - 403 Forbidden: Submission belongs to another user
 * - 404 Not Found: Submission doesn't exist
 * - 500 Internal Server Error: Database failure
 */
router.get(
  '/:id',
  authGuard,
  submissionsController.getSubmission
);

module.exports = router;
