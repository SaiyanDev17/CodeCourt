/**
 * Submissions Service
 * 
 * VISION:
 * Provide a robust, asynchronous code submission and judging system that handles
 * competitive programming submissions with real-time verdict updates. This service
 * acts as the bridge between user code submissions and the distributed judge engine,
 * ensuring reliable queuing, execution, and result tracking.
 * 
 * WHY THIS EXISTS:
 * Code execution is inherently dangerous and resource-intensive. We need a service that:
 * 1. Safely queues submissions for asynchronous processing (avoid blocking API requests)
 * 2. Validates problem availability before accepting submissions
 * 3. Enforces ownership rules (users can only view their own submissions)
 * 4. Integrates with BullMQ for reliable background job processing
 * 5. Supports both practice mode and contest mode submissions
 * 
 * WHAT IT DOES:
 * - submit(): Validates problem, creates PENDING submission, enqueues judge job
 * - getSubmission(): Retrieves submission with ownership validation
 * - getSubmissionsByProblem(): Lists user's submissions for a specific problem
 * - updateVerdict(): Updates submission with judge results (called by worker)
 * 
 * DESIGN DECISIONS:
 * 
 * 1. **Asynchronous Processing (BullMQ)**:
 *    - Submissions return immediately with status: 'queued' (202 Accepted)
 *    - Actual judging happens in background worker (submission.worker.js)
 *    - Verdicts delivered via Socket.io real-time events
 *    - WHY: Code execution can take 1-10 seconds; blocking HTTP requests would timeout
 * 
 * 2. **PENDING Status Initialization**:
 *    - All submissions start with verdict: 'PENDING'
 *    - Worker updates to AC/WA/TLE/MLE/RE/CE after judging
 *    - WHY: Provides clear state tracking and prevents race conditions
 * 
 * 3. **Problem Validation Before Submission**:
 *    - Check problem exists and status === 'published'
 *    - Reject submissions to draft/rejected problems
 *    - WHY: Prevent submissions to incomplete problems without test cases
 * 
 * 4. **Ownership Enforcement**:
 *    - getSubmission() verifies userId matches submission.userId
 *    - Prevents users from viewing others' code
 *    - WHY: Code privacy and academic integrity (prevent plagiarism)
 * 
 * 5. **Code Exclusion in List View**:
 *    - getSubmissionsByProblem() uses .select('-code')
 *    - Only full getSubmission() returns code
 *    - WHY: Reduce payload size for list endpoints (code can be large)
 * 
 * 6. **Contest Mode Support**:
 *    - contestId is optional (null for practice mode)
 *    - Passed to worker for contest score updates
 *    - WHY: Same submission logic for practice and contests
 * 
 * USAGE:
 * ```javascript
 * const submissionsService = require('./modules/submissions/service');
 * 
 * // Submit code for judging
 * const result = await submissionsService.submit(
 *   userId,
 *   problemId,
 *   'print("Hello World")',
 *   'python',
 *   contestId // optional
 * );
 * // Returns: { submissionId: '...', status: 'queued' }
 * 
 * // Get submission with verdict (after judging completes)
 * const submission = await submissionsService.getSubmission(submissionId, userId);
 * // Returns: { verdict: 'AC', executionTime: 45, memoryUsed: 2048, ... }
 * 
 * // List user's submissions for a problem
 * const submissions = await submissionsService.getSubmissionsByProblem(userId, problemId);
 * // Returns: [{ verdict: 'WA', createdAt: '...' }, ...] (no code field)
 * 
 * // Update verdict (called by worker after judging)
 * await submissionsService.updateVerdict(
 *   submissionId,
 *   'AC',
 *   45,      // executionTime in ms
 *   2048,    // memoryUsed in KB
 *   null     // compilerError (only for CE verdict)
 * );
 * ```
 * 
 * INTEGRATION POINTS:
 * - BullMQ Queue: Enqueues submissions for background processing
 * - Submission Worker: Consumes jobs and calls updateVerdict()
 * - Socket.io: Worker emits verdict events to user's room
 * - Contest Service: Worker updates contest scores on AC verdicts
 * 
 * SECURITY CONSIDERATIONS:
 * - Ownership validation prevents code theft
 * - Problem status check prevents submissions to incomplete problems
 * - Code execution happens in isolated Docker containers (see worker)
 * - No direct code execution in this service (only queuing)
 */

