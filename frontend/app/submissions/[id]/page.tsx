'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { VerdictBadge } from '@/components/Submission/VerdictBadge'
import type { Submission } from '@/types'

export default function SubmissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/submissions/${id}`)
        setSubmission(response.data.submission || response.data)
      } catch (err: any) {
        console.error('Failed to fetch submission:', err)
        setError(err.response?.data?.message || 'Failed to load submission')
      } finally {
        setLoading(false)
      }
    }
    
    fetchSubmission()
  }, [id])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading submission...</p>
        </div>
      </div>
    )
  }
  
  if (error || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Submission not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Submission Details</h1>
        </div>
        
        {/* Verdict Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Verdict</h2>
          <div className="flex items-center gap-4 mb-4">
            <VerdictBadge verdict={submission.verdict} size="large" />
          </div>
          
          {/* Execution Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-600">Language</p>
              <p className="text-lg font-semibold text-gray-900">{submission.language.toUpperCase()}</p>
            </div>
            
            {submission.executionTime !== null && submission.executionTime !== undefined && (
              <div>
                <p className="text-sm font-medium text-gray-600">Execution Time</p>
                <p className="text-lg font-semibold text-gray-900">{submission.executionTime}ms</p>
              </div>
            )}
            
            {submission.memoryUsed !== null && submission.memoryUsed !== undefined && (
              <div>
                <p className="text-sm font-medium text-gray-600">Memory Used</p>
                <p className="text-lg font-semibold text-gray-900">{submission.memoryUsed.toFixed(2)}MB</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Compiler Error */}
        {submission.compilerError && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-red-700 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Compiler Error
            </h2>
            <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono bg-white p-4 rounded border border-red-100 overflow-x-auto">
              {submission.compilerError}
            </pre>
          </div>
        )}
        
        {/* Submitted Code */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Submitted Code</h2>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>{submission.code}</code>
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(submission.code)
                alert('Code copied to clipboard!')
              }}
              className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
        
        {/* Metadata */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Metadata</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-600">Submission ID</dt>
              <dd className="text-sm text-gray-900 font-mono mt-1">{submission._id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Submitted At</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {new Date(submission.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Problem ID</dt>
              <dd className="text-sm text-gray-900 font-mono mt-1">{submission.problemId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">User ID</dt>
              <dd className="text-sm text-gray-900 font-mono mt-1">{submission.userId}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
