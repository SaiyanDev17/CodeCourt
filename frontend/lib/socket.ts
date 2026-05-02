/**
 * Socket.io Client for Real-Time Communication
 * 
 * This file creates a Socket.io client that handles:
 * 1. Persistent WebSocket connection to the Express backend
 * 2. Authentication via JWT token
 * 3. Real-time bidirectional communication (server can push updates)
 * 4. Automatic reconnection on connection loss
 * 
 * ============================================================================
 * HTTP vs WebSocket: What's the Difference?
 * ============================================================================
 * 
 * HTTP (used by Axios in api.ts):
 * - Request-Response Model: Client asks → Server responds → Connection closes
 * - Unidirectional: Client must initiate every interaction
 * - Stateless: Each request is independent
 * - Use cases: Fetching data, submitting forms, CRUD operations
 * - Example: GET /api/problems → Server sends problem list → Done
 * 
 * WebSocket (used by Socket.io in this file):
 * - Persistent Connection: Connection stays open continuously
 * - Bidirectional: Both client and server can send messages anytime
 * - Stateful: Maintains connection state and context
 * - Use cases: Real-time updates, live notifications, chat, streaming
 * - Example: Submit code → Server judges → Server PUSHES verdict → Client receives instantly
 * 
 * In CodeCourt:
 * - Axios (HTTP): Login, fetch problems, submit code, create contests
 * - Socket.io (WebSocket): Real-time verdict updates, live leaderboard, notifications
 * 
 * ============================================================================
 * Why autoConnect: false?
 * ============================================================================
 * 
 * Security Reasons:
 * - Without a JWT token, the connection would be anonymous/unauthenticated
 * - We need to wait until the user logs in and we have their token
 * - Then we pass the token in socket.auth for server-side verification
 * - This prevents unauthorized users from subscribing to real-time events
 * 
 * Performance Reasons:
 * - No wasted connection attempts on public pages (landing, login, register)
 * - Only connect when user actually needs real-time features
 * - Saves server resources (each WebSocket connection consumes memory)
 * - Saves client bandwidth and battery (mobile devices)
 * 
 * Flow:
 * 1. User lands on site → Socket NOT connected (autoConnect: false)
 * 2. User logs in → We get JWT token
 * 3. User navigates to problem page → We call connectSocket(token)
 * 4. Server verifies token → Connection established
 * 5. User submits code → Server pushes verdict via socket
 * 6. User logs out → We call disconnectSocket()
 */

import { io, Socket } from 'socket.io-client'

/**
 * Singleton Socket Instance
 * 
 * We use a singleton pattern (single shared instance) because:
 * 1. Only one WebSocket connection per client is needed
 * 2. Multiple components can share the same connection
 * 3. Prevents duplicate connections (memory leak)
 * 4. Maintains connection state across component re-renders
 * 
 * Why null initially?
 * - We don't create the socket until it's actually needed (lazy initialization)
 * - This prevents connection attempts during SSR (Server-Side Rendering)
 */
let socket: Socket | null = null

/**
 * Get or Create Socket Instance
 * 
 * This function implements lazy initialization:
 * - First call: Creates the socket instance
 * - Subsequent calls: Returns the existing instance
 * 
 * Socket Configuration:
 * - baseURL: Points to Express backend (same as Axios, but for WebSocket)
 * - autoConnect: false (CRITICAL - explained above)
 * - transports: ['websocket', 'polling'] (default, but explicit is better)
 * 
 * @returns Socket instance (not connected yet)
 */
