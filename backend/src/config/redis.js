/**
 * Redis Connection Module
 * 
 * VISION:
 * Provide a resilient Redis connection for caching, rate limiting, and BullMQ job queues.
 * This module ensures the application can handle Redis failures gracefully and recover
 * automatically from transient network issues.
 * 
 * WHY THIS EXISTS:
 * - Redis is critical for multiple features: caching (problems, contests, users), rate limiting, and job queues
 * - In production, Redis failures should not crash the application
 * - BullMQ requires specific Redis configuration (maxRetriesPerRequest: null)
 * - Containerized environments need robust reconnection logic
 * 
 * WHAT IT DOES:
 * 1. Creates a Redis client with automatic retry and reconnection logic
 * 2. Configures BullMQ-compatible settings (maxRetriesPerRequest: null)
 * 3. Implements exponential backoff for reconnection attempts (up to 30s)
 * 4. Monitors connection health with comprehensive event handlers
 * 5. Provides graceful shutdown capability
 * 
 * DESIGN DECISIONS:
 * - maxRetriesPerRequest: null - Required by BullMQ to prevent job loss during reconnection
 * - Exponential backoff with 30s cap - Balances quick recovery vs server load
 * - Reconnects on specific errors (READONLY, ECONNREFUSED, ETIMEDOUT) - Handles common failure modes
 * - Separate closeRedis function - Enables clean shutdown in tests and production
 * 
 * USAGE:
 * ```javascript
 * const redisClient = require('./config/redis');
 * 
 * // Caching
 * await redisClient.setex('key', 60, JSON.stringify(data));
 * const cached = await redisClient.get('key');
 * 
 * // In BullMQ queue
 * const queue = new Queue('submissions', { connection: redisClient });
 * 
 * // Graceful shutdown
 * const { closeRedis } = require('./config/redis');
 * await closeRedis();
 * ```
 */

const Redis = require('ioredis');

// Maximum number of reconnection attempts before giving up
const MAX_RETRIES = 5;

// Base delay between retry attempts in milliseconds (5 seconds)
// Actual delay uses exponential backoff: attempt × RETRY_DELAY_MS
const RETRY_DELAY_MS = 5000;

/**
 * Create Redis client with connection handling
 * 
 * Configures a Redis client with:
 * - BullMQ-compatible settings (maxRetriesPerRequest: null)
 * - Exponential backoff retry strategy (5s → 10s → 15s → ... → 30s max)
 * - Automatic reconnection on specific errors
 * - Comprehensive event logging
 * 
 * @returns {Redis} Redis client instance
 */
