/**
 * LeaderboardTable Component
 * 
 * Real-time leaderboard display for competitive programming contests.
 * 
 * Features:
 * - Displays contest rankings with rank, username, score, problems solved, and penalty
 * - Visual indicators: medals for top 3, problem status badges (solved/attempted/not attempted)
 * - Responsive table design with hover effects
 * - Links to user profiles
 * - Empty state for contests with no submissions
 * 
 * Real-time Updates:
 * - Parent component (leaderboard/page.tsx) listens for Socket.io 'leaderboard:update' events
 * - This component receives updated data via props and re-renders automatically
 * - No direct Socket.io logic here (separation of concerns)
 * 
 * ICPC Scoring:
 * - Score = number of problems solved
 * - Penalty = sum of (20 * wrong_attempts + time_to_first_AC) for each problem
 * - Tiebreaker: lower penalty wins
 * 
 * Props:
 * @param {LeaderboardEntry[]} leaderboard - Array of leaderboard entries
 * @param {number} problemCount - Total number of problems in the contest
 */

'use client'

import Link from 'next/link'
import { LeaderboardEntry } from '@/types'

interface LeaderboardTableProps {
  leaderboard: LeaderboardEntry[]
  problemCount: number
}

export default function LeaderboardTable({ 
  leaderboard, 
  problemCount 
}: LeaderboardTableProps) {
  // Empty state: no submissions yet
  if (leaderboard.length === 0) {
    return (
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-12 text-center text-slate-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-slate-500"
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
          <p className="text-lg font-medium">No submissions yet</p>
          <p className="text-sm mt-1">
            Be the first to solve a problem and appear on the leaderboard!
          </p>
        </div>
      </div>
    )
  }

  // Success state: display leaderboard
  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700/70">
          {/* Table Header */}
          <thead className="bg-slate-900/70">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Problems Solved
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Penalty
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-700/60">
            {leaderboard.map((entry) => {
              // Calculate solved count and total penalty
              const solvedCount = entry.problemScores.filter((p) => p.solved).length
              const totalPenalty = entry.problemScores.reduce(
                (sum, p) => sum + p.penalty,
                0
              )

              return (
                <tr
                  key={entry.userId}
                  className="hover:bg-slate-800/45 transition-colors"
                >
                  {/* Rank Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {entry.rank <= 3 ? (
                        // Medal icons for top 3
                        <span className="text-2xl">
                          {entry.rank === 1 && '🥇'}
                          {entry.rank === 2 && '🥈'}
                          {entry.rank === 3 && '🥉'}
                        </span>
                      ) : (
                        // Numeric rank for others
                        <span className="text-sm font-medium text-slate-100">
                          #{entry.rank}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Username Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/profile/${entry.username}`}
                      className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
                    >
                      {entry.username}
                    </Link>
                  </td>

                  {/* Score Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-slate-100">
                      {entry.totalScore}
                    </span>
                  </td>

                  {/* Problems Solved Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {/* Solved count */}
                      <span className="text-sm text-slate-100">
                        {solvedCount} / {problemCount}
                      </span>

                      {/* Problem status badges */}
                      <div className="flex gap-1">
                        {entry.problemScores.map((problem, idx) => (
                          <div
                            key={problem.problemId}
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium ${
                              problem.solved
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : problem.attempts > 0
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-slate-600/25 text-slate-400'
                            }`}
                            title={
                              problem.solved
                                ? `Solved (${problem.attempts} attempts)`
                                : problem.attempts > 0
                                ? `${problem.attempts} failed attempts`
                                : 'Not attempted'
                            }
                          >
                            {/* Problem letter (A, B, C, ...) */}
                            {String.fromCharCode(65 + idx)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Penalty Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-400">
                      {totalPenalty}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
