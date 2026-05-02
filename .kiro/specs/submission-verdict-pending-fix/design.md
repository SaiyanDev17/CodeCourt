# Submission Verdict Pending Fix - Bugfix Design

## Overview

This bugfix addresses two critical issues preventing the CodeCourt submission system from functioning:

1. **Worker Not Started**: The BullMQ submission worker is never initialized in server.js, causing all submissions to remain stuck at "PENDING" verdict indefinitely
2. **Missing Submissions List Endpoint**: The GET /api/submissions endpoint (list all user submissions) returns 404, preventing users from viewing their submission history

The fix requires minimal changes: importing and initializing the worker in server.js, and adding a new route handler for listing submissions. Both fixes preserve all existing functionality while enabling the core submission workflow.

## Glossary

- **Bug_Condition (C)**: The conditions that trigger the bugs:
  - C1: Server starts without importing submission.worker.js → worker never runs
  - C2: User sends GET /api/submissions → 404 Not Found
- **Property (P)**: The desired behavior when bugs are fixed:
  - P1: Worker processes queued submissions and updates verdicts
  - P2: GET /api/submissions returns user's submission list
- **Preservation**: Existing submission functionality that must remain unchanged:
  - POST /api/submissions continues to create submissions and enqueue jobs
  - GET /api/submissions/:id continues to return single submission details
  - GET /api/submissions/problem/:problemId continues to return problem-specific submissions
  - Worker verdict determination logic remains unchanged
- **BullMQ Worker**: Background process that picks up jobs from the "submissions" queue and executes them
- **submission.worker.js**: The worker module in backend/src/jobs/submission.worker.js that processes code submissions
- **server.js**: The HTTP server entry point in backend/server.js that initializes the application
- **Express Router**: The routing mechanism that maps HTTP requests to controller functions

## Bug Details

### Bug Condition

The bugs manifest in two distinct scenarios:

**Bug 1: Worker Never Started**
When the backend server starts, the submission worker module is never imported or initialized. The worker.js file exports a Worker instance that begins processing jobs immediately upon import, but server.js never imports this module. This causes all submission jobs to accumulate in the BullMQ queue without being processed.

**Bug 2: Missing Submissions List Endpoint**
When a user sends GET /api/submissions (without an ID parameter), the Express router does not match any defined route. The submissions routes only define POST /, GET /problem/:problemId, and GET /:id, so the request falls through to the 404 handler.

**Formal Specification:**
```
FUNCTION isBugCondition1(serverStartup)
  INPUT: serverStartup of type ServerInitialization
  OUTPUT: boolean
  
  RETURN NOT imports('submission.worker.js')
         AND bullmqQueueExists('submissions')
         AND jobsAccumulateInQueue()
END FUNCTION

FUNCTION isBugCondition2(request)
  INPUT: request of type HTTPRequest
  OUTPUT: boolean
  
  RETURN request.method == 'GET'
         AND request.path == '/api/submissions'
         AND NOT routeExists('/api/submissions', 'GET')
END FUNCTION
```

### Examples

**Bug 1 Examples:**
- User submits code via POST /api/submissions → submission created with verdict="PENDING", job enqueued
- 5 seconds later, user polls GET /api/submissions/:id → verdict still "PENDING"
- 60 seconds later, user polls again → verdict still "PENDING" (expected: "AC", "WA", etc.)
- Checking Redis: `redis-cli LLEN bull:submissions:waiting` shows jobs accumulating
- Checking Docker: `docker ps` shows no judge containers running (expected: containers spawn and terminate)

**Bug 2 Examples:**
- User sends GET /api/submissions with valid JWT → 404 Not Found {"error":"Not Found","path":"/api/submissions"}
- Frontend tries to fetch submission history → Cannot display list, shows error message
- Expected: 200 OK with array of user's submissions (or 501 Not Implemented if feature not ready)

### Edge Cases

**Bug 1 Edge Cases:**
- If worker is manually started in a separate process, submissions will be processed (workaround confirms root cause)
- If server is restarted, queued jobs remain in Redis and will be processed once worker starts
- If multiple server instances start without worker, jobs still accumulate (no processing)

**Bug 2 Edge Cases:**
- GET /api/submissions/:id works correctly (different route)
- GET /api/submissions/problem/:problemId works correctly (different route)
- POST /api/submissions works correctly (different method)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- POST /api/submissions must continue to create submission records in MongoDB with verdict="PENDING"
- POST /api/submissions must continue to enqueue jobs to BullMQ and return 202 Accepted
- GET /api/submissions/:id must continue to return single submission details (owner only)
- GET /api/submissions/problem/:problemId must continue to return problem-specific submissions
- Worker verdict determination logic (AC, WA, TLE, MLE, RE, CE) must remain unchanged
- Worker Docker execution with resource limits must remain unchanged
- Worker Socket.io event publishing must remain unchanged
- Worker contest leaderboard updates must remain unchanged
- Worker test case execution (stop at first failure) must remain unchanged
- Worker temporary directory cleanup must remain unchanged

