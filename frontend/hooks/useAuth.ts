/**
 * useAuth Hook
 * 
 * A custom React hook that provides authentication functionality to components.
 * This hook acts as a bridge between the Zustand auth store and React components,
 * providing a clean, reusable interface for authentication operations.
 * 
 * Why use a custom hook instead of directly accessing the store in components?
 * 
 * 1. **Abstraction**: Components don't need to know about Zustand implementation details
 * 2. **Reusability**: Write auth logic once, use it everywhere
 * 3. **Consistency**: All components use the same auth interface
 * 4. **Testability**: Easy to mock in tests
 * 5. **Maintainability**: Change auth implementation in one place
 * 6. **Type Safety**: TypeScript ensures correct usage
 * 
 * Usage Example:
 * ```tsx
 * function LoginPage() {
 *   const { login, isLoading, error } = useAuth()
 *   
 *   const handleSubmit = async (email: string, password: string) => {
 *     await login(email, password)
 *     router.push('/problems')
 *   }
 * }
 * ```
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import type { User } from '@/types'

/**
 * Login Credentials Interface
 * Defines the shape of login form data
 */
interface LoginCredentials {
  email: string
  password: string
}

/**
 * Register Credentials Interface
 * Defines the shape of registration form data
 */
interface RegisterCredentials {
  username: string
  email: string
  password: string
}

/**
 * useAuth Hook Return Type
 * Defines what this hook exposes to components
 */
interface UseAuthReturn {
  // ============ STATE ============
  
  /**
   * The currently authenticated user (from Zustand store)
   * null if not logged in
   */
  user: User | null
  
  /**
   * Convenience boolean for checking authentication status
   * true if user is logged in, false otherwise
   */
  isAuthenticated: boolean
  
  /**
   * Loading state for async operations (login, logout, register)
   * true while an auth operation is in progress
   */
  isLoading: boolean
  
  /**
   * Error message from the last failed auth operation
   * null if no error or operation succeeded
   */
  error: string | null
  
  // ============ ACTIONS ============
  
  /**
   * Login function
   * Authenticates user with email and password
   * 
   * @param credentials - Email and password
   * @returns Promise that resolves when login succeeds
   * @throws Error if login fails
   */
  login: (credentials: LoginCredentials) => Promise<void>
  
  /**
   * Register function
   * Creates a new user account
   * 
   * @param credentials - Username, email, and password
   * @returns Promise that resolves when registration succeeds
   * @throws Error if registration fails
   */
  register: (credentials: RegisterCredentials) => Promise<void>
  
  /**
   * Logout function
   * Logs out the current user and clears auth state
   * 
   * @returns Promise that resolves when logout completes
   */
  logout: () => Promise<void>
  
  /**
   * Refresh Token function
   * Manually triggers a token refresh
   * Useful for checking if the session is still valid
   * 
   * @returns Promise that resolves with the new access token
   * @throws Error if refresh fails (session expired)
   */
  refreshToken: () => Promise<string>
  
  /**
   * Clear Error function
   * Clears the current error message
   * Useful for dismissing error alerts
   */
  clearError: () => void
}

/**
 * useAuth Hook Implementation
 * 
 * This hook manages authentication state and operations.
 * It uses:
 * - Zustand store for global auth state (user, accessToken)
 * - Local React state for UI state (isLoading, error)
 * - Axios API client for HTTP requests
 * - Next.js router for navigation
 */
