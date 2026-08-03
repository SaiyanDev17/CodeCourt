'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { User, UserRole } from '@/types'

export default function ProfileClient() {
  const params = useParams()
  const username = params.username as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await api.get(`/users/${username}`)
        setUser(response.data)
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('User not found')
        } else {
          setError(err.response?.data?.message || 'Failed to load user profile')
        }
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchUserProfile()
    }
  }, [username])

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => window.location.href = '/problems'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to Problems
          </button>
        </div>
      </div>
    )
  }

  const getRoleBadgeColor = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'problem_setter':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'contestant':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatRole = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'problem_setter':
        return 'Problem Setter'
      case 'contestant':
        return 'Contestant'
      default:
        return role
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {user.username}
            </h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
          
          <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getRoleBadgeColor(user.role)}`}>
            {formatRole(user.role)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-500 mb-1">Member Since</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(user.createdAt || '')}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Last Updated</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(user.updatedAt || '')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Submission History
        </h2>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-2">
            📊 Submission history coming soon!
          </p>
          <p className="text-sm text-yellow-700">
            This feature requires a backend endpoint to fetch all user submissions.
            Currently, the API only supports fetching submissions by problem ID.
          </p>
        </div>
      </div>
    </div>
  )
}
