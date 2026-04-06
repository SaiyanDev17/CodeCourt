# Backend Nodemon Restart Loop Fix - Bugfix Design

## Overview

The backend server experiences a continuous restart loop caused by three distinct issues: (1) Mongoose emitting duplicate index warnings during startup, (2) Redis configured with "allkeys-lru" eviction policy that can evict BullMQ job data, and (3) nodemon potentially reacting to these warnings or file changes. This fix removes duplicate index definitions from User and Problem models, changes Redis eviction policy to "noeviction", and ensures nodemon only watches relevant code files.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the restart loop - when backend starts and Mongoose emits duplicate index warnings, Redis uses wrong eviction policy, or nodemon detects non-code changes
- **Property (P)**: The desired behavior - backend starts cleanly without warnings, Redis preserves BullMQ data, and nodemon only restarts on actual code changes
- **Preservation**: Existing index performance, BullMQ reliability, and nodemon development workflow must remain unchanged
- **userSchema**: The Mongoose schema in `backend/src/modules/auth/model.js` that defines User model structure
- **problemSchema**: The Mongoose schema in `backend/src/modules/problems/model.js` that defines Problem model structure
- **Duplicate Index**: When both schema field definition (`unique: true`) and explicit `schema.index()` call create the same index, causing Mongoose warnings
- **Eviction Policy**: Redis configuration that determines what happens when memory limit is reached (allkeys-lru evicts any key, noeviction returns errors)
- **BullMQ**: Job queue library that requires persistent Redis storage (cannot tolerate key eviction)

## Bug Details

### Bug Condition

The bug manifests when the backend server starts and encounters three problematic conditions: (1) Mongoose detects duplicate index definitions in User and Problem schemas, (2) Redis is configured with "allkeys-lru" eviction policy that can evict BullMQ job data, and (3) nodemon may restart due to warnings or file changes. The combination creates a restart loop that prevents stable operation.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ServerStartupEvent
  OUTPUT: boolean
  
  RETURN (hasMongooseDuplicateIndexWarnings(input) 
         OR hasRedisWrongEvictionPolicy(input)
         OR hasNodemonIncorrectWatchConfig(input))
         AND serverRestartsRepeatedly(input)
END FUNCTION

FUNCTION hasMongooseDuplicateIndexWarnings(input)
  RETURN (userSchemaHasUniqueFieldAndExplicitIndex('username')
         OR userSchemaHasUniqueFieldAndExplicitIndex('email')
         OR problemSchemaHasUniqueFieldAndExplicitIndex('slug'))
END FUNCTION

FUNCTION hasRedisWrongEvictionPolicy(input)
  RETURN redisEvictionPolicy == 'allkeys-lru'
         AND applicationUsesBullMQ == true
END FUNCTION

FUNCTION hasNodemonIncorrectWatchConfig(input)
  RETURN nodemonWatchesNonCodeFiles(input)
         OR nodemonReactsToLogFiles(input)
