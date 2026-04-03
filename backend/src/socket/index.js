// Socket.io server initialization
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'changeme_access';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

let io;

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - HTTP server instance
 */
exports.initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: FRONTEND_URL,
      credentials: true
    }
  });
  
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });
  
  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);
    
    // Join personal room for verdict notifications
    socket.join(`user:${socket.userId}`);
    
    // Handle contest room joins
    socket.on('join:contest', (contestId) => {
      socket.join(`contest:${contestId}`);
      console.log(`User ${socket.username} joined contest room: ${contestId}`);
    });
    
    socket.on('leave:contest', (contestId) => {
      socket.leave(`contest:${contestId}`);
      console.log(`User ${socket.username} left contest room: ${contestId}`);
    });
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.username}`);
    });
  });
  
  return io;
};

/**
 * Get Socket.io instance
 */
exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
