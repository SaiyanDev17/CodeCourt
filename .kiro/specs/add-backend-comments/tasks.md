# Tasks: Add Comprehensive Comments to Backend Code

## Legend
- [ ] Not started
- [-] In progress
- [x] Complete

---

## Phase 1: Configuration Layer ✅ COMPLETE

### 1.1 Database Configuration
- [x] 1.1.1 Add module-level comments to `backend/src/config/db.js` (VISION, WHY, WHAT, DESIGN DECISIONS, USAGE)
- [x] 1.1.2 Add inline comments to retry logic and event handlers
- [x] 1.1.3 Document environment variables and their defaults

### 1.2 Redis Configuration
- [x] 1.2.1 Add module-level comments to `backend/src/config/redis.js`
- [x] 1.2.2 Add inline comments to retry strategy and reconnection logic
- [x] 1.2.3 Document BullMQ-specific configuration (maxRetriesPerRequest: null)
- [x] 1.2.4 Explain event handlers and their purposes

### 1.3 S3 Configuration
- [x] 1.3.1 Add module-level comments to `backend/src/config/s3.js`
- [x] 1.3.2 Document AWS credential validation logic
- [x] 1.3.3 Add usage examples for uploading test cases
- [x] 1.3.4 Document getBucketName() helper function

### 1.4 BullMQ Configuration
- [x] 1.4.1 Add module-level comments to `backend/src/config/bullmq.js`
- [x] 1.4.2 Document job options (attempts, backoff, removeOnComplete)
- [x] 1.4.3 Explain worker concurrency setting (5 simultaneous judges)
- [x] 1.4.4 Document queue options and their purposes

### 1.5 Constants
- [x] 1.5.1 Add module-level comments to `backend/src/config/constants.js`
- [x] 1.5.2 Document each constant group (ROLES, VERDICTS, LIMITS, etc.)
- [x] 1.5.3 Explain the rationale behind specific values (e.g., ICPC_PENALTY_PER_WA: 20)
- [x] 1.5.4 Add examples showing how constants are used

---

## Phase 2: Middleware Layer ✅ COMPLETE

### 2.1 Auth Guard
- [x] 2.1.1 Add module-level comments to `backend/src/middleware/authGuard.js`
- [x] 2.1.2 Document JWT verification logic
- [x] 2.1.3 Explain req.user attachment and its structure
- [x] 2.1.4 Document error handling for invalid/expired tokens

### 2.2 Role Guard
- [x] 2.2.1 Add module-level comments to `backend/src/middleware/roleGuard.js`
- [x] 2.2.2 Document role-based access control logic
- [x] 2.2.3 Explain the allowed roles array parameter
- [x] 2.2.4 Add usage examples for different role combinations

### 2.3 Error Handler
- [x] 2.3.1 Add module-level comments to `backend/src/middleware/errorHandler.js`
- [x] 2.3.2 Document error response structure
- [x] 2.3.3 Explain Mongoose validation error handling
- [x] 2.3.4 Document production vs development error responses

### 2.4 Rate Limiter
- [x] 2.4.1 Add module-level comments to `backend/src/middleware/rateLimit.js`
- [x] 2.4.2 Document Redis-backed rate limiting strategy
- [x] 2.4.3 Explain the 10 attempts / 15 minutes window
- [x] 2.4.4 Document fallback behavior when Redis is unavailable

### 2.5 Validator
- [x] 2.5.1 Add module-level comments to `backend/src/middleware/validate.js`
- [x] 2.5.2 Document Joi schema validation logic
- [x] 2.5.3 Explain validation error response format
- [x] 2.5.4 Add examples of schema definitions

---

## Phase 3: Auth Module ✅ COMPLETE

### 3.1 Auth Model
- [x] 3.1.1 Add module-level comments to `backend/src/modules/auth/model.js`
- [x] 3.1.2 Document User schema fields and their purposes
- [x] 3.1.3 Explain password hashing with bcrypt (cost factor 10)
- [x] 3.1.4 Document indexes and their query optimization purposes

