'use client'

export default function Navbar() {
  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-600">CodeCourt</div>
        <div className="flex gap-6">
          <a href="/problems" className="hover:text-blue-600">Problems</a>
          <a href="/contests" className="hover:text-blue-600">Contests</a>
          <a href="/login" className="hover:text-blue-600">Login</a>
        </div>
      </div>
    </nav>
  )
}
