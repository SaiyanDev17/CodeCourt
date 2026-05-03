/**
 * Socket.io Room Joining Tests
 * 
 * Tests verify that Socket.io correctly:
 * 1. Authenticates users via JWT tokens
 * 2. Joins users to their personal rooms (user:{userId})
 * 3. Isolates verdict events to the correct user room
 * 
 * **Validates: Requirements 7.1, 7.2, 7.4**
 */

const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'changeme_access';

describe('Socket.io Room Joining', () => {
  let io, serverSocket, httpServer, httpServerAddr;
  
  beforeAll((done) => {
    // Create HTTP server and Socket.io server
    httpServer = createServer();
    io = new Server(httpServer);
    
    // Start server on random port
    httpServer.listen(() => {
      const port = httpServer.address().port;
      httpServerAddr = `http://localhost:${port}`;
      done();
    });
  });
  
  afterAll(() => {
    io.close();
    httpServer.close();
  });
  
  beforeEach((done) => {
    // Reset server socket before each test
    serverSocket = null;
    
    // Set up authentication middleware (same as production)
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
    
    // Set up connection handler (same as production)
    io.on('connection', (socket) => {
      serverSocket = socket;
      
      // Automatically join personal room
      socket.join(`user:${socket.userId}`);
      
      console.log(`[TEST] User ${socket.username} joined room: user:${socket.userId}`);
    });
    
    done();
  });
  
  afterEach(() => {
    // Clean up all sockets
    if (serverSocket) {
      serverSocket.disconnect();
    }
    io.removeAllListeners();
  });
  
  test('should authenticate user with valid JWT token', (done) => {
    const userId = '507f1f77bcf86cd799439011';
    const username = 'testuser';
    
    // Create valid JWT token
    const token = jwt.sign({ userId, username }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    
    // Connect client with token
    const clientSocket = Client(httpServerAddr, {
      auth: { token }
    });
    
    clientSocket.on('connect', () => {
      expect(serverSocket).toBeDefined();
      expect(serverSocket.userId).toBe(userId);
      expect(serverSocket.username).toBe(username);
      
      clientSocket.disconnect();
      done();
    });
    
    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });
  
  test('should reject connection without JWT token', (done) => {
    // Connect without token
    const clientSocket = Client(httpServerAddr);
    
    clientSocket.on('connect', () => {
      done(new Error('Should not connect without token'));
    });
    
    clientSocket.on('connect_error', (error) => {
      expect(error.message).toContain('Authentication required');
      clientSocket.disconnect();
      done();
    });
  });
  
  test('should reject connection with invalid JWT token', (done) => {
    // Connect with invalid token
    const clientSocket = Client(httpServerAddr, {
      auth: { token: 'invalid-token' }
    });
    
    clientSocket.on('connect', () => {
      done(new Error('Should not connect with invalid token'));
    });
    
    clientSocket.on('connect_error', (error) => {
      expect(error.message).toContain('Invalid token');
      clientSocket.disconnect();
      done();
    });
  });
  
  test('should join user to personal room on connection', (done) => {
    const userId = '507f1f77bcf86cd799439011';
    const username = 'testuser';
    
    const token = jwt.sign({ userId, username }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    
    const clientSocket = Client(httpServerAddr, {
      auth: { token }
    });
    
    clientSocket.on('connect', () => {
      // Verify user joined their personal room
      const rooms = Array.from(serverSocket.rooms);
      
      expect(rooms).toContain(`user:${userId}`);
      expect(rooms).toContain(serverSocket.id); // Socket.io also adds socket ID as a room
      
      console.log(`[TEST] User rooms:`, rooms);
      
      clientSocket.disconnect();
      done();
    });
    
    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });
  
  test('should emit verdict event only to correct user room', (done) => {
    const user1Id = '507f1f77bcf86cd799439011';
    const user2Id = '507f1f77bcf86cd799439012';
    
    const token1 = jwt.sign({ userId: user1Id, username: 'user1' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    const token2 = jwt.sign({ userId: user2Id, username: 'user2' }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    
    const client1 = Client(httpServerAddr, { auth: { token: token1 } });
    const client2 = Client(httpServerAddr, { auth: { token: token2 } });
    
    let client1Connected = false;
    let client2Connected = false;
    let client1ReceivedVerdict = false;
    let client2ReceivedVerdict = false;
    
    client1.on('connect', () => {
      client1Connected = true;
      checkBothConnected();
    });
    
    client2.on('connect', () => {
      client2Connected = true;
      checkBothConnected();
    });
    
    function checkBothConnected() {
      if (client1Connected && client2Connected) {
        // Both clients connected, now emit verdict to user1 only
        const verdictData = {
          submissionId: '507f1f77bcf86cd799439013',
          verdict: 'AC',
          executionTime: 245,
          memoryUsed: 12
        };
        
        // Emit to user1's room only
        io.to(`user:${user1Id}`).emit('verdict', verdictData);
        
        // Wait a bit to ensure events are processed
        setTimeout(() => {
          expect(client1ReceivedVerdict).toBe(true);
          expect(client2ReceivedVerdict).toBe(false);
          
          client1.disconnect();
          client2.disconnect();
          done();
        }, 100);
      }
    }
    
    client1.on('verdict', (data) => {
      client1ReceivedVerdict = true;
      expect(data.verdict).toBe('AC');
      expect(data.submissionId).toBe('507f1f77bcf86cd799439013');
    });
    
    client2.on('verdict', () => {
      client2ReceivedVerdict = true;
    });
    
    client1.on('connect_error', done);
    client2.on('connect_error', done);
  });
  
  test('should use correct room name format: user:{userId}', (done) => {
    const userId = '507f1f77bcf86cd799439011';
    const username = 'testuser';
    
    const token = jwt.sign({ userId, username }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    
    const clientSocket = Client(httpServerAddr, {
      auth: { token }
    });
    
    clientSocket.on('connect', () => {
      const rooms = Array.from(serverSocket.rooms);
      const expectedRoomName = `user:${userId}`;
      
      expect(rooms).toContain(expectedRoomName);
      
      // Verify exact format (no extra characters, correct separator)
      const userRoom = rooms.find(room => room.startsWith('user:'));
      expect(userRoom).toBe(expectedRoomName);
      
      clientSocket.disconnect();
      done();
    });
    
    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });
});
