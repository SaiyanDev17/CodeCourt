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
 * Get verdict display text
 */
function getVerdictText(verdict: SubmissionVerdict): string {
  const verdictMap: Record<SubmissionVerdict, string> = {
    AC: 'Accepted',
    WA: 'Wrong Answer',
    TLE: 'Time Limit Exceeded',
    MLE: 'Memory Limit Exceeded',
    RE: 'Runtime Error',
    CE: 'Compilation Error',
    PENDING: 'Judging...',
  }
  return verdictMap[verdict]
}

/**
 * Get verdict color classes
 * Returns Tailwind classes for text and background colors
 */
function getVerdictColorClasses(verdict: SubmissionVerdict): string {
  // Use clsx for clean conditional class logic
  return clsx(
    // Base classes (always applied)
    'font-semibold text-lg',
    
    // Conditional classes based on verdict
    verdict === 'AC' && 'text-green-600',
    verdict === 'WA' && 'text-red-600',
    verdict === 'TLE' && 'text-yellow-600',
    verdict === 'MLE' && 'text-orange-600',
    verdict === 'RE' && 'text-purple-600',
    verdict === 'CE' && 'text-red-700',
    verdict === 'PENDING' && 'text-blue-600'
  )
}

/**
 * Get verdict background color classes
 */
function getVerdictBgClasses(verdict: SubmissionVerdict): string {
  return clsx(
    'px-4 py-3 rounded-lg border',
    verdict === 'AC' && 'bg-green-50 border-green-200',
    verdict === 'WA' && 'bg-red-50 border-red-200',
    verdict === 'TLE' && 'bg-yellow-50 border-yellow-200',
    verdict === 'MLE' && 'bg-orange-50 border-orange-200',
    verdict === 'RE' && 'bg-purple-50 border-purple-200',
    verdict === 'CE' && 'bg-red-50 border-red-200',
    verdict === 'PENDING' && 'bg-blue-50 border-blue-200'
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
          Shows overall verdict with color-coded styling
          ==================================================================== */}
      <div className={getVerdictBgClasses(verdict)}>
        <div className="flex items-center justify-between">
          <div>
            <div className={getVerdictColorClasses(verdict)}>
              {getVerdictText(verdict)}
            </div>
            
            {/* Show test case summary if available */}
            {totalCount > 0 && (
              <div className="text-sm text-gray-600 mt-1">
                Passed {passedCount} of {totalCount} test cases
              </div>
            )}
          </div>
          
          {/* Execution metrics (time and memory) */}
          {(executionTime !== null || memoryUsed !== null) && (
            <div className="text-sm text-gray-600 space-y-1">
              {executionTime !== null && (
                <div>Time: {executionTime}ms</div>
              )}
              {memoryUsed !== null && (
                <div>Memory: {memoryUsed.toFixed(2)}MB</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* ====================================================================
          COMPILER ERROR (only shown for CE verdict)
          ==================================================================== */}
      {compilerError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700 font-semibold mb-2">
            Compilation Error:
          </div>
          <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono overflow-x-auto">
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
