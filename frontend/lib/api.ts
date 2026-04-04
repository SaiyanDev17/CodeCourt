/**
 * Axios API Client for Express Backend
 * 
 * This file creates a configured Axios instance that handles:
 * 1. Automatic Bearer token attachment to every request
 * 2. Automatic token refresh when the access token expires (401 errors)
 * 3. Retry of failed requests after token refresh
 * 
 * Why use a custom Axios instance instead of raw fetch or axios directly?
 * - Centralized configuration (base URL, credentials, headers)
 * - Automatic authentication handling (no manual token management in components)
 * - Automatic token refresh (seamless user experience, no forced re-login)
 * - Request/response interceptors (middleware for all HTTP calls)
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth.store'

/**
 * Create the Axios Instance
 * 
 * This is our main API client that all components will use.
 * It's pre-configured with:
 * - baseURL: Points to our Express backend API
 * - withCredentials: Allows cookies to be sent (needed for refresh token cookie)
 */
const api = axios.create({
  // Base URL for all requests
  // In production: NEXT_PUBLIC_API_URL = https://api.codecourt.com/api
  // In development: defaults to http://localhost:5000/api
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  
  // withCredentials: true is CRITICAL for authentication
  // This tells Axios to include cookies in requests
  // Our refresh token is stored as an HTTP-only cookie by the backend
  // Without this, the refresh token cookie won't be sent, and auto-refresh will fail
  withCredentials: true,
})

/**
 * Flag to prevent infinite refresh loops
 * 
 * Scenario: If the refresh token itself is expired/invalid, the refresh request
 * will also return 401, which would trigger another refresh attempt, creating
 * an infinite loop.
 * 
 * This flag ensures we only attempt ONE refresh at a time.
 */
let isRefreshing = false

/**
 * Queue for failed requests during token refresh
 * 
 * When multiple requests fail with 401 simultaneously (e.g., user opens multiple
 * tabs or makes parallel API calls), we don't want to trigger multiple refresh
 * attempts. Instead:
 * 1. First 401 triggers refresh and sets isRefreshing = true
 * 2. Subsequent 401s add their retry callbacks to this queue
 * 3. After refresh completes, all queued requests are retried with the new token
 */
let failedRequestsQueue: Array<(token: string) => void> = []

// ============================================================================
// REQUEST INTERCEPTOR: Automatically attach Bearer token to every request
// ============================================================================

/**
 * Request Interceptor
 * 
 * This function runs BEFORE every HTTP request is sent.
 * It's like a checkpoint that every request passes through.
 * 
 * Purpose: Automatically add the JWT access token to the Authorization header
 * 
 * Flow:
 * 1. Component calls: api.get('/problems')
 * 2. This interceptor runs BEFORE the request is sent
 * 3. We grab the access token from Zustand store
 * 4. We inject it into the Authorization header
 * 5. The request is sent with the token attached
 * 
 * Why this is better than manual token attachment:
 * - Write once, works everywhere (DRY principle)
 * - Components don't need to know about authentication
 * - Impossible to forget adding the token
 * - Centralized auth logic (easy to update)
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // ========================================================================
    // STEP 1: Get the access token from Zustand store
    // ========================================================================
    
    // useAuthStore.getState() gives us access to the store OUTSIDE of React components
    // This is different from using the hook: const token = useAuthStore(state => state.accessToken)
    // Hooks only work inside components, but interceptors run outside the React lifecycle
    const token = useAuthStore.getState().accessToken
    
    // ========================================================================
    // STEP 2: Inject the token into the Authorization header (if it exists)
    // ========================================================================
    
    if (token) {
      // Ensure config.headers exists (TypeScript safety)
      // In rare cases, config.headers might be undefined
      if (!config.headers) {
        config.headers = {} as any
      }
      
      // Set the Authorization header with Bearer token
      // Format: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      // 
      // Why "Bearer"?
      // - It's the standard OAuth 2.0 token type for JWTs
      // - Backend expects this format: req.headers.authorization.split(' ')[1]
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // ========================================================================
    // STEP 3: Return the modified config so the request can proceed
    // ========================================================================
    
    // The request will now be sent with the Authorization header attached
    return config
  },
  
  // Error handler for request interceptor
  // This catches errors that happen BEFORE the request is sent (rare)
  (error) => {
    return Promise.reject(error)
  }
)

// ============================================================================
// RESPONSE INTERCEPTOR: Automatically refresh token on 401 errors
// ============================================================================

/**
 * Response Interceptor
 * 
 * This function runs AFTER every HTTP response is received.
 * It's like a checkpoint that every response passes through.
 * 
 * Purpose: Detect 401 Unauthorized errors and automatically refresh the token
 * 
 * Flow (Happy Path):
 * 1. Request succeeds (200, 201, etc.)
 * 2. This interceptor runs
 * 3. We just pass the response through unchanged
 * 
 * Flow (401 Error - Token Expired):
 * 1. Request fails with 401 (access token expired after 15 minutes)
 * 2. This interceptor catches the error
 * 3. We call POST /api/auth/refresh (sends refresh token cookie)
 * 4. Backend validates refresh token and returns new access token
 * 5. We update Zustand store with new access token
 * 6. We retry the original failed request with the new token
 * 7. User never notices - seamless experience!
 */
