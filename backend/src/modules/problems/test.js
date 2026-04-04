// Problems module tests
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Problem = require('./model');
const User = require('../auth/model');
const redis = require('../../config/redis');
const authService = require('../auth/service');

describe('Problems Module', () => {
  let problemSetterToken;
  let problemSetterUser;
  let adminToken;
  let adminUser;
  let contestantToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codecourt-test');
    }

    // Create test users
    problemSetterUser = await authService.register('problemsetter', 'setter@example.com', 'password123');
    await User.findByIdAndUpdate(problemSetterUser.id, { role: 'problem_setter' });
    const setterLogin = await authService.login('setter@example.com', 'password123');
    problemSetterToken = setterLogin.accessToken;

    adminUser = await authService.register('admin', 'admin@example.com', 'password123');
    await User.findByIdAndUpdate(adminUser.id, { role: 'admin' });
    const adminLogin = await authService.login('admin@example.com', 'password123');
    adminToken = adminLogin.accessToken;

    const contestantLogin = await authService.register('contestant', 'contestant@example.com', 'password123');
    contestantToken = (await authService.login('contestant@example.com', 'password123')).accessToken;
  });

  afterAll(async () => {
    await Problem.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
    redis.quit();
  });

  beforeEach(async () => {
    await Problem.deleteMany({});
    // Clear Redis cache
    try {
      await redis.del('problems:list');
    } catch (error) {
      // Ignore
    }
  });

  describe('POST /api/problems', () => {
    const validProblem = {
      title: 'Two Sum',
      slug: 'two-sum',
      description: 'Find two numbers that add up to target',
      constraints: '1 <= nums.length <= 10^4',
      timeLimit: 1000,
      memoryLimit: 256,
      difficulty: 'easy',
      sampleTestCases: [
        { input: '2 7 11 15\n9', output: '0 1' }
      ]
    };

    it('should create a new problem with status draft', async () => {
      const res = await request(app)
        .post('/api/problems')
        .set('Authorization', `Bearer ${problemSetterToken}`)
        .send(validProblem);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Problem created successfully');
      expect(res.body.problem.status).toBe('draft');
      expect(res.body.problem.title).toBe('Two Sum');
      expect(res.body.problem.slug).toBe('two-sum');
    });

    it('should reject duplicate slug', async () => {
      await Problem.create({
        ...validProblem,
        authorId: problemSetterUser.id
      });

      const res = await request(app)
        .post('/api/problems')
        .set('Authorization', `Bearer ${problemSetterToken}`)
        .send(validProblem);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('slug already exists');
    });

    it('should reject problem without required fields', async () => {
      const res = await request(app)
        .post('/api/problems')
        .set('Authorization', `Bearer ${problemSetterToken}`)
        .send({
          title: 'Incomplete Problem'
          // Missing required fields
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Validation Error');
    });

    it('should reject creation by contestant', async () => {
      const res = await request(app)
        .post('/api/problems')
        .set('Authorization', `Bearer ${contestantToken}`)
        .send(validProblem);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/problems', () => {
    beforeEach(async () => {
      // Create some problems
      await Problem.create({
        title: 'Published Problem',
        slug: 'published-problem',
        description: 'Test',
        constraints: 'Test',
        timeLimit: 1000,
        memoryLimit: 256,
        difficulty: 'easy',
        sampleTestCases: [{ input: '1', output: '1' }],
        status: 'published',
        authorId: problemSetterUser.id
      });

      await Problem.create({
        title: 'Draft Problem',
        slug: 'draft-problem',
        description: 'Test',
        constraints: 'Test',
        timeLimit: 1000,
        memoryLimit: 256,
        difficulty: 'easy',
        sampleTestCases: [{ input: '1', output: '1' }],
        status: 'draft',
        authorId: problemSetterUser.id
      });
    });

    it('should return only published problems', async () => {
      const res = await request(app)
        .get('/api/problems');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.problems[0].title).toBe('Published Problem');
    });

    it('should serve from Redis cache on second request', async () => {
      // First request - cache miss
      await request(app).get('/api/problems');

      // Check cache is populated
      const cached = await redis.get('problems:list');
      expect(cached).toBeDefined();

      // Second request - cache hit
      const res = await request(app).get('/api/problems');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });
  });

  describe('GET /api/problems/:slug', () => {
    beforeEach(async () => {
      await Problem.create({
        title: 'Test Problem',
        slug: 'test-problem',
        description: 'Test description',
        constraints: 'Test constraints',
        timeLimit: 1000,
        memoryLimit: 256,
        difficulty: 'medium',
        sampleTestCases: [{ input: '1', output: '1' }],
        status: 'published',
        authorId: problemSetterUser.id
      });
    });

    it('should return problem by slug', async () => {
      const res = await request(app)
        .get('/api/problems/test-problem');

      expect(res.status).toBe(200);
      expect(res.body.problem.title).toBe('Test Problem');
      expect(res.body.problem.slug).toBe('test-problem');
    });

    it('should return 404 for non-existent slug', async () => {
      const res = await request(app)
        .get('/api/problems/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Problem not found');
    });
  });

  describe('POST /api/problems/:id/approve', () => {
    let problemId;

    beforeEach(async () => {
      const problem = await Problem.create({
        title: 'Draft Problem',
        slug: 'draft-problem',
        description: 'Test',
        constraints: 'Test',
        timeLimit: 1000,
        memoryLimit: 256,
        difficulty: 'easy',
        sampleTestCases: [{ input: '1', output: '1' }],
        status: 'draft',
        authorId: problemSetterUser.id
      });
      problemId = problem._id.toString();
    });

    it('should transition problem from draft to published', async () => {
      const res = await request(app)
        .post(`/api/problems/${problemId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Problem approved and published');
      expect(res.body.problem.status).toBe('published');

      // Verify cache was invalidated
      const cached = await redis.get('problems:list');
      expect(cached).toBeNull();
    });

    it('should reject approval by non-admin', async () => {
      const res = await request(app)
        .post(`/api/problems/${problemId}/approve`)
        .set('Authorization', `Bearer ${problemSetterToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/problems/:id/reject', () => {
    let problemId;

    beforeEach(async () => {
      const problem = await Problem.create({
        title: 'Draft Problem',
        slug: 'draft-problem',
        description: 'Test',
        constraints: 'Test',
        timeLimit: 1000,
        memoryLimit: 256,
        difficulty: 'easy',
        sampleTestCases: [{ input: '1', output: '1' }],
        status: 'draft',
        authorId: problemSetterUser.id
      });
      problemId = problem._id.toString();
    });

    it('should transition problem to rejected with reason', async () => {
      const res = await request(app)
        .post(`/api/problems/${problemId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: 'Test cases are insufficient' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Problem rejected');
      expect(res.body.problem.status).toBe('rejected');
      expect(res.body.problem.rejectionReason).toBe('Test cases are insufficient');
    });

    it('should require rejection reason', async () => {
      const res = await request(app)
        .post(`/api/problems/${problemId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Rejection reason is required');
    });
  });

  describe('PUT /api/problems/:id', () => {
    let problemId;

    beforeEach(async () => {
      const problem = await Problem.create({
        title: 'Original Title',
        slug: 'original-slug',
        description: 'Original description',
        constraints: 'Original constraints',
        timeLimit: 1000,
        memoryLimit: 256,
        difficulty: 'easy',
        sampleTestCases: [{ input: '1', output: '1' }],
        status: 'published',
        authorId: problemSetterUser.id
      });
      problemId = problem._id.toString();
    });

    it('should update problem by owner', async () => {
      const res = await request(app)
        .put(`/api/problems/${problemId}`)
        .set('Authorization', `Bearer ${problemSetterToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.problem.title).toBe('Updated Title');
    });

    it('should transition to draft when updating test cases on published problem', async () => {
      const res = await request(app)
        .put(`/api/problems/${problemId}`)
        .set('Authorization', `Bearer ${problemSetterToken}`)
        .send({
          sampleTestCases: [
            { input: '2', output: '2' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.problem.status).toBe('draft');
    });

    it('should reject update by non-owner', async () => {
      const otherUser = await authService.register('other', 'other@example.com', 'password123');
      await User.findByIdAndUpdate(otherUser.id, { role: 'problem_setter' });
      const otherToken = (await authService.login('other@example.com', 'password123')).accessToken;

      const res = await request(app)
        .put(`/api/problems/${problemId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });
  });
});
