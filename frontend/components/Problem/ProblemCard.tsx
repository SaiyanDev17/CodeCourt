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
      className="glass-panel glass-panel-hover block rounded-2xl p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-100 hover:text-cyan-300 transition-colors">
          {problem.title}
        </h3>
        <Badge variant={problem.difficulty} size="sm" />
      </div>
      
      <p className="mt-2 text-sm text-slate-400">
        Time: {problem.timeLimit}ms | Memory: {problem.memoryLimit}MB
      </p>
    </Link>
  )
}
