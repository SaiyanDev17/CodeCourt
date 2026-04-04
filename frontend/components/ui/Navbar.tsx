'use client'

import Link from 'next/link'
import Button from './Button'

interface User {
  username: string
  email: string
  role: string
}

/**
 * Global navigation bar with app branding and navigation links.
 * Uses Next.js <Link> for client-side navigation (SPA behavior).
 * 
 * Currently shows mock auth buttons (Login/Register) until auth store is implemented.
 */
export default function Navbar() {
  // TODO: Replace with actual auth state from Zustand store (task 4.1.1)
  const isAuthenticated = false
  const user = null as User | null

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: App branding */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              CodeCourt
            </Link>
          </div>

          {/* Center: Navigation links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/problems" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Problems
            </Link>
            <Link 
              href="/contests" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Contests
            </Link>
          </div>

          {/* Right: Auth buttons (mocked for now) */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              // TODO: Show user profile dropdown when auth is implemented
              <Link href={`/profile/${user?.username || ''}`}>
                <Button variant="ghost" size="sm">
                  {user?.username}
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
