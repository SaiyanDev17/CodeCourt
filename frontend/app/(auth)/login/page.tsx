/**
 * Login Page Component
 * 
 * This page allows users to authenticate with their email and password.
 * 
 * Key Features:
 * 1. Form validation (email format, required fields)
 * 2. Calls POST /api/auth/login using our custom Axios instance
 * 3. Stores token and user data in Zustand auth store on success
 * 4. Redirects to /problems page after successful login
 * 5. Displays error messages for failed login attempts
 * 6. Shows loading state during authentication
 * 
 * Route Group Note:
 * This file is in app/(auth)/login/page.tsx
 * The (auth) folder is a Route Group (parentheses = organization only)
 * URL is /login (NOT /auth/login)
 */

'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  /**
   * Form Input State
   * 
   * We use useState to create "controlled components" for our inputs.
   * This means React controls the input values, not the DOM.
   * 
   * Flow:
   * 1. User types in input
   * 2. onChange event fires
   * 3. We call setEmail/setPassword with the new value
   * 4. React re-renders with the updated value
   * 5. Input displays the new value
   * 
   * Why controlled components?
   * - Single source of truth (React state, not DOM)
   * - Easy validation (we have the value in state)
   * - Easy to clear/reset (just call setState)
   * - Predictable behavior
   */
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  /**
   * Loading State
   * 
   * Tracks whether the login request is in progress.
   * Used to:
   * - Disable the submit button (prevent double-submit)
   * - Show loading spinner in the button
   * - Prevent form submission while request is pending
   */
  const [isLoading, setIsLoading] = useState(false)
  
  /**
   * Error State
   * 
   * Stores error messages to display to the user.
   * Examples:
   * - "Invalid email or password"
   * - "Please enter a valid email address"
   * - "Network error. Please try again."
   */
  const [error, setError] = useState('')
  
  // ============================================================================
  // HOOKS
  // ============================================================================
  
  /**
   * Next.js Router Hook
   * 
   * Used for programmatic navigation (redirecting after login).
   * In Next.js 14 App Router, we use useRouter from 'next/navigation'
   * (NOT 'next/router' - that's for Pages Router)
   * 
   * Usage: router.push('/problems') navigates to the problems page
   */
  const router = useRouter()
  
  /**
   * Zustand Auth Store Hook
   * 
   * We only need the login action (not the state), so we select just that.
   * This is more efficient than selecting the entire store.
   * 
   * The login action will update the global auth state with user + token.
   */
  const login = useAuthStore((state) => state.login)
  
  // ============================================================================
  // FORM VALIDATION
  // ============================================================================
  
  /**
   * Validate Email Format
   * 
   * Simple email validation using regex.
   * Checks for: something@something.something
   * 
   * Note: This is basic client-side validation.
   * The backend will do more thorough validation.
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  /**
   * Validate Form
   * 
   * Checks all form fields and returns true if valid.
   * Sets error message if validation fails.
   * 
   * Validation rules:
   * 1. Email is required
   * 2. Email must be valid format
   * 3. Password is required
   * 4. Password must be at least 6 characters (basic check)
   */
  const validateForm = (): boolean => {
    // Clear any previous errors
    setError('')
    
    // Check if email is provided
    if (!email.trim()) {
      setError('Email is required')
      return false
    }
    
    // Check if email format is valid
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address')
      return false
    }
    
    // Check if password is provided
    if (!password) {
      setError('Password is required')
      return false
    }
    
    // Check minimum password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    
    // All validations passed
    return true
  }
  
  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================
  
  /**
   * Handle Form Submit
   * 
   * This function is called when the user submits the form.
   * 
   * Flow:
   * 1. Prevent default form submission (no page reload)
   * 2. Validate form inputs
   * 3. Set loading state (disable button, show spinner)
   * 4. Call POST /api/auth/login with email and password
   * 5. On success:
   *    - Store user and token in Zustand store
   *    - Redirect to /problems page
   * 6. On error:
   *    - Display error message to user
   * 7. Always clear loading state
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // Prevent default form submission (which would reload the page)
    e.preventDefault()
    
    // Validate form inputs
    if (!validateForm()) {
      return // Stop if validation fails
    }
    
    // Set loading state (disables button, shows spinner)
    setIsLoading(true)
    
    // Clear any previous errors
    setError('')
    
    try {
      // ========================================================================
      // STEP 1: Call the login API endpoint
      // ========================================================================
      
      /**
       * POST /api/auth/login
       * 
       * Request body: { email, password }
       * 
       * Expected response (200 OK):
       * {
       *   user: {
       *     id: "507f1f77bcf86cd799439011",
       *     username: "johndoe",
       *     email: "john@example.com",
       *     role: "contestant"
       *   },
       *   accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
       * }
       * 
       * The backend also sets an HTTP-only cookie with the refresh token.
       * We don't see this cookie in JavaScript (security feature).
       * 
       * Our custom Axios instance (lib/api.ts) automatically:
       * - Sends cookies (withCredentials: true)
       * - Handles token refresh on 401 errors
       */
      const response = await api.post('/auth/login', {
        email: email.trim(), // Trim whitespace
        password,
      })
      
      // ========================================================================
      // STEP 2: Extract user and token from response
      // ========================================================================
      
      const { user, accessToken } = response.data
      
      // ========================================================================
      // STEP 3: Store user and token in Zustand global state
      // ========================================================================
      
      /**
       * This updates the global auth store.
       * Now all components can access:
       * - useAuthStore(state => state.user)
       * - useAuthStore(state => state.accessToken)
       * 
       * The token will be automatically attached to all future API requests
       * by the request interceptor in lib/api.ts
       */
      login(user, accessToken)
      
      // ========================================================================
      // STEP 4: Redirect to problems page
      // ========================================================================
      
      /**
       * router.push() performs client-side navigation (no page reload)
       * This is faster than window.location.href (which reloads the page)
       * 
       * We redirect to /problems (the main page after login)
       * You could also redirect to:
       * - '/' (home page)
       * - '/contests' (contests page)
       * - '/profile/' + user.username (user profile)
       */
      router.push('/problems')
      
    } catch (err: any) {
      // ========================================================================
      // STEP 5: Handle errors
      // ========================================================================
      
      /**
       * Common error scenarios:
       * 
       * 1. Invalid credentials (401 Unauthorized)
       *    - Backend returns: { message: "Invalid email or password" }
       * 
       * 2. Validation error (400 Bad Request)
       *    - Backend returns: { message: "Email is required" }
       * 
       * 3. Network error (no response)
       *    - Axios throws error with no response object
       * 
       * 4. Server error (500 Internal Server Error)
       *    - Backend returns: { message: "Internal server error" }
       */
      
      // Extract error message from response (if available)
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.'
      
      // Set error state (will be displayed to user)
      setError(errorMessage)
      
      // Log error for debugging (remove in production)
      console.error('Login error:', err)
      
    } finally {
      // ========================================================================
      // STEP 6: Clear loading state
      // ========================================================================
      
      /**
       * This runs whether the request succeeds or fails.
       * It re-enables the submit button and hides the loading spinner.
       */
      setIsLoading(false)
    }
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to CodeCourt
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>
        
        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>
            
            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          
          {/* Register Link */}
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
