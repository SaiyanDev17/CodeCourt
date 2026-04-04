/**
 * Authentication Store using Zustand
 * 
 * This is a GLOBAL STATE store that manages authentication data across the entire application.
 * Unlike local React state (useState), this store:
 * - Persists across component mounts/unmounts
 * - Can be accessed from ANY component without prop drilling
 * - Provides a single source of truth for authentication status
 * 
 * Why authentication is perfect for global state:
 * 1. User identity is needed everywhere (navbar, protected routes, API calls, profile pages)
 * 2. Login session must persist when navigating between pages
 * 3. Avoids passing user/token through multiple component layers
 * 4. Centralizes login/logout logic in one place
 */

import { create } from 'zustand'

/**
 * User Interface
 * Represents the authenticated user's profile data
 * This matches the User model from the backend (see design.md)
 */
interface User {
  id: string          // MongoDB ObjectId as string
  username: string    // Unique username
  email: string       // User's email address
  role: string        // One of: 'admin' | 'problem_setter' | 'contestant'
}

/**
 * AuthState Interface
 * Defines the shape of our authentication store
 * 
 * State properties:
 * - user: The currently logged-in user (null if not authenticated)
 * - accessToken: Short-lived JWT token (15 minutes) for API authentication
 * 
 * Actions (functions that modify state):
 * - login: Called after successful authentication to set user + token
 * - setUser: Updates just the user object (useful for profile updates)
 * - setAccessToken: Updates just the access token (useful for token refresh)
 * - logout: Clears all authentication data
 */
interface AuthState {
  // ============ STATE ============
  
  /**
   * The currently authenticated user
   * - null when user is not logged in
   * - Contains user profile data when authenticated
   */
  user: User | null
  
  /**
   * JWT Access Token (short-lived, 15 minutes)
   * - Used in Authorization: Bearer {token} header for API requests
   * - Stored in memory only (NOT localStorage) for security
   * - null when user is not logged in
   * 
   * Note: The refresh token (7 days) is stored as an HTTP-only cookie
   * by the backend and is NOT accessible to JavaScript for security.
   */
  accessToken: string | null
  
  // ============ ACTIONS ============
  
  /**
   * Login Action
   * Called after successful authentication (POST /api/auth/login)
   * Sets both user and accessToken in a single atomic operation
   * 
   * @param user - The authenticated user object from the API
   * @param accessToken - The JWT access token from the API
   * 
   * Example usage:
   * ```ts
   * const response = await api.post('/auth/login', { email, password })
   * useAuthStore.getState().login(response.data.user, response.data.accessToken)
   * ```
   */
  login: (user: User, accessToken: string) => void
  
  /**
   * Set User Action
   * Updates just the user object without touching the token
   * Useful when user profile is updated (e.g., role change, username change)
   * 
   * @param user - The updated user object (or null to clear)
   * 
   * Example usage:
   * ```ts
   * const updatedUser = await api.get('/users/me')
   * useAuthStore.getState().setUser(updatedUser.data)
   * ```
   */
  setUser: (user: User | null) => void
  
  /**
   * Set Access Token Action
   * Updates just the access token without touching the user
   * Primarily used during token refresh (POST /api/auth/refresh)
   * 
   * @param token - The new JWT access token (or null to clear)
   * 
   * Example usage:
   * ```ts
   * const response = await api.post('/auth/refresh')
   * useAuthStore.getState().setAccessToken(response.data.accessToken)
   * ```
   */
  setAccessToken: (token: string | null) => void
  
  /**
   * Logout Action
   * Clears all authentication data from the store
   * Should be called after POST /api/auth/logout completes
   * 
   * This resets the store to its initial unauthenticated state:
   * - user: null
   * - accessToken: null
   * 
   * Note: The backend will handle clearing the HTTP-only refresh token cookie
   * 
   * Example usage:
   * ```ts
   * await api.post('/auth/logout')
   * useAuthStore.getState().logout()
   * router.push('/login')
   * ```
   */
  logout: () => void
}

/**
 * Create the Zustand Store
 * 
 * Zustand's create() function takes a function that receives 'set' and returns the store shape.
 * 
 * The 'set' function is how we update state in Zustand:
 * - set({ key: value }) merges the new state with existing state
 * - It's similar to setState in React, but for global state
 * - Zustand automatically triggers re-renders in components using this state
 * 
 * Initial state:
 * - user: null (not logged in)
 * - accessToken: null (no token)
 * 
 * All actions use 'set' to update state immutably.
 */
export const useAuthStore = create<AuthState>((set) => ({
  // ============ INITIAL STATE ============
  user: null,
  accessToken: null,
  
  // ============ ACTION IMPLEMENTATIONS ============
  
  /**
   * Login Implementation
   * Sets both user and accessToken atomically
   * This ensures the store is always in a consistent state
   */
  login: (user, accessToken) => set({ user, accessToken }),
  
  /**
   * Set User Implementation
   * Updates only the user field, leaving accessToken unchanged
   */
  setUser: (user) => set({ user }),
  
  /**
   * Set Access Token Implementation
   * Updates only the accessToken field, leaving user unchanged
   */
  setAccessToken: (token) => set({ accessToken: token }),
  
  /**
   * Logout Implementation
   * Resets both fields to null, returning to unauthenticated state
   */
  logout: () => set({ user: null, accessToken: null }),
}))

/**
 * USAGE EXAMPLES IN COMPONENTS:
 * 
 * 1. Reading state (causes re-render when state changes):
 * ```tsx
 * function Navbar() {
 *   const user = useAuthStore((state) => state.user)
 *   const accessToken = useAuthStore((state) => state.accessToken)
 *   
 *   if (!user) return <LoginButton />
 *   return <div>Welcome, {user.username}!</div>
 * }
 * ```
 * 
 * 2. Calling actions (doesn't cause re-render):
 * ```tsx
 * function LoginForm() {
 *   const login = useAuthStore((state) => state.login)
 *   
 *   const handleSubmit = async (email, password) => {
 *     const response = await api.post('/auth/login', { email, password })
 *     login(response.data.user, response.data.accessToken)
 *   }
 * }
 * ```
 * 
 * 3. Accessing state outside components:
 * ```ts
 * // In API interceptor or utility function
 * const token = useAuthStore.getState().accessToken
 * ```
 * 
 * 4. Subscribing to changes outside components:
 * ```ts
 * useAuthStore.subscribe((state) => {
 *   console.log('Auth state changed:', state.user)
 * })
 * ```
 */