const Submission = require('./model');
const Problem = require('../problems/model');
const { enqueueSubmission } = require('../../jobs/submission.queue');

class SubmissionsService {
  /**
   * Submit code for judging
   * 
   * This is the main entry point for code submissions. It validates the problem,
   * creates a PENDING submission record, and enqueues the job for asynchronous
   * processing by the judge worker.
   * 
   * FLOW:
   * 1. Validate problem exists and is published (reject draft/rejected problems)
   * 2. Create Submission document with verdict: 'PENDING'
   * 3. Enqueue job to BullMQ for background processing
   * 4. Return immediately with status: 'queued' (202 Accepted)
   * 5. Worker processes job and updates verdict via updateVerdict()
   * 6. User receives verdict via Socket.io real-time event
   * 
   * PENDING STATUS INITIALIZATION:
   * All submissions start with verdict: 'PENDING' to indicate they are awaiting
   * judgment. This provides:
   * - Clear state tracking (PENDING → AC/WA/TLE/MLE/RE/CE)
   * - Race condition prevention (worker can't update before record exists)
   * - User feedback (UI can show "Judging..." state)
   * - Audit trail (createdAt timestamp captures submission time)
   * 
   * The worker (submission.worker.js) will update the verdict after judging:
   * - AC (Accepted): All test cases passed
   * - WA (Wrong Answer): Output doesn't match expected
   * - TLE (Time Limit Exceeded): Execution took too long
   * - MLE (Memory Limit Exceeded): Used too much memory
   * - RE (Runtime Error): Program crashed
   * - CE (Compilation Error): Code failed to compile
   * 
   * PROBLEM VALIDATION:
   * We validate the problem before accepting the submission to prevent:
   * - Submissions to non-existent problems (404 error)
   * - Submissions to draft problems (no test cases uploaded yet)
   * - Submissions to rejected problems (admin rejected the problem)
   * 
   * ASYNCHRONOUS PROCESSING:
   * Code execution can take 1-10 seconds (or more for TLE). We use BullMQ
   * to process submissions asynchronously to avoid:
   * - HTTP request timeouts (most clients timeout after 30-60 seconds)
   * - API server blocking (can't handle other requests while judging)
   * - Resource exhaustion (limit concurrent judges via worker concurrency)
   * 
   * @param {string} userId - MongoDB ObjectId of the user submitting code
   * @param {string} problemId - MongoDB ObjectId of the problem being solved
   * @param {string} code - Source code to execute (any length, stored in MongoDB)
   * @param {string} language - Programming language ('python' or 'cpp')
   * @param {string|null} contestId - MongoDB ObjectId of contest (null for practice mode)
   * 
   * @returns {Promise<{submissionId: string, status: string}>}
   *   - submissionId: MongoDB ObjectId of created submission (use to poll/subscribe)
   *   - status: Always 'queued' (indicates job was enqueued successfully)
   * 
   * @throws {Error} 404 - Problem not found
   * @throws {Error} 400 - Problem is not published (status !== 'published')
   * 
   * @example
   * // Practice mode submission
   * const result = await submissionsService.submit(
   *   '507f1f77bcf86cd799439011',  // userId
   *   '507f1f77bcf86cd799439012',  // problemId
   *   'print("Hello World")',      // code
   *   'python',                    // language
   *   null                         // contestId (practice mode)
   * );
   * // Returns: { submissionId: '507f...', status: 'queued' }
   * 
   * @example
   * // Contest mode submission
   * const result = await submissionsService.submit(
   *   userId,
   *   problemId,
   *   'def solve(): return 42',
   *   'python',
   *   '507f1f77bcf86cd799439013'  // contestId
   * );
   * // Worker will update contest scores on AC verdict
   */
  async submit(userId, problemId, code, language, contestId = null) {
    // Validate problem exists and is published
    // We check this BEFORE creating the submission to fail fast
    const problem = await Problem.findById(problemId);
    
    if (!problem) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Only published problems can receive submissions
    // Draft problems may not have test cases uploaded yet
    // Rejected problems are not suitable for judging
    if (problem.status !== 'published') {
      const error = new Error('Problem is not published');
      error.statusCode = 400;
      throw error;
    }
    
    // Create Submission document with verdict: 'PENDING'
    // This is the initial state before judging begins
    // The worker will update this to AC/WA/TLE/MLE/RE/CE after judging
    const submission = await Submission.create({
      userId,
      problemId,
      code,
      language,
      contestId,
      verdict: 'PENDING'  // Initial state: awaiting judgment
    });
    
    // ============================================================================
    // BULLMQ QUEUE INTEGRATION
    // ============================================================================
    // 
    // Enqueue job to BullMQ Queue for background processing
    // 
    // WHAT IS BULLMQ?
    // BullMQ is a Redis-backed job queue for Node.js that provides:
    // - Reliable job persistence (jobs survive server restarts)
    // - Automatic retries on failure (configurable attempts and backoff)
    // - Concurrency control (limit simultaneous judges to prevent resource exhaustion)
    // - Job prioritization (future: prioritize contest submissions)
    // - Progress tracking (monitor job state: waiting → active → completed/failed)
    // 
    // QUEUE ARCHITECTURE:
    // 1. Producer (this service): Adds jobs to 'submissions' queue via enqueueSubmission()
    // 2. Redis: Stores job data and state (acts as message broker)
    // 3. Consumer (submission.worker.js): Processes jobs with concurrency limit (5 simultaneous)
    // 
    // WHY BULLMQ INSTEAD OF DIRECT EXECUTION?
    // - Decoupling: API server doesn't block waiting for judge results
    // - Scalability: Can run multiple worker instances across servers
    // - Reliability: Jobs are retried on failure (network issues, Docker crashes)
    // - Resource Control: Limit concurrent judges to prevent CPU/memory exhaustion
    // - Observability: Track job state, progress, and failures in Redis
    // 
    // JOB DATA STRUCTURE:
    // The job payload contains everything the worker needs to judge the submission:
    // - submissionId: Used as jobId for idempotency (resubmit = update existing job)
    // - code: Source code to execute (passed to Docker container)
    // - language: Determines which Docker image to use (python:3.9-slim or gcc:11)
    // - problemId: Used to fetch test cases from S3 (hiddenTestCasesS3Key)
    // - userId: Used to emit Socket.io verdict event to user's room
    // - contestId: Used to update contest scores on AC verdict (null for practice mode)
    // 
    // JOB OPTIONS (configured in config/bullmq.js):
    // - jobId: submissionId (ensures idempotency - resubmit updates existing job)
    // - attempts: 3 (retry up to 3 times on failure)
    // - backoff: exponential (1s, 2s, 4s delays between retries)
    // - removeOnComplete: 100 (keep last 100 completed jobs for debugging)
    // - removeOnFail: 500 (keep last 500 failed jobs for analysis)
    // 
    // WORKER PROCESSING FLOW (submission.worker.js):
    // 1. Fetch problem test cases from S3 (hiddenTestCasesS3Key)
    // 2. Spawn Docker container with user code and test cases
    // 3. Run code against each test case with time/memory limits
    // 4. Collect verdict (AC/WA/TLE/MLE/RE/CE) and execution metrics
    // 5. Update submission via updateVerdict() (this service)
    // 6. Emit Socket.io 'verdict' event to room: `user:${userId}`
    // 7. Update contest scores if contestId provided (computeICPCScore)
    // 
    // ERROR HANDLING:
    // - Network failures: BullMQ retries automatically (up to 3 attempts)
    // - Docker crashes: Worker catches errors and sets verdict to 'RE' (Runtime Error)
    // - Redis unavailable: enqueueSubmission() throws error, API returns 500
    // - Worker crashes: Job remains in 'active' state, BullMQ marks as 'stalled' after timeout
    // 
    // MONITORING:
    // - Job state: waiting → active → completed (or failed)
    // - Progress: Worker can report progress (e.g., "3/10 test cases passed")
    // - Logs: Worker logs are captured in Docker container logs
    // - Metrics: Track queue length, processing time, failure rate (future: Prometheus)
    // 
    // IDEMPOTENCY:
    // Using submissionId as jobId ensures that resubmitting the same submission
    // updates the existing job instead of creating a duplicate. This prevents:
    // - Duplicate judging (wasted resources)
    // - Race conditions (two workers judging same submission)
    // - Inconsistent verdicts (last worker wins)
    // 
    // EXAMPLE FLOW:
    // 1. User submits code → API creates Submission with verdict: 'PENDING'
    // 2. API calls enqueueSubmission() → Job added to Redis queue
    // 3. API returns 202 Accepted with submissionId and status: 'queued'
    // 4. Worker picks up job → Spawns Docker container → Runs test cases
    // 5. Worker calls updateVerdict() → Updates Submission to verdict: 'AC'
    // 6. Worker emits Socket.io event → User's browser receives verdict
    // 7. User sees "Accepted" in UI with execution time and memory usage
    // 
    await enqueueSubmission({
      submissionId: submission._id.toString(),  // Used as jobId for idempotency
      code,                                      // Source code to execute in Docker
      language,                                  // 'python' or 'cpp' (determines Docker image)
      problemId: problemId.toString(),           // Used to fetch test cases from S3
      userId: userId.toString(),                 // Used to emit Socket.io verdict event
      contestId: contestId ? contestId.toString() : null  // Used to update contest scores (null = practice mode)
    });
    
    // Return immediately with status: 'queued'
    // Client should:
    // 1. Subscribe to Socket.io room: `user:${userId}`
    // 2. Listen for 'verdict' event with submissionId
    // 3. Update UI when verdict arrives
    return {
      submissionId: submission._id.toString(),
      status: 'queued'  // Indicates job was enqueued successfully
    };
  }

