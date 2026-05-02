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

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'
import { getSocket, connectSocket, isSocketConnected } from '@/lib/socket'
import { useAuthStore } from '@/store/auth.store'
import type { 
  Submission, 
  SubmissionLanguage, 
  SubmissionVerdict,
  VerdictEvent 
} from '@/types'

interface SubmitResponse {
  message: string
  submissionId: string
  status: string
}

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
  
  /**
   * Check Status function - manually fetch verdict
   * Call this when polling times out or user wants to refresh
   */
  checkStatus: () => Promise<void>
  
  /**
   * Polling state flag
   * - true when actively polling for verdict
   * - false when not polling
   */
  isPolling: boolean
  
  /**
   * Number of polling attempts made
   * - 0 when not polling
   * - Increments with each poll attempt
   * - Max: 30 attempts
   */
  pollingAttempts: number
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
  
  // Polling state
  const [isPolling, setIsPolling] = useState(false)
  const [pollingAttempts, setPollingAttempts] = useState(0)
  
  // Get user and token from auth store
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  
  // CRITICAL FIX: Use ref to track current submission ID
  // This prevents stale closure issues in the Socket.io event handler
  const currentSubmissionIdRef = useRef<string | null>(null)
  
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
   * 
   * IMPORTANT: We use useEffect with minimal dependencies to avoid
   * re-registering the event listener on every state change.
   * The handler uses state setters which are stable across renders.
   */
  useEffect(() => {
    // Only connect if user is authenticated
    if (!user || !accessToken) {
      return
    }
    
    // Connect to Socket.io if not already connected
    if (!isSocketConnected()) {
      console.log('[useSubmission] Connecting to Socket.io...')
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
     * This handler receives the event and updates React state.
     * 
     * CRITICAL FIX: We use a callback pattern with setCurrentSubmission
     * to access the latest currentSubmission value without adding it
     * to the dependency array. This prevents the event listener from
     * being re-registered on every submission.
     */
    const handleVerdict = async (data: VerdictEvent) => {
      console.log('[useSubmission] Received verdict event:', {
        submissionId: data.submissionId,
        verdict: data.verdict,
        executionTime: data.executionTime,
        memoryUsed: data.memoryUsed,
        hasCompilerError: !!data.compilerError
      })
      
      // CRITICAL FIX: Use ref instead of state callback
      // Check if this verdict is for the current submission
      const currentId = currentSubmissionIdRef.current
      
      if (!currentId) {
        console.log('[useSubmission] No current submission, ignoring verdict')
        return
      }
      
      if (data.submissionId !== currentId) {
        console.log('[useSubmission] Verdict is for different submission, ignoring', {
          expected: currentId,
          received: data.submissionId
        })
        return
      }
      
      console.log('[useSubmission] Verdict matches current submission, updating state')
      
      // Update verdict state
      setVerdict(data.verdict)
      setExecutionTime(data.executionTime)
      setMemoryUsed(data.memoryUsed)
      setCompilerError(data.compilerError ?? null)
      
      // Stop judging spinner
      setIsJudging(false)
      
      // Clear any previous errors
      setError(null)

      // The running backend/worker may emit only the verdict metrics. Fetch the
      // saved submission once judging finishes so compiler/runtime output is not lost.
      try {
        const response = await api.get<{ submission: Submission }>(`/submissions/${data.submissionId}`)
        const submission = response.data.submission

        setVerdict(submission.verdict)
        setExecutionTime(submission.executionTime)
        setMemoryUsed(submission.memoryUsed)
        setCompilerError(submission.compilerError ?? null)
        setCurrentSubmission(submission)
      } catch (err) {
        console.error('[useSubmission] Failed to refresh completed submission:', err)
      }
    }
    
    // Register the event listener
    console.log('[useSubmission] Registering verdict event listener')
    socket.on('verdict', handleVerdict)
    
    // ========================================================================
    // CLEANUP FUNCTION
    // ========================================================================
    
    /**
     * This cleanup function runs when:
     * 1. Component unmounts
     * 2. Dependencies change (user, accessToken)
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
      console.log('[useSubmission] Cleaning up verdict event listener')
      socket.off('verdict', handleVerdict)
    }
  }, [user, accessToken]) // Removed currentSubmission from dependencies
  
  // ==========================================================================
  // POLLING FALLBACK MECHANISM
  // ==========================================================================
  
  /**
   * Effect: Poll for verdict when Socket.io connection fails
   * 
   * This effect implements the polling fallback mechanism:
   * 1. Detects when Socket.io connection is lost
   * 2. Starts polling GET /api/submissions/:id every 2 seconds
   * 3. Stops polling when verdict is received or timeout occurs
   * 4. Switches back to Socket.io when connection is restored
   * 
   * Polling Configuration:
   * - Interval: 2 seconds (2000ms)
   * - Max attempts: 30 (60 seconds total)
   * - Timeout error after max attempts
   * 
   * Why polling as fallback?
   * - Socket.io might fail due to network issues, firewall, proxy
   * - Polling ensures user always gets verdict eventually
   * - Better UX than showing "connection lost" with no fallback
   */
  useEffect(() => {
    // Only poll if:
    // 1. We have a current submission being judged
    // 2. Socket.io is NOT connected
    // 3. We're not already polling
    if (!currentSubmission || isSocketConnected() || isPolling) {
      return
    }
    
    // If we have a submission but Socket.io is disconnected, start polling
    console.log('[useSubmission] Socket.io disconnected, starting polling fallback')
    
    setIsPolling(true)
    setPollingAttempts(0)
    
    // Polling configuration
    const POLL_INTERVAL_MS = 2000 // 2 seconds
    const MAX_POLL_ATTEMPTS = 30 // 60 seconds total
    
    let pollCount = 0
    
    // Start polling interval
    const pollInterval = setInterval(async () => {
      pollCount++
      setPollingAttempts(pollCount)
      
      console.log(`[useSubmission] Polling attempt ${pollCount}/${MAX_POLL_ATTEMPTS}`)
      
      try {
        // Fetch submission status from API
        const response = await api.get<{ submission: Submission }>(`/submissions/${currentSubmission._id}`)
        const submission = response.data.submission
        
        console.log('[useSubmission] Polling received verdict:', submission.verdict)
        
        // Check if verdict is no longer PENDING
        if (submission.verdict !== 'PENDING') {
          // Verdict received! Update state
          setVerdict(submission.verdict)
          setExecutionTime(submission.executionTime)
          setMemoryUsed(submission.memoryUsed)
          setCompilerError(submission.compilerError)
          setIsJudging(false)
          setError(null)
          
          // Stop polling
          clearInterval(pollInterval)
          setIsPolling(false)
          
          console.log('[useSubmission] Verdict received via polling, stopping')
        }
      } catch (err: any) {
        console.error('[useSubmission] Polling error:', err)
        // Continue polling despite errors (might be transient)
      }
      
      // Check if we've exceeded max attempts
      if (pollCount >= MAX_POLL_ATTEMPTS) {
        console.error('[useSubmission] Polling timeout after', MAX_POLL_ATTEMPTS, 'attempts')
        
        // Stop polling
        clearInterval(pollInterval)
        setIsPolling(false)
        setIsJudging(false)
        
        // Display timeout error
        setError('Verdict not received. Please check status or refresh the page.')
        
        // Note: We don't clear currentSubmission here so the "Check Status" button can retry
      }
    }, POLL_INTERVAL_MS)
    
    // Cleanup function
    return () => {
      console.log('[useSubmission] Cleaning up polling interval')
      clearInterval(pollInterval)
      setIsPolling(false)
    }
  }, [currentSubmission, isPolling])
  
  /**
   * Effect: Switch back to Socket.io when connection is restored
   * 
   * This effect monitors Socket.io connection state and stops polling
   * when the connection is restored.
   */
  useEffect(() => {
    // If Socket.io reconnects while we're polling, stop polling
    if (isPolling && isSocketConnected()) {
      console.log('[useSubmission] Socket.io reconnected, stopping polling')
      setIsPolling(false)
      setPollingAttempts(0)
      
      // Socket.io will now handle verdict updates
      // The verdict event listener is still active from the first useEffect
    }
  }, [isPolling])
  
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
        
        const response = await api.post<SubmitResponse>('/submissions', {
          code,
          language,
          problemId,
          contestId,
        })
        
        const userId = 'id' in user ? user.id : (user as any)._id
        const submission: Submission = {
          _id: response.data.submissionId,
          userId,
          problemId,
          contestId: contestId ?? null,
          language,
          code,
          verdict: 'PENDING',
          executionTime: null,
          memoryUsed: null,
          compilerError: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        console.log('[useSubmission] Submission created:', submission._id)
        
        // ====================================================================
        // STEP 4: Update state with new submission
        // ====================================================================
        
        setCurrentSubmission(submission)
        
        // CRITICAL FIX: Update ref to track submission ID
        currentSubmissionIdRef.current = submission._id
        
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
    setIsPolling(false)
    setPollingAttempts(0)
    currentSubmissionIdRef.current = null
  }, [])
  
  // ==========================================================================
  // CHECK STATUS FUNCTION
  // ==========================================================================
  
  /**
   * Check Status function - manually fetch verdict
   * 
   * This function allows users to manually check submission status
   * when polling times out or they want to refresh the verdict.
   * 
   * Use case: Display a "Check Status" button when polling times out
   */
  const checkStatus = useCallback(async () => {
    if (!currentSubmission) {
      console.warn('[useSubmission] No current submission to check')
      return
    }
    
    try {
      console.log('[useSubmission] Manually checking submission status')
      
      const response = await api.get<{ submission: Submission }>(`/submissions/${currentSubmission._id}`)
      const submission = response.data.submission
      
      console.log('[useSubmission] Manual check received verdict:', submission.verdict)
      
      // Update state with fetched verdict
      setVerdict(submission.verdict)
      setExecutionTime(submission.executionTime)
      setMemoryUsed(submission.memoryUsed)
      setCompilerError(submission.compilerError)
      
      // If verdict is no longer PENDING, stop judging state
      if (submission.verdict !== 'PENDING') {
        setIsJudging(false)
        setError(null)
      }
    } catch (err: any) {
      console.error('[useSubmission] Failed to check status:', err)
      setError(err.response?.data?.message || 'Failed to check submission status')
    }
  }, [currentSubmission])
  
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
    checkStatus,
    isPolling,
    pollingAttempts,
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
