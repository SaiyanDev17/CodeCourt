const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Connect to MongoDB with retry logic
 * @param {number} retryCount - Current retry attempt (default: 0)
 * @returns {Promise<void>}
 */
const connectDB = async (retryCount = 0) => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codecourt';
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✓ MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`✗ MongoDB connection error (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);

    if (retryCount < MAX_RETRIES - 1) {
      console.log(`⟳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(retryCount + 1);
    } else {
      console.error('✗ Max retries reached. Could not connect to MongoDB.');
      throw error;
    }
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB connection error:', err);
});

mongoose.connection.on('reconnected', () => {
  console.log('✓ MongoDB reconnected');
});

module.exports = { connectDB };
