'use client'

/**
 * Problem Detail Page
 * 
 * This page displays a specific problem with a split-screen layout:
 * - Left side: Problem statement (scrollable)
 * - Right side: Monaco code editor + submit button (fixed height)
 * 
 * URL Pattern: /problems/[slug]
 * Example: /problems/two-sum
 * 
 * The [slug] is extracted from the URL using useParams() hook
 */

import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'
import { Problem, Submission } from '@/types'
import ProblemStatement from '@/components/Problem/ProblemStatement'
import MonacoEditor from '@/components/Editor/MonacoEditor'
import SubmitButton from '@/components/Editor/SubmitButton'
import { SubmissionResult } from '@/components/Problem/SubmissionResult'
import { useSubmission } from '@/hooks/useSubmission'
import { SubmissionHistory } from '@/components/Submission/SubmissionHistory'

type HintEntry = {
  id: string
  hintText: string
  hintIndex: number
  createdAt: string
}

export default function ProblemPage() {
  // ============================================================================
  // STEP 1: Extract the [slug] from the URL
  // ============================================================================
  
  /**
   * useParams() hook from next/navigation
   * 
   * For a file at app/problems/[slug]/page.tsx:
   * - URL: /problems/two-sum
   * - params: { slug: 'two-sum' }
   * 
   * This is the App Router equivalent of:
   * - Pages Router: router.query.slug
   * - Server Component: async function Page({ params })
   */
  const params = useParams()
  const slug = params.slug as string
  
  // ============================================================================
  // STEP 2: State Management
  // ============================================================================
  
  const [problem, setProblem] = useState<Problem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Tab state for Problem vs Submissions view
  const [activeTab, setActiveTab] = useState<'problem' | 'submissions' | 'hints'>('problem')
  
  // Scroll position preservation
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const scrollPositions = useRef<{ problem: number; submissions: number; hints: number }>({
    problem: 0,
    submissions: 0,
    hints: 0,
  })
  
  // Editor state
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<'cpp' | 'python'>('cpp')
  
  // Submission state (real-time via Socket.io)
  const {
    submit,
    currentSubmission,
    verdict,
    executionTime,
    memoryUsed,
    compilerError,
    isJudging,
    error: submissionError,
    reset: resetSubmission,
  } = useSubmission()
  
  // AI Hint state
  const [hints, setHints] = useState<HintEntry[]>([])
  const [hintsRemaining, setHintsRemaining] = useState<number>(3)
  const [isLoadingHint, setIsLoadingHint] = useState(false)
  const [hintError, setHintError] = useState<string | null>(null)
  const [isLoadingHints, setIsLoadingHints] = useState(false)
  const [hintsLoadError, setHintsLoadError] = useState<string | null>(null)
  const [currentConsoleMessage, setCurrentConsoleMessage] = useState<string | null>(null)

  const formatHintTime = (value?: string) => {
    if (!value) return 'Just now'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? 'Just now' : parsed.toLocaleString()
  }

  const loadHints = async (problemId: string) => {
    try {
      setIsLoadingHints(true)
      setHintsLoadError(null)

      const response = await api.get('/agent/my-hints', {
        params: { problem_id: problemId },
      })

      const fetchedHints = (response.data?.hints || []).map((hint: any) => ({
        id: hint.id || hint._id || `hint-${hint.hintIndex}`,
        hintText: hint.hintText,
        hintIndex: hint.hintIndex,
        createdAt: hint.createdAt,
      }))

      setHints(fetchedHints)

      if (typeof response.data?.hints_remaining === 'number') {
        setHintsRemaining(response.data.hints_remaining)
      } else if (typeof response.data?.hints_used === 'number') {
        setHintsRemaining(Math.max(0, 3 - response.data.hints_used))
      } else {
        setHintsRemaining(Math.max(0, 3 - fetchedHints.length))
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setHintsLoadError('Log in to view saved hints')
      } else {
        setHintsLoadError('Failed to load hints')
      }
    } finally {
      setIsLoadingHints(false)
    }
  }
  
  // ============================================================================
  // STEP 3: Fetch Problem Data
  // ============================================================================
  
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Call GET /api/problems/:slug
        const response = await api.get(`/problems/${slug}`)
        
        // Backend returns { problem: {...} }, so we need to access response.data.problem
        setProblem(response.data.problem || response.data)
        
      } catch (err: any) {
        console.error('Failed to fetch problem:', err)
        setError(err.response?.data?.message || 'Failed to load problem')
        
        // Fallback to dummy data for development/testing
        setProblem(DUMMY_PROBLEM)
        
      } finally {
        setIsLoading(false)
      }
    }
    
    if (slug) {
      fetchProblem()
    }
  }, [slug])

  useEffect(() => {
    if (!problem?._id) return
    loadHints(problem._id)
  }, [problem?._id])

  useEffect(() => {
    setCurrentConsoleMessage(compilerError)
  }, [compilerError])

  useEffect(() => {
    if (!verdict || !currentSubmission?._id) {
      return
    }

    let cancelled = false
    const needsConsoleRefresh = verdict === 'CE' || verdict === 'RE'

    const refreshCurrentSubmission = async () => {
      const maxAttempts = needsConsoleRefresh ? 5 : 1

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const response = await api.get<{ submission: Submission }>(
            `/submissions/${currentSubmission._id}`
          )

          if (cancelled) return

          const message = response.data.submission.compilerError
          if (message) {
            setCurrentConsoleMessage(message)
            return
          }
        } catch (err) {
          console.error('Failed to refresh current submission details:', err)
        }

        if (!needsConsoleRefresh || cancelled) {
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    refreshCurrentSubmission()

    return () => {
      cancelled = true
    }
  }, [currentSubmission?._id, verdict])
  
  // ============================================================================
  // STEP 4: Handle Editor Changes
  // ============================================================================
  
  /**
   * Called whenever the user types in the editor or changes language
   * 
   * The MonacoEditor component maintains separate code for each language,
   * so we just need to track the current code and language for submission
   */
  const handleEditorChange = (newCode: string, newLanguage: 'cpp' | 'python') => {
    setCode(newCode)
    setLanguage(newLanguage)
  }
  
  // ============================================================================
  // STEP 4.5: Handle Tab Switching with Scroll Position Preservation
  // ============================================================================
  
  /**
   * Save current scroll position before switching tabs
   * Restore scroll position after switching tabs
   */
  const handleTabChange = (newTab: 'problem' | 'submissions' | 'hints') => {
    // Save current scroll position
    if (leftPanelRef.current) {
      scrollPositions.current[activeTab] = leftPanelRef.current.scrollTop
    }
    
    // Switch tab
    setActiveTab(newTab)
    
    // Restore scroll position for new tab (after render)
    setTimeout(() => {
      if (leftPanelRef.current) {
        leftPanelRef.current.scrollTop = scrollPositions.current[newTab]
      }
    }, 0)
  }
  
  // ============================================================================
  // STEP 5: Handle Code Submission
  // ============================================================================
  
  /**
   * For now, just console.log the code and language
   * 
   * Submits code to POST /api/submissions and listens for verdict via Socket.io.
   */
  /**
   * Handle code submission to the judge system
   * 
   * Submits code to POST /api/submissions endpoint
   * Returns 202 Accepted and verdict comes via Socket.io
   */
  const handleSubmit = async () => {
    if (!problem || !code.trim()) {
      alert('Please write some code before submitting')
      return
    }
    
    try {
      resetSubmission()
      setCurrentConsoleMessage(null)
      await submit(code, language, problem._id)
    } catch (err: any) {
      console.error('Submission failed:', err)
      
      if (err.response?.status === 401) {
        alert('Please log in to submit code')
      } else {
        alert(err.response?.data?.message || err.response?.data?.error || 'Failed to submit code. Please try again.')
      }
    }
  }
  
  // ============================================================================
  // STEP 6: Handle AI Hint Request
  // ============================================================================
  
  /**
   * Request an AI hint for the current problem
   * 
   * Flow:
   * 1. Call POST /api/agent/hint with { problem_id, problem_slug }
   * 2. Backend validates auth + checks hint count (max 3)
   * 3. Backend proxies to FastAPI AI service
   * 4. AI service generates hint using LangChain + Groq
   * 5. Display hint text and update hints remaining counter
   * 
   * Error handling:
   * - 403: Maximum hints reached (3/3 used)
   * - 401: Unauthenticated (auto-redirects to login via api interceptor)
   * - 500: Server error (show generic error message)
   */
  const handleGetHint = async () => {
    if (!problem) return
    
    try {
      setIsLoadingHint(true)
      setHintError(null)
      
      // Call the Express proxy endpoint (not direct to FastAPI)
      // This requires authentication and handles hint count validation
      const response = await api.post('/agent/hint', {
        problem_id: problem._id,
        problem_slug: problem.slug,
      })
      
      // Response format: { hint: string, hints_used: number, hint_index: number }
      const { hint, hints_used, hint_index } = response.data
      const nextHintIndex = hint_index || hints_used || hints.length + 1
      
      // Update state
      setHintsRemaining(Math.max(0, 3 - hints_used))
      setHints((prev) => {
        const exists = prev.some((entry) => entry.hintIndex === nextHintIndex)
        if (exists) return prev

        const next = [
          ...prev,
          {
            id: `hint-${nextHintIndex}`,
            hintText: hint,
            hintIndex: nextHintIndex,
            createdAt: new Date().toISOString(),
          },
        ]

        return next.sort((a, b) => a.hintIndex - b.hintIndex)
      })
      
    } catch (err: any) {
      console.error('Failed to get hint:', err)
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        setHintError('Please log in to get hints')
      } else if (err.response?.status === 403) {
        setHintError("You've used all 3 hints for this problem")
        setHintsRemaining(0)
      } else if (err.response?.status === 503 || err.code === 'ECONNREFUSED') {
        setHintError('AI service is currently unavailable. Please try again later.')
      } else {
        setHintError(err.response?.data?.message || err.response?.data?.error || 'Failed to get hint. Please try again.')
      }
      
    } finally {
      setIsLoadingHint(false)
    }
  }
  
  // ============================================================================
  // STEP 7: Render Loading/Error States
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading problem...</p>
        </div>
      </div>
    )
  }
  
  if (error && !problem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-300 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 rounded-lg hover:from-cyan-300 hover:to-blue-400 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Problem not found</p>
      </div>
    )
  }
  
  // ============================================================================
  // STEP 8: Render Split-Screen Layout
  // ============================================================================
  
  /**
   * Layout Strategy (FIXED for Monaco Editor visibility):
   * 
   * 1. Container: h-[calc(100vh-70px)] - Full viewport height minus navbar
   *    - Adjust 70px to match your actual navbar height
   * 
   * 2. Grid: grid grid-cols-2 - Two equal columns (50% each)
   * 
   * 3. Left Side (Problem Statement):
   *    - overflow-y-auto: Scrollable if content is long
   *    - p-6: Padding for readability
   * 
   * 4. Right Side (Editor + Submit):
   *    - flex flex-col h-full: Stack vertically with explicit height
   *    - Editor wrapper: flex-1 min-h-0 - Takes remaining space, min-h-0 allows flex shrinking
   *    - Submit button: flex-shrink-0 - Prevents shrinking
   * 
   * Why min-h-0 is critical:
   * - By default, flex items have min-height: auto, which prevents them from shrinking below content size
   * - Canvas elements report 0 content size, but flex still won't shrink without min-h-0
   * - min-h-0 allows the flex item to shrink and fill available space properly
   * 
   * This ensures:
   * - Monaco Editor gets an explicit pixel height from the flex chain
   * - Both sides are always visible (no horizontal scroll)
   * - Each side scrolls independently
   * - Layout works on long problem statements
   */
  
  return (
    <div className="h-[calc(100vh-76px)] min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-1">
      {/* ========================================================================
          LEFT SIDE: Tabbed View (Problem Statement / Submission History)
          ======================================================================== */}
      
      <div className="glass-panel flex min-h-0 flex-col h-full rounded-none lg:rounded-r-none border-r border-slate-700/70 bg-slate-950/75">
        {/* Tab Headers - Sticky at top */}
        <div className="border-b border-slate-700/70 sticky top-0 bg-slate-950/90 z-10 flex-shrink-0 backdrop-blur-sm">
          {/* Desktop: Tab Buttons (hidden on mobile) */}
          <div className="hidden md:flex">
            <button
              onClick={() => handleTabChange('problem')}
              className={`flex-1 px-4 py-3 font-medium transition-colors ${
                activeTab === 'problem'
                  ? 'border-b-2 border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-[inset_0_-2px_8px_rgba(34,211,238,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              aria-current={activeTab === 'problem' ? 'page' : undefined}
            >
              Problem
            </button>
            <button
              onClick={() => handleTabChange('submissions')}
              className={`flex-1 px-4 py-3 font-medium transition-colors ${
                activeTab === 'submissions'
                  ? 'border-b-2 border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-[inset_0_-2px_8px_rgba(34,211,238,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              aria-current={activeTab === 'submissions' ? 'page' : undefined}
            >
              Submissions
            </button>
            <button
              onClick={() => handleTabChange('hints')}
              className={`flex-1 px-4 py-3 font-medium transition-colors ${
                activeTab === 'hints'
                  ? 'border-b-2 border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-[inset_0_-2px_8px_rgba(34,211,238,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              aria-current={activeTab === 'hints' ? 'page' : undefined}
            >
              Hints
            </button>
          </div>
          
          {/* Mobile: Dropdown Menu (hidden on desktop) */}
          <div className="md:hidden px-4 py-3">
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value as 'problem' | 'submissions' | 'hints')}
              className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-900 text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              aria-label="Select tab"
            >
              <option value="problem">Problem</option>
              <option value="submissions">Submissions</option>
              <option value="hints">Hints</option>
            </select>
          </div>
        </div>
        
        {/* Tab Content - Scrollable */}
        <div ref={leftPanelRef} className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === 'problem' ? (
            <div className="p-6 max-w-4xl">
              {/* Problem Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-100 mb-2">
                  {problem.title}
                </h1>
                
                <div className="flex items-center gap-3">
                  {/* Difficulty Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      !problem.difficulty
                        ? 'bg-slate-600/20 text-slate-200 border border-slate-400/30'
                        : problem.difficulty === 'easy'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/35'
                        : problem.difficulty === 'medium'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-400/35'
                        : 'bg-red-500/15 text-red-300 border border-red-400/35'
                    }`}
                  >
                    {problem.difficulty?.charAt(0).toUpperCase() + problem.difficulty?.slice(1) || 'Unknown'}
                  </span>
                  
                  {/* Time Limit */}
                  <span className="text-sm text-slate-400">
                    Time: {problem.timeLimit}ms
                  </span>
                  
                  {/* Memory Limit */}
                  <span className="text-sm text-slate-400">
                    Memory: {problem.memoryLimit}MB
                  </span>
                </div>
              </div>
              
              {/* Problem Description (Markdown) */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-cyan-300 mb-4 tracking-wide border-b border-slate-700/50 pb-2">Description</h2>
                <ProblemStatement markdownContent={problem.description} />
              </div>
              
              {/* Constraints */}
              {problem.constraints && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-cyan-300 mb-4 tracking-wide border-b border-slate-700/50 pb-2">Constraints</h2>
                  <ProblemStatement markdownContent={problem.constraints} />
                </div>
              )}
              
              {/* Sample Test Cases */}
              {problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-cyan-300 mb-4 tracking-wide border-b border-slate-700/50 pb-2">Sample Test Cases</h2>
                  {problem.sampleTestCases.map((testCase, index) => (
                    <div key={index} className="mb-6 bg-slate-900/60 border border-slate-700/80 rounded-xl p-5 shadow-sm">
                      <p className="font-semibold text-slate-100 mb-3 text-lg flex items-center gap-2"><span className="w-1.5 h-4 bg-cyan-400 rounded-full inline-block"></span>Example {index + 1}</p>
                      
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Input:</p>
                        <pre className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-sm text-cyan-100 overflow-x-auto font-mono shadow-inner">
                          {testCase.input}
                        </pre>
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Output:</p>
                        <pre className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-sm text-cyan-100 overflow-x-auto font-mono shadow-inner">
                          {testCase.output}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'submissions' ? (
            <div className="p-6">
              <SubmissionHistory problemId={problem._id} />
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-amber-300 tracking-wide">Hints</h2>
                <span className="text-xs text-slate-400">
                  {Math.max(0, 3 - hintsRemaining)}/3 used
                </span>
              </div>

              {isLoadingHints && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
                  Loading hints...
                </div>
              )}

              {!isLoadingHints && hintsLoadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {hintsLoadError}
                </div>
              )}

              {!isLoadingHints && !hintsLoadError && hints.length === 0 && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
                  No hints yet. Use the "Get AI Hint" button on the right to generate one.
                </div>
              )}

              {!isLoadingHints && !hintsLoadError && hints.length > 0 && (
                <div className="space-y-4">
                  {hints.map((hint) => (
                    <div
                      key={hint.id}
                      className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4 backdrop-blur-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-semibold text-cyan-200">
                          AI Hint {hint.hintIndex}/3
                        </div>
                        <span className="text-xs text-cyan-300/80">
                          {formatHintTime(hint.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-cyan-100 whitespace-pre-wrap">
                        {hint.hintText}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* ========================================================================
          RIGHT SIDE: Code Editor + Submit Button
          ======================================================================== */}
      
      <div className="flex min-h-0 flex-col h-full overflow-hidden bg-slate-950/70 border-l border-slate-700/60">
        {/* Editor Container - Takes remaining space with explicit height */}
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <MonacoEditor
            onChange={handleEditorChange}
          />
        </div>
        
        {/* Submit Button + AI Hint Button - Fixed at bottom */}
        <div className="max-h-[45vh] flex-shrink-0 overflow-y-auto p-4 border-t border-slate-700/70 bg-slate-950/85 space-y-3">
          {/* Submit Button */}
          <SubmitButton
            onSubmit={handleSubmit}
            isJudging={isJudging}
            className="w-full"
          />
          
          {/* Helper text for submission */}
          <p className="text-xs text-slate-400 text-center">
            {isJudging 
              ? 'Your code is being judged...' 
              : 'Click submit to test your solution'
            }
          </p>

          {/* Real-time verdict result */}
          {verdict && (
            <SubmissionResult
              verdict={verdict}
              testCases={[]}
              executionTime={executionTime}
              memoryUsed={memoryUsed}
              compilerError={null}
            />
          )}

          {verdict && (
            <div className="rounded-lg border border-slate-700 bg-slate-950 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
                <h3 className="text-sm font-semibold">
                  Compiler / Console Message
                </h3>
                <span className="text-xs text-slate-400">
                  Current submission
                </span>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm leading-6">
                {currentConsoleMessage || 'No compiler or runtime message was returned for this submission.'}
              </pre>
            </div>
          )}

          {submissionError && !verdict && (
            <p className="text-xs text-red-300 text-center">
              {submissionError}
            </p>
          )}
          
          {/* Divider */}
          <div className="border-t border-slate-700 pt-3">
            {/* AI Hint Button */}
            <button
              onClick={handleGetHint}
              disabled={isLoadingHint || hintsRemaining === 0 || !problem}
              className={`w-full py-2 px-4 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                isLoadingHint || hintsRemaining === 0 || !problem
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:from-purple-400 hover:to-cyan-400 shadow-[0_8px_24px_rgba(168,85,247,0.35)]'
              }`}
            >
              {isLoadingHint ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Getting hint...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  {hintsRemaining === 0 ? 'No hints remaining' : `Get AI Hint (${hintsRemaining}/3)`}
                </>
              )}
            </button>
            
            {/* Hint error message */}
            {hintError && (
              <p className="text-xs text-red-300 text-center mt-2">
                {hintError}
              </p>
            )}
            
            {/* Hint info text */}
            {!hintError && hintsRemaining > 0 && (
              <p className="text-xs text-slate-400 text-center mt-2">
                Hints appear in the "Hints" tab on the left
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// DUMMY DATA: Fallback for development/testing
// ============================================================================

/**
 * Dummy problem data for testing the UI when the API is unavailable
 * 
 * This allows you to see the layout and test the editor without
 * needing the backend running
 */
const DUMMY_PROBLEM: Problem = {
  _id: 'dummy-1',
  id: 'dummy-1',
  title: 'Two Sum',
  slug: 'two-sum',
  description: `
Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.
  `.trim(),
  constraints: `
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- Only one valid answer exists.
  `.trim(),
  timeLimit: 1000,
  memoryLimit: 256,
  difficulty: 'easy',
  sampleTestCases: [
    {
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]',
    },
    {
      input: 'nums = [3,2,4], target = 6',
      output: '[1,2]',
    },
    {
      input: 'nums = [3,3], target = 6',
      output: '[0,1]',
    },
  ],
  status: 'published',
  authorId: 'dummy-author',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
