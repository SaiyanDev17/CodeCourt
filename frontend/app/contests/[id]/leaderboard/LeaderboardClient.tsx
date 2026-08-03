'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { Contest, LeaderboardEntry, LeaderboardUpdateEvent } from '@/types'
import { useAuthStore } from '@/store/auth.store'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import LeaderboardTable from '@/components/Leaderboard/LeaderboardTable'

export default function LeaderboardClient() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const accessToken = useAuthStore((state) => state.accessToken)

  const [contest, setContest] = useState<Contest | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const contestResponse = await api.get(`/contests/${id}`)
        setContest(contestResponse.data)

        const leaderboardResponse = await api.get(`/contests/${id}/leaderboard`)
        setLeaderboard(leaderboardResponse.data)
        setLastUpdate(new Date())
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  useEffect(() => {
    if (!accessToken || !id) return

    const socket = connectSocket(accessToken)
    socket.emit('join:contest', id)

    const handleLeaderboardUpdate = (event: LeaderboardUpdateEvent) => {
      if (event.contestId === id) {
        setLeaderboard(event.leaderboard)
        setLastUpdate(new Date())
      }
    }

    socket.on('leaderboard:update', handleLeaderboardUpdate)

    return () => {
      socket.off('leaderboard:update', handleLeaderboardUpdate)
      socket.emit('leave:contest', id)
      disconnectSocket()
    }
  }, [id, accessToken])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatLastUpdate = () => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000)

    if (diff < 10) return 'Just now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return formatTime(lastUpdate.toISOString())
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

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

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link
              href={`/contests/${contest._id}`}
              className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Contest
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {contest.title} - Leaderboard
            </h1>
          </div>
          <Badge variant={contest.status} size="md" />
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
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
            <span>{contest.participants.length} participants</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
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
            <span>Updated {formatLastUpdate()}</span>
          </div>
        </div>
      </div>

      <LeaderboardTable 
        leaderboard={leaderboard} 
        problemCount={contest.problemIds.length} 
      />

      {contest.status === 'ongoing' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live updates enabled</span>
        </div>
      )}
    </div>
  )
}
