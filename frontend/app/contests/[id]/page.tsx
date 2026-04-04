'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Contest, Problem } from '@/types'
import { useAuthStore } from '@/store/auth.store'

export default function ContestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  // State management
  const [contest, setContest] = useState<Contest | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)

  // Check if user is registered for this contest
  const isRegistered = contest?.participants.includes(user?._id || '')

  // Fetch contest details and associated problems
  useEffect(() => {
    const fetchContestData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch contest details
        const contestResponse = await api.get(`/contests/${params.id}`)
        const contestData: Contest = contestResponse.data
        setContest(contestData)

        // Fetch all problems associated with this contest
        const problemPromises = contestData.problemIds.map((problemId) =>
          api.get(`/problems/${problemId}`)
        )
        const problemResponses = await Promise.all(problemPromises)
        const problemsData = problemResponses.map((res) => res.data)
        setProblems(problemsData)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load contest')
      } finally {
        setLoading(false)
      }
    }

    fetchContestData()
  }, [params.id])

  // Handle contest registration
  const handleRegister = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    try {
      setRegistering(true)
      await api.post(`/contests/${params.id}/register`)

      // Update local state to reflect registration
      if (contest) {
        setContest({
          ...contest,
          participants: [...contest.participants, user._id],
        })
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to register for contest')
    } finally {
      setRegistering(false)
    }
  }

  // Format date and time
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

  // Calculate contest duration
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

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !contest) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error || 'Contest not found'}</p>
          <Button onClick={() => router.push('/contests')}>
            Back to Contests
          </Button>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className="container mx-auto p-8">
      {/* Contest Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {contest.title}
            </h1>
            <Badge variant={contest.status} size="lg" />
          </div>

          {/* Register Button */}
          {!isRegistered && contest.status !== 'ended' && (
            <Button
              onClick={handleRegister}
              disabled={registering}
              className="ml-4"
            >
              {registering ? 'Registering...' : 'Register'}
            </Button>
          )}

          {isRegistered && (
            <div className="ml-4 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
              ✓ Registered
            </div>
          )}
        </div>

        {/* Contest Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5"
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
            <div>
              <p className="text-sm text-gray-500">Start Time</p>
              <p className="font-medium text-gray-900">
                {formatDateTime(contest.startTime)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5"
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
            <div>
              <p className="text-sm text-gray-500">End Time</p>
              <p className="font-medium text-gray-900">
                {formatDateTime(contest.endTime)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5"
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
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium text-gray-900">
                {calculateDuration(contest.startTime, contest.endTime)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5"
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
            <div>
              <p className="text-sm text-gray-500">Participants</p>
              <p className="font-medium text-gray-900">
                {contest.participants.length}
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard Link */}
        {contest.status !== 'upcoming' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href={`/contests/${contest._id}/leaderboard`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              View Leaderboard
            </Link>
          </div>
        )}
      </div>

      {/* Problems Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Problems ({problems.length})
        </h2>

        {problems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No problems available for this contest
          </p>
        ) : (
          <div className="space-y-4">
            {problems.map((problem, index) => (
              <Link
                key={problem._id}
                href={`/problems/${problem.slug}?contestId=${contest._id}`}
                className="block p-6 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full font-bold text-gray-700">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {problem.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Time: {problem.timeLimit}ms | Memory: {problem.memoryLimit}MB
                      </p>
                    </div>
                  </div>
                  <Badge variant={problem.difficulty} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
