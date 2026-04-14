'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import Badge from '@/components/ui/Badge'
import { Contest } from '@/types'

export default function ContestsPage() {
  // State management for async data fetching
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch contests when component mounts
  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Call GET /api/contests using our configured Axios instance
        const response = await api.get('/contests')
        
        // Update state with the fetched contests - validate it's an array
        setContests(Array.isArray(response.data) ? response.data : [])
      } catch (err: any) {
        // Handle errors (network issues, 500 errors, etc.)
        setError(err.response?.data?.message || 'Failed to load contests')
      } finally {
        // Always set loading to false, whether success or error
        setLoading(false)
      }
    }

    fetchContests()
  }, []) // Empty dependency array = run only once on mount

  // Helper function to categorize contests by status
  const categorizeContests = () => {
    // Type guard: ensure contests is an array before calling .filter()
    if (!Array.isArray(contests)) {
      return { upcoming: [], active: [], past: [] }
    }

    const now = new Date()

    // Filter contests into three categories based on start/end times
    const upcoming = contests.filter(contest => 
      new Date(contest.startTime) > now
    )

    const active = contests.filter(contest => 
      new Date(contest.startTime) <= now && new Date(contest.endTime) > now
    )

    const past = contests.filter(contest => 
      new Date(contest.endTime) <= now
    )

    return { upcoming, active, past }
  }

  // Helper function to format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Helper function to calculate contest duration
  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const durationMs = end.getTime() - start.getTime()
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  }

  // Loading state: Show spinner while fetching
  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Contests</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Error state: Show error message with retry button
  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Contests</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Categorize contests
  const { upcoming, active, past } = categorizeContests()

  // Contest Card Component
  const ContestCard = ({ contest }: { contest: Contest }) => (
    <Link
      href={`/contests/${contest._id}`}
      className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-semibold text-gray-900 flex-1">
          {contest.title}
        </h3>
        <Badge variant={contest.status} size="md" />
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>
            <span className="font-medium">Starts:</span> {formatDateTime(contest.startTime)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            <span className="font-medium">Duration:</span>{' '}
            {calculateDuration(contest.startTime, contest.endTime)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span>
            <span className="font-medium">Participants:</span> {contest.participants.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>
            <span className="font-medium">Problems:</span> {contest.problemIds.length}
          </span>
        </div>
      </div>
    </Link>
  )

  // Contest Section Component
  const ContestSection = ({
    title,
    contests,
    emptyMessage,
  }: {
    title: string
    contests: Contest[]
    emptyMessage: string
  }) => (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
      {contests.length === 0 ? (
        <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.map((contest) => (
            <ContestCard key={contest._id} contest={contest} />
          ))}
        </div>
      )}
    </div>
  )

  // Success state: Render the contests organized by status
  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contests</h1>
        <p className="text-gray-600">
          Compete with others and climb the leaderboard
        </p>
      </div>

      {/* Active Contests Section */}
      <ContestSection
        title="🔥 Active Contests"
        contests={active}
        emptyMessage="No active contests right now"
      />

      {/* Upcoming Contests Section */}
      <ContestSection
        title="📅 Upcoming Contests"
        contests={upcoming}
        emptyMessage="No upcoming contests scheduled"
      />

      {/* Past Contests Section */}
      <ContestSection
        title="📜 Past Contests"
        contests={past}
        emptyMessage="No past contests to display"
      />
    </div>
  )
}
