/**
 * Submissions Controller
 * 
 * VISION:
 * Provide HTTP endpoints for code submission and result retrieval in the CodeCourt
 * competitive programming platform. This controller handles the request/response cycle
 * for all submission-related operations, enabling users to submit code for judging and
 * track their submission history.
 * 
 * WHY THIS EXISTS:
 * In a competitive programming platform, users need to:
 * 1. Submit code solutions to problems for automated judging
 * 2. Check the status and results of their submissions (verdict, execution time, memory)
 * 3. View their submission history for specific problems
 * 
 * This controller acts as the HTTP interface layer, validating requests, delegating
 * business logic to the service layer, and formatting responses for the frontend.
 * 
 * WHAT IT DOES:
 * 1. **submit()**: Accepts code submissions and queues them for asynchronous judging
 *    - Returns 202 Accepted (async processing pattern)
 *    - Enqueues submission to BullMQ for background judging
 * 
 * 2. **getSubmission()**: Retrieves a single submission by ID
 *    - Enforces ownership validation (users can only view their own submissions)
 *    - Returns submission details including verdict, execution metrics, and code
 * 
 * 3. **getSubmissionsByProblem()**: Lists all submissions for a specific problem
 *    - Filtered by authenticated user (users see only their own submissions)
 *    - Useful for tracking progress and debugging failed attempts
 * 
 * DESIGN DECISIONS:
 * 
 * 1. **202 Accepted for Submissions**:
 *    - Submissions return 202 (not 201 Created) because judging is asynchronous
 *    - The submission is created but not yet processed
 *    - Frontend uses Socket.io to receive real-time verdict updates
 * 
 * 2. **Ownership Validation**:
 *    - Users can only view their own submissions (privacy and security)
 *    - Admins could view all submissions (future enhancement)
 *    - Prevents users from viewing others' code solutions
 * 
 * 3. **Thin Controller Pattern**:
 *    - Controllers only handle HTTP concerns (req/res, status codes)
 *    - All business logic delegated to service layer
 *    - Makes testing easier (service layer can be unit tested independently)
 * 
 * 4. **Error Handling**:
 *    - All errors passed to Express error handler via next(error)
 *    - Centralized error handling in middleware/errorHandler.js
 *    - Consistent error response format across all endpoints
 * 
 * USAGE:
 * ```javascript
 * // In routes.js
 * const controller = require('./controller');
 * router.post('/submit', authGuard, validate(submitSchema), controller.submit);
 * router.get('/:id', authGuard, controller.getSubmission);
 * router.get('/problem/:problemId', authGuard, controller.getSubmissionsByProblem);
 * 
 * // Frontend usage (submit code)
 * const response = await fetch('/api/submissions/submit', {
 *   method: 'POST',
 *   headers: { 'Authorization': `Bearer ${token}` },
 *   body: JSON.stringify({
 *     problemId: '507f1f77bcf86cd799439011',
 *     code: 'print(sum(map(int, input().split())))',
 *     language: 'python',
 *     contestId: '507f1f77bcf86cd799439012' // optional
 *   })
 * });
 * // Response: { message: 'Submission queued for judging', submissionId: '...' }
 * 
 * // Frontend usage (check submission status)
 * const response = await fetch(`/api/submissions/${submissionId}`, {
 *   headers: { 'Authorization': `Bearer ${token}` }
 * });
 * // Response: { submission: { verdict: 'AC', executionTime: 45, ... } }
 * ```
 * 
 * RELATED MODULES:
 * - service.js: Business logic for submission processing
 * - model.js: Mongoose schema for submissions
 * - routes.js: Route definitions and middleware stack
 * - jobs/submission.worker.js: Background judge worker
 * - socket/verdict.socket.js: Real-time verdict updates
 */

const submissionsService = require('./service');