export function useAuth(): UseAuthReturn {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Get auth state from Zustand store
  // This causes re-render when user or accessToken changes
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  
  // Get auth actions from Zustand store
  // These don't cause re-renders (they're just functions)
  const storeLogin = useAuthStore((state) => state.login)
  const storeLogout = useAuthStore((state) => state.logout)
  const storeSetAccessToken = useAuthStore((state) => state.setAccessToken)
  
  // Local state for UI feedback
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Next.js router for navigation after auth operations
  const router = useRouter()
  
  // Derived state: user is authenticated if they exist in the store
  const isAuthenticated = !!user
  
  // ============================================================================
  // LOGIN FUNCTION
  // ============================================================================
  
  /**
   * Login Implementation
   * 
   * Flow:
   * 1. Set loading state
   * 2. Call POST /api/auth/login with credentials
   * 3. Backend validates credentials and returns user + tokens
   * 4. Store user and accessToken in Zustand
   * 5. Clear loading state
   * 6. Navigate to problems page (or wherever user was trying to go)
   * 
   * Note: The refresh token is stored as an HTTP-only cookie by the backend
   * and is NOT accessible to JavaScript (for security).
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        // Clear any previous errors
        setError(null)
        
        // Set loading state (shows spinner in UI)
        setIsLoading(true)
        
        // Call the login endpoint
        // Backend will:
        // 1. Validate email/password
        // 2. Generate JWT access token (15 min expiry)
        // 3. Generate JWT refresh token (7 day expiry)
        // 4. Set refresh token as HTTP-only cookie
        // 5. Return access token + user object
        const response = await api.post('/auth/login', credentials)
        
        // Extract user and access token from response
        const { user, accessToken } = response.data
        
        // Update Zustand store with auth data
        // This makes the user authenticated across the entire app
        storeLogin(user, accessToken)
        
        // Login successful - no error
        setError(null)
        
      } catch (err: any) {
        // Login failed - extract error message
        const errorMessage = err.response?.data?.message || 'Login failed. Please try again.'
        setError(errorMessage)
        
        // Re-throw the error so calling code can handle it
        // (e.g., show a toast notification)
        throw new Error(errorMessage)
        
      } finally {
        // Always clear loading state, whether success or failure
        setIsLoading(false)
      }
    },
    [storeLogin] // Dependency: recreate function if storeLogin changes (it won't)
  )
  
  // ============================================================================
  // REGISTER FUNCTION
  // ============================================================================
  
  /**
   * Register Implementation
   * 
   * Flow:
   * 1. Set loading state
   * 2. Call POST /api/auth/register with credentials
   * 3. Backend creates user account
   * 4. Backend returns success message (but NOT tokens - user must login)
   * 5. Clear loading state
   * 6. Navigate to login page
   * 
   * Note: After registration, user must login separately.
   * This is a security best practice (prevents account takeover via registration).
   */
  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      try {
        // Clear any previous errors
        setError(null)
        
        // Set loading state
        setIsLoading(true)
        
        // Call the register endpoint
        // Backend will:
        // 1. Validate username/email uniqueness
        // 2. Hash password with bcrypt (cost 10)
        // 3. Create user in MongoDB
        // 4. Return success message
        await api.post('/auth/register', credentials)
        
        // Registration successful
        setError(null)
        
        // Navigate to login page
        // User needs to login with their new credentials
        router.push('/login')
        
      } catch (err: any) {
        // Registration failed - extract error message
        const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.'
        setError(errorMessage)
        
        // Re-throw the error
        throw new Error(errorMessage)
        
      } finally {
        // Always clear loading state
        setIsLoading(false)
      }
    },
    [router] // Dependency: recreate function if router changes (it won't)
  )
  
  // ============================================================================
  // LOGOUT FUNCTION
  // ============================================================================
  
  /**
   * Logout Implementation
   * 
   * Flow:
   * 1. Set loading state
   * 2. Call POST /api/auth/logout
   * 3. Backend blacklists refresh token in Redis
   * 4. Backend clears refresh token cookie
   * 5. Clear Zustand store (user + accessToken)
   * 6. Navigate to login page
   * 
   * Note: Even if the API call fails, we still clear local state.
   * This ensures the user is logged out on the frontend even if the backend fails.
   */
  const logout = useCallback(async () => {
    try {
      // Set loading state
      setIsLoading(true)
      
      // Call the logout endpoint
      // Backend will:
      // 1. Extract refresh token from cookie
      // 2. Add it to Redis blacklist (TTL = token expiry)
      // 3. Clear the refresh token cookie
      await api.post('/auth/logout')
      
    } catch (err: any) {
      // Logout API call failed, but we still want to clear local state
      console.error('Logout API call failed:', err)
      
    } finally {
      // ALWAYS clear local auth state, even if API call failed
      // This ensures user is logged out on the frontend
      storeLogout()
      
      // Clear loading state
      setIsLoading(false)
      
      // Navigate to login page
      router.push('/login')
    }
  }, [storeLogout, router])
  
  // ============================================================================
  // REFRESH TOKEN FUNCTION
  // ============================================================================
  
  /**
   * Refresh Token Implementation
   * 
   * Flow:
   * 1. Call POST /api/auth/refresh
   * 2. Backend validates refresh token from cookie
   * 3. Backend generates new access token
   * 4. Backend rotates refresh token (optional, for extra security)
   * 5. Update Zustand store with new access token
   * 6. Return new access token
   * 
   * Note: This is usually called automatically by the Axios interceptor
   * when a 401 error occurs. But it can also be called manually to check
   * if the session is still valid.
   */
  const refreshToken = useCallback(async (): Promise<string> => {
    try {
      // Call the refresh endpoint
      // The refresh token cookie is automatically sent (withCredentials: true)
      const response = await api.post('/auth/refresh')
      
      // Extract new access token
      const { accessToken: newAccessToken } = response.data
      
      // Update Zustand store with new token
      storeSetAccessToken(newAccessToken)
      
      // Return the new token
      return newAccessToken
      
    } catch (err: any) {
      // Refresh failed - session expired
      // Clear auth state and redirect to login
      storeLogout()
      router.push('/login')
      
      // Re-throw the error
      throw new Error('Session expired. Please login again.')
    }
  }, [storeSetAccessToken, storeLogout, router])
  
  // ============================================================================
  // CLEAR ERROR FUNCTION
  // ============================================================================
  
  /**
   * Clear Error Implementation
   * 
   * Simple function to clear the error state.
   * Useful for dismissing error alerts in the UI.
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // ============================================================================
  // RETURN HOOK INTERFACE
  // ============================================================================
  
  /**
   * Return all state and actions
   * Components can destructure what they need:
   * 
   * const { user, login } = useAuth()  // Login page
   * const { user, logout } = useAuth()  // Navbar
   * const { isAuthenticated } = useAuth()  // Protected route
   */
  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    refreshToken,
    clearError,
  }
}

