import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Controls the color scheme of the button */
  variant?: ButtonVariant
  /** Controls the size of the button */
  size?: ButtonSize
  /** Shows a loading spinner and disables the button */
  isLoading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:from-cyan-300 hover:to-blue-400 focus:ring-cyan-400 shadow-[0_8px_24px_rgba(34,211,238,0.3)]',
  secondary:
    'bg-slate-800 text-slate-100 hover:bg-slate-700 focus:ring-slate-400 border border-slate-600',
  danger:
    'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-400 hover:to-rose-500 focus:ring-red-400',
  ghost:
    'bg-transparent text-slate-200 hover:bg-slate-800 focus:ring-cyan-500 border border-slate-600/80',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

/**
 * Reusable Button component with variant, size, loading, and disabled support.
 * Forwards refs to the underlying <button> element.
 *
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>Submit</Button>
 * <Button variant="danger" isLoading={submitting}>Delete</Button>
 * <Button variant="ghost" size="sm" disabled>Unavailable</Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={twMerge(
          clsx(
            // Base styles
            'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
            'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950',
            'hover:scale-[1.01] active:scale-[0.99]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Variant
            variantClasses[variant],
            // Size
            sizeClasses[size],
            // Consumer overrides
            className
          )
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
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
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
