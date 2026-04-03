/**
 * Unit tests for BullMQ configuration
 */

const bullmqConfig = require('./bullmq');
const redis = require('./redis');

describe('BullMQ Configuration', () => {
  describe('Connection', () => {
    test('should export connection object', () => {
      expect(bullmqConfig.connection).toBeDefined();
    });

    test('should use the shared Redis client', () => {
      expect(bullmqConfig.connection).toBe(redis);
    });

    test('should have maxRetriesPerRequest set to null for BullMQ compatibility', () => {
      expect(bullmqConfig.connection.options.maxRetriesPerRequest).toBeNull();
    });
  });

  describe('Default Job Options', () => {
    test('should export defaultJobOptions', () => {
      expect(bullmqConfig.defaultJobOptions).toBeDefined();
      expect(typeof bullmqConfig.defaultJobOptions).toBe('object');
    });

    test('should configure 3 retry attempts', () => {
      expect(bullmqConfig.defaultJobOptions.attempts).toBe(3);
    });

    test('should configure exponential backoff', () => {
      expect(bullmqConfig.defaultJobOptions.backoff).toEqual({
        type: 'exponential',
        delay: 2000
      });
    });

    test('should configure job retention for completed jobs', () => {
      expect(bullmqConfig.defaultJobOptions.removeOnComplete).toEqual({
        age: 3600,
        count: 1000
      });
    });

    test('should configure job retention for failed jobs', () => {
      expect(bullmqConfig.defaultJobOptions.removeOnFail).toEqual({
        age: 86400
      });
    });
  });

  describe('Worker Options', () => {
    test('should export workerOptions', () => {
      expect(bullmqConfig.workerOptions).toBeDefined();
      expect(typeof bullmqConfig.workerOptions).toBe('object');
    });

    test('should set concurrency to 5', () => {
      expect(bullmqConfig.workerOptions.concurrency).toBe(5);
    });

    test('should include connection in workerOptions', () => {
      expect(bullmqConfig.workerOptions.connection).toBe(redis);
    });
  });

  describe('Queue Options', () => {
    test('should export queueOptions', () => {
      expect(bullmqConfig.queueOptions).toBeDefined();
      expect(typeof bullmqConfig.queueOptions).toBe('object');
    });

    test('should include connection in queueOptions', () => {
      expect(bullmqConfig.queueOptions.connection).toBe(redis);
    });

    test('should include defaultJobOptions in queueOptions', () => {
      expect(bullmqConfig.queueOptions.defaultJobOptions).toBe(bullmqConfig.defaultJobOptions);
    });
  });
});