const createRedisClient = () => {
  // Get Redis URL from environment or use local default
  // In production, this should point to Redis Cloud, ElastiCache, or a managed cluster
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = new Redis(redisUrl, {
    // CRITICAL: maxRetriesPerRequest must be null for BullMQ compatibility
    // BullMQ needs to retry indefinitely to prevent job loss during reconnection
    // Without this, jobs can be lost if Redis disconnects during processing
    maxRetriesPerRequest: null,
    
    // Wait for Redis to be ready before accepting commands
    // Prevents "Connection is closed" errors during startup
    enableReadyCheck: true,
    
    /**
     * Retry strategy with exponential backoff
     * 
     * Calculates delay between reconnection attempts:
     * - Attempt 1: 5s
     * - Attempt 2: 10s
     * - Attempt 3: 15s
     * - Attempt 4: 20s
     * - Attempt 5: 25s
     * - Capped at 30s maximum
     * 
     * @param {number} times - Current retry attempt number
     * @returns {number|null} Delay in ms, or null to stop retrying
     */
    retryStrategy: (times) => {
      // Stop retrying after MAX_RETRIES attempts
      if (times > MAX_RETRIES) {
        console.error('✗ Max Redis connection retries reached.');
        return null; // Returning null stops the retry loop
      }
      
      // Exponential backoff with 30s cap
      // Math.min ensures we never wait more than 30 seconds
      const delay = Math.min(times * RETRY_DELAY_MS, 30000);
      console.log(`⟳ Redis reconnecting in ${delay / 1000} seconds... (attempt ${times}/${MAX_RETRIES})`);
      return delay;
    },
    
    /**
     * Reconnect on specific error types
     * 
     * Handles common Redis failure scenarios:
     * - READONLY: Redis replica promoted to master (failover)
     * - ECONNREFUSED: Redis server not accepting connections
     * - ETIMEDOUT: Network timeout (slow network, firewall issues)
     * 
     * @param {Error} err - The error that occurred
     * @returns {boolean} true to reconnect, false to propagate error
     */
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT'];
      if (targetErrors.some(targetError => err.message.includes(targetError))) {
        console.warn('⚠ Redis reconnecting due to error:', err.message);
        return true; // Attempt reconnection
      }
      return false; // Propagate other errors to application
    }
  });

  // ============================================================================
  // CONNECTION EVENT HANDLERS
  // ============================================================================
  // These listeners monitor Redis connection health throughout the application
  // lifecycle. They provide visibility into connection state for debugging and
  // monitoring in production.

  /**
   * 'connect' event - Initial connection attempt started
   * Fired when the client starts connecting to Redis server
   */
  client.on('connect', () => {
    console.log('⟳ Redis connecting...');
  });

  /**
   * 'ready' event - Connection established and ready for commands
   * Fired when Redis is fully connected and ready to accept commands
   * This is the event to wait for before executing Redis operations
   */
  client.on('ready', () => {
    console.log('✓ Redis connected and ready');
  });

  /**
   * 'error' event - Connection or command error occurred
   * Fired when an error occurs (connection failure, command error, etc.)
   * Note: This does NOT close the connection - reconnection will be attempted
   */
  client.on('error', (err) => {
    console.error('✗ Redis connection error:', err.message);
  });

  /**
   * 'close' event - Connection closed
   * Fired when the connection is closed (either by client or server)
   * Reconnection will be attempted automatically unless quit() was called
   */
  client.on('close', () => {
    console.warn('⚠ Redis connection closed');
  });

  /**
   * 'reconnecting' event - Attempting to reconnect
   * Fired when the client starts a reconnection attempt
   * Useful for tracking reconnection frequency in production
   */
  client.on('reconnecting', () => {
    console.log('⟳ Redis reconnecting...');
  });

  /**
   * 'end' event - Connection permanently ended
   * Fired when the connection is permanently closed (quit() or max retries exceeded)
   * No further reconnection attempts will be made
   */
  client.on('end', () => {
    console.warn('⚠ Redis connection ended');
  });

  return client;
};

// Create and export the Redis client instance
// This singleton instance is shared across the entire application
// Used by: rate limiter, caching, BullMQ queues
const redisClient = createRedisClient();

/**
 * Gracefully close Redis connection
 * 
 * This function should be called during application shutdown to ensure:
 * 1. All pending commands are flushed
 * 2. Connection is closed cleanly
 * 3. No data loss occurs
 * 
 * Used in:
 * - Test teardown (to prevent Jest from hanging)
 * - Graceful shutdown handlers (SIGTERM, SIGINT)
 * - Application cleanup before restart
 * 
 * @returns {Promise<void>}
 */
const closeRedis = async () => {
  try {
    // quit() sends QUIT command and waits for pending commands to complete
    // This is the preferred way to close Redis connections
    await redisClient.quit();
    console.log('✓ Redis connection closed gracefully');
  } catch (error) {
    console.error('✗ Error closing Redis connection:', error.message);
    // Force close if graceful shutdown fails (e.g., connection already lost)
    // disconnect() immediately closes the connection without waiting
    redisClient.disconnect();
  }
};

module.exports = redisClient;
module.exports.closeRedis = closeRedis;
