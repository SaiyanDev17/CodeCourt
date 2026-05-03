/**
 * Unit Tests for SubmissionResult Component
 * 
 * Tests verify:
 * - Verdict badge is displayed using VerdictBadge component
 * - Execution metrics (time, memory) shown when available
 * - Compiler error displayed for CE verdict in monospace font
 * - Null metrics don't break rendering
 * - Test case results displayed correctly
 * - Proper spacing and layout
 * 
 * **Validates: Requirements 1.5, 1.6, 9.7**
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubmissionResult } from './SubmissionResult'
import type { SubmissionVerdict } from '@/types'

describe('SubmissionResult Component', () => {
  describe('Verdict Badge Display', () => {
    it('should display VerdictBadge component for AC verdict', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
          executionTime={100}
          memoryUsed={2.5}
        />
      )
      
      // VerdictBadge should render "Accepted" text
      expect(screen.getByText('Accepted')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verdict: Accepted')
    })

    it('should display VerdictBadge component for WA verdict', () => {
      render(
        <SubmissionResult
          verdict="WA"
          testCases={[]}
          executionTime={95}
          memoryUsed={1.8}
        />
      )
      
      expect(screen.getByText('Wrong Answer')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Verdict: Wrong Answer')
    })

    it('should display VerdictBadge component for TLE verdict', () => {
      render(
        <SubmissionResult
          verdict="TLE"
          testCases={[]}
          executionTime={null}
          memoryUsed={2.1}
        />
      )
      
      expect(screen.getByText('Time Limit Exceeded')).toBeInTheDocument()
    })

    it('should display VerdictBadge component for CE verdict', () => {
      render(
        <SubmissionResult
          verdict="CE"
          testCases={[]}
          compilerError="error: expected ';' before '}' token"
        />
      )
      
      expect(screen.getByText('Compilation Error')).toBeInTheDocument()
    })

    it('should display VerdictBadge component for PENDING verdict', () => {
      render(
        <SubmissionResult
          verdict="PENDING"
          testCases={[]}
        />
      )
      
      expect(screen.getByText('Judging...')).toBeInTheDocument()
      expect(screen.getByText('Judging your submission...')).toBeInTheDocument()
    })
  })

  describe('Execution Metrics Display', () => {
    it('should display execution time when available', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
          executionTime={123}
          memoryUsed={null}
        />
      )
      
      expect(screen.getByText('Execution Time:')).toBeInTheDocument()
      expect(screen.getByText('123ms')).toBeInTheDocument()
    })

    it('should display memory usage when available', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
          executionTime={null}
          memoryUsed={2.45}
        />
      )
      
      expect(screen.getByText('Memory Used:')).toBeInTheDocument()
      expect(screen.getByText('2.45MB')).toBeInTheDocument()
    })

    it('should display both execution time and memory when available', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
          executionTime={150}
          memoryUsed={3.2}
        />
      )
      
      expect(screen.getByText('Execution Time:')).toBeInTheDocument()
      expect(screen.getByText('150ms')).toBeInTheDocument()
      expect(screen.getByText('Memory Used:')).toBeInTheDocument()
      expect(screen.getByText('3.20MB')).toBeInTheDocument()
    })

    it('should not display metrics section when both are null', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
          executionTime={null}
          memoryUsed={null}
        />
      )
      
      expect(screen.queryByText('Execution Time:')).not.toBeInTheDocument()
      expect(screen.queryByText('Memory Used:')).not.toBeInTheDocument()
    })

    it('should not display metrics section when both are undefined', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
        />
      )
      
      expect(screen.queryByText('Execution Time:')).not.toBeInTheDocument()
      expect(screen.queryByText('Memory Used:')).not.toBeInTheDocument()
    })

    it('should handle zero execution time correctly', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
          executionTime={0}
          memoryUsed={1.5}
        />
      )
      
      expect(screen.getByText('0ms')).toBeInTheDocument()
    })
  })

  describe('Compiler Error Display', () => {
    it('should display compiler error for CE verdict in monospace font', () => {
      const errorMessage = "error: expected ';' before '}' token\n  line 5: int main() {"
      
      render(
        <SubmissionResult
          verdict="CE"
          testCases={[]}
          compilerError={errorMessage}
        />
      )
      
      expect(screen.getByText('Compilation Error:')).toBeInTheDocument()
      
      // Check that error message is displayed (use regex to handle whitespace)
      const errorElement = screen.getByText((content, element) => {
        return element?.tagName === 'PRE' && content.includes("error: expected ';'")
      })
      expect(errorElement).toBeInTheDocument()
      
      // Verify monospace font class is applied
      expect(errorElement).toHaveClass('font-mono')
    })

    it('should not display compiler error section when error is null', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
          compilerError={null}
        />
      )
      
      expect(screen.queryByText('Compilation Error:')).not.toBeInTheDocument()
    })

    it('should not display compiler error section when error is undefined', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
        />
      )
      
      expect(screen.queryByText('Compilation Error:')).not.toBeInTheDocument()
    })

    it('should handle multiline compiler errors', () => {
      const multilineError = `error: expected ';' before '}' token
  line 5: int main() {
  line 10: return 0
           ^
error: expected '}' at end of input`
      
      render(
        <SubmissionResult
          verdict="CE"
          testCases={[]}
          compilerError={multilineError}
        />
      )
      
      const errorElement = screen.getByText((content, element) => {
        return element?.tagName === 'PRE' && content.includes("error: expected ';'")
      })
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveClass('whitespace-pre-wrap')
    })
  })

  describe('Null Metrics Handling', () => {
    it('should render correctly with all null metrics', () => {
      render(
        <SubmissionResult
          verdict="WA"
          testCases={[]}
          executionTime={null}
          memoryUsed={null}
          compilerError={null}
        />
      )
      
      // Should still render verdict badge
      expect(screen.getByText('Wrong Answer')).toBeInTheDocument()
      
      // Should not crash or show undefined/null text
      expect(screen.queryByText('null')).not.toBeInTheDocument()
      expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    })

    it('should render correctly with all undefined metrics', () => {
      render(
        <SubmissionResult
          verdict="RE"
          testCases={[]}
        />
      )
      
      // Should still render verdict badge
      expect(screen.getByText('Runtime Error')).toBeInTheDocument()
      
      // Should not crash or show undefined text
      expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    })
  })

  describe('Test Case Results Display', () => {
    it('should display test case summary when test cases are provided', () => {
      const testCases = [
        { testNumber: 1, passed: true },
        { testNumber: 2, passed: true },
        { testNumber: 3, passed: false },
      ]
      
      render(
        <SubmissionResult
          verdict="WA"
          testCases={testCases}
          executionTime={100}
          memoryUsed={2.0}
        />
      )
      
      expect(screen.getByText('2 / 3 tests passed')).toBeInTheDocument()
    })

    it('should display test case grid when test cases are provided', () => {
      const testCases = [
        { testNumber: 1, passed: true },
        { testNumber: 2, passed: false },
      ]
      
      render(
        <SubmissionResult
          verdict="WA"
          testCases={testCases}
          executionTime={100}
          memoryUsed={2.0}
        />
      )
      
      expect(screen.getByText('Test Cases:')).toBeInTheDocument()
      expect(screen.getByText('Passed')).toBeInTheDocument()
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('should not display test case section when no test cases provided', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
          executionTime={100}
          memoryUsed={2.0}
        />
      )
      
      expect(screen.queryByText('Test Cases:')).not.toBeInTheDocument()
    })
  })

  describe('Layout and Spacing', () => {
    it('should have proper spacing between sections', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[{ testNumber: 1, passed: true }]}
          executionTime={100}
          memoryUsed={2.0}
        />
      )
      
      // Find the main container with space-y-4 class
      const container = screen.getByText('Accepted').closest('div')?.parentElement?.parentElement?.parentElement
      expect(container).toHaveClass('space-y-4')
    })

    it('should render with proper border and padding', () => {
      render(
        <SubmissionResult
          verdict="AC"
          testCases={[]}
          executionTime={100}
          memoryUsed={2.0}
        />
      )
      
      // Verdict section should have border and padding
      const verdictSection = screen.getByText('Accepted').closest('div')?.parentElement?.parentElement
      expect(verdictSection).toHaveClass('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'p-4')
    })
  })

  describe('All Verdict Types', () => {
    const verdicts: SubmissionVerdict[] = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING']
    
    verdicts.forEach((verdict) => {
      it(`should render correctly for ${verdict} verdict`, () => {
        render(
          <SubmissionResult
            verdict={verdict}
            testCases={[]}
            executionTime={verdict !== 'CE' && verdict !== 'PENDING' ? 100 : null}
            memoryUsed={verdict !== 'CE' && verdict !== 'PENDING' ? 2.0 : null}
            compilerError={verdict === 'CE' ? 'Test error' : null}
          />
        )
        
        // Should render without crashing
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })
  })
})