**Scope:**
All inputs that do NOT involve server startup (Bug 1) or GET /api/submissions requests (Bug 2) should be completely unaffected by this fix. This includes:
- All existing submission endpoints (POST, GET /:id, GET /problem/:problemId)
- Worker processing logic and verdict determination
- Socket.io real-time updates
- Contest scoring and leaderboard updates
- Authentication and authorization checks
- All other API endpoints (problems, contests, auth, etc.)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

### Bug 1: Worker Not Started

1. **Missing Import in server.js**: The server.js file does not import the submission.worker.js module
   - The worker module exports a Worker instance that starts processing immediately upon import
   - Without the import, the worker never initializes
   - The BullMQ queue exists and jobs are enqueued, but no worker picks them up

2. **No Worker Initialization Call**: Even if imported, there's no explicit initialization
   - The worker.js module uses module-level code execution (exports the worker instance)
   - Simply importing the module is sufficient to start the worker
   - This is a common pattern in BullMQ applications

3. **No Process Management**: The application runs as a single process
   - Docker Compose only starts one "api" container
   - No separate worker container or process
   - The worker must run in the same process as the HTTP server

### Bug 2: Missing Submissions List Endpoint

1. **Route Not Defined**: The submissions/routes.js file does not define a GET / route
   - Only POST /, GET /problem/:problemId, and GET /:id are defined
   - Express router does not match GET /api/submissions to any handler
   - Request falls through to the 404 middleware in app.js

2. **No Controller Method**: The submissions/controller.js likely doesn't have a listAllSubmissions method
   - The controller has submit, getSubmission, and getSubmissionsByProblem
   - No method exists to list all submissions for the authenticated user

3. **Unclear Feature Status**: It's unclear if this endpoint is intentionally missing or forgotten
   - The requirements mention it should exist or return 501 Not Implemented
   - The frontend may be trying to use this endpoint
   - Decision needed: implement the feature or return 501

## Correctness Properties

Property 1: Bug Condition - Worker Processes Submissions

_For any_ server startup where the submission worker is properly imported and initialized, the worker SHALL connect to the BullMQ "submissions" queue, pick up queued jobs within 1-2 seconds, execute code in Docker containers, determine verdicts, and update submission records in MongoDB with the correct verdict (AC, WA, TLE, MLE, RE, CE).

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

Property 2: Bug Condition - Submissions List Endpoint Returns Data

_For any_ authenticated GET /api/submissions request, the endpoint SHALL return a 200 OK response with an array of the user's submissions (or 501 Not Implemented if the feature is not yet ready), instead of returning 404 Not Found.

**Validates: Requirements 2.1, 2.2**

Property 3: Preservation - Submission Creation Unchanged

_For any_ POST /api/submissions request with valid authentication and data, the system SHALL continue to create a submission record in MongoDB with verdict="PENDING", enqueue the job to BullMQ, and return 202 Accepted, exactly as it did before the fix.

**Validates: Requirements 3.1, 3.2**

Property 4: Preservation - Existing Endpoints Unchanged

_For any_ request to GET /api/submissions/:id or GET /api/submissions/problem/:problemId, the system SHALL continue to return the same responses as before the fix, with no changes to authentication, authorization, or data format.

**Validates: Requirements 3.3, 3.4**

Property 5: Preservation - Worker Logic Unchanged

_For any_ submission job processed by the worker, the verdict determination logic, Docker execution, resource limits, Socket.io events, contest updates, and cleanup SHALL remain exactly as implemented before the fix.

**Validates: Requirements 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

#### Fix 1: Start Worker in server.js

**File**: `backend/server.js`

**Function**: `startServer` (async function)

**Specific Changes**:
1. **Import Worker Module**: Add `require('./src/jobs/submission.worker')` at the top of server.js
   - This import triggers the worker to start processing jobs immediately
   - The worker module exports a Worker instance that begins listening to the queue
   - No explicit initialization call needed (module-level execution)

2. **Add Worker Startup Log**: Add console.log after MongoDB connection to confirm worker started
   - Log message: `'✓ Submission worker started'`
   - Helps with debugging and confirms the fix is working
   - Placed after MongoDB connection (worker depends on MongoDB)

3. **Graceful Shutdown**: Import worker instance and close it on SIGTERM
   - Add `const submissionWorker = require('./src/jobs/submission.worker')` to get worker instance
   - In SIGTERM handler, call `await submissionWorker.close()` before server.close()
   - Ensures in-flight jobs complete before shutdown
   - Prevents job loss during deployment or restart

#### Fix 2: Add Submissions List Endpoint (Decision Required)

**Decision Point**: Should we implement the full feature or return 501 Not Implemented?

**Option A: Return 501 Not Implemented (Minimal Fix)**

**File**: `backend/src/modules/submissions/routes.js`

