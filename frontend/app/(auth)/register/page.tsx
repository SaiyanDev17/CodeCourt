/**
 * Register Page Component
 * 
 * This page allows new users to create an account.
 * 
 * Key Features:
 * 1. Form validation (username, email format, password length, password confirmation)
 * 2. Calls POST /api/auth/register using our custom Axios instance
 * 3. Redirects to /login page on successful registration
 * 4. Displays error messages for failed registration attempts (e.g., "Username already taken")
 * 5. Shows loading state during registration
 * 
 * Route Group Note:
 * This file is in app/(auth)/register/page.tsx
 * The (auth) folder is a Route Group (parentheses = organization only)
 * URL is /register (NOT /auth/register)
 */

'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import Button from '@/components/ui/Button'

export default function RegisterPage() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  /**
   * Form Input State
   * 
   * We use controlled components for all form inputs.
   * This gives us full control over validation and submission.
   */
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  /**
   * Loading State
   * 
   * Tracks whether the registration request is in progress.
   * Used to disable the submit button and show loading spinner.
   */
  const [isLoading, setIsLoading] = useState(false)
  
  /**
   * Error State
   * 
   * Stores error messages from validation or backend.
   * Examples:
   * - "Username already taken"
   * - "Email is already registered"
   * - "Passwords do not match"
   * - "Username must be at least 3 characters"
   */
  const [error, setError] = useState('')
  
  // ============================================================================
  // HOOKS
  // ============================================================================
  
  /**
   * Next.js Router Hook
   * 
   * Used to redirect to /login page after successful registration.
   */
  const router = useRouter()
  
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
   * Validate Username Format
   * 
   * Username rules:
   * - At least 3 characters, maximum 30 characters
   * - Only alphanumeric characters (letters and numbers)
   * - No spaces, no special characters, no underscores
   */
  const isValidUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9]{3,30}$/
    return usernameRegex.test(username)
  }
  
  /**
   * Validate Form
   * 
   * Checks all form fields and returns true if valid.
   * Sets error message if validation fails.
   * 
   * Validation rules:
   * 1. Username is required and valid format
   * 2. Email is required and valid format
   * 3. Password is required and at least 6 characters
   * 4. Confirm password matches password
   */
  const validateForm = (): boolean => {
    // Clear any previous errors
    setError('')
    
    // Check if username is provided
    if (!username.trim()) {
      setError('Username is required')
      return false
    }
    
    // Check if username format is valid
    if (!isValidUsername(username)) {
      setError('Username must be 3-30 characters and contain only letters and numbers')
      return false
    }
    
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    
    // Check if confirm password is provided
    if (!confirmPassword) {
      setError('Please confirm your password')
      return false
    }
    
    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
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
   * 4. Call POST /api/auth/register with username, email, and password
   * 5. On success:
   *    - Redirect to /login page so user can log in
   * 6. On error:
   *    - Display error message to user (e.g., "Username already taken")
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
      // STEP 1: Call the register API endpoint
      // ========================================================================
      
      /**
       * POST /api/auth/register
       * 
       * Request body: { username, email, password }
       * 
       * Expected response (201 Created):
       * {
       *   message: "User registered successfully",
       *   user: {
       *     id: "507f1f77bcf86cd799439011",
       *     username: "johndoe",
       *     email: "john@example.com",
       *     role: "contestant"
       *   }
       * }
       * 
       * Note: The backend does NOT automatically log in the user.
       * We redirect to /login so they can log in with their new credentials.
       */
      await api.post('/auth/register', {
        username: username.trim(),
        email: email.trim(),
        password,
      })
      
      // ========================================================================
      // STEP 2: Redirect to login page
      // ========================================================================
      
      /**
       * On successful registration, we redirect to /login.
       * 
       * Why not auto-login?
       * - Keeps the flow simple and predictable
       * - User confirms their credentials work
       * - Follows common UX patterns (most sites do this)
       * 
       * Alternative: You could auto-login by calling the login endpoint
       * and storing the token, then redirecting to /problems
       */
      router.push('/login')
      
    } catch (err: any) {
      // ========================================================================
      // STEP 3: Handle errors
      // ========================================================================
      
      /**
       * Common error scenarios:
       * 
       * 1. Username already taken (409 Conflict)
       *    - Backend returns: { message: "Username already taken" }
       * 
       * 2. Email already registered (409 Conflict)
       *    - Backend returns: { message: "Email already registered" }
       * 
       * 3. Validation error (400 Bad Request)
       *    - Backend returns: { message: "Invalid email format" }
       * 
       * 4. Network error (no response)
       *    - Axios throws error with no response object
       * 
       * 5. Server error (500 Internal Server Error)
       *    - Backend returns: { message: "Internal server error" }
       */
      
      // Extract error message from response (if available)
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.'
      
      // Set error state (will be displayed to user)
      setError(errorMessage)
      
      // Log error for debugging (remove in production)
      console.error('Registration error:', err)
      
    } finally {
      // ========================================================================
      // STEP 4: Clear loading state
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
            Create Your Account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Join CodeCourt and start competing today
          </p>
        </div>
        
        {/* Register Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            {/* Username Input */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="johndoe"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                At least 3 characters, letters and numbers only
              </p>
            </div>
            
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                At least 8 characters
              </p>
            </div>
            
            {/* Confirm Password Input */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
          
          {/* Login Link */}
          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
