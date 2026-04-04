/**
 * useSubmission Hook
 * 
 * This custom React hook manages the complete submission lifecycle:
 * 1. Submit code to the backend API
 * 2. Listen for real-time verdict updates via Socket.io
 * 3. Update UI state when verdict arrives
 * 4. Handle errors and edge cases
 * 
 * ============================================================================
 * Why use a custom hook instead of inline logic in components?
 * ============================================================================
 * 
 * 1. Reusability: Multiple components can submit code (problem page, contest page)
 * 2. Separation of Concerns: Components focus on UI, hook handles submission logic
 * 3. Testability: Hook logic can be tested independently
 * 4. Maintainability: Submission logic is centralized in one place
 * 5. State Management: Hook encapsulates complex state (isJudging, verdict, error)
 * 
 * ============================================================================
 * Socket.io Event Flow
 * ============================================================================
 * 
 * 1. User clicks "Submit" button
 * 2. Component calls submit(code, language, problemId)
 * 3. Hook sends POST /api/submissions (returns 202 Accepted + submissionId)
 * 4. Hook sets isJudging = true
 * 5. Backend enqueues submission in BullMQ
 * 6. Worker picks up job, spawns judge container, runs tests
 * 7. Worker emits Socket.io event: 'verdict' to room 'user:{userId}'
 * 8. Hook receives event, updates verdict state
 * 9. Hook sets isJudging = false
 * 10. Component re-renders with verdict (AC, WA, TLE, etc.)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { getSocket, connectSocket, isSocketConnected } from '@/lib/socket'
import { useAuthStore } from '@/store/auth.store'
import type { 
  Submission, 
  SubmissionLanguage, 
  SubmissionVerdict,
  VerdictEvent 
} from '@/types'

/**
 * Submission State Interface
 * Defines the return type of the useSubmission hook
 */
interface UseSubmissionReturn {
  /**
   * Submit function - call this to submit code
   * @param code - The user's source code
   * @param language - Programming language ('cpp' | 'python')
   * @param problemId - The problem being solved
   * @param contestId - Optional contest ID if submitting during a contest
   * @returns Promise<Submission | null> - The created submission or null on error
   */
  submit: (
    code: string, 
    language: SubmissionLanguage, 
    problemId: string,
    contestId?: string
  ) => Promise<Submission | null>
  
  /**
   * Current submission being judged
   * - null when no submission is in progress
   * - Contains submission data when judging
   */
  currentSubmission: Submission | null
  
  /**
   * Latest verdict received
   * - null when no verdict yet
   * - Updated when Socket.io 'verdict' event arrives
   */
  verdict: SubmissionVerdict | null
  
  /**
   * Execution time in milliseconds
   * - null when no verdict yet or compilation error
   * - Updated when verdict arrives
   */
  executionTime: number | null
  
  /**
   * Memory used in megabytes
   * - null when no verdict yet or compilation error
   * - Updated when verdict arrives
   */
  memoryUsed: number | null
  
  /**
   * Compiler error message
   * - null when no compilation error
   * - Contains error message when verdict is 'CE'
   */
  compilerError: string | null
  
  /**
   * Judging state flag
   * - true when submission is being judged
   * - false when idle or verdict received
   */
  isJudging: boolean
  
  /**
   * Error message
   * - null when no error
   * - Contains error message when submission fails
   */
  error: string | null
  
  /**
   * Reset function - clears all state
   * Call this when user navigates away or starts a new submission
   */
  reset: () => void
}

/**
 * useSubmission Hook Implementation
 * 
 * This hook manages submission state and Socket.io event listeners.
 * It automatically connects to Socket.io when the component mounts
 * and cleans up when the component unmounts.
 */