**Specific Changes**:
1. **Add Route Handler**: Add `router.get('/', authGuard, (req, res) => res.status(501).json({ error: 'Not Implemented' }))` before the `/:id` route
   - Returns 501 Not Implemented status code
   - Indicates feature is planned but not yet available
   - Prevents 404 error and clarifies intent
   - Must be placed BEFORE `/:id` route to prevent Express from matching "/" as an ID

**Option B: Implement Full Feature (Complete Fix)**

**File**: `backend/src/modules/submissions/controller.js`

**Specific Changes**:
1. **Add Controller Method**: Add `listSubmissions` method to controller
   - Accepts req, res parameters
   - Calls service.getSubmissionsByUser(req.user.id)
   - Returns 200 OK with array of submissions
   - Includes error handling (try/catch)

**File**: `backend/src/modules/submissions/service.js`

**Specific Changes**:
1. **Add Service Method**: Add `getSubmissionsByUser(userId)` method
   - Queries MongoDB: `Submission.find({ userId }).sort({ createdAt: -1 })`
   - Returns array of submissions sorted by most recent first
   - Does NOT include full code (only metadata: verdict, executionTime, memoryUsed, createdAt)
   - No pagination in MVP (acceptable for <1000 submissions per user)

**File**: `backend/src/modules/submissions/routes.js`

**Specific Changes**:
1. **Add Route Handler**: Add `router.get('/', authGuard, submissionsController.listSubmissions)` before the `/:id` route
   - Must be placed BEFORE `/:id` route to prevent Express from matching "/" as an ID
   - Requires authentication (authGuard)
   - No validation schema needed (no request body or query params)

**Recommendation**: Option A (501 Not Implemented) for this bugfix, then implement Option B as a separate feature if needed. This keeps the bugfix focused on the critical issue (worker not starting) and defers the feature decision.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate server startup and API requests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Worker Not Started Test**: Start server, submit code, wait 10 seconds, check verdict (will fail on unfixed code - verdict remains PENDING)
2. **Queue Accumulation Test**: Start server, submit 5 codes, check Redis queue length (will fail on unfixed code - queue grows without processing)
3. **Missing Endpoint Test**: Send GET /api/submissions with auth token (will fail on unfixed code - returns 404)
4. **Existing Endpoints Test**: Send GET /api/submissions/:id and GET /api/submissions/problem/:problemId (should pass on unfixed code - these work)

**Expected Counterexamples**:
- Submissions remain at PENDING verdict indefinitely
- BullMQ queue accumulates jobs without processing
- GET /api/submissions returns 404 Not Found
- Possible causes: worker not imported, route not defined

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed system produces the expected behavior.

**Pseudocode:**
```
FOR ALL serverStartup WHERE isBugCondition1(serverStartup) DO
  result := startServer_fixed()
  ASSERT workerIsRunning(result)
  ASSERT submissionsAreProcessed(result)
END FOR

FOR ALL request WHERE isBugCondition2(request) DO
  result := handleRequest_fixed(request)
  ASSERT result.statusCode IN [200, 501]
  ASSERT result.statusCode != 404
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition1(request) AND NOT isBugCondition2(request) DO
  ASSERT handleRequest_original(request) = handleRequest_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for existing endpoints, then write property-based tests capturing that behavior.

**Test Cases**:
1. **POST Submission Preservation**: Verify POST /api/submissions continues to create submissions and enqueue jobs
2. **GET Single Submission Preservation**: Verify GET /api/submissions/:id continues to return submission details
3. **GET Problem Submissions Preservation**: Verify GET /api/submissions/problem/:problemId continues to return problem-specific submissions
4. **Worker Logic Preservation**: Verify worker verdict determination, Docker execution, and Socket.io events remain unchanged
5. **Authentication Preservation**: Verify all endpoints continue to require authentication and enforce ownership

### Unit Tests

- Test server startup imports worker module correctly
- Test worker connects to BullMQ queue on startup
- Test worker processes a single submission job
- Test GET /api/submissions returns 200 or 501 (not 404)
- Test POST /api/submissions still creates submission and enqueues job
- Test GET /api/submissions/:id still returns submission details
- Test GET /api/submissions/problem/:problemId still returns problem submissions
- Test worker graceful shutdown on SIGTERM

### Property-Based Tests

- Generate random submission data and verify POST endpoint behavior unchanged
- Generate random submission IDs and verify GET /:id endpoint behavior unchanged
- Generate random problem IDs and verify GET /problem/:problemId endpoint behavior unchanged
- Generate random code submissions and verify worker verdict determination unchanged
- Test that all non-buggy requests produce identical responses before and after fix

### Integration Tests

- Test full submission flow: POST → worker processes → verdict updates → Socket.io emits
- Test server startup sequence: MongoDB → worker → HTTP server → graceful shutdown
- Test GET /api/submissions with authentication (returns 200/501, not 404)
- Test contest submission flow: POST → worker processes → leaderboard updates
- Test multiple concurrent submissions (worker concurrency: 5)
- Test worker recovery after Redis connection loss
- Test worker recovery after MongoDB connection loss
