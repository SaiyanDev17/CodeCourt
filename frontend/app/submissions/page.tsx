/**
 * AllSubmissionsPage Component
 * 
 * Displays all submissions by the authenticated user across all problems.
 * This page provides a comprehensive view of the user's submission history,
 * including problem details, verdicts, execution metrics, and timestamps.
 * 
 * Features:
 * - Fetches all user submissions via GET /api/submissions
 * - Displays loading spinner while fetching
 * - Shows "No submissions found" when empty
 * - Verdict filter dropdown to filter by verdict type (AC, WA, TLE, MLE, RE, CE)
 * - Shows count of filtered submissions
 * - Pagination: displays first 50 submissions initially
 * - "Load More" button to load next 50 submissions
 * - Hides "Load More" button when no more submissions available
 * - Renders list of submissions with:
 *   - Problem title (clickable link to problem page)
 *   - VerdictBadge component (size="large")
 *   - Language (uppercase)
 *   - Execution time with clock icon (if available)
 *   - Memory usage with memory icon (if available)
 *   - Timestamp (formatted)
 * - Card layout with hover shadow effect
 * - Responsive Tailwind CSS layout
 * 
 * Route: /submissions
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { VerdictBadge } from '@/components/Submission/VerdictBadge'
import type { SubmissionVerdict, SubmissionLanguage } from '@/types'

/**
 * Submission with problem details (from backend aggregation)
 */
interface SubmissionWithProblem {
  _id: string
  verdict: SubmissionVerdict
  executionTime: number | null
  memoryUsed: number | null
  language: SubmissionLanguage
  createdAt: string
  problemId: string
  problemTitle: string
  problemSlug: string
}

/**
 * API response format from GET /api/submissions
 */
interface GetAllSubmissionsResponse {
  count: number
  submissions: SubmissionWithProblem[]
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
 * Loading Spinner Component
 */
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div
        className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
        role="status"
        aria-label="Loading submissions"
      ></div>
    </div>
  )
}

/**
 * Format timestamp to readable date string
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Submission Card Component
 * Responsive layout:
 * - Desktop (>=1024px): Horizontal layout with all details in one row
 * - Mobile (<1024px): Compact card with stacked details
 */
function SubmissionCard({ submission }: { submission: SubmissionWithProblem }) {
  return (
    <Link
      href={`/problems/${submission.problemSlug}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 lg:p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header: Problem Title and Timestamp */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-3 gap-2">
        <div className="flex-1">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {submission.problemTitle}
          </h3>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">
            {formatTimestamp(submission.createdAt)}
          </p>
        </div>
        <div className="self-start lg:self-auto">
          <VerdictBadge verdict={submission.verdict} size="large" />
        </div>
      </div>

      {/* Metrics: Language, Execution Time, Memory Usage */}
      <div className="flex flex-wrap items-center gap-3 lg:gap-6 text-xs lg:text-sm text-gray-600">
        {/* Language */}
        <span className="font-medium">{submission.language.toUpperCase()}</span>

        {/* Execution Time */}
        {submission.executionTime !== null && submission.executionTime !== undefined && (
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3 lg:w-4 lg:h-4" />
            {submission.executionTime}ms
          </span>
        )}

        {/* Memory Usage */}
        {submission.memoryUsed !== null && submission.memoryUsed !== undefined && (
          <span className="flex items-center gap-1">
            <MemoryIcon className="w-3 h-3 lg:w-4 lg:h-4" />
            {submission.memoryUsed.toFixed(2)}MB
          </span>
        )}
      </div>
    </Link>
  )
}

/**
 * AllSubmissionsPage Component
 */
export default function AllSubmissionsPage() {
  const [allSubmissions, setAllSubmissions] = useState<SubmissionWithProblem[]>([])
  const [displayedSubmissions, setDisplayedSubmissions] = useState<SubmissionWithProblem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | SubmissionVerdict>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const ITEMS_PER_PAGE = 50

  useEffect(() => {
    const fetchAllSubmissions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await api.get<GetAllSubmissionsResponse>('/submissions')
        const fetchedSubmissions = response.data.submissions
        
        setAllSubmissions(fetchedSubmissions)
        
        // Display first 50 submissions initially
        setDisplayedSubmissions(fetchedSubmissions.slice(0, ITEMS_PER_PAGE))
        
        // Check if there are more submissions to load
        setHasMore(fetchedSubmissions.length > ITEMS_PER_PAGE)
        setPage(1)
      } catch (err: any) {
        console.error('Failed to fetch submissions:', err)
        setError(err.response?.data?.message || 'Failed to load submissions')
      } finally {
        setLoading(false)
      }
    }

    fetchAllSubmissions()
  }, [])

  // Handle "Load More" button click
  const handleLoadMore = () => {
    setLoadingMore(true)
    
    const nextPage = page + 1
    const startIndex = 0
    const endIndex = nextPage * ITEMS_PER_PAGE
    
    // Load next page of submissions
    const newDisplayedSubmissions = allSubmissions.slice(startIndex, endIndex)
    setDisplayedSubmissions(newDisplayedSubmissions)
    setPage(nextPage)
    
    // Update hasMore based on whether there are more submissions
    setHasMore(allSubmissions.length > endIndex)
    
    setLoadingMore(false)
  }

  // Filter submissions based on selected verdict
  const filteredSubmissions = filter === 'all'
    ? displayedSubmissions
    : displayedSubmissions.filter(sub => sub.verdict === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-3 lg:px-4 py-4 lg:py-8 max-w-5xl">
        {/* Page Title and Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 lg:mb-6 gap-3 lg:gap-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">All Submissions</h1>
          
          {/* Verdict Filter Dropdown */}
          <div className="flex items-center gap-2 lg:gap-3">
            <label htmlFor="verdict-filter" className="text-xs lg:text-sm font-medium text-gray-700">
              Filter:
            </label>
            <select
              id="verdict-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | SubmissionVerdict)}
              className="px-3 lg:px-4 py-1.5 lg:py-2 text-sm lg:text-base border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Verdicts</option>
              <option value="AC">Accepted</option>
              <option value="WA">Wrong Answer</option>
              <option value="TLE">Time Limit Exceeded</option>
              <option value="MLE">Memory Limit Exceeded</option>
              <option value="RE">Runtime Error</option>
              <option value="CE">Compilation Error</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && <LoadingSpinner />}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredSubmissions.length === 0 && (
          <div className="text-center py-8 lg:py-12">
            <p className="text-gray-500 text-base lg:text-lg">
              {displayedSubmissions.length === 0 ? 'No submissions found' : `No ${filter} submissions found`}
            </p>
            {displayedSubmissions.length === 0 && (
              <p className="text-gray-400 text-xs lg:text-sm mt-2">
                Submit solutions to problems to see your submission history here
              </p>
            )}
          </div>
        )}

        {/* Submissions List */}
        {!loading && !error && filteredSubmissions.length > 0 && (
          <>
            {/* Submission Count */}
            <div className="mb-3 lg:mb-4 text-xs lg:text-sm text-gray-600">
              Showing {filteredSubmissions.length} of {displayedSubmissions.length} submission{displayedSubmissions.length !== 1 ? 's' : ''}
            </div>
            
            <div className="space-y-3 lg:space-y-4">
              {filteredSubmissions.map((submission) => (
                <SubmissionCard key={submission._id} submission={submission} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && filter === 'all' && (
              <div className="mt-4 lg:mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
