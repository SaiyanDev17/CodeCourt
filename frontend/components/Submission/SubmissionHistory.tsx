/**
 * SubmissionHistory Component
 * 
 * Displays a list of all submissions for a specific problem by the authenticated user.
 * Used in the "Submissions" tab on the problem page to show submission history.
 * 
 * Features:
 * - Fetches submissions via GET /api/submissions/problem/:problemId on mount
 * - Loading spinner while fetching
 * - Empty state message when no submissions exist
 * - List of submissions with verdict badges, language, execution metrics, and timestamps
 * - Clickable submissions (navigate to detail view - future enhancement)
 * - Card layout with hover effects
 * 
 * Design Principles:
 * - Uses VerdictBadge component for consistent verdict display
 * - Responsive card layout with Tailwind CSS
 * - Handles loading, empty, and error states gracefully
 * - Follows existing component patterns (SubmissionResult, VerdictBadge)
 */

'use client'

import { useEffect, useState } from 'react'
import { VerdictBadge } from './VerdictBadge'
import api from '@/lib/api'
import type { Submission, SubmissionVerdict, SubmissionLanguage } from '@/types'

/**
 * Submission history item (without code field for security)
 */
interface SubmissionHistoryItem {
  _id: string
  verdict: SubmissionVerdict
  executionTime: number | null
  memoryUsed: number | null
  language: SubmissionLanguage
  createdAt: string
}

/**
 * SubmissionHistory Props
 */
interface SubmissionHistoryProps {
  /**
   * Problem ID to fetch submissions for
   */
  problemId: string
}

/**
 * SubmissionHistory Component
 */
export function SubmissionHistory({ problemId }: SubmissionHistoryProps) {
  const [submissions, setSubmissions] = useState<SubmissionHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await api.get<{ count: number; submissions: SubmissionHistoryItem[] }>(
          `/submissions/problem/${problemId}`
        )
        
        setSubmissions(response.data.submissions)
      } catch (err: any) {
        console.error('Failed to fetch submission history:', err)
        setError(err.response?.data?.message || 'Failed to load submissions')
      } finally {
        setLoading(false)
      }
    }

    fetchSubmissions()
  }, [problemId])

  const openSubmission = async (submissionId: string) => {
    try {
      setDetailLoadingId(submissionId)
      setDetailError(null)

      const response = await api.get<{ submission: Submission }>(`/submissions/${submissionId}`)
      setSelectedSubmission(response.data.submission)
    } catch (err: any) {
      console.error('Failed to fetch submission details:', err)
      setDetailError(err.response?.data?.message || 'Failed to load submission details')
    } finally {
      setDetailLoadingId(null)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Loading submissions">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // Empty state
  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg font-medium">No submissions yet</p>
        <p className="text-sm mt-2">Submit your code to see results here</p>
      </div>
    )
  }

  // Submissions list
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Your Submissions ({submissions.length})
      </h3>
      
      {detailError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {detailError}
        </div>
      )}

      {submissions.map((submission) => (
        <button
          type="button"
          key={submission._id}
          className="w-full text-left bg-gray-50 rounded-lg p-4 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer transition-colors border border-gray-200"
          onClick={() => openSubmission(submission._id)}
          tabIndex={0}
        >
          {/* Header: Verdict and Timestamp */}
          <div className="flex items-center justify-between mb-2">
            <VerdictBadge verdict={submission.verdict} size="small" />
            <span className="text-xs text-gray-500">
              {new Date(submission.createdAt).toLocaleString()}
            </span>
          </div>
          
          {/* Details: Language and Execution Metrics */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="font-medium">{submission.language.toUpperCase()}</span>
            
            {submission.executionTime !== null && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
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
                {submission.executionTime}ms
              </span>
            )}
            
            {submission.memoryUsed !== null && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
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
                {submission.memoryUsed}MB
              </span>
            )}

            {detailLoadingId === submission._id && (
              <span className="text-blue-600">Loading details...</span>
            )}
          </div>
        </button>
      ))}

      {selectedSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-detail-title"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-4">
              <div>
                <h4 id="submission-detail-title" className="text-lg font-semibold text-gray-900">
                  Submission Details
                </h4>
                <p className="text-sm text-gray-500">
                  {new Date(selectedSubmission.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <VerdictBadge verdict={selectedSubmission.verdict} size="large" />
                <span className="text-sm font-medium text-gray-700">
                  {selectedSubmission.language.toUpperCase()}
                </span>
                {selectedSubmission.executionTime !== null && (
                  <span className="text-sm text-gray-600">
                    Time: {selectedSubmission.executionTime}ms
                  </span>
                )}
                {selectedSubmission.memoryUsed !== null && (
                  <span className="text-sm text-gray-600">
                    Memory: {selectedSubmission.memoryUsed}MB
                  </span>
                )}
              </div>

              <section>
                <h5 className="mb-2 text-sm font-semibold text-gray-900">Source Code</h5>
                <pre className="max-h-96 overflow-auto rounded-lg border border-gray-200 bg-gray-950 p-4 text-sm text-gray-100">
                  <code>{selectedSubmission.code}</code>
                </pre>
              </section>

              <section>
                <h5 className="mb-2 text-sm font-semibold text-gray-900">Console / Compiler Message</h5>
                {selectedSubmission.compilerError ? (
                  <pre className="overflow-auto rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {selectedSubmission.compilerError}
                  </pre>
                ) : (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    No compiler or runtime message was recorded for this submission.
                  </p>
                )}
              </section>

              <section>
                <h5 className="mb-2 text-sm font-semibold text-gray-900">Test Cases</h5>
                <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  Detailed passed/failed test case counts are not currently stored by the judge. The verdict above shows the final result.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * USAGE EXAMPLE:
 * 
 * ```tsx
 * import { SubmissionHistory } from '@/components/Submission/SubmissionHistory'
 * 
 * // In problem page with tabs
 * function ProblemPage({ problem }) {
 *   const [activeTab, setActiveTab] = useState<'problem' | 'submissions'>('problem')
 *   
 *   return (
 *     <div>
 *       {activeTab === 'problem' ? (
 *         <ProblemStatement problem={problem} />
 *       ) : (
 *         <SubmissionHistory problemId={problem._id} />
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
