// Integration test for user profile caching
// NOTE: This is an INTEGRATION TEST that requires MongoDB, Redis, and the Express app to be running.
// Run with: npm run test:integration
// Or skip with: npm test (runs unit tests only)
const request = require('supertest');
const app = require('../../app');
const User = require('../auth/model');
const redis = require('../../config/redis');
const { closeRedis } = require('../../config/redis');
const { closeDB } = require('../../config/db');
const { REDIS_KEYS, LIMITS } = require('../../config/constants');

describe('User Profile Caching Integration', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create a test user
    testUser = await User.create({
      username: 'cachetest',
      email: 'cachetest@example.com',
      passwordHash: 'hashedpassword',
      role: 'contestant'
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteOne({ username: 'cachetest' });
    await redis.del(`${REDIS_KEYS.USER_PROFILE}:${testUser._id}`);
    await redis.del(`${REDIS_KEYS.USER_PROFILE}:username:cachetest`);
    
    // Close connections
    await closeDB();
    await closeRedis();
  });

  describe('GET /api/users/:username', () => {
    it('should cache user profile with correct TTL', async () => {
      const response = await request(app)
        .get('/api/users/cachetest')
        .expect(200);

      expect(response.body.username).toBe('cachetest');
      expect(response.body.passwordHash).toBeUndefined();

      // Verify cache was set
      const cachedProfile = await redis.get(`${REDIS_KEYS.USER_PROFILE}:${testUser._id}`);
      expect(cachedProfile).toBeTruthy();
      
      const cachedMapping = await redis.get(`${REDIS_KEYS.USER_PROFILE}:username:cachetest`);
      expect(cachedMapping).toBe(testUser._id.toString());

      // Verify TTL is set correctly (should be around 300 seconds)
      const ttl = await redis.ttl(`${REDIS_KEYS.USER_PROFILE}:${testUser._id}`);
      expect(ttl).toBeGreaterThan(290);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it('should serve from cache on subsequent requests', async () => {
      // First request - cache miss
      await request(app)
        .get('/api/users/cachetest')
        .expect(200);

      // Modify the cached data to verify it's being served from cache
      const modifiedUser = { ...testUser.toObject(), testFlag: 'cached' };
      await redis.setex(
        `${REDIS_KEYS.USER_PROFILE}:${testUser._id}`,
        LIMITS.CACHE_TTL_USER_PROFILE,
        JSON.stringify(modifiedUser)
      );

      // Second request - should get modified cached data
      const response = await request(app)
        .get('/api/users/cachetest')
        .expect(200);

      expect(response.body.testFlag).toBe('cached');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/users/nonexistent')
        .expect(404);
    });
  });

  describe('PUT /api/users/:id/role - Cache Invalidation', () => {
    it('should invalidate cache when role is updated', async () => {
      // First, populate the cache
      await request(app)
        .get('/api/users/cachetest')
        .expect(200);

      // Verify cache exists
      let cachedProfile = await redis.get(`${REDIS_KEYS.USER_PROFILE}:${testUser._id}`);
      expect(cachedProfile).toBeTruthy();

      // Update role (requires admin auth - this test assumes auth middleware is mocked)
      // In a real scenario, you'd need to authenticate as admin first
      // For now, we'll test the service method directly
      const userService = require('./service');
      await userService.updateUserRole(testUser._id, 'problem_setter');

      // Verify cache was invalidated
      cachedProfile = await redis.get(`${REDIS_KEYS.USER_PROFILE}:${testUser._id}`);
      expect(cachedProfile).toBeNull();

      const cachedMapping = await redis.get(`${REDIS_KEYS.USER_PROFILE}:username:cachetest`);
      expect(cachedMapping).toBeNull();
    });
  });
});
