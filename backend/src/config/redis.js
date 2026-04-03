const Redis = require('ioredis');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Create Redis client with connection handling
 * @returns {Redis} Redis client instance
 */
const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: true,
    retryStrategy: (times) => {
      if (times > MAX_RETRIES) {
        console.error('✗ Max Redis connection retries reached.');
        return null; // Stop retrying
      }
      const delay = Math.min(times * RETRY_DELAY_MS, 30000);
      console.log(`⟳ Redis reconnecting in ${delay / 1000} seconds... (attempt ${times}/${MAX_RETRIES})`);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT'];
      if (targetErrors.some(targetError => err.message.includes(targetError))) {
        console.warn('⚠ Redis reconnecting due to error:', err.message);
        return true; // Reconnect
      }
      return false;
    }
  });

  // Connection event handlers
  client.on('connect', () => {
    console.log('⟳ Redis connecting...');
  });

  client.on('ready', () => {
    console.log('✓ Redis connected and ready');
  });

  client.on('error', (err) => {
    console.error('✗ Redis connection error:', err.message);
  });

  client.on('close', () => {
    console.warn('⚠ Redis connection closed');
  });

  client.on('reconnecting', () => {
    console.log('⟳ Redis reconnecting...');
  });

  client.on('end', () => {
    console.warn('⚠ Redis connection ended');
  });

  return client;
};

// Create and export the Redis client instance
const redisClient = createRedisClient();

/**
 * Gracefully close Redis connection
 * @returns {Promise<void>}
 */
const closeRedis = async () => {
  try {
    await redisClient.quit();
    console.log('✓ Redis connection closed gracefully');
  } catch (error) {
    console.error('✗ Error closing Redis connection:', error.message);
    // Force close if graceful shutdown fails
    redisClient.disconnect();
  }
};

module.exports = redisClient;
module.exports.closeRedis = closeRedis;