### 3.2 Auth Service
- [x] 3.2.1 Add module-level comments to `backend/src/modules/auth/service.js`
- [x] 3.2.2 Document register() method and unique validation
- [x] 3.2.3 Explain login() method and JWT token generation
- [x] 3.2.4 Document refresh() method and token rotation strategy
- [x] 3.2.5 Explain logout() method and Redis blacklist mechanism
- [x] 3.2.6 Add inline comments to complex logic (token expiry, blacklist TTL)

### 3.3 Auth Controller
- [x] 3.3.1 Add module-level comments to `backend/src/modules/auth/controller.js`
- [x] 3.3.2 Document each endpoint handler (register, login, refresh, logout)
- [x] 3.3.3 Explain HTTP status codes used (201, 200, 401, 409)
- [x] 3.3.4 Document cookie settings (httpOnly, secure, sameSite)

### 3.4 Auth Routes
- [x] 3.4.1 Add module-level comments to `backend/src/modules/auth/routes.js`
- [x] 3.4.2 Document each route and its middleware stack
- [x] 3.4.3 Explain validation schemas applied to each endpoint
- [x] 3.4.4 Document rate limiting on login endpoint

---

## Phase 4: Problems Module ✅ COMPLETE

### 4.1 Problem Model
- [x] 4.1.1 Add module-level comments to `backend/src/modules/problems/model.js`
- [x] 4.1.2 Document Problem schema fields (title, slug, description, etc.)
- [x] 4.1.3 Explain status field and state machine (draft → published/rejected)
- [x] 4.1.4 Document test case structure (sampleTestCases, hiddenTestCasesS3Key)
- [x] 4.1.5 Explain indexes and their query optimization purposes

### 4.2 Problem Service
- [x] 4.2.1 Add module-level comments to `backend/src/modules/problems/service.js`
- [x] 4.2.2 Document create() method and draft status initialization
- [x] 4.2.3 Explain getPublishedProblems() and Redis caching strategy (TTL 60s)
- [x] 4.2.4 Document update() method and status reversion logic
- [x] 4.2.5 Explain approve() method and cache invalidation
- [x] 4.2.6 Document reject() method and rejection reason
- [x] 4.2.7 Add inline comments to cache fallback logic

### 4.3 Problem Controller
- [x] 4.3.1 Add module-level comments to `backend/src/modules/problems/controller.js`
- [x] 4.3.2 Document each endpoint handler
- [x] 4.3.3 Explain S3 upload logic in uploadTests()
- [x] 4.3.4 Document multer file handling

### 4.4 Problem Routes
- [x] 4.4.1 Add module-level comments to `backend/src/modules/problems/routes.js`
- [x] 4.4.2 Document each route and required roles
- [x] 4.4.3 Explain multer configuration for file uploads
- [x] 4.4.4 Document validation schemas

---

## Phase 5: Submissions Module

### 5.1 Submission Model
- [x] 5.1.1 Add module-level comments to `backend/src/modules/submissions/model.js`
- [x] 5.1.2 Document Submission schema fields
- [x] 5.1.3 Explain verdict field and possible values
- [x] 5.1.4 Document execution metrics (executionTime, memoryUsed)
- [x] 5.1.5 Explain indexes for query optimization

### 5.2 Submission Service
- [x] 5.2.1 Add module-level comments to `backend/src/modules/submissions/service.js`
- [x] 5.2.2 Document submit() method and PENDING status initialization
- [x] 5.2.3 Explain BullMQ queue integration
- [x] 5.2.4 Document getSubmission() and ownership validation
- [x] 5.2.5 Explain getUserSubmissions() filtering logic

### 5.3 Submission Controller
- [x] 5.3.1 Add module-level comments to `backend/src/modules/submissions/controller.js`
- [x] 5.3.2 Document each endpoint handler
- [x] 5.3.3 Explain 202 Accepted response for async processing
- [x] 5.3.4 Document ownership validation logic

### 5.4 Submission Routes
- [x] 5.4.1 Add module-level comments to `backend/src/modules/submissions/routes.js`
- [x] 5.4.2 Document each route and authentication requirements
- [x] 5.4.3 Explain validation schemas

---

## Phase 6: Contests Module

### 6.1 Contest Models
- [x] 6.1.1 Add module-level comments to `backend/src/modules/contests/model.js`
- [x] 6.1.2 Document Contest schema and status state machine
- [x] 6.1.3 Explain ContestScore schema and ICPC scoring fields
- [x] 6.1.4 Document problemScores array structure
- [x] 6.1.5 Explain indexes for leaderboard queries

