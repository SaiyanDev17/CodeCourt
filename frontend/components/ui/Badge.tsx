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
  AC:      'bg-emerald-500/15  text-emerald-300 border border-emerald-400/35',
  WA:      'bg-red-500/15      text-red-300 border border-red-400/35',
  TLE:     'bg-amber-500/15    text-amber-300 border border-amber-400/35',
  MLE:     'bg-orange-500/15   text-orange-300 border border-orange-400/35',
  RE:      'bg-purple-500/15   text-purple-300 border border-purple-400/35',
  CE:      'bg-pink-500/15     text-pink-300 border border-pink-400/35',
  PENDING: 'bg-slate-500/20    text-slate-300 border border-slate-400/35',

  // ── Difficulty ───────────────────────────────────────────────
  easy:   'bg-emerald-500/15 text-emerald-300 border border-emerald-400/35',
  medium: 'bg-amber-500/15   text-amber-300 border border-amber-400/35',
  hard:   'bg-rose-500/15    text-rose-300 border border-rose-400/35',

  // ── Contest status ───────────────────────────────────────────
  upcoming: 'bg-blue-500/15  text-blue-300 border border-blue-400/35',
  ongoing:  'bg-cyan-500/15  text-cyan-300 border border-cyan-400/35',
  ended:    'bg-slate-500/20 text-slate-300 border border-slate-400/35',

  // ── Fallback ─────────────────────────────────────────────────
  default: 'bg-slate-500/20 text-slate-200 border border-slate-400/35',
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
          'inline-flex items-center justify-center rounded-full font-semibold tracking-wide backdrop-blur-sm',
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
