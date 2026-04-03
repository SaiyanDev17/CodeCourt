export default function ProfilePage({ params }: { params: { username: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Profile: {params.username}</h1>
      {/* User profile will be implemented in Phase 4 */}
    </div>
  )
}
