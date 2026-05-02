/**
 * Tests for AllSubmissionsPage Component
 * 
 * Tests the all submissions page functionality including:
 * - Loading state display
 * - Empty state when no submissions exist
 * - Submission list rendering with all required fields
 * - Verdict filter functionality
 * - Filtered submission count display
 * - Error handling
 * - API integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AllSubmissionsPage from './page'
import api from '@/lib/api'

// Mock the API module
vi.mock('@/lib/api')

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock VerdictBadge component
vi.mock('@/components/Submission/VerdictBadge', () => ({
  VerdictBadge: ({ verdict, size }: { verdict: string; size: string }) => (
    <div data-testid="verdict-badge" data-verdict={verdict} data-size={size}>
      {verdict}
    </div>
  ),
}))

describe('AllSubmissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading spinner while fetching submissions', () => {
      // Mock API to never resolve (simulates loading state)
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))

      render(<AllSubmissionsPage />)

      // Check for loading spinner
      const spinner = screen.getByRole('status', { hidden: true })
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('animate-spin')
    })
  })

  describe('Empty State', () => {
    it('should display "No submissions found" when submissions array is empty', async () => {
      // Mock API to return empty submissions
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 0,
          submissions: [],
        },
      } as any)

      render(<AllSubmissionsPage />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check for empty state message
      expect(screen.getByText('No submissions found')).toBeInTheDocument()
      expect(
        screen.getByText('Submit solutions to problems to see your submission history here')
      ).toBeInTheDocument()
    })
  })

  describe('Submissions List', () => {
    it('should render all submissions with required fields', async () => {
      // Mock API to return sample submissions
      const mockSubmissions = [
        {
          _id: 'sub1',
          verdict: 'AC',
          executionTime: 123,
          memoryUsed: 2.5,
          language: 'cpp',
          createdAt: '2024-01-15T10:30:00.000Z',
          problemId: 'prob1',
          problemTitle: 'Two Sum',
          problemSlug: 'two-sum',
        },
        {
          _id: 'sub2',
          verdict: 'WA',
          executionTime: 95,
          memoryUsed: 1.8,
          language: 'python',
          createdAt: '2024-01-14T09:20:00.000Z',
          problemId: 'prob2',
          problemTitle: 'Binary Search',
          problemSlug: 'binary-search',
        },
      ]

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 2,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      // Wait for submissions to load
      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check page title
      expect(screen.getByText('All Submissions')).toBeInTheDocument()

      // Check first submission
      expect(screen.getByText('Two Sum')).toBeInTheDocument()
      expect(screen.getByText('CPP')).toBeInTheDocument() // Language uppercase
      expect(screen.getByText('123ms')).toBeInTheDocument()
      expect(screen.getByText('2.50MB')).toBeInTheDocument()

      // Check second submission
      expect(screen.getByText('Binary Search')).toBeInTheDocument()
      expect(screen.getByText('PYTHON')).toBeInTheDocument() // Language uppercase
      expect(screen.getByText('95ms')).toBeInTheDocument()
      expect(screen.getByText('1.80MB')).toBeInTheDocument()

      // Check verdict badges
      const verdictBadges = screen.getAllByTestId('verdict-badge')
      expect(verdictBadges).toHaveLength(2)
      expect(verdictBadges[0]).toHaveAttribute('data-verdict', 'AC')
      expect(verdictBadges[0]).toHaveAttribute('data-size', 'large')
      expect(verdictBadges[1]).toHaveAttribute('data-verdict', 'WA')
      expect(verdictBadges[1]).toHaveAttribute('data-size', 'large')
    })

    it('should render submission without execution metrics when null', async () => {
      // Mock submission with null metrics
      const mockSubmissions = [
        {
          _id: 'sub1',
          verdict: 'CE',
          executionTime: null,
          memoryUsed: null,
          language: 'cpp',
          createdAt: '2024-01-15T10:30:00.000Z',
          problemId: 'prob1',
          problemTitle: 'Test Problem',
          problemSlug: 'test-problem',
        },
      ]

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check that problem title and language are displayed
      expect(screen.getByText('Test Problem')).toBeInTheDocument()
      expect(screen.getByText('CPP')).toBeInTheDocument()

      // Check that execution metrics are NOT displayed
      expect(screen.queryByText(/ms$/)).not.toBeInTheDocument()
      expect(screen.queryByText(/MB$/)).not.toBeInTheDocument()
    })

    it('should link to problem page with correct slug', async () => {
      const mockSubmissions = [
        {
          _id: 'sub1',
          verdict: 'AC',
          executionTime: 100,
          memoryUsed: 2.0,
          language: 'cpp',
          createdAt: '2024-01-15T10:30:00.000Z',
          problemId: 'prob1',
          problemTitle: 'Two Sum',
          problemSlug: 'two-sum',
        },
      ]

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check that link has correct href
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/problems/two-sum')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      // Mock API to reject with error
      vi.mocked(api.get).mockRejectedValue({
        response: {
          data: {
            message: 'Failed to fetch submissions',
          },
        },
      })

      render(<AllSubmissionsPage />)

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check for error message
      expect(screen.getByText('Failed to fetch submissions')).toBeInTheDocument()
    })

    it('should display generic error message when no error message in response', async () => {
      // Mock API to reject without specific error message
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check for generic error message
      expect(screen.getByText('Failed to load submissions')).toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    it('should call GET /api/submissions on mount', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 0,
          submissions: [],
        },
      } as any)

      render(<AllSubmissionsPage />)

      // Wait for API call
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/submissions')
      })
    })
  })

  describe('Timestamp Formatting', () => {
    it('should format timestamps in readable format', async () => {
      const mockSubmissions = [
        {
          _id: 'sub1',
          verdict: 'AC',
          executionTime: 100,
          memoryUsed: 2.0,
          language: 'cpp',
          createdAt: '2024-01-15T10:30:00.000Z',
          problemId: 'prob1',
          problemTitle: 'Test Problem',
          problemSlug: 'test-problem',
        },
      ]

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check that timestamp is formatted (exact format depends on locale)
      // Just verify it contains expected parts
      const timestampElement = screen.getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
      expect(timestampElement).toBeInTheDocument()
    })
  })

  describe('Verdict Filter', () => {
    it('should display filter dropdown with all verdict options', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 0,
          submissions: [],
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check filter dropdown exists
      const filterSelect = screen.getByLabelText('Filter:')
      expect(filterSelect).toBeInTheDocument()

      // Check all options are present
      expect(screen.getByRole('option', { name: 'All Verdicts' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Accepted' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Wrong Answer' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Time Limit Exceeded' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Memory Limit Exceeded' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Runtime Error' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Compilation Error' })).toBeInTheDocument()
    })

    it('should filter submissions by AC verdict', async () => {
      const user = userEvent.setup()
      const mockSubmissions = [
        {
          _id: 'sub1',
          verdict: 'AC',
          executionTime: 123,
          memoryUsed: 2.5,
          language: 'cpp',
          createdAt: '2024-01-15T10:30:00.000Z',
          problemId: 'prob1',
          problemTitle: 'Two Sum',
          problemSlug: 'two-sum',
        },
        {
          _id: 'sub2',
          verdict: 'WA',
          executionTime: 95,
          memoryUsed: 1.8,
          language: 'python',
          createdAt: '2024-01-14T09:20:00.000Z',
          problemId: 'prob2',
          problemTitle: 'Binary Search',
          problemSlug: 'binary-search',
        },
        {
          _id: 'sub3',
          verdict: 'AC',
          executionTime: 150,
          memoryUsed: 3.0,
          language: 'cpp',
          createdAt: '2024-01-13T08:10:00.000Z',
          problemId: 'prob3',
          problemTitle: 'Merge Sort',
          problemSlug: 'merge-sort',
        },
      ]

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 3,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Initially all submissions should be visible
      expect(screen.getByText('Two Sum')).toBeInTheDocument()
      expect(screen.getByText('Binary Search')).toBeInTheDocument()
      expect(screen.getByText('Merge Sort')).toBeInTheDocument()
      expect(screen.getByText('Showing 3 of 3 submissions')).toBeInTheDocument()

      // Select AC filter
      const filterSelect = screen.getByLabelText('Filter:')
      await user.selectOptions(filterSelect, 'AC')

      // Only AC submissions should be visible
      expect(screen.getByText('Two Sum')).toBeInTheDocument()
      expect(screen.queryByText('Binary Search')).not.toBeInTheDocument()
      expect(screen.getByText('Merge Sort')).toBeInTheDocument()
      expect(screen.getByText('Showing 2 of 3 submissions')).toBeInTheDocument()
    })

    it('should filter submissions by WA verdict', async () => {
      const user = userEvent.setup()
      const mockSubmissions = [
        {
          _id: 'sub1',
          verdict: 'AC',
          executionTime: 123,
          memoryUsed: 2.5,
          language: 'cpp',
          createdAt: '2024-01-15T10:30:00.000Z',
          problemId: 'prob1',
          problemTitle: 'Two Sum',
          problemSlug: 'two-sum',
        },
        {
          _id: 'sub2',
          verdict: 'WA',
          executionTime: 95,
          memoryUsed: 1.8,
          language: 'python',
          createdAt: '2024-01-14T09:20:00.000Z',
          problemId: 'prob2',
          problemTitle: 'Binary Search',
          problemSlug: 'binary-search',
        },
      ]

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 2,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Select WA filter
      const filterSelect = screen.getByLabelText('Filter:')
      await user.selectOptions(filterSelect, 'WA')

      // Only WA submission should be visible
      expect(screen.queryByText('Two Sum')).not.toBeInTheDocument()
      expect(screen.getByText('Binary Search')).toBeInTheDocument()
      expect(screen.getByText('Showing 1 of 2 submissions')).toBeInTheDocument()
    })

    it('should show "No [verdict] submissions found" when filter has no matches', async () => {
      const user = userEvent.setup()
      const mockSubmissions = [
        {
          _id: 'sub1',
          verdict: 'AC',
          executionTime: 123,
          memoryUsed: 2.5,
          language: 'cpp',
          createdAt: '2024-01-15T10:30:00.000Z',
          problemId: 'prob1',
          problemTitle: 'Two Sum',
          problemSlug: 'two-sum',
        },
      ]

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Select TLE filter (no TLE submissions exist)
      const filterSelect = screen.getByLabelText('Filter:')
      await user.selectOptions(filterSelect, 'TLE')

      // Should show no TLE submissions message
      expect(screen.getByText('No TLE submissions found')).toBeInTheDocument()
      expect(screen.queryByText('Two Sum')).not.toBeInTheDocument()
    })

    it('should reset to all submissions when "All Verdicts" is selected', async () => {
      const user = userEvent.setup()
      const mockSubmissions = [
        {
          _id: 'sub1',
          verdict: 'AC',
          executionTime: 123,
          memoryUsed: 2.5,
          language: 'cpp',
          createdAt: '2024-01-15T10:30:00.000Z',
          problemId: 'prob1',
          problemTitle: 'Two Sum',
          problemSlug: 'two-sum',
        },
        {
          _id: 'sub2',
          verdict: 'WA',
          executionTime: 95,
          memoryUsed: 1.8,
          language: 'python',
          createdAt: '2024-01-14T09:20:00.000Z',
          problemId: 'prob2',
          problemTitle: 'Binary Search',
          problemSlug: 'binary-search',
        },
      ]

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 2,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Select AC filter
      const filterSelect = screen.getByLabelText('Filter:')
      await user.selectOptions(filterSelect, 'AC')

      // Only AC submission visible
      expect(screen.getByText('Two Sum')).toBeInTheDocument()
      expect(screen.queryByText('Binary Search')).not.toBeInTheDocument()

      // Reset to all verdicts
      await user.selectOptions(filterSelect, 'all')

      // All submissions should be visible again
      expect(screen.getByText('Two Sum')).toBeInTheDocument()
      expect(screen.getByText('Binary Search')).toBeInTheDocument()
      expect(screen.getByText('Showing 2 of 2 submissions')).toBeInTheDocument()
    })

    it('should display submission count correctly', async () => {
      const mockSubmissions = [
        {
          _id: 'sub1',
          verdict: 'AC',
          executionTime: 123,
          memoryUsed: 2.5,
          language: 'cpp',
          createdAt: '2024-01-15T10:30:00.000Z',
          problemId: 'prob1',
          problemTitle: 'Two Sum',
          problemSlug: 'two-sum',
        },
        {
          _id: 'sub2',
          verdict: 'WA',
          executionTime: 95,
          memoryUsed: 1.8,
          language: 'python',
          createdAt: '2024-01-14T09:20:00.000Z',
          problemId: 'prob2',
          problemTitle: 'Binary Search',
          problemSlug: 'binary-search',
        },
        {
          _id: 'sub3',
          verdict: 'TLE',
          executionTime: 1000,
          memoryUsed: 2.0,
          language: 'cpp',
          createdAt: '2024-01-13T08:10:00.000Z',
          problemId: 'prob3',
          problemTitle: 'Merge Sort',
          problemSlug: 'merge-sort',
        },
      ]

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 3,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check initial count
      expect(screen.getByText('Showing 3 of 3 submissions')).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('should display first 50 submissions initially', async () => {
      // Create 75 mock submissions
      const mockSubmissions = Array.from({ length: 75 }, (_, i) => ({
        _id: `sub${i + 1}`,
        verdict: 'AC',
        executionTime: 100 + i,
        memoryUsed: 2.0 + i * 0.1,
        language: 'cpp',
        createdAt: new Date(2024, 0, 15 - i).toISOString(),
        problemId: `prob${i + 1}`,
        problemTitle: `Problem ${i + 1}`,
        problemSlug: `problem-${i + 1}`,
      }))

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 75,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Should display first 50 submissions
      expect(screen.getByText('Problem 1')).toBeInTheDocument()
      expect(screen.getByText('Problem 50')).toBeInTheDocument()
      
      // Should NOT display submission 51 yet
      expect(screen.queryByText('Problem 51')).not.toBeInTheDocument()
      
      // Should show "Load More" button
      expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument()
    })

    it('should load next 50 submissions when "Load More" is clicked', async () => {
      const user = userEvent.setup()
      
      // Create 75 mock submissions
      const mockSubmissions = Array.from({ length: 75 }, (_, i) => ({
        _id: `sub${i + 1}`,
        verdict: 'AC',
        executionTime: 100 + i,
        memoryUsed: 2.0 + i * 0.1,
        language: 'cpp',
        createdAt: new Date(2024, 0, 15 - i).toISOString(),
        problemId: `prob${i + 1}`,
        problemTitle: `Problem ${i + 1}`,
        problemSlug: `problem-${i + 1}`,
      }))

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 75,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Initially showing first 50
      expect(screen.getByText('Problem 1')).toBeInTheDocument()
      expect(screen.getByText('Problem 50')).toBeInTheDocument()
      expect(screen.queryByText('Problem 51')).not.toBeInTheDocument()

      // Click "Load More"
      const loadMoreButton = screen.getByRole('button', { name: 'Load More' })
      await user.click(loadMoreButton)

      // Now should show all 75 submissions
      expect(screen.getByText('Problem 1')).toBeInTheDocument()
      expect(screen.getByText('Problem 50')).toBeInTheDocument()
      expect(screen.getByText('Problem 51')).toBeInTheDocument()
      expect(screen.getByText('Problem 75')).toBeInTheDocument()
    })

    it('should hide "Load More" button when no more submissions', async () => {
      // Create exactly 50 submissions
      const mockSubmissions = Array.from({ length: 50 }, (_, i) => ({
        _id: `sub${i + 1}`,
        verdict: 'AC',
        executionTime: 100 + i,
        memoryUsed: 2.0 + i * 0.1,
        language: 'cpp',
        createdAt: new Date(2024, 0, 15 - i).toISOString(),
        problemId: `prob${i + 1}`,
        problemTitle: `Problem ${i + 1}`,
        problemSlug: `problem-${i + 1}`,
      }))

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 50,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Should NOT show "Load More" button (exactly 50 submissions)
      expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
    })

    it('should hide "Load More" button after loading all submissions', async () => {
      const user = userEvent.setup()
      
      // Create 75 mock submissions
      const mockSubmissions = Array.from({ length: 75 }, (_, i) => ({
        _id: `sub${i + 1}`,
        verdict: 'AC',
        executionTime: 100 + i,
        memoryUsed: 2.0 + i * 0.1,
        language: 'cpp',
        createdAt: new Date(2024, 0, 15 - i).toISOString(),
        problemId: `prob${i + 1}`,
        problemTitle: `Problem ${i + 1}`,
        problemSlug: `problem-${i + 1}`,
      }))

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 75,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Click "Load More"
      const loadMoreButton = screen.getByRole('button', { name: 'Load More' })
      await user.click(loadMoreButton)

      // Button should be hidden after loading all submissions
      expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
    })

    it('should hide "Load More" button when filter is active', async () => {
      const user = userEvent.setup()
      
      // Create 75 mock submissions
      const mockSubmissions = Array.from({ length: 75 }, (_, i) => ({
        _id: `sub${i + 1}`,
        verdict: 'AC',
        executionTime: 100 + i,
        memoryUsed: 2.0 + i * 0.1,
        language: 'cpp',
        createdAt: new Date(2024, 0, 15 - i).toISOString(),
        problemId: `prob${i + 1}`,
        problemTitle: `Problem ${i + 1}`,
        problemSlug: `problem-${i + 1}`,
      }))

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 75,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Initially "Load More" button should be visible
      expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument()

      // Select AC filter
      const filterSelect = screen.getByLabelText('Filter:')
      await user.selectOptions(filterSelect, 'AC')

      // "Load More" button should be hidden when filter !== 'all'
      expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
    })

    it('should update hasMore based on response count', async () => {
      // Create 100 submissions
      const mockSubmissions = Array.from({ length: 100 }, (_, i) => ({
        _id: `sub${i + 1}`,
        verdict: 'AC',
        executionTime: 100 + i,
        memoryUsed: 2.0 + i * 0.1,
        language: 'cpp',
        createdAt: new Date(2024, 0, 15 - i).toISOString(),
        problemId: `prob${i + 1}`,
        problemTitle: `Problem ${i + 1}`,
        problemSlug: `problem-${i + 1}`,
      }))

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 100,
          submissions: mockSubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Should show "Load More" button (100 > 50)
      expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument()
    })
  })
})
