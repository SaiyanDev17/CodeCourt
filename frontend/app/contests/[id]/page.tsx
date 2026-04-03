export default function ContestDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Contest: {params.id}</h1>
      {/* Contest detail will be implemented in Phase 4 */}
    </div>
  )
}
