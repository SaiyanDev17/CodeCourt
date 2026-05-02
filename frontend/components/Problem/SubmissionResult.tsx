/**
 * SubmissionResult Component
 * 
 * Displays the result of a code submission with:
 * 1. Overall verdict (AC, WA, TLE, MLE, RE, CE, PENDING)
 * 2. Execution metrics (time, memory)
 * 3. Individual test case results (pass/fail indicators)
 * 4. Compiler error messages (if CE)
 * 
 * ============================================================================
 * Conditional Styling with Tailwind CSS
 * ============================================================================
 * 
 * Tailwind CSS uses a JIT (Just-In-Time) compiler that scans your code for
 * class names at build time. This means:
 * 
 * ❌ WRONG - Dynamic class names don't work:
 * ```tsx
 * className={`text-${color}-600`}  // Tailwind can't detect this at build time
 * ```
 * 
 * ✅ CORRECT - Use conditional expressions with complete class names:
 * ```tsx
 * className={status === 'AC' ? 'text-green-600' : 'text-red-600'}
 * ```
 * 
 * ✅ BETTER - Use clsx for complex conditions:
 * ```tsx
 * import { clsx } from 'clsx'
 * className={clsx(
 *   'base-class',
 *   status === 'AC' && 'text-green-600',
 *   status === 'WA' && 'text-red-600',
 *   status === 'TLE' && 'text-yellow-600'
 * )}
 * ```
 * 
 * ✅ BEST - Use cn utility (combines clsx + tailwind-merge):
 * ```tsx
 * import { cn } from '@/lib/utils'
 * className={cn(
 *   'base-class',
 *   status === 'AC' && 'text-green-600 bg-green-50',
 *   status === 'WA' && 'text-red-600 bg-red-50'
 * )}
 * ```
 * 
 * The cn utility prevents class conflicts. For example:
 * - Without cn: 'text-red-600 text-green-600' → both classes applied (bug!)
 * - With cn: 'text-red-600 text-green-600' → only 'text-green-600' applied (correct!)
 * 
 * ============================================================================
 * Why Show Individual Test Cases?
 * ============================================================================
 * 
 * 1. DEBUGGING:
 *    - "Test 3 failed" is more useful than "Some tests failed"
 *    - Users can identify which edge case broke their solution
 *    - Example: Test 1-5 pass (small inputs), Test 6 fails (large input)
 * 
 * 2. PARTIAL CREDIT:
 *    - In competitive programming, passing 7/10 tests shows progress
 *    - Users can gauge how close they are to a full solution
 *    - Motivates incremental improvement
 * 
 * 3. EDGE CASE IDENTIFICATION:
 *    - Failed tests often reveal specific edge cases
 *    - Example: Empty input, maximum constraints, negative numbers
 *    - Users can add these cases to their local testing
 * 
 * 4. LEARNING:
 *    - Beginners learn to think about test coverage
 *    - Seeing which tests fail helps understand problem requirements
 *    - Encourages systematic debugging approach
 * 
 * 5. TRANSPARENCY:
 *    - Builds trust - users see exactly what was tested
 *    - No "black box" judging - everything is visible
 *    - Users can verify their solution against known test cases
 */

'use client'

import { clsx } from 'clsx'
import type { SubmissionVerdict } from '@/types'
import { VerdictBadge } from '@/components/Submission/VerdictBadge'

/**
 * Test Case Result Interface
 * Represents the result of a single test case
 */
interface TestCaseResult {
  testNumber: number    // Test case number (1-indexed)
  passed: boolean       // true if test passed, false if failed
  input?: string        // Optional: test input (for sample tests)
  expectedOutput?: string  // Optional: expected output (for sample tests)
  actualOutput?: string    // Optional: user's output (for debugging)
}

/**
 * SubmissionResult Props
 */
interface SubmissionResultProps {
  /**
   * Overall verdict from the judge
   * - AC: Accepted (all tests passed)
   * - WA: Wrong Answer (some tests failed)
   * - TLE: Time Limit Exceeded
   * - MLE: Memory Limit Exceeded
   * - RE: Runtime Error (crash, exception)
   * - CE: Compilation Error
   * - PENDING: Still judging
   */
  verdict: SubmissionVerdict
  
  /**
   * Array of individual test case results
   * - Empty array if no test results available (e.g., CE, PENDING)
   * - Each element represents one test case
   */
  testCases: TestCaseResult[]
  
