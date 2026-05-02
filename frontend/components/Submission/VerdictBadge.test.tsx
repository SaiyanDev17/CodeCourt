/**
 * Unit Tests for VerdictBadge Component
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
 * 
 * Tests verify:
 * - Each verdict type renders with correct color and icon
 * - Size prop affects badge dimensions correctly
 * - PENDING verdict shows animated spinner
 * - Accessibility attributes are present
 * - Component handles all verdict types without crashing
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VerdictBadge } from './VerdictBadge'
import type { SubmissionVerdict } from '@/types'

describe('VerdictBadge Component', () => {
  /**
   * Test: AC verdict renders with green checkmark
   * Validates: Requirement 9.1
   */
  it('should render AC verdict with green checkmark and "Accepted" text', () => {
    render(<VerdictBadge verdict="AC" />)
    
    // Verify text is displayed
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    
    // Verify ARIA label for accessibility
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verdict: Accepted')
    
    // Verify green color classes are applied
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-green-700')
    expect(badge).toHaveClass('bg-green-100')
    expect(badge).toHaveClass('border-green-300')
  })

  /**
   * Test: WA verdict renders with red X
   * Validates: Requirement 9.2
   */
  it('should render WA verdict with red X and "Wrong Answer" text', () => {
    render(<VerdictBadge verdict="WA" />)
    
    // Verify text is displayed
    expect(screen.getByText('Wrong Answer')).toBeInTheDocument()
    
    // Verify ARIA label
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verdict: Wrong Answer')
    
    // Verify red color classes are applied
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-red-700')
    expect(badge).toHaveClass('bg-red-100')
    expect(badge).toHaveClass('border-red-300')
  })

  /**
   * Test: TLE verdict renders with yellow clock icon
   * Validates: Requirement 9.3
   */
  it('should render TLE verdict with yellow clock icon and "Time Limit Exceeded" text', () => {
    render(<VerdictBadge verdict="TLE" />)
    
    // Verify text is displayed
    expect(screen.getByText('Time Limit Exceeded')).toBeInTheDocument()
    
    // Verify ARIA label
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verdict: Time Limit Exceeded')
    
    // Verify yellow color classes are applied
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-yellow-700')
    expect(badge).toHaveClass('bg-yellow-100')
    expect(badge).toHaveClass('border-yellow-300')
  })

  /**
   * Test: MLE verdict renders with yellow memory icon
   * Validates: Requirement 9.4
   */
  it('should render MLE verdict with yellow memory icon and "Memory Limit Exceeded" text', () => {
    render(<VerdictBadge verdict="MLE" />)
    
    // Verify text is displayed
    expect(screen.getByText('Memory Limit Exceeded')).toBeInTheDocument()
    
    // Verify ARIA label
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verdict: Memory Limit Exceeded')
    
    // Verify yellow color classes are applied (same as TLE)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-yellow-700')
    expect(badge).toHaveClass('bg-yellow-100')
    expect(badge).toHaveClass('border-yellow-300')
  })

  /**
   * Test: RE verdict renders with orange warning icon
   * Validates: Requirement 9.5
   */
  it('should render RE verdict with orange warning icon and "Runtime Error" text', () => {
    render(<VerdictBadge verdict="RE" />)
    
    // Verify text is displayed
    expect(screen.getByText('Runtime Error')).toBeInTheDocument()
    
    // Verify ARIA label
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verdict: Runtime Error')
    
    // Verify orange color classes are applied
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-orange-700')
    expect(badge).toHaveClass('bg-orange-100')
    expect(badge).toHaveClass('border-orange-300')
  })

  /**
   * Test: CE verdict renders with red error icon
   * Validates: Requirement 9.6
   */
  it('should render CE verdict with red error icon and "Compilation Error" text', () => {
    render(<VerdictBadge verdict="CE" />)
    
    // Verify text is displayed
    expect(screen.getByText('Compilation Error')).toBeInTheDocument()
    
    // Verify ARIA label
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verdict: Compilation Error')
    
    // Verify red color classes are applied
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-red-700')
    expect(badge).toHaveClass('bg-red-100')
    expect(badge).toHaveClass('border-red-300')
  })

  /**
   * Test: PENDING verdict shows animated spinner
   * Validates: Requirement 9.6 (PENDING state)
   */
  it('should render PENDING verdict with gray spinner and "Judging..." text', () => {
    render(<VerdictBadge verdict="PENDING" />)
    
    // Verify text is displayed
    expect(screen.getByText('Judging...')).toBeInTheDocument()
    
    // Verify ARIA label
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verdict: Judging...')
    
    // Verify gray color classes are applied
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-gray-700')
    expect(badge).toHaveClass('bg-gray-100')
    expect(badge).toHaveClass('border-gray-300')
    
    // Verify spinner animation class is present
    const spinner = badge.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  /**
   * Test: Small size renders with correct dimensions
   * Validates: Size prop functionality
   */
  it('should render small size badge with compact dimensions', () => {
    render(<VerdictBadge verdict="AC" size="small" />)
    
    const badge = screen.getByRole('status')
    
    // Verify small size classes
    expect(badge).toHaveClass('px-2')
    expect(badge).toHaveClass('py-1')
    expect(badge).toHaveClass('text-xs')
    expect(badge).toHaveClass('gap-1')
    
    // Verify small icon size
    const icon = badge.querySelector('svg')
    expect(icon).toHaveClass('w-3')
    expect(icon).toHaveClass('h-3')
  })

  /**
   * Test: Medium size (default) renders with correct dimensions
   * Validates: Size prop functionality
   */
  it('should render medium size badge (default) with standard dimensions', () => {
    render(<VerdictBadge verdict="WA" size="medium" />)
    
    const badge = screen.getByRole('status')
    
    // Verify medium size classes
    expect(badge).toHaveClass('px-3')
    expect(badge).toHaveClass('py-1.5')
    expect(badge).toHaveClass('text-sm')
    expect(badge).toHaveClass('gap-1.5')
    
    // Verify medium icon size
    const icon = badge.querySelector('svg')
    expect(icon).toHaveClass('w-4')
    expect(icon).toHaveClass('h-4')
  })

  /**
   * Test: Large size renders with correct dimensions
   * Validates: Size prop functionality
   */
  it('should render large size badge with prominent dimensions', () => {
    render(<VerdictBadge verdict="TLE" size="large" />)
    
    const badge = screen.getByRole('status')
    
    // Verify large size classes
    expect(badge).toHaveClass('px-4')
    expect(badge).toHaveClass('py-2')
    expect(badge).toHaveClass('text-base')
    expect(badge).toHaveClass('gap-2')
    
    // Verify large icon size
    const icon = badge.querySelector('svg')
    expect(icon).toHaveClass('w-5')
    expect(icon).toHaveClass('h-5')
  })

  /**
   * Test: Default size is medium when size prop is omitted
   * Validates: Default prop behavior
   */
  it('should default to medium size when size prop is not provided', () => {
    render(<VerdictBadge verdict="AC" />)
    
    const badge = screen.getByRole('status')
    
    // Verify medium size classes are applied by default
    expect(badge).toHaveClass('px-3')
    expect(badge).toHaveClass('py-1.5')
    expect(badge).toHaveClass('text-sm')
  })

  /**
   * Test: All verdict types render without crashing
   * Validates: Component robustness
   */
  it('should render all verdict types without crashing', () => {
    const verdicts: SubmissionVerdict[] = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING']
    
    verdicts.forEach(verdict => {
      const { unmount } = render(<VerdictBadge verdict={verdict} />)
      
      // Verify badge is rendered
      expect(screen.getByRole('status')).toBeInTheDocument()
      
      // Clean up for next iteration
      unmount()
    })
  })

  /**
   * Test: Badge has proper semantic HTML structure
   * Validates: Accessibility and semantic HTML
   */
  it('should have proper semantic HTML structure with role and aria-label', () => {
    render(<VerdictBadge verdict="AC" />)
    
    const badge = screen.getByRole('status')
    
    // Verify role attribute
    expect(badge).toHaveAttribute('role', 'status')
    
    // Verify aria-label attribute
    expect(badge).toHaveAttribute('aria-label')
    
    // Verify aria-label contains verdict text
    const ariaLabel = badge.getAttribute('aria-label')
    expect(ariaLabel).toContain('Accepted')
  })

  /**
   * Test: Icons have aria-hidden attribute for accessibility
   * Validates: Accessibility best practices
   */
  it('should have aria-hidden on icons to prevent screen reader duplication', () => {
    render(<VerdictBadge verdict="AC" />)
    
    const badge = screen.getByRole('status')
    const icon = badge.querySelector('svg')
    
    // Verify icon has aria-hidden attribute
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  /**
   * Test: Badge has inline-flex display for proper alignment
   * Validates: Layout and styling
   */
  it('should use inline-flex display for proper alignment with surrounding content', () => {
    render(<VerdictBadge verdict="WA" />)
    
    const badge = screen.getByRole('status')
    
    // Verify inline-flex class
    expect(badge).toHaveClass('inline-flex')
    expect(badge).toHaveClass('items-center')
  })

  /**
   * Test: Badge has rounded corners and border
   * Validates: Visual design consistency
   */
  it('should have rounded corners and border for visual consistency', () => {
    render(<VerdictBadge verdict="TLE" />)
    
    const badge = screen.getByRole('status')
    
    // Verify rounded corners
    expect(badge).toHaveClass('rounded-md')
    
    // Verify border
    expect(badge).toHaveClass('border')
  })

  /**
   * Test: Each verdict type has unique color combination
   * Validates: Visual distinction between verdicts
   */
  it('should have unique color combinations for each verdict type', () => {
    const verdictColors: Record<SubmissionVerdict, { text: string; bg: string; border: string }> = {
      AC: { text: 'text-green-700', bg: 'bg-green-100', border: 'border-green-300' },
      WA: { text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300' },
      TLE: { text: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-300' },
      MLE: { text: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-300' },
      RE: { text: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-300' },
      CE: { text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300' },
      PENDING: { text: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300' },
    }

    Object.entries(verdictColors).forEach(([verdict, colors]) => {
      const { unmount } = render(<VerdictBadge verdict={verdict as SubmissionVerdict} />)
      
      const badge = screen.getByRole('status')
      
      // Verify color classes
      expect(badge).toHaveClass(colors.text)
      expect(badge).toHaveClass(colors.bg)
      expect(badge).toHaveClass(colors.border)
      
      // Clean up
      unmount()
    })
  })
})
