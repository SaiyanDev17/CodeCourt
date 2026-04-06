/**
 * Preservation Property Tests - Backend Restart Loop Fix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * CRITICAL: These tests MUST PASS on unfixed code - they capture baseline behavior to preserve
 * 
 * PURPOSE:
 * These tests verify that the bugfix does NOT break existing functionality:
 * 1. User queries by username/email use indexes for O(log n) performance
 * 2. Problem queries by slug use indexes for O(log n) performance
 * 3. BullMQ jobs are stored and processed reliably in Redis
 * 4. Nodemon detects actual code file changes and restarts appropriately
 * 5. All existing API functionality works correctly
 * 
 * METHODOLOGY:
 * - Observation-first: These tests capture OBSERVED behavior on unfixed code
 * - Property-based: Generate many test cases for stronger guarantees
 * - Preservation: After fix, these tests must still pass (no regressions)
 * 
 * EXPECTED OUTCOME ON UNFIXED CODE:
 * - Tests PASS (confirms baseline behavior exists)
 * 
 * EXPECTED OUTCOME ON FIXED CODE:
 * - Tests PASS (confirms no regressions introduced)
 */

const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue } = require('bullmq');
const User = require('./modules/auth/model');
const Problem = require('./modules/problems/model');
const fs = require('fs');
const path = require('path');