### 6.2 Contest Service
- [x] 6.2.1 Add module-level comments to `backend/src/modules/contests/service.js`
- [x] 6.2.2 Document create() method and validation (30min minimum duration)
- [x] 6.2.3 Explain register() method and participant management
- [x] 6.2.4 Document computeICPCScore() algorithm with examples
- [x] 6.2.5 Explain getLeaderboard() and Redis caching (TTL 10s)
- [x] 6.2.6 Document duplicate AC handling logic
- [x] 6.2.7 Add inline comments to scoring calculations

### 6.3 Contest Controller
- [x] 6.3.1 Add module-level comments to `backend/src/modules/contests/controller.js`
- [x] 6.3.2 Document each endpoint handler
- [x] 6.3.3 Explain role-based access control for creation
- [x] 6.3.4 Document leaderboard response format

### 6.4 Contest Routes
- [x] 6.4.1 Add module-level comments to `backend/src/modules/contests/routes.js`
- [x] 6.4.2 Document each route and required roles
- [x] 6.4.3 Explain validation schemas

---

## Phase 7: Users Module

### 7.1 User Service
- [ ] 7.1.1 Add module-level comments to `backend/src/modules/users/service.js`
- [ ] 7.1.2 Document getUserProfile() and Redis caching (TTL 300s)
- [ ] 7.1.3 Explain updateUserRole() and cache invalidation
- [ ] 7.1.4 Document public profile data filtering

### 7.2 User Controller
- [ ] 7.2.1 Add module-level comments to `backend/src/modules/users/controller.js`
- [ ] 7.2.2 Document each endpoint handler
- [ ] 7.2.3 Explain admin-only role update logic

### 7.3 User Routes
- [ ] 7.3.1 Add module-level comments to `backend/src/modules/users/routes.js`
- [ ] 7.3.2 Document each route and required roles
- [ ] 7.3.3 Explain validation schemas

---

## Phase 8: Jobs/Queue System

### 8.1 Submission Queue
- [ ] 8.1.1 Add module-level comments to `backend/src/jobs/submission.queue.js`
- [ ] 8.1.2 Document BullMQ Queue initialization
- [ ] 8.1.3 Explain enqueueSubmission() method
- [ ] 8.1.4 Document job options (attempts, backoff)

### 8.2 Submission Worker
- [ ] 8.2.1 Add module-level comments to `backend/src/jobs/submission.worker.js`
- [ ] 8.2.2 Document worker initialization and concurrency (5 simultaneous)
- [ ] 8.2.3 Explain job processing flow (fetch problem → spawn judge → collect verdict)
- [ ] 8.2.4 Document verdict mapping logic (exit codes → verdicts)
- [ ] 8.2.5 Explain Docker judge spawning with resource limits
- [ ] 8.2.6 Document Socket.io event emission
- [ ] 8.2.7 Add inline comments to complex logic (timeout handling, error cases)

### 8.3 Kubernetes Spawner
- [ ] 8.3.1 Add module-level comments to `backend/src/jobs/k8s.spawner.js`
- [ ] 8.3.2 Document Kubernetes Job creation logic
- [ ] 8.3.3 Explain resource limits and security settings
- [ ] 8.3.4 Document log collection and cleanup

---

## Phase 9: Socket.io Real-Time

### 9.1 Socket.io Initialization
- [ ] 9.1.1 Add module-level comments to `backend/src/socket/index.js`
- [ ] 9.1.2 Document Socket.io server initialization
- [ ] 9.1.3 Explain JWT authentication middleware
- [ ] 9.1.4 Document CORS configuration
- [ ] 9.1.5 Explain room joining logic (user:{userId}, contest:{contestId})

### 9.2 Verdict Socket
- [ ] 9.2.1 Add module-level comments to `backend/src/socket/verdict.socket.js`
- [ ] 9.2.2 Document emitVerdict() function
- [ ] 9.2.3 Explain verdict event payload structure
- [ ] 9.2.4 Document room-based emission (user:{userId})

