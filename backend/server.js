// HTTP server entry point
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { initSocket } = require('./src/socket');
const { initSocketBridge } = require('./src/socket/bridge');
const { startContestCron } = require('./src/cron/contest.cron');
const submissionWorker = require('./src/jobs/submission.worker');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io and the Redis pub/sub bridge
// Bridge allows BullMQ workers to emit events via Redis → Socket.io
initSocket(server);
initSocketBridge();

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✓ MongoDB connected');
    
    // Start submission worker
    console.log('✓ Submission worker started');
    
    // Start contest cron job
    startContestCron();
    console.log('✓ Contest cron started');
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API: http://localhost:${PORT}`);
      console.log(`✓ Swagger: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Close worker first to finish in-flight jobs
  if (submissionWorker) {
    await submissionWorker.close();
    console.log('Worker closed');
  }
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();
