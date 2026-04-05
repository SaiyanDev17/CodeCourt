'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import ProblemCard from '@/components/Problem/ProblemCard'
import { Problem } from '@/types'

export default function ProblemsPage() {
  // State management for async data fetching
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch problems when component mounts
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Call GET /api/problems using our configured Axios instance
        // The api instance automatically attaches the Bearer token
        const response = await api.get('/problems')
        
        // Update state with the fetched problems
        // Extract the problems array from the response object { count, problems }
        setProblems(response.data.problems)
      } catch (err: any) {
        // Handle errors (network issues, 500 errors, etc.)
        setError(err.response?.data?.message || 'Failed to load problems')
      } finally {
        // Always set loading to false, whether success or error
        setLoading(false)
      }
    }

    fetchProblems()
  }, []) // Empty dependency array = run only once on mount

  // Loading state: Show spinner while fetching
  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Problems</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Error state: Show error message with retry button
  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Problems</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Success state: Render the problem grid
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Problems</h1>
      
      {problems.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No problems available yet. Check back soon!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((problem) => (
            // Key prop is required for React to track list items efficiently
            // Using problem.id ensures each key is unique and stable
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      )}
    </div>
  )
}
