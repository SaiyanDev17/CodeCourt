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
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Problem } from '@/types'
import ProblemStatement from '@/components/Problem/ProblemStatement'
import MonacoEditor from '@/components/Editor/MonacoEditor'
import SubmitButton from '@/components/Editor/SubmitButton'

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
  
  // Editor state
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<'cpp' | 'python'>('cpp')
  
  // Submission state
  const [isJudging, setIsJudging] = useState(false)
  
  // AI Hint state
  const [hintText, setHintText] = useState<string | null>(null)
  const [hintsRemaining, setHintsRemaining] = useState<number>(3)
  const [isLoadingHint, setIsLoadingHint] = useState(false)
  const [hintError, setHintError] = useState<string | null>(null)
  const [showHintPanel, setShowHintPanel] = useState(false)
  
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
        setProblem(response.data)
        
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
  // STEP 5: Handle Code Submission
  // ============================================================================
  
  /**
   * For now, just console.log the code and language
   * 
   * In the future (Task 4.3.7), this will:
   * 1. Call POST /api/submissions with { code, language, problemId }
   * 2. Listen for verdict via Socket.io
   * 3. Display the verdict in the UI
   */
  const handleSubmit = () => {
    console.log('=== SUBMISSION ===')
    console.log('Problem:', problem?.title)
    console.log('Language:', language)
    console.log('Code:', code)
    console.log('==================')
    
    // Simulate judging state for UI testing
    setIsJudging(true)
    setTimeout(() => {
      setIsJudging(false)
      alert('Submission logged to console! Check the browser console.')
    }, 2000)
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
        problem_id: problem.id,
        problem_slug: problem.slug,
      })
      
      // Response format: { hint_text: string, hints_used: number }
      const { hint_text, hints_used } = response.data
      
      // Update state
      setHintText(hint_text)
      setHintsRemaining(3 - hints_used)
      setShowHintPanel(true)
      
    } catch (err: any) {
      console.error('Failed to get hint:', err)
      
      // Handle specific error cases
      if (err.response?.status === 403) {
        setHintError("You've used all 3 hints for this problem")
      } else {
        setHintError(err.response?.data?.message || 'Failed to get hint. Please try again.')
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading problem...</p>
        </div>
      </div>
    )
  }
  
  if (error && !problem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
        <p className="text-gray-600">Problem not found</p>
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
    <div className="h-[calc(100vh-70px)] grid grid-cols-1 lg:grid-cols-2">
      {/* ========================================================================
          LEFT SIDE: Problem Statement
          ======================================================================== */}
      
      <div className="overflow-y-auto border-r border-gray-200 bg-white">
        <div className="p-6 max-w-4xl">
          {/* Problem Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {problem.title}
            </h1>
            
            <div className="flex items-center gap-3">
              {/* Difficulty Badge */}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  problem.difficulty === 'easy'
                    ? 'bg-green-100 text-green-800'
                    : problem.difficulty === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
              </span>
              
              {/* Time Limit */}
              <span className="text-sm text-gray-600">
                Time: {problem.timeLimit}ms
              </span>
              
              {/* Memory Limit */}
              <span className="text-sm text-gray-600">
                Memory: {problem.memoryLimit}MB
              </span>
            </div>
          </div>
          
          {/* Problem Description (Markdown) */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
            <ProblemStatement markdownContent={problem.description} />
          </div>
          
          {/* Constraints */}
          {problem.constraints && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Constraints</h2>
              <ProblemStatement markdownContent={problem.constraints} />
            </div>
          )}
          
          {/* Sample Test Cases */}
          {problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Sample Test Cases</h2>
              {problem.sampleTestCases.map((testCase, index) => (
                <div key={index} className="mb-4 bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-700 mb-2">Example {index + 1}</p>
                  
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-600 mb-1">Input:</p>
                    <pre className="bg-white p-2 rounded border border-gray-200 text-sm overflow-x-auto">
                      {testCase.input}
                    </pre>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Output:</p>
                    <pre className="bg-white p-2 rounded border border-gray-200 text-sm overflow-x-auto">
                      {testCase.output}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* ========================================================================
          RIGHT SIDE: Code Editor + Submit Button
          ======================================================================== */}
      
      <div className="flex flex-col h-full bg-gray-50">
        {/* AI Hint Panel - Collapsible, appears above editor when hint exists */}
        {showHintPanel && hintText && (
          <div className="flex-shrink-0 bg-blue-50 border-b border-blue-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-blue-900">AI Hint</h3>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {hintsRemaining}/3 remaining
                </span>
              </div>
              <button
                onClick={() => setShowHintPanel(false)}
                className="text-blue-600 hover:text-blue-800"
                aria-label="Close hint panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-sm text-blue-900 bg-white rounded p-3 border border-blue-200">
              {hintText}
            </div>
          </div>
        )}
        
        {/* Editor Container - Takes remaining space with explicit height */}
        <div className="flex-1 p-4 h-full min-h-0">
          <MonacoEditor
            onChange={handleEditorChange}
          />
        </div>
        
        {/* Submit Button + AI Hint Button - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white space-y-3">
          {/* Submit Button */}
          <SubmitButton
            onSubmit={handleSubmit}
            isJudging={isJudging}
            className="w-full"
          />
          
          {/* Helper text for submission */}
          <p className="text-xs text-gray-500 text-center">
            {isJudging 
              ? 'Your code is being judged...' 
              : 'Click submit to test your solution'
            }
          </p>
          
          {/* Divider */}
          <div className="border-t border-gray-200 pt-3">
            {/* AI Hint Button */}
            <button
              onClick={handleGetHint}
              disabled={isLoadingHint || hintsRemaining === 0 || !problem}
              className={`w-full py-2 px-4 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                isLoadingHint || hintsRemaining === 0 || !problem
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
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
              <p className="text-xs text-red-600 text-center mt-2">
                {hintError}
              </p>
            )}
            
            {/* Hint info text */}
            {!hintError && hintsRemaining > 0 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Get a helpful hint from our AI assistant
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
