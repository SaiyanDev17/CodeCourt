/**
 * VerdictBadge Demo Component
 * 
 * Visual demonstration of all VerdictBadge variants.
 * This file can be used for:
 * - Visual testing during development
 * - Documentation/showcase
 * - Quick reference for designers and developers
 * 
 * To view: Import this component in any page and render it
 */

'use client'

import { VerdictBadge } from './VerdictBadge'
import type { SubmissionVerdict } from '@/types'

export function VerdictBadgeDemo() {
  const verdicts: SubmissionVerdict[] = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING']
  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large']

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">VerdictBadge Component Demo</h1>
        <p className="text-gray-600">Visual showcase of all verdict types and sizes</p>
      </div>

      {/* All Verdicts - Medium Size */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Verdict Types (Medium)</h2>
        <div className="flex flex-wrap gap-3">
          {verdicts.map(verdict => (
            <VerdictBadge key={verdict} verdict={verdict} size="medium" />
          ))}
        </div>
      </section>

      {/* Size Comparison */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Size Comparison</h2>
        <div className="space-y-4">
          {sizes.map(size => (
            <div key={size} className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 capitalize">{size}</h3>
              <div className="flex flex-wrap gap-3">
                {verdicts.map(verdict => (
                  <VerdictBadge key={`${verdict}-${size}`} verdict={verdict} size={size} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Usage in Lists */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage in Submission List</h2>
        <div className="space-y-2">
          {[
            { verdict: 'AC' as const, time: 123, memory: 2.1, lang: 'C++' },
            { verdict: 'WA' as const, time: 95, memory: 1.8, lang: 'Python' },
            { verdict: 'TLE' as const, time: 1000, memory: 2.3, lang: 'C++' },
            { verdict: 'MLE' as const, time: 456, memory: 256.5, lang: 'Python' },
            { verdict: 'RE' as const, time: 78, memory: 1.5, lang: 'C++' },
            { verdict: 'CE' as const, time: null, memory: null, lang: 'Python' },
            { verdict: 'PENDING' as const, time: null, memory: null, lang: 'C++' },
          ].map((sub, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <VerdictBadge verdict={sub.verdict} size="small" />
              <span className="font-medium text-gray-700 w-16">{sub.lang}</span>
              {sub.time !== null && (
                <span className="text-sm text-gray-600">{sub.time}ms</span>
              )}
              {sub.memory !== null && (
                <span className="text-sm text-gray-600">{sub.memory}MB</span>
              )}
              <span className="text-xs text-gray-500 ml-auto">2 minutes ago</span>
            </div>
          ))}
        </div>
      </section>

      {/* Usage in Cards */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage in Submission Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { verdict: 'AC' as const, problem: 'Two Sum', time: 123, memory: 2.1 },
            { verdict: 'WA' as const, problem: 'Binary Search', time: 95, memory: 1.8 },
            { verdict: 'TLE' as const, problem: 'Merge Sort', time: 1000, memory: 2.3 },
          ].map((sub, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{sub.problem}</h3>
                <VerdictBadge verdict={sub.verdict} size="small" />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>C++</span>
                <span>{sub.time}ms</span>
                <span>{sub.memory}MB</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">Submitted 5 minutes ago</div>
            </div>
          ))}
        </div>
      </section>

      {/* Inline Usage */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Inline Usage in Text</h2>
        <div className="space-y-3 text-gray-700">
          <p>
            Your submission received verdict <VerdictBadge verdict="AC" size="small" /> and
            executed in 123ms.
          </p>
          <p>
            The previous attempt got <VerdictBadge verdict="WA" size="small" /> on test case 5.
          </p>
          <p>
            Your code is currently <VerdictBadge verdict="PENDING" size="small" /> and will be
            judged shortly.
          </p>
        </div>
      </section>

      {/* Accessibility Note */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Accessibility Features</h2>
        <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
          <li>All badges have <code className="bg-blue-100 px-1 rounded">role="status"</code> for screen readers</li>
          <li>Each badge includes descriptive <code className="bg-blue-100 px-1 rounded">aria-label</code></li>
          <li>Icons have <code className="bg-blue-100 px-1 rounded">aria-hidden="true"</code> to prevent duplication</li>
          <li>Color is not the only indicator (icons + text provide redundancy)</li>
          <li>PENDING state uses animation to indicate active processing</li>
        </ul>
      </section>
    </div>
  )
}
