/**
 * Socket.io Server Initialization
 * 
 * VISION:
 * Provide real-time bidirectional communication between server and clients for
 * instant verdict notifications and live leaderboard updates. Enable responsive
 * user experience without polling.
 * 
 * WHY THIS EXISTS:
 * Real-time features are critical for competitive programming:
 * - Instant verdict feedback (no page refresh needed)
 * - Live leaderboard updates during contests
 * - Better user experience than HTTP polling
 * - Reduced server load (push vs pull)
 * 
 * Without WebSockets, clients would need to poll every few seconds, creating
 * unnecessary load and delayed updates.
 * 
 * WHAT IT DOES:
 * - Initializes Socket.io server with CORS configuration
 * - Implements JWT-based authentication middleware
 * - Manages room-based event emission (user rooms, contest rooms)
 * - Handles connection/disconnection events
 * - Provides singleton access to Socket.io instance
 * 
 * DESIGN DECISIONS:
 * 1. JWT Authentication:
 *    - Reuses existing JWT tokens (no separate auth system)
 *    - Token passed in handshake.auth.token
 *    - Validates on connection (not per-event for performance)
 * 
 * 2. Room-Based Architecture:
 *    - user:{userId} rooms for personal notifications (verdicts)
 *    - contest:{contestId} rooms for contest-wide updates (leaderboard)
 *    - Efficient targeted emission (no broadcast to all clients)
 * 
 * 3. Singleton Pattern:
 *    - Single Socket.io instance shared across modules
 *    - getIO() provides access without circular dependencies
 *    - Throws error if accessed before initialization
 * 
 * 4. CORS Configuration:
 *    - Allows frontend origin (localhost:3000 in dev)
 *    - Enables credentials for cookie-based auth
 *    - Configurable via FRONTEND_URL env var
 * 
 * 5. Automatic Room Management:
 *    - Users auto-join personal room on connection
 *    - Contest rooms joined/left via client events
 *    - Rooms cleaned up automatically on disconnect
 * 
 * USAGE:
 * ```javascript
 * // In server.js
 * const { initSocket } = require('./socket/index');
 * const io = initSocket(httpServer);
 * 
 * // In other modules
 * const { getIO } = require('./socket/index');
 * const io = getIO();
 * io.to('user:123').emit('verdict', { verdict: 'AC' });
 * ```
 * 
 * CLIENT USAGE:
 * ```javascript
 * // Frontend connection
 * import io from 'socket.io-client';
 * 
 * const socket = io('http://localhost:5000', {
 *   auth: { token: accessToken }
 * });
 * 
 * // Listen for verdicts
 * socket.on('verdict', (data) => {
 *   console.log('Verdict received:', data);
 * });
 * 
 * // Join contest room
 * socket.emit('join:contest', contestId);
 * 
 * // Listen for leaderboard updates
 * socket.on('leaderboard:update', (data) => {
 *   console.log('Leaderboard updated:', data);
 * });
 * ```
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'changeme_access';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Singleton Socket.io instance
let io;

/**
 * Initialize Socket.io server
 * 
 * Creates and configures Socket.io server with authentication middleware
 * and connection handlers. Should be called once during server startup.
 * 
 * @param {http.Server} httpServer - HTTP server instance from server.js
 * @returns {Server} Socket.io server instance
 * 
 * @example
 * const httpServer = http.createServer(app);
 * const io = initSocket(httpServer);
 */
exports.initSocket = (httpServer) => {
  // Create Socket.io server with CORS configuration
  io = new Server(httpServer, {
    cors: {
      origin: FRONTEND_URL, // Allow frontend origin
      credentials: true // Allow cookies/auth headers
    }
  });
  
  // Authentication middleware - runs on every connection attempt
  // Validates JWT token before allowing connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      // Verify JWT token and extract user data
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
      
      // Attach user data to socket for use in event handlers
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      
      next(); // Allow connection
    } catch (error) {
      // Invalid/expired token - reject connection
      next(new Error('Invalid token'));
    }
  });
  
  // Connection handler - runs when client successfully connects
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);
    
    // Automatically join personal room for verdict notifications
    // Room name format: user:{userId}
    socket.join(`user:${socket.userId}`);
    
    // Handle contest room joins
    // Client emits this when viewing a contest page
    socket.on('join:contest', (contestId) => {
      socket.join(`contest:${contestId}`);
      console.log(`User ${socket.username} joined contest room: ${contestId}`);
    });
    
    // Handle contest room leaves
    // Client emits this when leaving contest page
    socket.on('leave:contest', (contestId) => {
      socket.leave(`contest:${contestId}`);
      console.log(`User ${socket.username} left contest room: ${contestId}`);
    });
    
    // Handle disconnection
    // Rooms are automatically cleaned up by Socket.io
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.username}`);
    });
  });
  
  return io;
};

/**
 * Get Socket.io instance
 * 
 * Returns the singleton Socket.io instance for use in other modules.
 * Throws error if called before initSocket().
 * 
 * @returns {Server} Socket.io server instance
 * @throws {Error} If Socket.io not initialized
 * 
 * @example
 * const { getIO } = require('./socket/index');
 * const io = getIO();
 * io.to('user:123').emit('verdict', { verdict: 'AC' });
 */
exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