### 9.3 Leaderboard Socket
- [ ] 9.3.1 Add module-level comments to `backend/src/socket/leaderboard.socket.js`
- [ ] 9.3.2 Document emitLeaderboardUpdate() function
- [ ] 9.3.3 Explain leaderboard event payload structure
- [ ] 9.3.4 Document room-based emission (contest:{contestId})

---

## Phase 10: Cron Jobs

### 10.1 Contest Cron
- [ ] 10.1.1 Add module-level comments to `backend/src/cron/contest.cron.js`
- [ ] 10.1.2 Document cron schedule (every 30 seconds)
- [ ] 10.1.3 Explain contest state transition logic (upcoming → ongoing → ended)
- [ ] 10.1.4 Document cache invalidation on state changes
- [ ] 10.1.5 Add inline comments to time comparison logic

---

## Phase 11: Server Entry Points

### 11.1 Express App
- [ ] 11.1.1 Add module-level comments to `backend/src/app.js`
- [ ] 11.1.2 Document middleware stack order and rationale
- [ ] 11.1.3 Explain CORS configuration
- [ ] 11.1.4 Document route mounting order
- [ ] 11.1.5 Explain error handler placement (must be last)

### 11.2 HTTP Server
- [ ] 11.2.1 Add module-level comments to `backend/server.js`
- [ ] 11.2.2 Document server initialization sequence
- [ ] 11.2.3 Explain Socket.io integration
- [ ] 11.2.4 Document graceful shutdown handling (SIGTERM, SIGINT)
- [ ] 11.2.5 Explain database and Redis connection lifecycle

---

## Phase 12: Docker & Kubernetes

### 12.1 API Dockerfile
- [ ] 12.1.1 Add comments to `backend/docker/Dockerfile`
- [ ] 12.1.2 Document multi-stage build strategy
- [ ] 12.1.3 Explain production optimizations (non-root user, minimal image)
- [ ] 12.1.4 Document exposed ports and volumes

### 12.2 Judge Dockerfiles
- [ ] 12.2.1 Add comments to `backend/docker/judges/cpp/Dockerfile`
- [ ] 12.2.2 Document C++ compilation and execution flow
- [ ] 12.2.3 Explain security settings (network=none, resource limits)
- [ ] 12.2.4 Add comments to `backend/docker/judges/python/Dockerfile`
- [ ] 12.2.5 Document Python execution flow and security

### 12.3 Kubernetes Manifests
- [ ] 12.3.1 Add comments to `backend/k8s/namespace.yaml`
- [ ] 12.3.2 Document `backend/k8s/configmap.yaml` and environment variables
- [ ] 12.3.3 Add comments to `backend/k8s/secrets.example.yaml`
- [ ] 12.3.4 Document `backend/k8s/api-deployment.yaml` (replicas, resources)
- [ ] 12.3.5 Add comments to `backend/k8s/redis-deployment.yaml`
- [ ] 12.3.6 Document `backend/k8s/judge-job-template.yaml` (resource limits)
- [ ] 12.3.7 Add comments to `backend/k8s/ingress.yaml` (routing rules)

---

## Summary

**Total Tasks**: ~120 tasks
**Completed**: ~40 tasks (Phases 1-4)
**Remaining**: ~80 tasks (Phases 5-12)
**Estimated Time Remaining**: 5-6 hours
**Outcome**: Fully documented backend codebase ready for interviews and maintenance

**Progress**:
- ✅ Phase 1: Configuration Layer (COMPLETE)
- ✅ Phase 2: Middleware Layer (COMPLETE)
- ✅ Phase 3: Auth Module (COMPLETE)
- ✅ Phase 4: Problems Module (COMPLETE)
- ⏳ Phase 5: Submissions Module (In Progress)
- ⏳ Phase 6: Contests Module (Pending)
- ⏳ Phase 7: Users Module (Pending)
- ⏳ Phase 8: Jobs/Queue System (Pending)
- ⏳ Phase 9: Socket.io Real-Time (Pending)
- ⏳ Phase 10: Cron Jobs (Pending)
- ⏳ Phase 11: Server Entry Points (Pending)
- ⏳ Phase 12: Docker & Kubernetes (Pending)

**Success Criteria**:
- ✅ Every file has module-level comments
- ✅ Every function has JSDoc comments
- ✅ Complex logic has inline comments
- ✅ New developers can understand any file in under 5 minutes
