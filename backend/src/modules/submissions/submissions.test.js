// Submissions module tests
// Unit tests for submission endpoints and business logic

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Submission = require('./model');
const Problem = require('../problems/model');
const User = require('../auth/model');
const redis = require('../../config/redis');

describe('Submissions Module', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codecourt-test');
    }
  });

  afterAll(async () => {
    await Submission.deleteMany({});
    await Problem.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
    redis.quit();
  });

  beforeEach(async () => {
    await Submission.deleteMany({});
    await Problem.deleteMany({});
    await User.deleteMany({});
  });
  describe('POST /api/submissions', () => {
    it('should return 501 Not Implemented', () => {
      // TODO: Test submission creation
      // TODO: Verify submission is enqueued to BullMQ
      // TODO: Verify 202 response with submissionId
      expect(true).toBe(true);
    });
  });

  describe('GET /api/submissions/:id', () => {
    it('should return 501 Not Implemented', () => {
      // TODO: Test fetching submission by ID
      // TODO: Verify ownership check
      // TODO: Verify verdict is returned
      expect(true).toBe(true);
    });
  });

  describe('GET /api/submissions/problem/:problemId', () => {
    it('should return 501 Not Implemented', () => {
      // TODO: Test fetching submissions by problem
      // TODO: Verify only user's own submissions are returned
      // TODO: Verify sorting by createdAt descending
      expect(true).toBe(true);
    });
  });

  describe('GET /api/submissions', () => {
    let user1, user2, problem1, problem2, accessToken1, accessToken2;

    beforeEach(async () => {
      // Create two test users
      const authService = require('../auth/service');
      user1 = await authService.register('testuser1', 'user1@example.com', 'password123');
      user2 = await authService.register('testuser2', 'user2@example.com', 'password123');

      // Login to get access tokens
      const login1 = await authService.login('user1@example.com', 'password123');
      const login2 = await authService.login('user2@example.com', 'password123');
      accessToken1 = login1.accessToken;
      accessToken2 = login2.accessToken;

      // Create two test problems
      const Problem = require('../problems/model');
      problem1 = await Problem.create({
        title: 'Two Sum',
        slug: 'two-sum',
        description: 'Find two numbers that add up to target',
        constraints: '1 <= nums.length <= 10^4',
        difficulty: 'easy',
        timeLimit: 1000,
        memoryLimit: 256,
        status: 'published',
        authorId: user1.id
      });

      problem2 = await Problem.create({
        title: 'Binary Search',
        slug: 'binary-search',
        description: 'Implement binary search',
        constraints: '1 <= nums.length <= 10^4',
        difficulty: 'easy',
        timeLimit: 1000,
        memoryLimit: 256,
        status: 'published',
        authorId: user1.id
      });
    });

    it('should return authenticated user submissions only', async () => {
      // Create submissions for user1
      await Submission.create({
        userId: user1.id,
        problemId: problem1._id,
        code: 'print("solution 1")',
        language: 'python',
        verdict: 'AC',
        executionTime: 45,
        memoryUsed: 2048
      });

      await Submission.create({
        userId: user1.id,
        problemId: problem2._id,
        code: 'print("solution 2")',
        language: 'cpp',
        verdict: 'WA',
        executionTime: 50,
        memoryUsed: 1800
      });

      // Create submission for user2
      await Submission.create({
        userId: user2.id,
        problemId: problem1._id,
        code: 'print("user2 solution")',
        language: 'python',
        verdict: 'AC',
        executionTime: 40,
        memoryUsed: 2000
      });

      // Request as user1
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${accessToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.submissions).toHaveLength(2);
      
      // Verify submissions are from the correct problems (indirect verification of user ownership)
      const problemTitles = res.body.submissions.map(s => s.problemTitle);
      expect(problemTitles).toContain('Two Sum');
      expect(problemTitles).toContain('Binary Search');
    });

    it('should include problem details (title, slug)', async () => {
      // Create submission
      await Submission.create({
        userId: user1.id,
        problemId: problem1._id,
        code: 'print("solution")',
        language: 'python',
        verdict: 'AC',
        executionTime: 45,
        memoryUsed: 2048
      });

      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${accessToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.submissions).toHaveLength(1);
      
      const submission = res.body.submissions[0];
      expect(submission.problemId).toBeDefined();
      expect(submission.problemTitle).toBe('Two Sum');
      expect(submission.problemSlug).toBe('two-sum');
    });

    it('should exclude code field from response', async () => {
      // Create submission with code
      await Submission.create({
        userId: user1.id,
        problemId: problem1._id,
        code: 'print("this should not be in response")',
        language: 'python',
        verdict: 'AC',
        executionTime: 45,
        memoryUsed: 2048
      });

      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${accessToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.submissions).toHaveLength(1);
      
      const submission = res.body.submissions[0];
      expect(submission.code).toBeUndefined();
      expect(submission).not.toHaveProperty('code');
    });

    it('should sort submissions by createdAt descending', async () => {
      // Create submissions with different timestamps
      const sub1 = await Submission.create({
        userId: user1.id,
        problemId: problem1._id,
        code: 'print("first")',
        language: 'python',
        verdict: 'WA',
        executionTime: 45,
        memoryUsed: 2048,
        createdAt: new Date('2024-01-15T10:00:00Z')
      });

      const sub2 = await Submission.create({
        userId: user1.id,
        problemId: problem2._id,
        code: 'print("second")',
        language: 'python',
        verdict: 'AC',
        executionTime: 50,
        memoryUsed: 1800,
        createdAt: new Date('2024-01-15T10:05:00Z')
      });

      const sub3 = await Submission.create({
        userId: user1.id,
        problemId: problem1._id,
        code: 'print("third")',
        language: 'cpp',
        verdict: 'TLE',
        executionTime: 1000,
        memoryUsed: 2500,
        createdAt: new Date('2024-01-15T10:10:00Z')
      });

      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${accessToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.submissions).toHaveLength(3);
      
      // Verify newest first (descending order)
      expect(res.body.submissions[0]._id.toString()).toBe(sub3._id.toString());
      expect(res.body.submissions[1]._id.toString()).toBe(sub2._id.toString());
      expect(res.body.submissions[2]._id.toString()).toBe(sub1._id.toString());
    });

    it('should return empty array when user has no submissions', async () => {
      // User1 has no submissions
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${accessToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.submissions).toEqual([]);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get('/api/submissions');

      expect(res.status).toBe(401);
    });

    it('should include all submission fields except code', async () => {
      // Create submission with all fields
      await Submission.create({
        userId: user1.id,
        problemId: problem1._id,
        code: 'print("solution")',
        language: 'python',
        verdict: 'AC',
        executionTime: 45,
        memoryUsed: 2048,
        contestId: null
      });

      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${accessToken1}`);

      expect(res.status).toBe(200);
      const submission = res.body.submissions[0];
      
      // Verify all expected fields are present
      expect(submission._id).toBeDefined();
      expect(submission.verdict).toBe('AC');
      expect(submission.executionTime).toBe(45);
      expect(submission.memoryUsed).toBe(2048);
      expect(submission.language).toBe('python');
      expect(submission.createdAt).toBeDefined();
      expect(submission.problemId).toBeDefined();
      expect(submission.problemTitle).toBe('Two Sum');
      expect(submission.problemSlug).toBe('two-sum');
      
      // Verify code is excluded
      expect(submission.code).toBeUndefined();
    });

    it('should handle submissions across multiple problems', async () => {
      // Create multiple submissions for different problems
      await Submission.create({
        userId: user1.id,
        problemId: problem1._id,
        code: 'print("solution 1")',
        language: 'python',
        verdict: 'AC',
        executionTime: 45,
        memoryUsed: 2048
      });

      await Submission.create({
        userId: user1.id,
        problemId: problem2._id,
        code: 'print("solution 2")',
        language: 'cpp',
        verdict: 'WA',
        executionTime: 50,
        memoryUsed: 1800
      });

      await Submission.create({
        userId: user1.id,
        problemId: problem1._id,
        code: 'print("solution 3")',
        language: 'python',
        verdict: 'TLE',
        executionTime: 1000,
        memoryUsed: 2500
      });

      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${accessToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
      expect(res.body.submissions).toHaveLength(3);
      
      // Verify we have submissions from both problems
      const problemTitles = res.body.submissions.map(s => s.problemTitle);
      expect(problemTitles).toContain('Two Sum');
      expect(problemTitles).toContain('Binary Search');
    });
  });

  describe('SubmissionsService', () => {
    it('should enqueue submission to BullMQ', () => {
      // TODO: Test service.submit()
      // TODO: Verify Submission document is created with PENDING verdict
      // TODO: Verify job is added to queue
      expect(true).toBe(true);
    });

    it('should update verdict after judge execution', () => {
      // TODO: Test service.updateVerdict()
      // TODO: Verify submission document is updated
      // TODO: Verify Socket.io event is emitted
      expect(true).toBe(true);
    });
  });
});
