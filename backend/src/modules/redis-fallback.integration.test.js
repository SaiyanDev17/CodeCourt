// Integration test: System functionality when Redis is completely unavailable
// NOTE: This is an INTEGRATION TEST that requires MongoDB and Redis to be running.
// Run with: npm run test:integration
// Or skip with: npm test (runs unit tests only)
const redis = require('../config/redis');
const { closeRedis } = require('../config/redis');
const { connectDB, closeDB } = require('../config/db');
const User = require('./auth/model');
const Problem = require('./problems/model');
const { Contest } = require('./contests/model');

describe('Redis Unavailability Integration Tests', () => {
  let originalRedisGet;
  let originalRedisSetex;
  let originalRedisDel;

  beforeAll(async () => {
    await connectDB();
    
    // Mock Redis to simulate complete unavailability
    originalRedisGet = redis.get;
    originalRedisSetex = redis.setex;
    originalRedisDel = redis.del;
    
    redis.get = jest.fn().mockRejectedValue(new Error('Redis unavailable'));
    redis.setex = jest.fn().mockRejectedValue(new Error('Redis unavailable'));
    redis.del = jest.fn().mockRejectedValue(new Error('Redis unavailable'));
  });

  afterAll(async () => {
    // Restore original Redis methods
    redis.get = originalRedisGet;
    redis.setex = originalRedisSetex;
    redis.del = originalRedisDel;
    
    // Close connections
    await closeDB();
    await closeRedis();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({ username: /^redis-test-/ });
    await Problem.deleteMany({ slug: /^redis-test-/ });
    await Contest.deleteMany({ title: /^Redis Test/ });
  });

  describe('User Profile Operations', () => {
    it('should fetch user profile from MongoDB when Redis is down', async () => {
      // Create test user
      const testUser = await User.create({
        username: 'redis-test-user',
        email: 'redis-test@example.com',
        passwordHash: 'hashed',
        role: 'contestant'
      });

      const userService = require('./users/service');
      const profile = await userService.getUserProfile('redis-test-user');

      expect(profile).toBeDefined();
      expect(profile.username).toBe('redis-test-user');
      expect(profile.email).toBe('redis-test@example.com');
    });

    it('should update user role when Redis is down', async () => {
      const testUser = await User.create({
        username: 'redis-test-user2',
        email: 'redis-test2@example.com',
        passwordHash: 'hashed',
        role: 'contestant'
      });

      const userService = require('./users/service');
      const updated = await userService.updateUserRole(testUser._id, 'problem_setter');

      expect(updated).toBeDefined();
      expect(updated.role).toBe('problem_setter');
    });
  });

  describe('Problem Operations', () => {
    it('should list published problems from MongoDB when Redis is down', async () => {
      // Create test problems
      await Problem.create({
        title: 'Redis Test Problem 1',
        slug: 'redis-test-problem-1',
        difficulty: 'easy',
        status: 'published',
        authorId: '507f1f77bcf86cd799439011',
        description: 'Test',
        constraints: 'Test',
        timeLimit: 1000,
        memoryLimit: 256,
        sampleTestCases: []
      });

      await Problem.create({
        title: 'Redis Test Problem 2',
        slug: 'redis-test-problem-2',
        difficulty: 'medium',
        status: 'published',
        authorId: '507f1f77bcf86cd799439011',
        description: 'Test',
        constraints: 'Test',
        timeLimit: 1000,
        memoryLimit: 256,
        sampleTestCases: []
      });

      const problemService = require('./problems/service');
      const problems = await problemService.listPublished();

      const testProblems = problems.filter(p => p.slug.startsWith('redis-test-'));
      expect(testProblems.length).toBeGreaterThanOrEqual(2);
    });

    it('should update problem when Redis is down', async () => {
      const testProblem = await Problem.create({
        title: 'Redis Test Problem',
        slug: 'redis-test-problem-update',
        difficulty: 'easy',
        status: 'draft',
        authorId: '507f1f77bcf86cd799439011',
        description: 'Original',
        constraints: 'Test',
        timeLimit: 1000,
        memoryLimit: 256,
        sampleTestCases: []
      });

      const problemService = require('./problems/service');
      const updated = await problemService.update(
        testProblem._id,
        { description: 'Updated' },
        '507f1f77bcf86cd799439011'
      );

      expect(updated).toBeDefined();
      expect(updated.description).toBe('Updated');
    });

    it('should approve problem when Redis is down', async () => {
      const testProblem = await Problem.create({
        title: 'Redis Test Problem Approve',
        slug: 'redis-test-problem-approve',
        difficulty: 'easy',
        status: 'draft',
        authorId: '507f1f77bcf86cd799439011',
        description: 'Test',
        constraints: 'Test',
        timeLimit: 1000,
        memoryLimit: 256,
        sampleTestCases: []
      });

      const problemService = require('./problems/service');
      const approved = await problemService.approve(testProblem._id);

      expect(approved).toBeDefined();
      expect(approved.status).toBe('published');
    });
  });

  describe('Contest Operations', () => {
    it('should fetch leaderboard from MongoDB when Redis is down', async () => {
      const testContest = await Contest.create({
        title: 'Redis Test Contest',
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-01T02:00:00Z'),
        problemIds: [],
        createdBy: '507f1f77bcf86cd799439011',
        status: 'ongoing',
        participants: []
      });

      const contestService = require('./contests/service');
      const leaderboard = await contestService.getLeaderboard(testContest._id);

      expect(leaderboard).toBeDefined();
      expect(Array.isArray(leaderboard)).toBe(true);
    });
  });

  describe('System-wide Verification', () => {
    it('should log warnings but continue operations when Redis is unavailable', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Perform various operations
      const userService = require('./users/service');
      const problemService = require('./problems/service');
      
      await problemService.listPublished();
      
      // Verify warnings were logged
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnings = consoleWarnSpy.mock.calls.map(call => call[0]);
      const redisWarnings = warnings.filter(w => 
        typeof w === 'string' && w.includes('Redis')
      );
      expect(redisWarnings.length).toBeGreaterThan(0);

      consoleWarnSpy.mockRestore();
    });
  });
});
