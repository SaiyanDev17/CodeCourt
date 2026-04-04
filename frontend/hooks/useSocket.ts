/**
 * useSocket Hook - Manages Socket.io Connection Lifecycle
 * 
 * This custom React hook handles the complete lifecycle of a Socket.io connection:
 * 1. Connects the socket when the component mounts
 * 2. Authenticates using the user's JWT token
 * 3. Disconnects the socket when the component unmounts (CRITICAL cleanup)
 * 
 * ============================================================================
 * WHY IS THE CLEANUP FUNCTION CRITICAL?
 * ============================================================================
 * 
 * Without the cleanup function (disconnectSocket in useEffect return):
 * 
 * 1. MEMORY LEAKS:
 *    - Every page navigation creates a NEW WebSocket connection
 *    - Old connections are never closed, consuming memory indefinitely
 *    - Browser memory usage grows continuously until tab crashes
 *    - Example: Navigate between 10 pages = 10 active connections eating RAM
 * 
 * 2. CONNECTION EXHAUSTION:
 *    - Browsers limit concurrent connections per domain (typically 6-10)
 *    - After hitting the limit, new connections fail
 *    - User can't load new pages or make API requests
 *    - Error: "ERR_INSUFFICIENT_RESOURCES" or "net::ERR_FAILED"
 * 
 * 3. SERVER RESOURCE WASTE:
 *    - Each connection consumes server memory (buffers, event listeners, rooms)
 *    - Zombie connections accumulate on the server
 *    - Server runs out of memory or hits connection limits
 *    - Legitimate users can't connect (DDoS-like effect)
 * 
 * 4. DUPLICATE EVENTS:
 *    - If you navigate back to a page, you might have 2+ socket instances
 *    - All instances listen to the same events
 *    - Example: Submit code once → receive verdict 3 times → UI shows 3 notifications
 *    - Race conditions: Multiple handlers updating the same state
 * 
 * 5. BATTERY DRAIN (Mobile):
 *    - Active WebSocket connections maintain heartbeat pings
 *    - Orphaned connections keep pinging forever
 *    - Drains battery on mobile devices
 *    - User's phone dies faster, poor UX
 * 
 * 6. NETWORK CONGESTION:
 *    - Each connection sends periodic heartbeat packets
 *    - Multiple connections = multiple heartbeats
 *    - Wastes bandwidth, especially on metered/slow connections
 * 
 * With proper cleanup:
 * - Component mounts → Socket connects
 * - Component unmounts → Socket disconnects
 * - Only ONE active connection at a time
 * - Resources freed immediately
 * - Clean, predictable behavior
 * 
 * ============================================================================
 * USAGE EXAMPLE:
 * ============================================================================
 * 
 * ```tsx
 * // In a component that needs real-time updates (e.g., problem page)
 * function ProblemPage() {
 *   useSocket() // That's it! Hook handles everything
 *   
 *   // Now you can listen to events in other hooks or effects
 *   useEffect(() => {
 *     const socket = getSocket()
 *     
 *     socket.on('verdict', (data) => {
 *       console.log('Received verdict:', data)
 *     })
 *     
 *     return () => {
 *       socket.off('verdict') // Clean up event listener
 *     }
 *   }, [])
 * }
 * ```
 * 
 * ============================================================================
 * WHEN TO USE THIS HOOK:
 * ============================================================================
 * 
 * Use in components that need real-time features:
 * - Problem page (verdict updates)
 * - Contest leaderboard (live score updates)
 * - Submission history (status changes)
 * 
 * Don't use on:
 * - Landing page (no real-time features)
 * - Login/Register pages (not authenticated yet)
 * - Static pages (about, FAQ, etc.)
 */

import { useEffect } from 'react'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { useAuthStore } from '@/store/auth.store'

/**
 * useSocket Hook
 * 
 * Manages Socket.io connection lifecycle with proper cleanup.
 * 
 * Flow:
 * 1. Component mounts → useEffect runs
 * 2. Get accessToken from auth store
 * 3. If token exists → Connect socket with authentication
 * 4. Component unmounts → useEffect cleanup runs → Disconnect socket
 * 
 * Dependencies:
 * - [accessToken]: Re-run effect if token changes
 *   - User logs in → token changes from null to string → connect
 *   - User logs out → token changes to null → disconnect
 *   - Token refreshes → new token → reconnect with new auth
 * 
 * @returns void (no return value, just side effects)
 */