/**
 * USAGE EXAMPLES:
 * 
 * 1. Login Page:
 * ```tsx
 * function LoginPage() {
 *   const { login, isLoading, error } = useAuth()
 *   const [email, setEmail] = useState('')
 *   const [password, setPassword] = useState('')
 *   
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault()
 *     try {
 *       await login({ email, password })
 *       // Success - user is now logged in and redirected
 *     } catch (err) {
 *       // Error is already set in the hook
 *       // Just show it in the UI
 *     }
 *   }
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <div className="error">{error}</div>}
 *       <input value={email} onChange={e => setEmail(e.target.value)} />
 *       <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
 *       <button disabled={isLoading}>
 *         {isLoading ? 'Logging in...' : 'Login'}
 *       </button>
 *     </form>
 *   )
 * }
 * ```
 * 
 * 2. Navbar:
 * ```tsx
 * function Navbar() {
 *   const { user, isAuthenticated, logout } = useAuth()
 *   
 *   if (!isAuthenticated) {
 *     return <Link href="/login">Login</Link>
 *   }
 *   
 *   return (
 *     <div>
 *       <span>Welcome, {user?.username}!</span>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   )
 * }
 * ```
 * 
 * 3. Protected Route:
 * ```tsx
 * function ProtectedPage() {
 *   const { isAuthenticated, isLoading } = useAuth()
 *   const router = useRouter()
 *   
 *   useEffect(() => {
 *     if (!isLoading && !isAuthenticated) {
 *       router.push('/login')
 *     }
 *   }, [isAuthenticated, isLoading, router])
 *   
 *   if (isLoading) return <div>Loading...</div>
 *   if (!isAuthenticated) return null
 *   
 *   return <div>Protected content</div>
 * }
 * ```
 * 
 * 4. Manual Token Refresh:
 * ```tsx
 * function SessionChecker() {
 *   const { refreshToken } = useAuth()
 *   
 *   useEffect(() => {
 *     // Check session validity every 10 minutes
 *     const interval = setInterval(async () => {
 *       try {
 *         await refreshToken()
 *         console.log('Session refreshed')
 *       } catch (err) {
 *         console.log('Session expired')
 *       }
 *     }, 10 * 60 * 1000)
 *     
 *     return () => clearInterval(interval)
 *   }, [refreshToken])
 *   
 *   return null
 * }
 * ```
 */