export function useSubmission(): UseSubmissionReturn {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  
  // Current submission being judged
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null)
  
  // Verdict state (updated by Socket.io event)
  const [verdict, setVerdict] = useState<SubmissionVerdict | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [memoryUsed, setMemoryUsed] = useState<number | null>(null)
  const [compilerError, setCompilerError] = useState<string | null>(null)
  
  // UI state
  const [isJudging, setIsJudging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get user and token from auth store
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  
  // ==========================================================================
  // SOCKET.IO CONNECTION SETUP
  // ==========================================================================
  
  /**
   * Effect: Connect to Socket.io when component mounts
   * 
   * This effect:
   * 1. Checks if user is authenticated
   * 2. Connects to Socket.io with JWT token
   * 3. Sets up event listener for 'verdict' events
   * 4. Cleans up on unmount
   */
  useEffect(() => {
    // Only connect if user is authenticated
    if (!user || !accessToken) {
      return
    }
    
    // Connect to Socket.io if not already connected
    if (!isSocketConnected()) {
      connectSocket(accessToken)
    }
    
    const socket = getSocket()
    
    // ========================================================================
    // VERDICT EVENT HANDLER
    // ========================================================================
    
    /**
     * This handler is called when the backend emits a 'verdict' event
     * 
     * Backend code (in submission.worker.js):
     * ```js
     * io.to(`user:${submission.userId}`).emit('verdict', {
     *   submissionId: submission._id,
     *   verdict: 'AC',
     *   executionTime: 123,
     *   memoryUsed: 4.5,
     *   compilerError: null
     * })
     * ```
     * 
     * This handler receives the event and updates React state
     */
    const handleVerdict = (data: VerdictEvent) => {
      console.log('[useSubmission] Received verdict:', data)
      
      // Only update if this verdict is for the current submission
      // This prevents race conditions if user submits multiple times quickly
      if (currentSubmission && data.submissionId === currentSubmission._id) {
        // Update verdict state
        setVerdict(data.verdict)
        setExecutionTime(data.executionTime)
        setMemoryUsed(data.memoryUsed)
        setCompilerError(data.compilerError)
        
        // Stop judging spinner
        setIsJudging(false)
        
        // Clear any previous errors
        setError(null)
      }
    }
    
    // Register the event listener
    socket.on('verdict', handleVerdict)
    
    // ========================================================================
    // CLEANUP FUNCTION
    // ========================================================================
    
    /**
     * This cleanup function runs when:
     * 1. Component unmounts
     * 2. Dependencies change (user, accessToken, currentSubmission)
     * 
     * It removes the event listener to prevent memory leaks
     * 
     * Why is cleanup important?
     * - Without cleanup, old event listeners accumulate
     * - Each re-render would add a new listener
     * - Multiple listeners would fire for the same event
     * - This causes bugs and memory leaks
     */
    return () => {
      socket.off('verdict', handleVerdict)
    }
  }, [user, accessToken, currentSubmission])
  
  // ==========================================================================
  // SUBMIT FUNCTION
  // ==========================================================================
  
  /**
   * Submit code to the backend
   * 
   * Flow:
   * 1. Validate inputs
   * 2. Reset previous state
   * 3. Send POST /api/submissions
   * 4. Set isJudging = true
   * 5. Wait for Socket.io 'verdict' event (handled by useEffect above)
   * 
   * Why useCallback?
   * - Prevents function from being recreated on every render
   * - Improves performance when passing to child components
   * - Prevents unnecessary re-renders of child components
   */
  const submit = useCallback(
    async (
      code: string,
      language: SubmissionLanguage,
      problemId: string,
      contestId?: string
    ): Promise<Submission | null> => {
      try {
        // ====================================================================
        // STEP 1: Validation
        // ====================================================================
        
        if (!code.trim()) {
          setError('Code cannot be empty')
          return null
        }
        
        if (!user) {
          setError('You must be logged in to submit')
          return null
        }
        
        // ====================================================================
        // STEP 2: Reset previous state
        // ====================================================================
        
        setError(null)
        setVerdict(null)
        setExecutionTime(null)
        setMemoryUsed(null)
        setCompilerError(null)
        setIsJudging(true)
        
        // ====================================================================
        // STEP 3: Send submission to backend
        // ====================================================================
        
        console.log('[useSubmission] Submitting code:', {
          language,
          problemId,
          contestId,
          codeLength: code.length,
        })
        
        const response = await api.post<Submission>('/submissions', {
          code,
          language,
          problemId,
          contestId,
        })
        
        const submission = response.data
        
        console.log('[useSubmission] Submission created:', submission._id)
        
        // ====================================================================
        // STEP 4: Update state with new submission
        // ====================================================================
        
        setCurrentSubmission(submission)
        
        // ====================================================================
        // STEP 5: Wait for verdict via Socket.io
        // ====================================================================
        
        // The verdict will arrive via Socket.io 'verdict' event
        // The useEffect above will handle it and update state
        // No need to poll or wait here - Socket.io pushes the update!
        
        return submission
        
      } catch (err: any) {
        // ====================================================================
        // ERROR HANDLING
        // ====================================================================
        
        console.error('[useSubmission] Submission failed:', err)
        
        // Extract error message from API response
        const errorMessage = err.response?.data?.message || 'Failed to submit code'
        
        setError(errorMessage)
        setIsJudging(false)
        
        return null
      }
    },
    [user]
  )
  
  // ==========================================================================
  // RESET FUNCTION
  // ==========================================================================
  
  /**
   * Reset all state to initial values
   * 
   * Call this when:
   * - User navigates to a different problem
   * - User wants to submit again
   * - Component needs to clear previous results
   */
  const reset = useCallback(() => {
    setCurrentSubmission(null)
    setVerdict(null)
    setExecutionTime(null)
    setMemoryUsed(null)
    setCompilerError(null)
    setIsJudging(false)
    setError(null)
  }, [])
  
  // ==========================================================================
  // RETURN HOOK API
  // ==========================================================================
  
  return {
    submit,
    currentSubmission,
    verdict,
    executionTime,
    memoryUsed,
    compilerError,
    isJudging,
    error,
    reset,
  }
}

/**
 * USAGE EXAMPLE IN COMPONENTS:
 * 
 * ```tsx
 * function ProblemPage({ problemId }: { problemId: string }) {
 *   const [code, setCode] = useState('')
 *   const [language, setLanguage] = useState<SubmissionLanguage>('cpp')
 *   
 *   const {
 *     submit,
 *     verdict,
 *     executionTime,
 *     memoryUsed,
 *     compilerError,
 *     isJudging,
 *     error,
 *     reset,
 *   } = useSubmission()
 *   
 *   const handleSubmit = async () => {
 *     const submission = await submit(code, language, problemId)
 *     if (submission) {
 *       console.log('Submission created:', submission._id)
 *       // UI will automatically update when verdict arrives via Socket.io
 *     }
 *   }
 *   
 *   return (
 *     <div>
 *       <MonacoEditor value={code} onChange={setCode} language={language} />
 *       
 *       <button onClick={handleSubmit} disabled={isJudging}>
 *         {isJudging ? 'Judging...' : 'Submit'}
 *       </button>
 *       
 *       {error && <div className="text-red-600">{error}</div>}
 *       
 *       {verdict && (
 *         <div className={verdict === 'AC' ? 'text-green-600' : 'text-red-600'}>
 *           Verdict: {verdict}
 *           {executionTime && <span> | Time: {executionTime}ms</span>}
 *           {memoryUsed && <span> | Memory: {memoryUsed}MB</span>}
 *           {compilerError && <pre>{compilerError}</pre>}
 *         </div>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
