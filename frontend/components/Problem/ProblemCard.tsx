import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { Problem } from '@/types'

interface ProblemCardProps {
  problem: Problem
}

/**
 * Reusable Problem Card component
 * Displays a problem's title and difficulty, links to the problem detail page
 */
export default function ProblemCard({ problem }: ProblemCardProps) {
  return (
    <Link
      href={`/problems/${problem.slug}`}
      className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
          {problem.title}
        </h3>
        <Badge variant={problem.difficulty} size="sm" />
      </div>
      
      <p className="mt-2 text-sm text-gray-500">
        Time: {problem.timeLimit}ms | Memory: {problem.memoryLimit}MB
      </p>
    </Link>
  )
}
