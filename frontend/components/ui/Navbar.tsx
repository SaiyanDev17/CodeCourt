'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Button from './Button'

/**
 * Global navigation bar with app branding and navigation links.
 * Uses Next.js <Link> for client-side navigation (SPA behavior).
 */
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const pathname = usePathname() || ''

  return (
    <nav className="sticky top-0 z-40 px-2 pt-3 sm:px-4">
      <div className="mx-auto max-w-7xl rounded-2xl border border-cyan-400/20 bg-slate-950/70 shadow-[0_10px_30px_rgba(2,6,23,0.45)] backdrop-blur-xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: App branding */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-2xl font-bold text-cyan-300 hover:text-cyan-200 transition-colors [text-shadow:0_0_16px_rgba(34,211,238,0.45)]"
            >
              CodeCourt
            </Link>
          </div>

          {/* Center: Navigation links */}
          <div className="hidden md:flex items-center space-x-2">
            <Link 
              href="/problems" 
              className={`rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
                pathname.startsWith('/problems') 
                  ? 'text-cyan-300 bg-cyan-500/10 shadow-[0_0_12px_rgba(34,211,238,0.15)]' 
                  : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/70'
              }`}
            >
              Problems
            </Link>
            <Link 
              href="/contests" 
              className={`rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
                pathname.startsWith('/contests') 
                  ? 'text-cyan-300 bg-cyan-500/10 shadow-[0_0_12px_rgba(34,211,238,0.15)]' 
                  : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/70'
              }`}
            >
              Contests
            </Link>
            {isAuthenticated && (
              <Link 
                href="/submissions" 
                className={`rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
                  pathname.startsWith('/submissions') 
                    ? 'text-purple-300 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                    : 'text-slate-300 hover:text-purple-300 hover:bg-slate-800/70'
                }`}
              >
                Submissions
              </Link>
            )}
          </div>

          {/* Right: Auth buttons */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-sm font-semibold text-slate-200">{user.username}</span>
                  <span className="text-xs font-medium text-cyan-400/80 uppercase tracking-wider">{user.role}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => logout()}
                  className="border-slate-700 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="border-transparent hover:border-slate-600">
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
