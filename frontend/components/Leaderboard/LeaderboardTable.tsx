'use client'

export default function LeaderboardTable() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-6 py-3 border-b">Rank</th>
            <th className="px-6 py-3 border-b">Username</th>
            <th className="px-6 py-3 border-b">Score</th>
            <th className="px-6 py-3 border-b">Penalty</th>
          </tr>
        </thead>
        <tbody>
          {/* Leaderboard data will be populated in Phase 4 */}
        </tbody>
      </table>
    </div>
  )
}