  /**
   * Execution time in milliseconds
   * - null if not applicable (CE, PENDING)
   */
  executionTime?: number | null
  
  /**
   * Memory used in megabytes
   * - null if not applicable (CE, PENDING)
   */
  memoryUsed?: number | null
  
  /**
   * Compiler error message
   * - Only present when verdict is CE
   */
  compilerError?: string | null
}

/**
 * Clock Icon (for execution time)
 */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

/**
 * Memory Icon (for memory usage)
 */
function MemoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      />
    </svg>
  )
}

/**
 * SubmissionResult Component
 */
export function SubmissionResult({
  verdict,
  testCases,
  executionTime,
  memoryUsed,
  compilerError,
}: SubmissionResultProps) {
  // Calculate pass/fail counts
  const passedCount = testCases.filter((tc) => tc.passed).length
  const totalCount = testCases.length
  
  return (
    <div className="space-y-4">
      {/* ====================================================================
          VERDICT HEADER
          Shows overall verdict with VerdictBadge component and metrics
          ==================================================================== */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        {/* Verdict Badge */}
        <div className="flex items-center justify-between">
          <VerdictBadge verdict={verdict} size="large" />
          
          {/* Test case summary if available */}
          {totalCount > 0 && (
            <div className="text-sm text-gray-600">
              {passedCount} / {totalCount} tests passed
            </div>
          )}
        </div>
        
        {/* Execution metrics (time and memory) */}
        {(executionTime !== null && executionTime !== undefined) || 
         (memoryUsed !== null && memoryUsed !== undefined) ? (
          <div className="flex items-center gap-6 text-sm text-gray-700 pt-2 border-t border-gray-100">
            {executionTime !== null && executionTime !== undefined && (
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Execution Time:</span>
                <span>{executionTime}ms</span>
              </div>
            )}
            {memoryUsed !== null && memoryUsed !== undefined && (
              <div className="flex items-center gap-2">
                <MemoryIcon className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Memory Used:</span>
                <span>{memoryUsed.toFixed(2)}MB</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
      
      {/* ====================================================================
          COMPILER ERROR (only shown for CE verdict)
          Displayed in monospace font for readability
          ==================================================================== */}
      {compilerError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700 font-semibold mb-2">
            Compilation Error:
          </div>
          <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono overflow-x-auto bg-white p-3 rounded border border-red-100">
            {compilerError}
          </pre>
        </div>
      )}
      
      {/* ====================================================================
          TEST CASE RESULTS
          Shows individual pass/fail indicators for each test
          ==================================================================== */}
      {testCases.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-gray-700 font-semibold mb-3">
            Test Cases:
          </div>
          
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {testCases.map((testCase) => (
              <div
                key={testCase.testNumber}
                className={clsx(
                  'flex items-center justify-center',
                  'w-10 h-10 rounded-md border-2 font-semibold text-sm',
                  testCase.passed
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-red-100 border-red-500 text-red-700'
                )}
                title={`Test ${testCase.testNumber}: ${testCase.passed ? 'Passed' : 'Failed'}`}
              >
                {testCase.passed ? (
                  // Green checkmark for passed tests
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  // Red X for failed tests
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
              <span>Passed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
              <span>Failed</span>
            </div>
          </div>
        </div>
      )}
      
      {/* ====================================================================
          PENDING STATE
          Shows loading indicator when verdict is PENDING
          ==================================================================== */}
      {verdict === 'PENDING' && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Judging your submission...</span>
        </div>
      )}
    </div>
  )
}

/**
 * USAGE EXAMPLE:
 * 
 * ```tsx
 * import { SubmissionResult } from '@/components/Problem/SubmissionResult'
 * 
 * function ProblemPage() {
 *   const { verdict, executionTime, memoryUsed, compilerError } = useSubmission()
 *   
 *   // Mock test case results (in real app, this comes from backend)
 *   const testCases = [
 *     { testNumber: 1, passed: true },
 *     { testNumber: 2, passed: true },
 *     { testNumber: 3, passed: false },
 *     { testNumber: 4, passed: true },
 *     { testNumber: 5, passed: false },
 *   ]
 *   
 *   return (
 *     <div>
 *       {verdict && (
 *         <SubmissionResult
 *           verdict={verdict}
 *           testCases={testCases}
 *           executionTime={executionTime}
 *           memoryUsed={memoryUsed}
 *           compilerError={compilerError}
 *         />
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
