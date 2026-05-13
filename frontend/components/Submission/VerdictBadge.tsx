/**
 * VerdictBadge Component
 * 
 * A reusable component for displaying submission verdicts with color-coded badges and icons.
 * Used in submission history lists, submission detail views, and anywhere verdicts need to be displayed.
 * 
 * Features:
 * - Color-coded badges for each verdict type (AC=green, WA=red, TLE=yellow, etc.)
 * - Appropriate icons for each verdict (checkmark, X, clock, memory, warning, error, spinner)
 * - Supports three sizes: small, medium (default), large
 * - Animated spinner for PENDING state
 * - Accessible with proper ARIA labels
 * 
 * Design Principles:
 * - Uses complete Tailwind class names (not dynamic) for JIT compiler compatibility
 * - Uses clsx for conditional class logic
 * - Follows existing SubmissionResult component patterns
 * - Responsive and mobile-friendly
 */

'use client'

import { clsx } from 'clsx'
import type { SubmissionVerdict } from '@/types'

/**
 * VerdictBadge Props
 */
interface VerdictBadgeProps {
  /**
   * The submission verdict to display
   */
  verdict: SubmissionVerdict
  
  /**
   * Badge size variant
   * - small: Compact badge for dense lists
   * - medium: Default size for most contexts
   * - large: Prominent badge for headers/featured content
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
}

/**
 * Get verdict display text
 */
function getVerdictText(verdict: SubmissionVerdict): string {
  const verdictMap: Record<SubmissionVerdict, string> = {
    AC: 'Accepted',
    WA: 'Wrong Answer',
    TLE: 'Time Limit Exceeded',
    MLE: 'Memory Limit Exceeded',
    RE: 'Runtime Error',
    CE: 'Compilation Error',
    PENDING: 'Judging...',
  }
  return verdictMap[verdict]
}

/**
 * Get verdict color classes based on verdict type
 */
function getVerdictColorClasses(verdict: SubmissionVerdict): string {
  return clsx(
    'font-semibold',
    verdict === 'AC' && 'text-emerald-300 bg-emerald-500/15 border-emerald-400/35',
    verdict === 'WA' && 'text-red-300 bg-red-500/15 border-red-400/35',
    verdict === 'TLE' && 'text-amber-300 bg-amber-500/15 border-amber-400/35',
    verdict === 'MLE' && 'text-amber-300 bg-amber-500/15 border-amber-400/35',
    verdict === 'RE' && 'text-orange-300 bg-orange-500/15 border-orange-400/35',
    verdict === 'CE' && 'text-red-300 bg-red-500/15 border-red-400/35',
    verdict === 'PENDING' && 'text-slate-300 bg-slate-500/20 border-slate-400/35'
  )
}

/**
 * Get size-specific classes
 */
function getSizeClasses(size: 'small' | 'medium' | 'large'): string {
  return clsx(
    size === 'small' && 'px-2 py-1 text-xs gap-1',
    size === 'medium' && 'px-3 py-1.5 text-sm gap-1.5',
    size === 'large' && 'px-4 py-2 text-base gap-2'
  )
}

/**
 * Get icon size classes
 */
function getIconSizeClasses(size: 'small' | 'medium' | 'large'): string {
  return clsx(
    size === 'small' && 'w-3 h-3',
    size === 'medium' && 'w-4 h-4',
    size === 'large' && 'w-5 h-5'
  )
}

/**
 * Checkmark Icon (for AC)
 */
function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}

/**
 * X Icon (for WA)
 */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

/**
 * Clock Icon (for TLE)
 */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

/**
 * Memory Icon (for MLE)
 */
function MemoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      />
    </svg>
  )
}

/**
 * Warning Icon (for RE)
 */
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

/**
 * Error Icon (for CE)
 */
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

/**
 * Spinner Icon (for PENDING)
 */
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={clsx(className, 'animate-spin')}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * Get icon component for verdict
 */
function getVerdictIcon(verdict: SubmissionVerdict, iconClassName: string) {
  switch (verdict) {
    case 'AC':
      return <CheckmarkIcon className={iconClassName} />
    case 'WA':
      return <XIcon className={iconClassName} />
    case 'TLE':
      return <ClockIcon className={iconClassName} />
    case 'MLE':
      return <MemoryIcon className={iconClassName} />
    case 'RE':
      return <WarningIcon className={iconClassName} />
    case 'CE':
      return <ErrorIcon className={iconClassName} />
    case 'PENDING':
      return <SpinnerIcon className={iconClassName} />
    default:
      return null
  }
}

/**
 * VerdictBadge Component
 */
export function VerdictBadge({ verdict, size = 'medium' }: VerdictBadgeProps) {
  const iconClassName = getIconSizeClasses(size)
  
  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-md border',
        'backdrop-blur-sm',
        getVerdictColorClasses(verdict),
        getSizeClasses(size)
      )}
      role="status"
      aria-label={`Verdict: ${getVerdictText(verdict)}`}
    >
      {getVerdictIcon(verdict, iconClassName)}
      <span>{getVerdictText(verdict)}</span>
    </div>
  )
}

/**
 * USAGE EXAMPLES:
 * 
 * ```tsx
 * import { VerdictBadge } from '@/components/Submission/VerdictBadge'
 * 
 * // Default medium size
 * <VerdictBadge verdict="AC" />
 * 
 * // Small size for compact lists
 * <VerdictBadge verdict="WA" size="small" />
 * 
 * // Large size for headers
 * <VerdictBadge verdict="TLE" size="large" />
 * 
 * // In a submission list
 * {submissions.map(sub => (
 *   <div key={sub._id} className="flex items-center gap-3">
 *     <VerdictBadge verdict={sub.verdict} size="small" />
 *     <span>{sub.language}</span>
 *     <span>{sub.executionTime}ms</span>
 *   </div>
 * ))}
 * ```
 */
