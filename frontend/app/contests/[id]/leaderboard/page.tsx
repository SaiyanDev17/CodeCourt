export default function LeaderboardPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Leaderboard - Contest {params.id}</h1>
      {/* Leaderboard will be implemented in Phase 4 */}
    </div>
  )
}
