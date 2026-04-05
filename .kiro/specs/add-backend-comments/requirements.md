# Requirements: Add Comprehensive Comments to Backend Code

## Vision

Transform the CodeCourt backend codebase into a well-documented, maintainable system that serves as both production code and educational reference material. Every file should clearly communicate its purpose, design decisions, and implementation details.

## Why This Exists

The current backend code is functional but lacks comprehensive documentation. This creates several problems:

1. **Onboarding Friction**: New developers struggle to understand the codebase architecture
2. **Maintenance Difficulty**: Future modifications require reverse-engineering the original intent
3. **Knowledge Loss**: Design decisions and trade-offs are not captured
4. **Interview Preparation**: Team members cannot easily explain their implementation choices

## What We Need

Add detailed, structured comments to every backend file that explain:

1. **VISION**: The high-level purpose and goals of the module
2. **WHY**: The business/technical reasons this code exists
3. **WHAT**: What the code does and how it works
4. **DESIGN DECISIONS**: Trade-offs, alternatives considered, and rationale
5. **USAGE**: Code examples showing how to use the module

## Scope

### In Scope (Backend Only)
- ✅ Configuration files (`backend/src/config/`)
- ✅ Middleware (`backend/src/middleware/`)
- ✅ Auth module (`backend/src/modules/auth/`)
- ✅ Problems module (`backend/src/modules/problems/`)
- ✅ Submissions module (`backend/src/modules/submissions/`)
- ✅ Contests module (`backend/src/modules/contests/`)
- ✅ Users module (`backend/src/modules/users/`)
- ✅ Jobs/Queue (`backend/src/jobs/`)
- ✅ Socket.io (`backend/src/socket/`)
- ✅ Cron (`backend/src/cron/`)
- ✅ Server entry points (`backend/src/app.js`, `backend/server.js`)
- ✅ Dockerfiles (`backend/docker/`)
- ✅ Kubernetes manifests (`backend/k8s/`)

### Out of Scope
- ❌ AI Service (Phase 3 - not implemented yet)
- ❌ Frontend (Phase 4 - separate codebase)
- ❌ Test files (already have descriptive test names)
- ❌ Terraform (infrastructure as code is self-documenting)
- ❌ Scripts (utility scripts are simple enough)

## Comment Structure Template

Every file should follow this structure:

```javascript
/**
 * [Module Name]
 * 
 * VISION:
 * [High-level purpose - what problem does this solve?]
 * 
 * WHY THIS EXISTS:
 * [Business/technical reasons - why was this built?]
 * 
 * WHAT IT DOES:
 * [Functional description - what does it do?]
 * 
 * DESIGN DECISIONS:
 * [Trade-offs, alternatives, rationale]
 * 
 * USAGE:
 * ```javascript
 * [Code example]
 * ```
 */

// [Existing code with inline comments explaining complex logic]
```

## Requirements

### Requirement 1: Configuration Files

**User Story**: As a developer, I want to understand the configuration layer, so I can modify settings and troubleshoot connection issues.

**Files**:
- `backend/src/config/db.js` ✅ (DONE)
- `backend/src/config/redis.js`
- `backend/src/config/s3.js`
- `backend/src/config/bullmq.js`
- `backend/src/config/constants.js`

**Acceptance Criteria**:
1. Each file SHALL have a module-level comment block explaining VISION, WHY, WHAT, DESIGN DECISIONS, and USAGE
2. Each function SHALL have JSDoc comments with parameter types and return types
3. Complex logic (retry loops, error handling) SHALL have inline comments
4. Environment variables SHALL be documented with their purpose and default values

### Requirement 2: Middleware

**User Story**: As a developer, I want to understand the middleware pipeline, so I can add new middleware or debug request processing.

**Files**:
- `backend/src/middleware/authGuard.js`
- `backend/src/middleware/roleGuard.js`
- `backend/src/middleware/errorHandler.js`
- `backend/src/middleware/rateLimit.js`
- `backend/src/middleware/validate.js`

**Acceptance Criteria**:
1. Each middleware SHALL explain its position in the Express middleware stack
2. Each middleware SHALL document the request/response modifications it makes
3. Error handling logic SHALL be clearly explained
4. Integration points with other modules (Redis, JWT) SHALL be documented

### Requirement 3: Auth Module

**User Story**: As a developer, I want to understand the authentication flow, so I can implement secure auth in other projects.

**Files**:
- `backend/src/modules/auth/model.js`
- `backend/src/modules/auth/service.js`
- `backend/src/modules/auth/controller.js`
- `backend/src/modules/auth/routes.js`

**Acceptance Criteria**:
1. JWT token generation and validation logic SHALL be explained
2. Bcrypt hashing and cost factor SHALL be documented
3. Refresh token rotation strategy SHALL be explained
4. Redis blacklist mechanism SHALL be documented
5. Security considerations SHALL be highlighted

### Requirement 4: Problems Module

**User Story**: As a developer, I want to understand the problem management workflow, so I can implement similar approval workflows.