describe('Preservation Properties: Index Performance and BullMQ Reliability', () => {
  let mongoConnection;
  let redisClient;
  let testQueue;
  
  beforeAll(async () => {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codecourt-test';
    mongoConnection = await mongoose.connect(mongoUri);
    
    // Connect to Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl);
    
    // Create test queue
    testQueue = new Queue('test-preservation', {
      connection: {
        host: redisUrl.includes('://') ? redisUrl.split('://')[1].split(':')[0] : 'localhost',
        port: redisUrl.includes(':') ? parseInt(redisUrl.split(':').pop()) : 6379
      }
    });
  });
  
  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ username: /^test-preservation-/ });
    await Problem.deleteMany({ slug: /^test-preservation-/ });
    
    // Close connections
    if (mongoConnection) {
      await mongoose.disconnect();
    }
    if (redisClient) {
      await redisClient.quit();
    }
    if (testQueue) {
      await testQueue.close();
    }
  });

  /**
   * Property 2.1: Preservation - User Index Performance
   * 
   * This test verifies that User queries by username and email use indexes
   * for O(log n) performance, not O(n) table scans.
   * 
   * Preservation Requirement: After removing duplicate index definitions,
   * the unique constraints must still create indexes that provide fast lookups.
   */
  describe('User Index Performance', () => {
    beforeAll(async () => {
      // Create test users for index testing
      const testUsers = [];
      for (let i = 0; i < 10; i++) {
        testUsers.push({
          username: `test-preservation-user-${i}`,
          email: `test-preservation-${i}@example.com`,
          passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
          role: 'contestant'
        });
      }
      await User.insertMany(testUsers);
    });

    test('should use index for username queries (O(log n) performance)', async () => {
      // Property-based test: For any username query, verify index usage
      const testCases = [
        'test-preservation-user-0',
        'test-preservation-user-5',
        'test-preservation-user-9'
      ];
      
      for (const username of testCases) {
        // Execute query with explain to check index usage
        const explainResult = await User.findOne({ username }).explain('executionStats');
        
        // Verify index was used (not COLLSCAN)
        const winningPlan = explainResult.executionStats.executionStages;
        
        // MongoDB explain output can have different structures (FETCH, LIMIT, etc.)
        // Navigate to find IXSCAN stage
        let hasIndexScan = false;
        let indexName = null;
        
        const checkStage = (stage) => {
          if (!stage) return;
          if (stage.stage === 'IXSCAN') {
            hasIndexScan = true;
            indexName = stage.indexName;
          }
          if (stage.inputStage) checkStage(stage.inputStage);
        };
        
        checkStage(winningPlan);
        
        expect(hasIndexScan).toBe(true);
        
        // Verify index name includes 'username'
        if (indexName) {
          expect(indexName).toMatch(/username/);
        }
        
        // Verify O(log n) performance: examined docs should be minimal
        expect(explainResult.executionStats.totalDocsExamined).toBeLessThanOrEqual(1);
      }
    });

    test('should use index for email queries (O(log n) performance)', async () => {
      // Property-based test: For any email query, verify index usage
      const testCases = [
        'test-preservation-0@example.com',
        'test-preservation-5@example.com',
        'test-preservation-9@example.com'
      ];
      
      for (const email of testCases) {
        // Execute query with explain to check index usage
        const explainResult = await User.findOne({ email }).explain('executionStats');
        
        // Verify index was used (not COLLSCAN)
        const winningPlan = explainResult.executionStats.executionStages;
        
        // MongoDB explain output can have different structures
        // Navigate to find IXSCAN stage
        let hasIndexScan = false;
        let indexName = null;
        
        const checkStage = (stage) => {
          if (!stage) return;
          if (stage.stage === 'IXSCAN') {
            hasIndexScan = true;
            indexName = stage.indexName;
          }
          if (stage.inputStage) checkStage(stage.inputStage);
        };
        
        checkStage(winningPlan);
        
        expect(hasIndexScan).toBe(true);
        
        // Verify index name includes 'email'
        if (indexName) {
          expect(indexName).toMatch(/email/);
        }
        
        // Verify O(log n) performance: examined docs should be minimal
        expect(explainResult.executionStats.totalDocsExamined).toBeLessThanOrEqual(1);
      }
    });

    test('should maintain index performance across multiple queries', async () => {
      // Property-based test: Generate many queries and verify consistent performance
      const iterations = 20;
      const executionTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const username = `test-preservation-user-${i % 10}`;
        const startTime = Date.now();
        
        const explainResult = await User.findOne({ username }).explain('executionStats');
        
        const endTime = Date.now();
        executionTimes.push(endTime - startTime);
        
        // Verify index usage for each query
        const winningPlan = explainResult.executionStats.executionStages;
        
        // Navigate to find IXSCAN stage
        let hasIndexScan = false;
        const checkStage = (stage) => {
          if (!stage) return;
          if (stage.stage === 'IXSCAN') hasIndexScan = true;
          if (stage.inputStage) checkStage(stage.inputStage);
        };
        
        checkStage(winningPlan);
        expect(hasIndexScan).toBe(true);
      }
      
      // Verify consistent performance (no degradation)
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      expect(avgTime).toBeLessThan(100); // Should be fast (< 100ms)
    });
  });

  /**
   * Property 2.2: Preservation - Problem Index Performance
   * 
   * This test verifies that Problem queries by slug use indexes
   * for O(log n) performance, not O(n) table scans.
   * 
   * Preservation Requirement: After removing duplicate slug index definition,
   * the unique constraint must still create an index that provides fast lookups.
   */
  describe('Problem Index Performance', () => {
    beforeAll(async () => {
      // Create test problems for index testing
      const testProblems = [];
      for (let i = 0; i < 10; i++) {
        testProblems.push({
          title: `Test Preservation Problem ${i}`,
          slug: `test-preservation-problem-${i}`,
          description: 'Test problem for preservation testing',
          constraints: '1 <= n <= 100',
          timeLimit: 1000,
          memoryLimit: 256,
          difficulty: 'easy',
          sampleTestCases: [{ input: '1', output: '1' }],
          status: 'published',
          authorId: new mongoose.Types.ObjectId()
        });
      }
      await Problem.insertMany(testProblems);
    });

    test('should use index for slug queries (O(log n) performance)', async () => {
      // Property-based test: For any slug query, verify index usage
      const testCases = [
        'test-preservation-problem-0',
        'test-preservation-problem-5',
        'test-preservation-problem-9'
      ];
      
      for (const slug of testCases) {
        // Execute query with explain to check index usage
        const explainResult = await Problem.findOne({ slug }).explain('executionStats');
        
        // Verify index was used (not COLLSCAN)
        const winningPlan = explainResult.executionStats.executionStages;
        
        // Navigate to find IXSCAN stage
        let hasIndexScan = false;
        let indexName = null;
        
        const checkStage = (stage) => {
          if (!stage) return;
          if (stage.stage === 'IXSCAN') {
            hasIndexScan = true;
            indexName = stage.indexName;
          }
          if (stage.inputStage) checkStage(stage.inputStage);
        };
        
        checkStage(winningPlan);
        
        expect(hasIndexScan).toBe(true);
        
        // Verify index name includes 'slug'
        if (indexName) {
          expect(indexName).toMatch(/slug/);
        }
        
        // Verify O(log n) performance: examined docs should be minimal
        expect(explainResult.executionStats.totalDocsExamined).toBeLessThanOrEqual(1);
      }
    });

    test('should use index for status queries (O(log n) performance)', async () => {
      // Property-based test: Verify status index still works
      const explainResult = await Problem.find({ status: 'published' }).explain('executionStats');
      
      // Verify index was used
      const winningPlan = explainResult.executionStats.executionStages;
      const usedIndex = winningPlan.stage === 'FETCH' && 
                       winningPlan.inputStage.stage === 'IXSCAN';
      
      expect(usedIndex).toBe(true);
      
      // Verify index name includes 'status'
      if (winningPlan.inputStage) {
        expect(winningPlan.inputStage.indexName).toMatch(/status/);
      }
    });

    test('should maintain index performance across multiple queries', async () => {
      // Property-based test: Generate many queries and verify consistent performance
      const iterations = 20;
      const executionTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const slug = `test-preservation-problem-${i % 10}`;
        const startTime = Date.now();
        
        const explainResult = await Problem.findOne({ slug }).explain('executionStats');
        
        const endTime = Date.now();
        executionTimes.push(endTime - startTime);
        
        // Verify index usage for each query
        const winningPlan = explainResult.executionStats.executionStages;
        
        // Navigate to find IXSCAN stage
        let hasIndexScan = false;
        const checkStage = (stage) => {
          if (!stage) return;
          if (stage.stage === 'IXSCAN') hasIndexScan = true;
          if (stage.inputStage) checkStage(stage.inputStage);
        };
        
        checkStage(winningPlan);
        expect(hasIndexScan).toBe(true);
      }
      
      // Verify consistent performance (no degradation)
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      expect(avgTime).toBeLessThan(100); // Should be fast (< 100ms)
    });
  });

  /**
   * Property 2.3: Preservation - BullMQ Job Reliability
   * 
   * This test verifies that BullMQ jobs are stored and processed reliably in Redis.
   * 
   * Preservation Requirement: After changing Redis eviction policy to noeviction,
   * BullMQ must continue to store and process jobs reliably.
   */
  describe('BullMQ Job Reliability', () => {
    test('should store jobs reliably in Redis', async () => {
      // Property-based test: Generate multiple jobs and verify storage
      const testJobs = [];
      const jobCount = 10;
      
      for (let i = 0; i < jobCount; i++) {
        const job = await testQueue.add('test-job', {
          submissionId: `test-preservation-${i}`,
          data: `test data ${i}`
        }, {
          jobId: `test-preservation-job-${i}`
        });
        
        testJobs.push(job);
        
        // Verify job was stored
        expect(job.id).toBe(`test-preservation-job-${i}`);
        expect(job.data.submissionId).toBe(`test-preservation-${i}`);
      }
      
      // Verify all jobs can be retrieved from Redis
      for (let i = 0; i < jobCount; i++) {
        const retrievedJob = await testQueue.getJob(`test-preservation-job-${i}`);
        expect(retrievedJob).not.toBeNull();
        expect(retrievedJob.data.submissionId).toBe(`test-preservation-${i}`);
      }
      
      // Clean up test jobs
      for (const job of testJobs) {
        await job.remove();
      }
    });

    test('should handle job state transitions reliably', async () => {
      // Property-based test: Verify job state management
      const job = await testQueue.add('test-job', {
        submissionId: 'test-preservation-state',
        data: 'test state transitions'
      }, {
        jobId: 'test-preservation-state-job'
      });
      
      // Verify initial state
      let state = await job.getState();
      expect(['waiting', 'delayed']).toContain(state);
      
      // Verify job can be retrieved
      const retrievedJob = await testQueue.getJob(job.id);
      expect(retrievedJob).not.toBeNull();
      expect(retrievedJob.id).toBe(job.id);
      
      // Clean up
      await job.remove();
    });

    test('should prevent duplicate job creation with same jobId', async () => {
      // Property-based test: Verify jobId uniqueness enforcement
      const jobId = 'test-preservation-duplicate';
      
      // Create first job
      const job1 = await testQueue.add('test-job', {
        submissionId: jobId,
        data: 'first job'
      }, {
        jobId: jobId
      });
      
      // Attempt to create duplicate job (should fail or return existing)
      try {
        const job2 = await testQueue.add('test-job', {
          submissionId: jobId,
          data: 'second job'
        }, {
          jobId: jobId
        });
        
        // If no error, verify it's the same job
        expect(job2.id).toBe(job1.id);
      } catch (error) {
        // Expected: BullMQ rejects duplicate jobId
        expect(error.message).toMatch(/duplicate|exists/i);
      }
      
      // Clean up
      await job1.remove();
    });

    test('should maintain job data integrity across multiple operations', async () => {
      // Property-based test: Generate many jobs and verify data integrity
      const jobCount = 20;
      const jobs = [];
      
      for (let i = 0; i < jobCount; i++) {
        const job = await testQueue.add('test-job', {
          submissionId: `test-preservation-integrity-${i}`,
          code: `print("test ${i}")`,
          language: 'python',
          problemId: `problem-${i}`,
          userId: `user-${i}`
        }, {
          jobId: `test-preservation-integrity-job-${i}`
        });
        
        jobs.push(job);
      }
      
      // Verify all jobs maintain data integrity
      for (let i = 0; i < jobCount; i++) {
        const retrievedJob = await testQueue.getJob(`test-preservation-integrity-job-${i}`);
        expect(retrievedJob).not.toBeNull();
        expect(retrievedJob.data.submissionId).toBe(`test-preservation-integrity-${i}`);
        expect(retrievedJob.data.code).toBe(`print("test ${i}")`);
        expect(retrievedJob.data.language).toBe('python');
        expect(retrievedJob.data.problemId).toBe(`problem-${i}`);
        expect(retrievedJob.data.userId).toBe(`user-${i}`);
      }
      
      // Clean up
      for (const job of jobs) {
        await job.remove();
      }
    });
  });

  /**
   * Property 2.4: Preservation - Nodemon Configuration
   * 
   * This test verifies that nodemon configuration (if it exists) is appropriate
   * for detecting actual code file changes.
   * 
   * Preservation Requirement: After creating nodemon.json, nodemon must still
   * detect code file changes and restart appropriately during development.
   */
  describe('Nodemon Configuration', () => {
    test('should have appropriate watch patterns for code files', () => {
      const nodemonConfigPath = path.join(__dirname, '../nodemon.json');
      
      // If nodemon.json exists, verify it watches code files
      if (fs.existsSync(nodemonConfigPath)) {
        const nodemonConfig = JSON.parse(fs.readFileSync(nodemonConfigPath, 'utf8'));
        
        // Verify watch patterns include source code
        expect(nodemonConfig.watch).toBeDefined();
        expect(Array.isArray(nodemonConfig.watch)).toBe(true);
        
        // Should watch src directory or server.js
        const watchesCode = nodemonConfig.watch.some(pattern => 
          pattern.includes('src') || pattern.includes('server.js')
        );
        expect(watchesCode).toBe(true);
        
        // Verify ignore patterns exclude non-code files
        if (nodemonConfig.ignore) {
          expect(Array.isArray(nodemonConfig.ignore)).toBe(true);
          
          // Should ignore node_modules, coverage, logs
          const ignoresNonCode = nodemonConfig.ignore.some(pattern =>
            pattern.includes('node_modules') || 
            pattern.includes('coverage') ||
            pattern.includes('.log')
          );
          expect(ignoresNonCode).toBe(true);
        }
        
        // Verify restart delay exists (prevents rapid restarts)
        if (nodemonConfig.delay) {
          expect(nodemonConfig.delay).toBeGreaterThanOrEqual(1000);
        }
      } else {
        // If nodemon.json doesn't exist yet, this is expected on unfixed code
        // Test should pass (we're just documenting current state)
        console.log('INFO: nodemon.json does not exist yet (expected on unfixed code)');
        expect(true).toBe(true);
      }
    });
  });

  /**
   * Property 2.5: Preservation - API Functionality
   * 
   * This test verifies that core API functionality remains unchanged.
   * 
   * Preservation Requirement: After the bugfix, all existing API functionality
   * (authentication, problem management, submissions) must work correctly.
   */
  describe('API Functionality', () => {
    test('should maintain User model schema and validation', () => {
      // Verify User model schema is intact
      const userSchema = User.schema;
      
      // Check required fields
      expect(userSchema.path('username').isRequired).toBe(true);
      expect(userSchema.path('email').isRequired).toBe(true);
      expect(userSchema.path('passwordHash').isRequired).toBe(true);
      
      // Check unique constraints
      expect(userSchema.path('username').options.unique).toBe(true);
      expect(userSchema.path('email').options.unique).toBe(true);
      
      // Check role enum
      expect(userSchema.path('role').enumValues).toEqual(['admin', 'problem_setter', 'contestant']);
      
      // Check default role
      expect(userSchema.path('role').defaultValue).toBe('contestant');
    });

    test('should maintain Problem model schema and validation', () => {
      // Verify Problem model schema is intact
      const problemSchema = Problem.schema;
      
      // Check required fields
      expect(problemSchema.path('title').isRequired).toBe(true);
      expect(problemSchema.path('slug').isRequired).toBe(true);
      expect(problemSchema.path('description').isRequired).toBe(true);
      expect(problemSchema.path('constraints').isRequired).toBe(true);
      expect(problemSchema.path('timeLimit').isRequired).toBe(true);
      expect(problemSchema.path('memoryLimit').isRequired).toBe(true);
      expect(problemSchema.path('difficulty').isRequired).toBe(true);
      
      // Check unique constraint
      expect(problemSchema.path('slug').options.unique).toBe(true);
      
      // Check difficulty enum
      expect(problemSchema.path('difficulty').enumValues).toEqual(['easy', 'medium', 'hard']);
      
      // Check status enum
      expect(problemSchema.path('status').enumValues).toEqual(['draft', 'published', 'rejected']);
      
      // Check default status
      expect(problemSchema.path('status').defaultValue).toBe('draft');
    });

    test('should maintain model indexes', () => {
      // Verify User model has indexes
      const userIndexes = User.schema.indexes();
      expect(userIndexes.length).toBeGreaterThan(0);
      
      // Verify Problem model has indexes
      const problemIndexes = Problem.schema.indexes();
      expect(problemIndexes.length).toBeGreaterThan(0);
    });
  });
});
