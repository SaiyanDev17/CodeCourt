# Bugfix Requirements Document

## Introduction

This document addresses a critical bug in the CodeCourt submission system where user code submissions remain stuck at "PENDING" verdict indefinitely and the submissions list endpoint returns a 404 error. This prevents users from receiving feedback on their code submissions and viewing their submission history, effectively breaking the core functionality of the platform.

The bug has two distinct manifestations:
1. **Worker Not Running**: The BullMQ worker that processes submissions is never started, causing all submissions to remain in PENDING state
2. **Missing API Endpoint**: There is no route handler for `GET /api/submissions` (list all submissions), causing 404 errors when users try to access this endpoint

## Bug Analysis

### Current Behavior (Defect)

#### Section 1: Worker Not Started

1.1 WHEN the backend server starts (server.js) THEN the submission worker (submission.worker.js) is never imported or initialized

1.2 WHEN a user submits code via POST /api/submissions THEN the submission is created in MongoDB with verdict="PENDING" and queued in BullMQ

1.3 WHEN the submission job is added to the BullMQ queue THEN no worker picks up the job because the worker process is not running

1.4 WHEN the user polls GET /api/submissions/:id or waits for Socket.io events THEN the verdict remains "PENDING" indefinitely

1.5 WHEN checking the BullMQ queue in Redis THEN jobs accumulate in the "waiting" list without being processed

#### Section 2: Missing Submissions List Endpoint

2.1 WHEN a user sends GET /api/submissions (without an ID parameter) THEN the Express router returns 404 Not Found with {"error":"Not Found","path":"/api/submissions"}

2.2 WHEN the request reaches the Express router THEN it does not match any defined route (only POST /, GET /problem/:problemId, and GET /:id exist)

2.3 WHEN the 404 handler in app.js catches the unmatched route THEN it returns the generic 404 response

### Expected Behavior (Correct)

#### Section 1: Worker Should Start Automatically

1.1 WHEN the backend server starts (server.js) THEN the submission worker SHALL be imported and initialized automatically

1.2 WHEN the worker is initialized THEN it SHALL connect to the BullMQ queue named "submissions" and begin listening for jobs

1.3 WHEN a submission job is added to the queue THEN the worker SHALL pick it up within 1-2 seconds and begin processing

1.4 WHEN the worker processes a submission THEN it SHALL execute the code in a Docker container, determine the verdict, and update MongoDB

1.5 WHEN the verdict is determined THEN the worker SHALL publish a verdict event via Redis pub/sub for Socket.io to broadcast to the user

1.6 WHEN the user polls GET /api/submissions/:id or listens via Socket.io THEN the verdict SHALL be updated from "PENDING" to the actual result (AC, WA, TLE, MLE, RE, CE)

#### Section 2: Submissions List Endpoint Should Exist (Optional)

2.1 WHEN a user sends GET /api/submissions with authentication THEN the system SHALL return a list of all submissions by that user (or return 501 Not Implemented if this feature is not yet supported)

2.2 WHEN the route is defined THEN it SHALL be placed before the GET /:id route to prevent Express from treating "submissions" as an ID parameter

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user submits code via POST /api/submissions THEN the system SHALL CONTINUE TO create a submission record in MongoDB with verdict="PENDING"

3.2 WHEN a user submits code via POST /api/submissions THEN the system SHALL CONTINUE TO enqueue the job to BullMQ and return 202 Accepted immediately

3.3 WHEN a user requests GET /api/submissions/:id with a valid submission ID THEN the system SHALL CONTINUE TO return the submission details with verdict and execution metrics

3.4 WHEN a user requests GET /api/submissions/problem/:problemId THEN the system SHALL CONTINUE TO return all submissions for that problem by the authenticated user

3.5 WHEN the worker processes a submission and determines a verdict THEN the system SHALL CONTINUE TO update the submission record in MongoDB with verdict, executionTime, and memoryUsed

3.6 WHEN the worker publishes a verdict event via Redis THEN the Socket.io bridge SHALL CONTINUE TO forward the event to the connected user

3.7 WHEN a submission is for a contest problem and the verdict is AC THEN the system SHALL CONTINUE TO update the contest leaderboard

3.8 WHEN the worker encounters an error during processing THEN the system SHALL CONTINUE TO update the submission verdict to "RE" and log the error

3.9 WHEN the worker compiles C++ code and compilation fails THEN the system SHALL CONTINUE TO return verdict "CE" with the compiler error message

3.10 WHEN the worker runs test cases and the first test case fails THEN the system SHALL CONTINUE TO stop execution and return the failure verdict (AC, WA, TLE, MLE, RE)
