# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Backend Restart Loop Detection
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the restart loop exists
  - **Scoped PBT Approach**: Test concrete failing scenarios - Mongoose duplicate index warnings, Redis wrong eviction policy, and nodemon restart loop
  - Test that backend startup produces Mongoose duplicate index warnings for User.username, User.email, and Problem.slug
  - Test that Redis is configured with "allkeys-lru" eviction policy instead of "noeviction"
  - Test that nodemon triggers restarts when warnings occur, creating a continuous loop
  - Test that backend never reaches stable running state (continuous restart pattern)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - Mongoose warnings: "Index with name: username_1 already exists with different options"
    - Redis policy: `maxmemory-policy: allkeys-lru` instead of `noeviction`
    - Container logs show repeated "Starting server..." messages without stable state
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Index Performance and BullMQ Reliability
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (runtime queries, job operations)
  - Write property-based tests capturing observed behavior patterns:
    - User queries by username/email use indexes for O(log n) performance
    - Problem queries by slug use indexes for O(log n) performance
    - BullMQ jobs are stored and processed reliably in Redis
    - Nodemon detects actual code file changes and restarts appropriately
    - All existing API functionality works correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix backend restart loop

  - [x] 3.1 Remove duplicate Mongoose indexes from User model
    - Open `backend/src/modules/auth/model.js`
    - Remove line `userSchema.index({ username: 1 });` (duplicate of `username: { unique: true }`)
    - Remove line `userSchema.index({ email: 1 });` (duplicate of `email: { unique: true }`)
    - Keep `unique: true` in field definitions (provides both validation and index creation)
    - Update "Database Indexes" comment section to clarify indexes are created by unique constraints
    - _Bug_Condition: hasMongooseDuplicateIndexWarnings(input) where userSchemaHasUniqueFieldAndExplicitIndex('username') OR userSchemaHasUniqueFieldAndExplicitIndex('email')_
    - _Expected_Behavior: noMongooseWarnings(result) from design_
    - _Preservation: User queries by username/email continue to use indexes for O(log n) performance_
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 3.2 Remove duplicate Mongoose indexes from Problem model
    - Open `backend/src/modules/problems/model.js`
    - Remove line `problemSchema.index({ slug: 1 });` (duplicate of `slug: { unique: true }`)
    - Keep `problemSchema.index({ status: 1 })` and `problemSchema.index({ authorId: 1 })` (not duplicates)
    - Update "Database Indexes" comment section to clarify which indexes are explicit vs created by unique constraints
    - _Bug_Condition: hasMongooseDuplicateIndexWarnings(input) where problemSchemaHasUniqueFieldAndExplicitIndex('slug')_
    - _Expected_Behavior: noMongooseWarnings(result) from design_
    - _Preservation: Problem queries by slug continue to use indexes for O(log n) performance_
    - _Requirements: 1.1, 2.1, 3.2_

  - [x] 3.3 Fix Redis eviction policy in docker-compose.yml
    - Open `docker-compose.yml`
    - In redis service command, replace `--maxmemory-policy allkeys-lru` with `--maxmemory-policy noeviction`
    - Rationale: BullMQ requires persistent storage and cannot tolerate key eviction; noeviction returns errors when memory full instead of silently evicting job data
    - Keep other Redis settings: `--maxmemory 256mb` and `--save 900 1`
    - _Bug_Condition: hasRedisWrongEvictionPolicy(input) where redisEvictionPolicy == 'allkeys-lru' AND applicationUsesBullMQ == true_
    - _Expected_Behavior: redisEvictionPolicy(result) == 'noeviction' from design_
    - _Preservation: BullMQ jobs continue to be stored and processed reliably_
    - _Requirements: 1.2, 2.2, 3.3_

  - [x] 3.4 Create nodemon configuration file
    - Create `backend/nodemon.json` with explicit watch patterns
    - Configure to watch `*.js` files in `src/` directory and `server.js`
    - Explicitly ignore `node_modules/`, `coverage/`, `*.log`, `*.test.js` files
    - Add small delay (1000ms) to prevent rapid restart loops
    - Configuration content:
      ```json
      {
        "watch": ["src/**/*.js", "server.js"],
        "ignore": ["node_modules/", "coverage/", "*.log", "*.test.js"],
        "ext": "js,json",
        "delay": 1000
      }
      ```
    - _Bug_Condition: hasNodemonIncorrectWatchConfig(input) where nodemonWatchesNonCodeFiles(input) OR nodemonReactsToLogFiles(input)_
    - _Expected_Behavior: nodemon only watches relevant code files and does not trigger restarts on non-code changes_
    - _Preservation: Nodemon continues to detect actual code file changes and restart appropriately_
    - _Requirements: 1.3, 2.3, 3.4_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Clean Backend Startup
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify no Mongoose duplicate index warnings in logs
    - Verify Redis uses "noeviction" policy
    - Verify backend reaches stable running state without restart loop
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Index Performance and BullMQ Reliability
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm User and Problem queries still use indexes efficiently
    - Confirm BullMQ jobs are still stored and processed reliably
    - Confirm nodemon still detects code changes appropriately
    - Confirm all existing API functionality still works correctly

- [x] 4. Checkpoint - Ensure all tests pass
  - Restart backend with `docker-compose up --build api`
  - Monitor container logs for clean startup (no warnings, no restart loop)
  - Verify backend reaches stable running state
  - Run all property-based tests and verify they pass
  - Test user registration/login (uses username/email indexes)
  - Test problem listing (uses slug/status indexes)
  - Test submission job enqueue (uses BullMQ/Redis)
  - Modify a source file and verify nodemon restarts once (not loop)
  - Ask the user if questions arise