class SubmissionsController {
  /**
   * Submit code for judging
   * 
   * Accepts a code submission from an authenticated user and queues it for asynchronous
   * judging by the background worker. Returns immediately with 202 Accepted status,
   * indicating the submission has been queued but not yet processed.
   * 
   * WHY 202 ACCEPTED (NOT 201 CREATED)?
   * 
   * This endpoint uses HTTP 202 Accepted instead of 201 Created because:
   * 
   * 1. **Asynchronous Processing Pattern**:
   *    - The submission is created in the database with status "PENDING"
   *    - The actual judging happens in a background worker (can take 1-10 seconds)
   *    - 202 signals "request accepted for processing, but not yet complete"
   *    - 201 would imply the resource is fully created and processed
   * 
   * 2. **Long-Running Operation**:
   *    - Code execution involves spawning Docker containers, running test cases
   *    - Cannot block HTTP request for 1-10 seconds (poor UX, timeout risks)
   *    - Background worker handles the heavy lifting asynchronously
   * 
   * 3. **Real-Time Updates via WebSocket**:
   *    - Frontend doesn't poll for results (inefficient)
   *    - Socket.io emits verdict updates when judging completes
   *    - Client subscribes to room `user:{userId}` for real-time notifications
   * 
   * 4. **Scalability**:
   *    - Decouples API server from judge execution
   *    - Multiple workers can process submissions in parallel
   *    - API server remains responsive under high load
   * 
   * ASYNC PROCESSING FLOW:
   * 
   * 1. **API Server** (this controller):
   *    - Validates request and creates submission with status "PENDING"
   *    - Enqueues job to BullMQ: { submissionId, problemId, code, language }
   *    - Returns 202 Accepted with submissionId immediately
   * 
   * 2. **BullMQ Worker** (jobs/submission.worker.js):
   *    - Picks up job from queue (concurrency: 5 simultaneous judges)
   *    - Spawns Docker container with user code and test cases
   *    - Collects verdict (AC, WA, TLE, etc.) and execution metrics
   *    - Updates submission in database with final verdict
   * 
   * 3. **Socket.io** (socket/verdict.socket.js):
   *    - Worker emits verdict event to room `user:{userId}`
   *    - Frontend receives real-time update and displays result
   *    - No polling required, instant feedback to user
   * 
   * The actual judging happens asynchronously in the BullMQ worker, which:
   * 1. Spawns a Docker container with the user's code
   * 2. Runs test cases and collects verdict (AC, WA, TLE, etc.)
   * 3. Emits real-time verdict updates via Socket.io
   * 
   * HTTP Status Codes:
   * - 202 Accepted: Submission queued successfully (async processing)
   * - 400 Bad Request: Invalid request body (validation error)
   * - 401 Unauthorized: Missing or invalid JWT token
   * - 404 Not Found: Problem or contest not found
   * - 500 Internal Server Error: Queue or database error
   * 
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.problemId - MongoDB ObjectId of the problem
   * @param {string} req.body.code - User's source code (max 65536 chars)
   * @param {string} req.body.language - Programming language ('cpp' or 'python')
   * @param {string} [req.body.contestId] - Optional contest ID (for contest submissions)
   * @param {Object} req.user - Authenticated user (attached by authGuard middleware)
   * @param {string} req.user.id - User's MongoDB ObjectId
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Promise<void>} Responds with 202 and submission details
   * 
   * @example
   * // Request body
   * {
   *   "problemId": "507f1f77bcf86cd799439011",
   *   "code": "print(sum(map(int, input().split())))",
   *   "language": "python",
   *   "contestId": "507f1f77bcf86cd799439012" // optional
   * }
   * 
   * // Response (202 Accepted)
   * {
   *   "message": "Submission queued for judging",
   *   "submissionId": "507f1f77bcf86cd799439013"
   * }
   */
  async submit(req, res, next) {
    try {
      const { problemId, code, language, contestId } = req.body;
      const userId = req.user.id;
      
      const result = await submissionsService.submit(userId, problemId, code, language, contestId);
      
      // Return 202 Accepted (not 201 Created) because judging is asynchronous
      // The submission is created but not yet processed - verdict will come via Socket.io
      // Frontend should subscribe to Socket.io room `user:{userId}` for real-time updates
      res.status(202).json({
        message: 'Submission queued for judging',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single submission by ID
   * 
   * Retrieves detailed information about a specific submission, including the verdict,
   * execution metrics (time, memory), source code, and error messages (if any).
   * 
   * Ownership Validation:
   * - Users can only view their own submissions (enforced by service layer)
   * - Attempting to access another user's submission returns 403 Forbidden
   * - This prevents users from viewing others' code solutions
   * 
   * Use Cases:
   * - Frontend displays submission details after judging completes
   * - Users review their code and debug failed test cases
   * - Contest participants check their submission status
   * 
   * HTTP Status Codes:
   * - 200 OK: Submission found and returned
   * - 401 Unauthorized: Missing or invalid JWT token
   * - 403 Forbidden: User does not own this submission
   * - 404 Not Found: Submission ID does not exist
   * - 500 Internal Server Error: Database error
   * 
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - Submission MongoDB ObjectId
   * @param {Object} req.user - Authenticated user (attached by authGuard middleware)
   * @param {string} req.user.id - User's MongoDB ObjectId
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Promise<void>} Responds with 200 and submission object
   * 
   * @example
   * // Request: GET /api/submissions/507f1f77bcf86cd799439013
   * 
   * // Response (200 OK)
   * {
   *   "submission": {
   *     "_id": "507f1f77bcf86cd799439013",
   *     "userId": "507f1f77bcf86cd799439010",
   *     "problemId": "507f1f77bcf86cd799439011",
   *     "code": "print(sum(map(int, input().split())))",
   *     "language": "python",
   *     "verdict": "AC",
   *     "executionTime": 45,
   *     "memoryUsed": 2048,
   *     "testCasesPassed": 10,
   *     "totalTestCases": 10,
   *     "createdAt": "2024-01-15T10:30:00.000Z"
   *   }
   * }
   */
  async getSubmission(req, res, next) {
    try {
      const { id } = req.params;
      
      // Extract userId from JWT token (attached by authGuard middleware)
      // This is the authenticated user making the request
      const userId = req.user.id;
      
      // ========================================================================
      // OWNERSHIP VALIDATION (enforced in service layer)
      // ========================================================================
      // 
      // The service layer validates that userId matches submission.userId
      // This prevents users from viewing other users' submissions
      // 
      // SECURITY FLOW:
      // 1. User requests: GET /api/submissions/:id
      // 2. authGuard extracts userId from JWT token → req.user.id
      // 3. Service fetches submission and checks: submission.userId === userId
      // 4. If match: Return submission (200 OK)
      // 5. If mismatch: Throw 403 Forbidden error
      // 6. If not found: Throw 404 Not Found error
      // 
      // WHY SERVICE LAYER (not controller)?
      // - Reusable: Other services can call getSubmission with ownership check
      // - Testable: Can unit test ownership logic without HTTP mocking
      // - Consistent: All access paths (API, internal) enforce same rules
      // - Separation: Controller handles HTTP, service handles business logic
      // 
      // WHAT IF USER TRIES TO ACCESS ANOTHER USER'S SUBMISSION?
      // Example: User A (id: 111) tries to access User B's submission (id: 222)
      // 
      // Request:
      //   GET /api/submissions/abc123
      //   Authorization: Bearer <User A's JWT token>
      // 
      // Flow:
      //   1. authGuard extracts userId: 111 from JWT
      //   2. Service fetches submission abc123 (belongs to User B: 222)
      //   3. Service checks: 222 !== 111 (ownership violation)
      //   4. Service throws: Error("Not authorized", statusCode: 403)
      //   5. Controller catches error and passes to errorHandler
      //   6. errorHandler returns: 403 Forbidden
      // 
      // Response:
      //   HTTP 403 Forbidden
      //   { "error": "Not authorized to view this submission" }
      // 
      // ALTERNATIVE APPROACHES CONSIDERED:
      // 
      // 1. Controller-level check:
      //    const submission = await service.getSubmission(id);
      //    if (submission.userId !== userId) throw 403;
      //    PRO: Explicit in controller, easy to see
      //    CON: Not reusable, must duplicate in every caller
      //    DECISION: Service layer is better (reusable, testable)
      // 
      // 2. Database-level filter:
      //    Submission.findOne({ _id: id, userId })
      //    PRO: Single query, no separate check
      //    CON: Returns 404 for both "not found" and "not authorized"
      //    DECISION: Explicit check gives better error messages
      // 
      // 3. Middleware-level check:
      //    router.get('/:id', authGuard, ownershipGuard, controller.getSubmission)
      //    PRO: Declarative, reusable across routes
      //    CON: Requires fetching submission twice (middleware + service)
      //    DECISION: Service layer is more efficient (single fetch)
      // 
      const submission = await submissionsService.getSubmission(id, userId);
      
      res.json({ submission });
    } catch (error) {
      // Pass errors to centralized error handler (middleware/errorHandler.js)
      // - 403 Forbidden: Ownership violation (user doesn't own submission)
      // - 404 Not Found: Submission doesn't exist
      // - 500 Internal Server Error: Database error
      next(error);
    }
  }

  /**
   * Get all submissions for a specific problem by the authenticated user
   * 
   * Retrieves a list of all submissions the authenticated user has made for a given
   * problem. This is useful for:
   * - Tracking submission history and progress
   * - Reviewing past attempts and debugging strategies
   * - Identifying patterns in failed test cases
   * 
   * Privacy & Filtering:
   * - Results are automatically filtered by userId (users see only their own submissions)
   * - Submissions are sorted by creation date (newest first)
   * - Includes all verdicts (AC, WA, TLE, etc.) for complete history
   * 
   * Use Cases:
   * - Frontend "My Submissions" page for a specific problem
   * - Contest participants reviewing their attempts during/after contest
   * - Users analyzing which test cases they're failing
   * 
   * HTTP Status Codes:
   * - 200 OK: Submissions found (may be empty array if no submissions)
   * - 401 Unauthorized: Missing or invalid JWT token
   * - 404 Not Found: Problem ID does not exist
   * - 500 Internal Server Error: Database error
   * 
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.problemId - Problem MongoDB ObjectId
   * @param {Object} req.user - Authenticated user (attached by authGuard middleware)
   * @param {string} req.user.id - User's MongoDB ObjectId
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Promise<void>} Responds with 200 and array of submissions
   * 
   * @example
   * // Request: GET /api/submissions/problem/507f1f77bcf86cd799439011
   * 
   * // Response (200 OK)
   * {
   *   "count": 3,
   *   "submissions": [
   *     {
   *       "_id": "507f1f77bcf86cd799439015",
   *       "verdict": "AC",
   *       "executionTime": 45,
   *       "createdAt": "2024-01-15T10:35:00.000Z"
   *     },
   *     {
   *       "_id": "507f1f77bcf86cd799439014",
   *       "verdict": "WA",
   *       "testCasesPassed": 8,
   *       "totalTestCases": 10,
   *       "createdAt": "2024-01-15T10:30:00.000Z"
   *     },
   *     {
   *       "_id": "507f1f77bcf86cd799439013",
   *       "verdict": "TLE",
   *       "executionTime": 2000,
   *       "createdAt": "2024-01-15T10:25:00.000Z"
   *     }
   *   ]
   * }
   */
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