api.interceptors.response.use(
  // Success handler - just pass through the response
  (response) => response,
  
  // Error handler - this is where the magic happens
  async (error: AxiosError) => {
    // Get the original request config so we can retry it later
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    // ========================================================================
    // STEP 1: Check if this is a 401 error that we should handle
    // ========================================================================
    
    // We only auto-refresh if:
    // 1. Error status is 401 (Unauthorized - token expired)
    // 2. We haven't already tried to refresh for this request (_retry flag)
    // 3. The failed request is NOT the refresh endpoint itself (prevent infinite loop)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      // Mark this request as "already attempted refresh" to prevent infinite loops
      originalRequest._retry = true
      
      // ========================================================================
      // STEP 2: Handle concurrent 401 errors (queue pattern)
      // ========================================================================
      
      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        // Return a promise that will resolve when the refresh completes
        // This request will be retried with the new token
        return new Promise((resolve) => {
          // Add a callback to the queue
          // When refresh completes, this callback will be called with the new token
          failedRequestsQueue.push((token: string) => {
            // Update the Authorization header with the new token
            originalRequest.headers.Authorization = `Bearer ${token}`
            // Retry the original request with the new token
            resolve(api(originalRequest))
          })
        })
      }
      
      // ========================================================================
      // STEP 3: Attempt to refresh the token
      // ========================================================================
      
      // Set the flag to prevent concurrent refresh attempts
      isRefreshing = true
      
      try {
        // Call the refresh endpoint
        // This sends the refresh token cookie (thanks to withCredentials: true)
        // Backend validates the refresh token and returns a new access token
        const response = await api.post('/auth/refresh')
        
        // Extract the new access token from the response
        const newAccessToken = response.data.accessToken
        
        // ========================================================================
        // STEP 4: Update Zustand store with the new token
        // ========================================================================
        
        // This updates the global auth state
        // All future requests will use this new token (via the request interceptor)
        useAuthStore.getState().setAccessToken(newAccessToken)
        
        // ========================================================================
        // STEP 5: Retry all queued requests with the new token
        // ========================================================================
        
        // Process all requests that failed while we were refreshing
        failedRequestsQueue.forEach((callback) => callback(newAccessToken))
        
        // Clear the queue
        failedRequestsQueue = []
        
        // ========================================================================
        // STEP 6: Retry the original request with the new token
        // ========================================================================
        
        // Update the Authorization header with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        
        // Retry the original request
        // This time it should succeed because we have a fresh token
        return api(originalRequest)
        
      } catch (refreshError) {
        // ========================================================================
        // STEP 7: Handle refresh failure (refresh token expired or invalid)
        // ========================================================================
        
        // If refresh fails, the refresh token is expired/invalid
        // User needs to log in again
        
        // Clear the queue (all queued requests will fail)
        failedRequestsQueue = []
        
        // Log the user out (clear Zustand store)
        useAuthStore.getState().logout()
        
        // Redirect to login page
        // Note: In Next.js App Router, we should use router.push('/login')
        // But we can't use hooks here, so we use window.location
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        
        // Reject the promise so the calling code knows the request failed
        return Promise.reject(refreshError)
        
      } finally {
        // ========================================================================
        // STEP 8: Reset the refresh flag
        // ========================================================================
        
        // Allow future refresh attempts
        isRefreshing = false
      }
    }
    
    // ========================================================================
    // STEP 9: For non-401 errors, just pass them through
    // ========================================================================
    
    // This could be 400 (Bad Request), 403 (Forbidden), 404 (Not Found), 500 (Server Error), etc.
    // Let the calling code handle these errors
    return Promise.reject(error)
  }
)

/**
 * Export the configured Axios instance
 * 
 * Usage in components:
 * 
 * ```tsx
 * import api from '@/lib/api'
 * 
 * // GET request - token is automatically attached
 * const problems = await api.get('/problems')
 * 
 * // POST request - token is automatically attached
 * const submission = await api.post('/submissions', { code, language })
 * 
 * // If token expires during the request:
 * // 1. Request fails with 401
 * // 2. Token is automatically refreshed
 * // 3. Request is automatically retried
 * // 4. You get the response as if nothing happened!
 * ```
 * 
 * No need to manually handle tokens or refresh logic in components!
 */
export default api
