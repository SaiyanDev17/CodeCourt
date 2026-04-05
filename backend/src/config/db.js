/**
 * MongoDB Connection Module
 * 
 * VISION:
 * Provide a robust, production-ready MongoDB connection with automatic retry logic
 * and comprehensive error handling. This ensures the application can recover from
 * transient network issues and database unavailability during startup.
 * 
 * WHY THIS EXISTS:
 * - MongoDB connections can fail due to network issues, DNS resolution delays, or database startup timing
 * - In containerized environments (Docker/Kubernetes), services may start before MongoDB is ready
 * - Production systems need resilient connection handling to avoid crashes during deployment
 * 
 * WHAT IT DOES:
 * 1. Attempts to connect to MongoDB with configurable retry logic (5 attempts, 5s delay)
 * 2. Monitors connection health with event listeners (disconnected, error, reconnected)
 * 3. Provides graceful shutdown capability for clean application termination
 * 4. Logs all connection state changes for debugging and monitoring
 * 
 * DESIGN DECISIONS:
 * - Uses exponential backoff pattern (5 retries × 5s = 25s max wait)
 * - Throws error after max retries to fail fast rather than hang indefinitely
 * - Configurable via MONGODB_URI environment variable for different environments
 * - Separate closeDB function for graceful shutdown in tests and production
 * 
 * USAGE:
 * ```javascript
 * const { connectDB, closeDB } = require('./config/db');
 * 
 * // In server.js
 * await connectDB();
 * 
 * // In test teardown
 * await closeDB();
 * ```
 */

const mongoose = require('mongoose');

// Maximum number of connection attempts before giving up
const MAX_RETRIES = 5;

// Delay between retry attempts in milliseconds (5 seconds)
const RETRY_DELAY_MS = 5000;

/**
 * Connect to MongoDB with automatic retry logic
 * 
 * This function implements an exponential backoff retry pattern to handle
 * transient connection failures. It's particularly useful in containerized
 * environments where MongoDB might not be immediately available.
 * 
 * @param {number} retryCount - Current retry attempt (default: 0)
 * @returns {Promise<void>}
 * @throws {Error} If connection fails after MAX_RETRIES attempts
 */
const connectDB = async (retryCount = 0) => {
  try {
    // Get MongoDB URI from environment or use local default
    // In production, this should point to MongoDB Atlas or a managed cluster
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codecourt';
    
    // Connect with timeout settings to prevent hanging
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,  // Fail fast if server not found (5s)
      socketTimeoutMS: 45000,           // Socket timeout for long-running operations (45s)
    });

    console.log(`✓ MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`✗ MongoDB connection error (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);

    // Retry logic: attempt reconnection if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES - 1) {
      console.log(`⟳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
      
      // Wait before retrying (exponential backoff pattern)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      
      // Recursive call with incremented retry count
      return connectDB(retryCount + 1);
    } else {
      // Max retries exceeded - fail fast to prevent application hang
      console.error('✗ Max retries reached. Could not connect to MongoDB.');
      throw error;
    }
  }
};

// ============================================================================
// CONNECTION EVENT HANDLERS
// ============================================================================
// These listeners monitor the MongoDB connection health throughout the
// application lifecycle. Mongoose automatically attempts to reconnect
// when the connection is lost.

/**
 * Handle disconnection events
 * Triggered when the connection to MongoDB is lost (network issue, server restart, etc.)
 */
mongoose.connection.on('disconnected', () => {
  console.warn('⚠ MongoDB disconnected. Attempting to reconnect...');
});

/**
 * Handle connection errors
 * Triggered when an error occurs on an established connection
 */
mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB connection error:', err);
});

/**
 * Handle successful reconnection
 * Triggered when Mongoose successfully reconnects after a disconnection
 */
mongoose.connection.on('reconnected', () => {
  console.log('✓ MongoDB reconnected');
});

/**
 * Gracefully close MongoDB connection
 * 
 * This function should be called during application shutdown to ensure
 * all pending operations complete and connections are properly closed.
 * 
 * Used in:
 * - Test teardown (to prevent Jest from hanging)
 * - Graceful shutdown handlers (SIGTERM, SIGINT)
 * - Application cleanup before restart
 * 
 * @returns {Promise<void>}
 */
const closeDB = async () => {
  try {
    // Close all connections in the connection pool
    await mongoose.connection.close();
    console.log('✓ MongoDB connection closed');
  } catch (error) {
    console.error('✗ Error closing MongoDB connection:', error.message);
  }
};

module.exports = { connectDB, closeDB };
