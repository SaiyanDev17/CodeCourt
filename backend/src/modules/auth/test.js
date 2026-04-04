// Auth module tests
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('./model');
const redis = require('../../config/redis');
const authService = require('./service');

describe('Auth Module', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codecourt-test');
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
    redis.quit();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    // Clear Redis test keys
    const keys = await redis.keys('refresh:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    const blacklistKeys = await redis.keys('blacklist:*');
    if (blacklistKeys.length > 0) {
      await redis.del(...blacklistKeys);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.role).toBe('contestant');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject registration with duplicate username', async () => {
      await User.create({
        username: 'testuser',
        email: 'first@example.com',
        passwordHash: 'hash'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'second@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('username already exists');
    });

    it('should reject registration with duplicate email', async () => {
      await User.create({
        username: 'firstuser',
        email: 'test@example.com',
        passwordHash: 'hash'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'seconduser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('email already exists');
    });

    it('should reject registration with invalid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // too short
          email: 'invalid-email',
          password: 'short'
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Validation Error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await authService.register('testuser', 'test@example.com', 'password123');
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');
    });

    it('should reject login with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      await authService.register('testuser', 'test@example.com', 'password123');
      const loginResult = await authService.login('test@example.com', 'password123');
      refreshToken = loginResult.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Token refreshed successfully');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject refresh with missing token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Refresh token not provided');
    });

    it('should reject refresh with blacklisted token', async () => {
      // First refresh to blacklist the old token
      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      // Try to use the old token again
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken;

    beforeEach(async () => {
      await authService.register('testuser', 'test@example.com', 'password123');
      const loginResult = await authService.login('test@example.com', 'password123');
      refreshToken = loginResult.refreshToken;
    });

    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logout successful');
    });

    it('should blacklist refresh token after logout', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      // Try to use the token after logout
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(401);
    });
  });

  describe('AuthService', () => {
    it('should hash password with bcrypt cost 10', async () => {
      const user = await authService.register('testuser', 'test@example.com', 'password123');
      const dbUser = await User.findById(user.id);
      
      // Bcrypt hashes start with $2b$10$ for cost 10
      expect(dbUser.passwordHash).toMatch(/^\$2b\$10\$/);
    });

    it('should store refresh token hash in Redis', async () => {
      const user = await authService.register('testuser', 'test@example.com', 'password123');
      const { refreshToken } = await authService.login('test@example.com', 'password123');
      
      const storedHash = await redis.get(`refresh:${user.id}`);
      expect(storedHash).toBeDefined();
      expect(storedHash).toHaveLength(64); // SHA256 hex digest length
    });

    it('should rotate refresh tokens on refresh', async () => {
      const user = await authService.register('testuser', 'test@example.com', 'password123');
      const { refreshToken: token1 } = await authService.login('test@example.com', 'password123');
      const { refreshToken: token2 } = await authService.refresh(token1);
      
      expect(token1).not.toBe(token2);
      
      // Old token should be blacklisted
      const crypto = require('crypto');
      const token1Hash = crypto.createHash('sha256').update(token1).digest('hex');
      const isBlacklisted = await redis.get(`blacklist:${token1Hash}`);
      expect(isBlacklisted).toBe('1');
    });
  });
});
