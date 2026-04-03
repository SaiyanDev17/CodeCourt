export default function ProblemDetailPage({ params }: { params: { slug: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Problem: {params.slug}</h1>
      {/* Problem detail and editor will be implemented in Phase 4 */}
    </div>
  )
}