END FUNCTION
```

### Examples

- **User Model Duplicate Index**: `userSchema` defines `username: { unique: true }` AND calls `userSchema.index({ username: 1 })`, causing Mongoose to emit "Index already exists" warning during startup
- **Problem Model Duplicate Index**: `problemSchema` defines `slug: { unique: true }` AND calls `problemSchema.index({ slug: 1 })`, causing Mongoose to emit "Index already exists" warning during startup
- **Redis Eviction Issue**: Redis configured with `--maxmemory-policy allkeys-lru` can evict BullMQ job data when memory limit reached, causing job loss and potential application errors
- **Nodemon Restart Loop**: Warnings or file changes trigger nodemon restart, which causes startup sequence to repeat, generating same warnings, creating infinite loop

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- User and Problem queries by indexed fields (username, email, slug) must continue to use indexes for O(log n) performance
- BullMQ job queue must continue to store and process submission jobs reliably
- Nodemon must continue to detect actual code file changes and restart appropriately during development
- All existing authentication, problem management, and submission functionality must work correctly

**Scope:**
All inputs that do NOT involve server startup should be completely unaffected by this fix. This includes:
- Runtime queries to User and Problem collections (indexes remain functional)
- BullMQ job enqueue/dequeue operations (Redis storage remains reliable)
- Code file modifications during development (nodemon continues to watch and restart)
- All API endpoints and business logic (no functional changes)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Mongoose Duplicate Index Definitions**: The User and Problem models define indexes in two places:
   - Field-level: `username: { unique: true }` creates an index automatically
   - Schema-level: `userSchema.index({ username: 1 })` explicitly creates the same index
   - When Mongoose initializes, it detects both and emits warnings about duplicate indexes
   - These warnings may trigger nodemon to detect "changes" and restart

2. **Redis Eviction Policy Mismatch**: The docker-compose.yml configures Redis with:
   - `--maxmemory-policy allkeys-lru` which evicts any key when memory limit reached
   - BullMQ requires persistent storage and cannot tolerate key eviction
   - Correct policy should be `noeviction` which returns errors instead of evicting keys
   - This prevents silent job data loss

3. **Nodemon Watch Configuration**: Nodemon may be watching files that shouldn't trigger restarts:
   - No explicit nodemon.json configuration exists, so default watch patterns apply
   - Defaults may include log files, temp files, or other non-code artifacts
   - Need to configure nodemon to only watch relevant code files (*.js, *.json)

## Correctness Properties

Property 1: Bug Condition - Clean Server Startup

_For any_ server startup event where the backend initializes Mongoose models and connects to Redis, the fixed system SHALL start without Mongoose duplicate index warnings, SHALL use Redis "noeviction" policy to preserve BullMQ job data, and SHALL NOT trigger nodemon restarts due to non-code changes.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Index Performance and Functionality

_For any_ database query or BullMQ operation that does NOT involve server startup (runtime queries, job processing, code modifications), the fixed system SHALL produce exactly the same behavior as the original system, preserving index-based query performance, BullMQ job reliability, and nodemon development workflow.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `backend/src/modules/auth/model.js`

**Function**: User schema definition

**Specific Changes**:
1. **Remove Duplicate Username Index**: Delete the line `userSchema.index({ username: 1 });` because `username: { unique: true }` already creates this index
2. **Remove Duplicate Email Index**: Delete the line `userSchema.index({ email: 1 });` because `email: { unique: true }` already creates this index
3. **Keep Unique Constraints**: Retain `unique: true` in field definitions as they provide both validation and index creation
4. **Update Comments**: Modify the "Database Indexes" comment section to clarify that indexes are created by `unique: true` constraint

**File 2**: `backend/src/modules/problems/model.js`

**Function**: Problem schema definition

**Specific Changes**:
1. **Remove Duplicate Slug Index**: Delete the line `problemSchema.index({ slug: 1 });` because `slug: { unique: true }` already creates this index
2. **Keep Non-Duplicate Indexes**: Retain `problemSchema.index({ status: 1 })` and `problemSchema.index({ authorId: 1 })` as these fields don't have `unique: true`
3. **Update Comments**: Modify the "Database Indexes" comment section to clarify which indexes are explicit vs created by unique constraints

**File 3**: `docker-compose.yml`

**Service**: redis

**Specific Changes**:
1. **Change Eviction Policy**: Replace `--maxmemory-policy allkeys-lru` with `--maxmemory-policy noeviction` in the redis command
2. **Rationale**: BullMQ requires persistent storage and cannot tolerate key eviction; noeviction returns errors when memory full instead of silently evicting job data
3. **Keep Other Settings**: Retain `--maxmemory 256mb` and `--save 900 1` settings as they are correct

**File 4**: `backend/nodemon.json` (create new file)

**Purpose**: Configure nodemon to only watch relevant code files

**Specific Changes**:
1. **Create Configuration File**: Add `backend/nodemon.json` with explicit watch patterns
2. **Watch Code Files**: Configure to watch `*.js` files in `src/` directory
3. **Ignore Non-Code Files**: Explicitly ignore `node_modules/`, `coverage/`, `*.log`, `*.test.js` files
4. **Set Restart Delay**: Add small delay to prevent rapid restart loops
5. **Configuration Content**:
```json
{
  "watch": ["src/**/*.js", "server.js"],
  "ignore": ["node_modules/", "coverage/", "*.log", "*.test.js"],
  "ext": "js,json",
  "delay": 1000
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code (duplicate index warnings, wrong Redis policy, restart loop), then verify the fixes work correctly and preserve existing behavior (index performance, BullMQ reliability, nodemon functionality).

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Start the backend server with unfixed code and observe container logs for Mongoose warnings, check Redis configuration, and monitor for restart loops. Document the exact warnings and restart patterns.

**Test Cases**:
1. **Mongoose Duplicate Index Test**: Start backend and grep logs for "Index already exists" or duplicate index warnings (will fail on unfixed code - warnings present)
2. **Redis Eviction Policy Test**: Inspect running Redis container with `redis-cli CONFIG GET maxmemory-policy` (will fail on unfixed code - returns "allkeys-lru")
3. **Nodemon Restart Loop Test**: Start backend with `npm run dev` and monitor for repeated startup sequences in logs (will fail on unfixed code - continuous restarts)
4. **Startup Stability Test**: Measure time to stable state - unfixed code never reaches stable state (will fail on unfixed code - infinite loop)

**Expected Counterexamples**:
- Mongoose emits warnings like "Index with name: username_1 already exists with different options"
- Redis reports `maxmemory-policy: allkeys-lru` instead of `noeviction`
- Container logs show repeated "Starting server..." messages without reaching stable running state
- Possible causes: duplicate index definitions, wrong Redis config, nodemon watching wrong files

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (server startup), the fixed system produces the expected behavior (clean startup, correct Redis policy, stable operation).

**Pseudocode:**
```
FOR ALL startupEvent WHERE isBugCondition(startupEvent) DO
  result := startBackendServer_fixed(startupEvent)
  ASSERT noMongooseWarnings(result)
  ASSERT redisEvictionPolicy(result) == 'noeviction'
  ASSERT serverReachesStableState(result)
  ASSERT noRestartLoop(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (runtime operations), the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL operation WHERE NOT isBugCondition(operation) DO
  ASSERT originalSystem(operation) = fixedSystem(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various queries, job operations)
- It catches edge cases that manual unit tests might miss (unusual query patterns, edge case job data)
- It provides strong guarantees that behavior is unchanged for all runtime operations

**Test Plan**: Observe behavior on UNFIXED code first for queries and BullMQ operations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Index Performance Preservation**: Query users by username/email and problems by slug on both unfixed and fixed code, verify same query execution time and index usage
2. **BullMQ Reliability Preservation**: Enqueue submission jobs on both systems, verify jobs are stored and processed identically
3. **Nodemon Development Workflow Preservation**: Modify a source file on both systems, verify nodemon detects change and restarts appropriately
4. **API Functionality Preservation**: Run full integration test suite on both systems, verify all endpoints return identical responses

### Unit Tests

- Test that User model has username and email indexes (via unique constraint, not explicit index call)
- Test that Problem model has slug index (via unique constraint) and status/authorId indexes (explicit)
- Test that Redis connection uses noeviction policy
- Test that nodemon configuration only watches relevant files

### Property-Based Tests

- Generate random user queries (by username, email, id) and verify index usage is identical on fixed code
- Generate random problem queries (by slug, status, authorId) and verify index usage is identical on fixed code
- Generate random BullMQ job data and verify jobs are stored/processed identically on fixed code
- Generate random file modification events and verify nodemon restart behavior is appropriate

### Integration Tests

- Test full backend startup sequence with fixed code, verify no warnings in logs
- Test Redis memory pressure scenario (fill to maxmemory), verify noeviction returns errors instead of evicting keys
- Test nodemon restart on actual code change, verify server restarts and reaches stable state
- Test that all existing integration tests pass with fixed code (authentication, problems, submissions)