**Files**:
- `backend/src/modules/problems/model.js`
- `backend/src/modules/problems/service.js`
- `backend/src/modules/problems/controller.js`
- `backend/src/modules/problems/routes.js`

**Acceptance Criteria**:
1. Problem status state machine (draft → published/rejected) SHALL be documented
2. S3 test case upload flow SHALL be explained
3. Redis caching strategy SHALL be documented
4. Admin approval workflow SHALL be explained

### Requirement 5: Submissions Module

**User Story**: As a developer, I want to understand the judge engine, so I can implement similar code execution systems.

**Files**:
- `backend/src/modules/submissions/model.js`
- `backend/src/modules/submissions/service.js`
- `backend/src/modules/submissions/controller.js`
- `backend/src/modules/submissions/routes.js`

**Acceptance Criteria**:
1. Submission lifecycle (PENDING → AC/WA/TLE/etc.) SHALL be documented
2. BullMQ queue integration SHALL be explained
3. Verdict mapping logic SHALL be documented
4. Security considerations (sandboxing) SHALL be highlighted

### Requirement 6: Contests Module

**User Story**: As a developer, I want to understand the contest engine, so I can implement similar competitive systems.

**Files**:
- `backend/src/modules/contests/model.js`
- `backend/src/modules/contests/service.js`
- `backend/src/modules/contests/controller.js`
- `backend/src/modules/contests/routes.js`

**Acceptance Criteria**:
1. Contest status state machine (upcoming → ongoing → ended) SHALL be documented
2. ICPC scoring algorithm SHALL be explained with examples
3. Leaderboard caching strategy SHALL be documented
4. Duplicate AC handling SHALL be explained

### Requirement 7: Users Module

**User Story**: As a developer, I want to understand the user profile system, so I can implement similar caching patterns.

**Files**:
- `backend/src/modules/users/service.js`
- `backend/src/modules/users/controller.js`
- `backend/src/modules/users/routes.js`

**Acceptance Criteria**:
1. User profile caching strategy SHALL be documented
2. Role update and cache invalidation SHALL be explained
3. Public vs private profile data SHALL be documented

### Requirement 8: Jobs/Queue System

**User Story**: As a developer, I want to understand the judge queue, so I can implement similar background job systems.

**Files**:
- `backend/src/jobs/submission.queue.js`
- `backend/src/jobs/submission.worker.js`
- `backend/src/jobs/k8s.spawner.js`

**Acceptance Criteria**:
1. BullMQ queue/worker architecture SHALL be explained
2. Docker judge spawning logic SHALL be documented
3. Verdict collection and error handling SHALL be explained
4. Kubernetes job spawning (future) SHALL be documented

### Requirement 9: Socket.io Real-Time

**User Story**: As a developer, I want to understand the real-time system, so I can implement similar WebSocket features.

**Files**:
- `backend/src/socket/index.js`
- `backend/src/socket/verdict.socket.js`
- `backend/src/socket/leaderboard.socket.js`

**Acceptance Criteria**:
1. Socket.io initialization and JWT auth SHALL be documented
2. Room-based event emission SHALL be explained
3. Verdict and leaderboard event payloads SHALL be documented
4. Reconnection handling SHALL be explained

### Requirement 10: Cron Jobs

**User Story**: As a developer, I want to understand the contest state transitions, so I can implement similar scheduled tasks.

**Files**:
- `backend/src/cron/contest.cron.js`

**Acceptance Criteria**:
1. Cron schedule (every 30s) SHALL be documented
2. Contest state transition logic SHALL be explained
3. Cache invalidation strategy SHALL be documented

### Requirement 11: Server Entry Points

**User Story**: As a developer, I want to understand the application bootstrap, so I can modify the startup sequence.

**Files**:
- `backend/src/app.js`
- `backend/server.js`

**Acceptance Criteria**:
1. Express middleware stack order SHALL be documented
2. Route mounting order SHALL be explained
3. Socket.io integration SHALL be documented
4. Graceful shutdown handling SHALL be explained

### Requirement 12: Docker & Kubernetes

**User Story**: As a developer, I want to understand the containerization strategy, so I can deploy similar systems.

**Files**:
- `backend/docker/Dockerfile`
- `backend/docker/judges/cpp/Dockerfile`
- `backend/docker/judges/python/Dockerfile`
- `backend/k8s/*.yaml`

**Acceptance Criteria**:
1. Multi-stage Docker builds SHALL be explained
2. Judge container security (network=none, resource limits) SHALL be documented
3. Kubernetes resource definitions SHALL be explained
4. Deployment strategy SHALL be documented

## Success Criteria

1. Every backend file has comprehensive module-level comments
2. Every function has JSDoc comments with types
3. Complex logic has inline comments
4. A new developer can understand any file in under 5 minutes
5. The codebase serves as a reference implementation for interviews

## Non-Goals

- We are NOT rewriting code, only adding comments
- We are NOT changing functionality
- We are NOT adding comments to test files (test names are self-documenting)
- We are NOT documenting the AI service (Phase 3 not implemented)
- We are NOT documenting the frontend (separate codebase)
