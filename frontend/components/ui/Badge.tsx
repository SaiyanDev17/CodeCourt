import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type BadgeVariant =
  // Judge verdicts
  | 'AC'
  | 'WA'
  | 'TLE'
  | 'MLE'
  | 'RE'
  | 'CE'
  | 'PENDING'
  // Difficulty
  | 'easy'
  | 'medium'
  | 'hard'
  // Contest status
  | 'upcoming'
  | 'ongoing'
  | 'ended'
  // Fallback
  | 'default'

export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** The variant key — maps to a color scheme */
  variant?: BadgeVariant | string
  size?: BadgeSize
}

/**
 * Maps variant keys to Tailwind background + text color pairs.
 * Direct key lookup keeps this O(1) and easy to extend.
 */
const variantStyles: Record<string, string> = {
  // ── Judge verdicts ──────────────────────────────────────────
  AC:      'bg-green-100  text-green-800',
  WA:      'bg-red-100    text-red-800',
  TLE:     'bg-yellow-100 text-yellow-800',
  MLE:     'bg-orange-100 text-orange-800',
  RE:      'bg-purple-100 text-purple-800',
  CE:      'bg-pink-100   text-pink-800',
  PENDING: 'bg-gray-100   text-gray-500',

  // ── Difficulty ───────────────────────────────────────────────
  easy:   'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100   text-amber-800',
  hard:   'bg-rose-100    text-rose-800',

  // ── Contest status ───────────────────────────────────────────
  upcoming: 'bg-blue-100  text-blue-800',
  ongoing:  'bg-green-100 text-green-800',
  ended:    'bg-gray-100  text-gray-600',

  // ── Fallback ─────────────────────────────────────────────────
  default: 'bg-gray-100 text-gray-700',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

/**
 * Reusable Badge component for verdicts, difficulty levels, and contest status.
 *
 * @example
 * <Badge variant="AC" />
 * <Badge variant="WA">Wrong Answer</Badge>
 * <Badge variant="hard" size="md" />
 */
export default function Badge({
  variant = 'default',
  size = 'sm',
  className,
  children,
  ...props
}: BadgeProps) {
  const colorClasses = variantStyles[variant] ?? variantStyles.default

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center rounded-full font-semibold tracking-wide',
          colorClasses,
          sizeClasses[size],
          className
        )
      )}
      {...props}
    >
      {children ?? variant}
    </span>
  )
}