export function getSocket(): Socket {
  if (!socket) {
    // Create the socket instance with configuration
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      // ======================================================================
      // autoConnect: false is CRITICAL
      // ======================================================================
      // 
      // Without this, Socket.io would try to connect immediately when this
      // module is imported. This would happen:
      // 1. Before the user logs in (no token available)
      // 2. On every page, even public pages that don't need real-time features
      // 3. During SSR (server-side rendering), which would fail
      // 
      // With autoConnect: false:
      // - Socket is created but NOT connected
      // - We manually call socket.connect() only when needed
      // - We can attach the auth token before connecting
      autoConnect: false,
      
      // ======================================================================
      // Transport Configuration
      // ======================================================================
      // 
      // Socket.io supports two transport mechanisms:
      // 1. websocket: True WebSocket protocol (preferred, faster)
      // 2. polling: HTTP long-polling fallback (for restrictive networks)
      // 
      // Socket.io automatically tries websocket first, falls back to polling
      // if websocket is blocked by firewall/proxy
      transports: ['websocket', 'polling'],
      
      // ======================================================================
      // Reconnection Configuration
      // ======================================================================
      // 
      // If connection is lost (network issue, server restart), Socket.io
      // will automatically try to reconnect with exponential backoff
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000, // Start with 1 second
      reconnectionDelayMax: 5000, // Max 5 seconds between attempts
      
      // ======================================================================
      // Timeout Configuration
      // ======================================================================
      timeout: 20000, // 20 seconds to establish connection
    })
    
    // ========================================================================
    // Connection Event Handlers
    // ========================================================================
    
    // These handlers help with debugging and monitoring connection state
    
    socket.on('connect', () => {
      console.log('[Socket.io] Connected to server', socket?.id)
    })
    
    socket.on('disconnect', (reason) => {
      console.log('[Socket.io] Disconnected:', reason)
      
      // If server disconnected us, it might be due to invalid token
      if (reason === 'io server disconnect') {
        console.warn('[Socket.io] Server disconnected the socket. Token might be invalid.')
      }
    })
    
    socket.on('connect_error', (error) => {
      console.error('[Socket.io] Connection error:', error.message)
    })
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket.io] Reconnection attempt ${attemptNumber}`)
    })
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket.io] Reconnected after ${attemptNumber} attempts`)
    })
    
    socket.on('reconnect_failed', () => {
      console.error('[Socket.io] Reconnection failed after all attempts')
    })
  }
  
  return socket
}

/**
 * Connect Socket with Authentication
 * 
 * This function:
 * 1. Gets the socket instance (creates if needed)
 * 2. Attaches the JWT token to socket.auth
 * 3. Initiates the connection
 * 
 * The token is sent to the server during the connection handshake.
 * Server-side middleware (in backend/src/socket/index.js) will:
 * 1. Extract the token from socket.handshake.auth.token
 * 2. Verify the JWT signature
 * 3. Attach user info to socket.data.user
 * 4. Accept or reject the connection
 * 
 * Usage:
 * ```tsx
 * // After user logs in
 * const token = useAuthStore(state => state.accessToken)
 * if (token) {
 *   connectSocket(token)
 * }
 * ```
 * 
 * @param token - JWT access token from auth store
 * @returns Connected socket instance
 */
export function connectSocket(token: string): Socket {
  const socket = getSocket()
  
  // ========================================================================
  // Attach Token to Auth Object
  // ========================================================================
  // 
  // socket.auth is a special object that Socket.io sends during the
  // connection handshake. The server can access it via:
  // socket.handshake.auth.token
  // 
  // This is the standard way to authenticate Socket.io connections
  socket.auth = { token }
  
  // ========================================================================
  // Initiate Connection
  // ========================================================================
  // 
  // This triggers the connection handshake:
  // 1. Client sends connection request with auth token
  // 2. Server verifies token in middleware
  // 3. If valid: connection established, 'connect' event fires
  // 4. If invalid: connection rejected, 'connect_error' event fires
  socket.connect()
  
  return socket
}

/**
 * Disconnect Socket
 * 
 * Call this when:
 * - User logs out
 * - User navigates away from pages that need real-time features
 * - Component unmounts (cleanup in useEffect)
 * 
 * This closes the WebSocket connection and frees up resources.
 * 
 * Usage:
 * ```tsx
 * // In logout handler
 * const logout = () => {
 *   disconnectSocket()
 *   authStore.logout()
 *   router.push('/login')
 * }
 * 
 * // In useEffect cleanup
 * useEffect(() => {
 *   connectSocket(token)
 *   return () => disconnectSocket()
 * }, [token])
 * ```
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
  }
}

/**
 * Check if Socket is Connected
 * 
 * Utility function to check connection state.
 * Useful for conditional rendering or logic.
 * 
 * @returns true if socket exists and is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}

/**
 * Export the socket instance for direct access (advanced usage)
 * 
 * Most components should use getSocket() instead, but this is useful
 * for debugging or advanced scenarios where you need direct access.
 */
export { socket }