  /**
   * Get submission by ID with ownership validation
   * 
   * This method retrieves a single submission and enforces strict ownership rules
   * to protect code privacy and prevent plagiarism. Users can ONLY view their own
   * submissions - attempting to access another user's submission returns 403 Forbidden.
   * 
   * OWNERSHIP VALIDATION:
   * The ownership check (submission.userId === userId) is critical for:
   * 
   * 1. **Code Privacy**: Prevents users from viewing others' source code
   *    - Competitive programming code is intellectual property
   *    - Users may not want their solutions publicly visible
   *    - Protects against code theft and unauthorized copying
   * 
   * 2. **Academic Integrity**: Prevents plagiarism in contests
   *    - Users cannot copy solutions from other participants
   *    - Maintains fairness in competitive environments
   *    - Prevents cheating by viewing others' accepted solutions
   * 
   * 3. **Security**: Prevents information disclosure attacks
   *    - Attackers cannot enumerate submissions to find vulnerabilities
   *    - Prevents reconnaissance of other users' coding patterns
   *    - Limits attack surface for code injection attempts
   * 
   * WHEN TO USE:
   * - Viewing submission details (code, verdict, execution metrics)
   * - Downloading submission for local testing
   * - Resubmitting modified code based on previous submission
   * 
   * WHEN NOT TO USE:
   * - Admin viewing all submissions (use separate admin endpoint)
   * - Public leaderboard (use getSubmissionsByProblem with code excluded)
   * - Contest scoreboard (use contest service, not this method)
   * 
   * POPULATE BEHAVIOR:
   * We populate 'problemId' with 'title' and 'slug' to provide context:
   * - title: Display problem name in UI ("Two Sum", "Binary Search")
   * - slug: Generate problem URL (/problems/two-sum)
   * - WHY: Avoids additional API call to fetch problem details
   * 
   * LEAN() OPTIMIZATION:
   * We use .lean() to return plain JavaScript object instead of Mongoose document:
   * - Faster: No Mongoose overhead (getters, setters, virtuals)
   * - Smaller: No Mongoose metadata attached
   * - Immutable: Cannot accidentally modify and save
   * - WHY: Read-only operation, no need for Mongoose features
   * 
   * ERROR HANDLING:
   * - 404 Not Found: Submission doesn't exist (invalid submissionId)
   * - 403 Forbidden: Submission exists but belongs to another user
   * 
   * SECURITY CONSIDERATION - 404 vs 403:
   * We return 403 (not 404) for ownership violations to clearly indicate:
   * - The submission exists (don't mislead with 404)
   * - Access is denied due to authorization (not existence)
   * - This is a security boundary (not a data issue)
   * 
   * Some systems return 404 for both cases to prevent enumeration attacks
   * (attacker can't tell if submission exists). We chose 403 for clarity:
   * - Better developer experience (clear error message)
   * - Easier debugging (know if issue is existence vs authorization)
   * - Submission IDs are UUIDs (hard to enumerate anyway)
   * 
   * @param {string} submissionId - MongoDB ObjectId of the submission to retrieve
   * @param {string} userId - MongoDB ObjectId of the requesting user (from JWT token)
   * 
   * @returns {Promise<Object>} Submission object with populated problem details
   *   - _id: Submission ID
   *   - userId: User who submitted (ObjectId)
   *   - problemId: { _id, title, slug } (populated)
   *   - code: Source code (full text)
   *   - language: 'python' or 'cpp'
   *   - verdict: 'PENDING' | 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE'
   *   - executionTime: Time in milliseconds (null if PENDING)
   *   - memoryUsed: Memory in KB (null if PENDING)
   *   - compilerError: Error message (only for CE verdict)
   *   - contestId: Contest ID (null for practice mode)
   *   - createdAt: Submission timestamp
   *   - updatedAt: Last update timestamp (verdict update)
   * 
   * @throws {Error} 404 - Submission not found (invalid submissionId)
   * @throws {Error} 403 - Not authorized (submission belongs to another user)
   * 
   * @example
   * // Successful retrieval (user owns submission)
   * const submission = await submissionsService.getSubmission(
   *   '507f1f77bcf86cd799439011',  // submissionId
   *   '507f1f77bcf86cd799439012'   // userId (from JWT token)
   * );
   * // Returns: {
   * //   _id: '507f1f77bcf86cd799439011',
   * //   userId: '507f1f77bcf86cd799439012',
   * //   problemId: { _id: '...', title: 'Two Sum', slug: 'two-sum' },
   * //   code: 'def solve(): return 42',
   * //   language: 'python',
   * //   verdict: 'AC',
   * //   executionTime: 45,
   * //   memoryUsed: 2048,
   * //   createdAt: '2024-01-15T10:30:00Z'
   * // }
   * 
   * @example
   * // Ownership violation (user doesn't own submission)
   * try {
   *   await submissionsService.getSubmission(
   *     '507f1f77bcf86cd799439011',  // submissionId (belongs to another user)
   *     '507f1f77bcf86cd799439999'   // userId (different user)
   *   );
   * } catch (error) {
   *   console.log(error.message);     // "Not authorized to view this submission"
   *   console.log(error.statusCode);  // 403
   * }
   * 
   * @example
   * // Non-existent submission
   * try {
   *   await submissionsService.getSubmission(
   *     '000000000000000000000000',  // Invalid/non-existent ID
   *     userId
   *   );
   * } catch (error) {
   *   console.log(error.message);     // "Submission not found"
   *   console.log(error.statusCode);  // 404
   * }
   */
  async getSubmission(submissionId, userId) {
    // Fetch submission with populated problem details
    // .populate() performs a JOIN-like operation to include problem title and slug
    // .lean() returns plain JavaScript object (faster, no Mongoose overhead)
    const submission = await Submission.findById(submissionId)
      .populate('problemId', 'title slug')  // Include problem context for UI
      .lean();  // Return plain object (read-only, no Mongoose features needed)
    
    // Check if submission exists
    // Return 404 if submissionId is invalid or submission was deleted
    if (!submission) {
      const error = new Error('Submission not found');
      error.statusCode = 404;
      throw error;
    }
    
    // ============================================================================
    // OWNERSHIP VALIDATION - CRITICAL SECURITY BOUNDARY
    // ============================================================================
    // 
    // Verify that the requesting user owns this submission
    // 
    // WHY THIS CHECK IS CRITICAL:
    // Without this check, any user could view any submission by guessing/enumerating
    // submission IDs. This would allow:
    // - Code theft: Copy others' accepted solutions
    // - Plagiarism: Submit copied code as your own
    // - Cheating: View solutions during active contests
    // - Privacy violation: Access code users intended to keep private
    // 
    // IMPLEMENTATION DETAILS:
    // - submission.userId is a MongoDB ObjectId (stored as BSON in database)
    // - userId parameter is a string (extracted from JWT token)
    // - We call .toString() to convert ObjectId to string for comparison
    // - Direct comparison (submission.userId === userId) would fail due to type mismatch
    // 
    // ALTERNATIVE APPROACHES CONSIDERED:
    // 
    // 1. Database-level filtering:
    //    Submission.findOne({ _id: submissionId, userId })
    //    PRO: Single query, no separate ownership check
    //    CON: Returns 404 for both "not found" and "not authorized" (less clear)
    //    DECISION: We chose explicit check for better error messages
    // 
    // 2. Role-based bypass (admins can view all):
    //    if (userRole !== 'admin' && submission.userId !== userId) throw 403
    //    PRO: Admins can debug/moderate submissions
    //    CON: Requires passing userRole, increases complexity
    //    DECISION: Use separate admin endpoint instead (better separation of concerns)
    // 
    // 3. Public submissions (opt-in sharing):
    //    if (!submission.isPublic && submission.userId !== userId) throw 403
    //    PRO: Users can share solutions publicly
    //    CON: Requires schema change, UI for toggling, moderation
    //    DECISION: Not implemented yet (future feature)
    // 
    // ERROR RESPONSE:
    // We return 403 Forbidden (not 404 Not Found) to clearly indicate:
    // - The submission exists (we found it in the database)
    // - Access is denied due to authorization failure (not existence failure)
    // - This is a security boundary (not a data issue)
    // 
    // Some systems return 404 for both cases to prevent enumeration attacks:
    // - Attacker cannot tell if submission exists or not
    // - Prevents reconnaissance of valid submission IDs
    // - Reduces information disclosure
    // 
    // We chose 403 for better developer experience:
    // - Clear error message ("Not authorized" vs "Not found")
    // - Easier debugging (know if issue is existence vs authorization)
    // - Submission IDs are MongoDB ObjectIds (128-bit, hard to enumerate)
    // - Rate limiting prevents brute-force enumeration attempts
    // 
    if (submission.userId.toString() !== userId) {
      const error = new Error('Not authorized to view this submission');
      error.statusCode = 403;  // Forbidden (not 404) - submission exists but access denied
      throw error;
    }
    
    // Ownership verified - return submission with all fields including code
    // This is the only method that returns the full code field
    // List endpoints (getSubmissionsByProblem) exclude code to reduce payload size
    return submission;
  }

