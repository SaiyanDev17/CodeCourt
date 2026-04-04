// Jest setup file for test environment configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codecourt-test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_min_32_characters_long';
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_min_32_characters_long';
process.env.ACCESS_TOKEN_EXPIRY = '15m';
process.env.REFRESH_TOKEN_EXPIRY = '7d';
process.env.PORT = '5001';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.AI_SERVICE_URL = 'http://localhost:8000';

// Increase test timeout for integration tests
jest.setTimeout(10000);
