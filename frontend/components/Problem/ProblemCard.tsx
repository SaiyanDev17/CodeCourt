export default function ProblemCard() {
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold mb-2">Problem Title</h3>
      <p className="text-gray-600 mb-4">Problem description preview...</p>
      <div className="flex gap-2">
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Easy</span>
      </div>
    </div>
  )
}