export function useSocket(): void {
  // ========================================================================
  // Get Access Token from Auth Store
  // ========================================================================
  // 
  // We use a selector function to extract only the accessToken.
  // This is more efficient than subscribing to the entire auth state.
  // 
  // The component will re-render only when accessToken changes, not when
  // other auth state properties (like user) change.
  const accessToken = useAuthStore((state) => state.accessToken)
  
  // ========================================================================
  // Connection Lifecycle Effect
  // ========================================================================
  useEffect(() => {
    // ======================================================================
    // Guard: Only connect if user is authenticated
    // ======================================================================
    // 
    // If accessToken is null (user not logged in), don't connect.
    // This prevents:
    // - Unauthenticated connection attempts (would be rejected by server)
    // - Unnecessary network requests
    // - Console errors from failed authentication
    if (!accessToken) {
      console.log('[useSocket] No access token, skipping socket connection')
      return // Early return, no cleanup needed
    }
    
    // ======================================================================
    // Connect Socket with Authentication
    // ======================================================================
    // 
    // This function (from lib/socket.ts):
    // 1. Gets or creates the socket instance
    // 2. Attaches the JWT token to socket.auth
    // 3. Initiates the WebSocket connection
    // 4. Server verifies the token and accepts/rejects connection
    console.log('[useSocket] Connecting socket with authentication')
    connectSocket(accessToken)
    
    // ======================================================================
    // CRITICAL: Cleanup Function
    // ======================================================================
    // 
    // This function runs when:
    // - Component unmounts (user navigates away)
    // - accessToken changes (user logs out or token refreshes)
    // - Component re-renders and effect needs to re-run
    // 
    // It MUST disconnect the socket to prevent the issues described above.
    // 
    // React guarantees this cleanup runs BEFORE the next effect and when
    // the component unmounts, ensuring no orphaned connections.
    return () => {
      console.log('[useSocket] Disconnecting socket (cleanup)')
      disconnectSocket()
    }
  }, [accessToken]) // Re-run effect when accessToken changes
  
  // No return value - this hook only manages side effects
}

/**
 * ADVANCED USAGE: Custom Event Listeners
 * 
 * If you need to listen to specific events, you can combine useSocket with
 * additional useEffect hooks:
 * 
 * ```tsx
 * function SubmissionPage() {
 *   useSocket() // Manage connection
 *   const [verdict, setVerdict] = useState(null)
 *   
 *   useEffect(() => {
 *     const socket = getSocket()
 *     
 *     // Listen for verdict events
 *     const handleVerdict = (data) => {
 *       setVerdict(data)
 *     }
 *     
 *     socket.on('verdict', handleVerdict)
 *     
 *     // IMPORTANT: Clean up event listener
 *     return () => {
 *       socket.off('verdict', handleVerdict)
 *     }
 *   }, [])
 *   
 *   return <div>Verdict: {verdict?.status}</div>
 * }
 * ```
 * 
 * Note: Always clean up event listeners with socket.off() to prevent:
 * - Multiple handlers for the same event
 * - Memory leaks from retained closures
 * - Stale state in event handlers
 */

/**
 * ALTERNATIVE: useSocket with Room Joining
 * 
 * If you need to join specific Socket.io rooms (e.g., contest leaderboard),
 * you can extend this hook:
 * 
 * ```tsx
 * export function useSocketRoom(room: string): void {
 *   const accessToken = useAuthStore((state) => state.accessToken)
 *   
 *   useEffect(() => {
 *     if (!accessToken) return
 *     
 *     const socket = connectSocket(accessToken)
 *     
 *     // Join room after connection
 *     socket.emit('join', room)
 *     console.log(`[useSocket] Joined room: ${room}`)
 *     
 *     return () => {
 *       socket.emit('leave', room)
 *       disconnectSocket()
 *     }
 *   }, [accessToken, room])
 * }
 * 
 * // Usage:
 * function ContestLeaderboard({ contestId }) {
 *   useSocketRoom(`contest:${contestId}`)
 *   // Now you'll receive leaderboard:update events for this contest
 * }
 * ```
 */