  /**
   * Get all submissions by a user for a specific problem
   * 
   * This method retrieves a user's submission history for a single problem,
   * showing their progression and attempts. It's commonly used for:
   * - Problem detail page: Show user's previous attempts
   * - Submission history: Track progress over time
   * - Retry logic: Let users see what they tried before
   * 
   * FILTERING LOGIC:
   * The query filters by TWO fields to create a user-problem-specific view:
   * 
   * 1. **userId Filter**: Only show submissions by this specific user
   *    - Enforces ownership (users only see their own submissions)
   *    - Prevents viewing others' attempts (privacy + anti-plagiarism)
   *    - Scopes results to authenticated user's submissions
   * 
   * 2. **problemId Filter**: Only show submissions for this specific problem
   *    - Narrows results to single problem (not all user's submissions)
   *    - Useful for problem detail page ("Your 5 attempts on Two Sum")
   *    - Enables problem-specific analytics (success rate, avg time)
   * 
   * COMBINED FILTER BEHAVIOR:
   * The query uses AND logic: { userId: X, problemId: Y }
   * - Returns submissions where BOTH conditions are true
   * - Example: User A's submissions for Problem B (not User A's all submissions)
   * - Empty array if user never submitted to this problem
   * 
   * WHY FILTER BY BOTH?
   * - Security: userId prevents viewing others' submissions
   * - Relevance: problemId shows only relevant attempts
   * - Performance: Compound index on (userId, problemId) makes query fast
   * 
   * SORTING:
   * Results are sorted by createdAt: -1 (newest first) to show:
   * - Most recent attempt at the top (likely most relevant)
   * - Chronological progression (latest → oldest)
   * - Easy to find "last submission" (first element in array)
   * 
   * CODE EXCLUSION:
   * We use .select('-code') to exclude the code field from results:
   * 
   * WHY EXCLUDE CODE?
   * 1. **Payload Size**: Code can be large (10KB+ for complex solutions)
   *    - List endpoint may return 10-50 submissions
   *    - Including code = 100KB-500KB response (slow, expensive)
   *    - Excluding code = 5KB-10KB response (fast, cheap)
   * 
   * 2. **Performance**: Smaller payloads = faster network transfer
   *    - Mobile users on slow connections benefit
   *    - Reduces bandwidth costs (especially for high-traffic sites)
   *    - Faster JSON parsing in browser
   * 
   * 3. **UI Design**: List view doesn't need code
   *    - Shows verdict, time, memory (summary info)
   *    - User clicks submission to view full details (separate API call)
   *    - Lazy loading pattern (fetch code only when needed)
   * 
   * 4. **Security**: Reduces attack surface
   *    - Less data exposed in list endpoints
   *    - Code only returned when explicitly requested (getSubmission)
   *    - Limits information disclosure in case of authorization bugs
   * 
   * HOW TO GET CODE:
   * If user needs to view code, they must call getSubmission(submissionId, userId)
   * - Separate endpoint enforces ownership validation
   * - Returns full submission including code field
   * - Typical flow: List submissions → User clicks → Fetch full details
   * 
   * LEAN() OPTIMIZATION:
   * We use .lean() to return plain JavaScript objects:
   * - Faster: No Mongoose document overhead (getters, setters, virtuals)
   * - Smaller: No Mongoose metadata attached
   * - Immutable: Cannot accidentally modify and save
   * - WHY: Read-only operation, no need for Mongoose features
   * 
   * INDEX OPTIMIZATION:
   * This query benefits from compound index: { userId: 1, problemId: 1, createdAt: -1 }
   * - Defined in Submission model schema
   * - Allows efficient filtering and sorting in single index scan
   * - Without index: Full collection scan (slow for large datasets)
   * - With index: O(log n) lookup + O(k) scan where k = result count
   * 
   * TYPICAL USE CASES:
   * 
   * 1. **Problem Detail Page**:
   *    - Show "Your Submissions" section below problem description
   *    - Display verdict, time, memory for each attempt
   *    - Let user click to view full submission details
   * 
   * 2. **Submission History**:
   *    - Track user's progress on a problem over time
   *    - Show improvement (WA → WA → AC)
   *    - Identify patterns (always TLE, never AC)
   * 
   * 3. **Retry Logic**:
   *    - Let user see what they tried before
   *    - Avoid resubmitting identical code
   *    - Learn from previous mistakes
   * 
   * 4. **Analytics**:
   *    - Calculate success rate (AC count / total submissions)
   *    - Track average execution time across attempts
   *    - Identify problematic test cases (always fail on same case)
   * 
   * EMPTY RESULT HANDLING:
   * If user never submitted to this problem, returns empty array []
   * - Not an error (valid state)
   * - UI should show "No submissions yet" message
   * - Encourages user to make first submission
   * 
   * @param {string} userId - MongoDB ObjectId of the user (from JWT token)
   * @param {string} problemId - MongoDB ObjectId of the problem
   * 
   * @returns {Promise<Array<Object>>} Array of submissions (newest first, code excluded)
   *   Each submission contains:
   *   - _id: Submission ID
   *   - userId: User who submitted (ObjectId)
   *   - problemId: Problem ID (ObjectId, not populated)
   *   - language: 'python' or 'cpp'
   *   - verdict: 'PENDING' | 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE'
   *   - executionTime: Time in milliseconds (null if PENDING)
   *   - memoryUsed: Memory in KB (null if PENDING)
   *   - contestId: Contest ID (null for practice mode)
   *   - createdAt: Submission timestamp
   *   - updatedAt: Last update timestamp
   *   - code: EXCLUDED (use getSubmission to fetch code)
   * 
   * @example
   * // Get user's submission history for a problem
   * const submissions = await submissionsService.getSubmissionsByProblem(
   *   '507f1f77bcf86cd799439011',  // userId
   *   '507f1f77bcf86cd799439012'   // problemId
   * );
   * // Returns: [
   * //   { _id: '...', verdict: 'AC', executionTime: 45, createdAt: '2024-01-15T10:30:00Z' },
   * //   { _id: '...', verdict: 'WA', executionTime: 50, createdAt: '2024-01-15T10:25:00Z' },
   * //   { _id: '...', verdict: 'TLE', executionTime: null, createdAt: '2024-01-15T10:20:00Z' }
   * // ]
   * // Note: code field is excluded, sorted newest first
   * 
   * @example
   * // User never submitted to this problem
   * const submissions = await submissionsService.getSubmissionsByProblem(userId, problemId);
   * // Returns: []
   * 
   * @example
   * // UI usage pattern
   * // 1. List submissions (without code)
   * const submissions = await getSubmissionsByProblem(userId, problemId);
   * submissions.forEach(sub => {
   *   console.log(`${sub.verdict} - ${sub.executionTime}ms`);
   * });
   * 
   * // 2. User clicks on a submission to view details
   * const fullSubmission = await getSubmission(submissions[0]._id, userId);
   * console.log(fullSubmission.code);  // Now we have the code
   */
  async getSubmissionsByProblem(userId, problemId) {
    // Query submissions with compound filter: userId AND problemId
    // This creates a user-problem-specific view (not all user submissions)
    const submissions = await Submission.find({
      userId,      // Filter 1: Only this user's submissions (ownership + privacy)
      problemId    // Filter 2: Only submissions for this problem (relevance)
    })
      // Sort by newest first (most recent attempt at top)
      // Useful for showing latest submission status in UI
      .sort({ createdAt: -1 })
      
      // Exclude code field to reduce payload size
      // Code can be 10KB+, list may have 50 submissions = 500KB saved
      // Use getSubmission() to fetch code when user clicks on submission
      .select('-code')
      
      // Return plain JavaScript objects (faster, no Mongoose overhead)
      // Read-only operation, no need for Mongoose document features
      .lean();
    
    return submissions;
  }

  async updateVerdict(submissionId, verdict, executionTime, memoryUsed, compilerError = null) {
    const submission = await Submission.findByIdAndUpdate(
      submissionId,
      {
        verdict,
        executionTime,
        memoryUsed,
        compilerError
      },
      { new: true }
    );
    
    return submission;
  }
}

module.exports = new SubmissionsService();
