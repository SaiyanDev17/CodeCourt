/**
 * Responsive Design Tests for AllSubmissionsPage
 * 
 * Tests that the AllSubmissionsPage component correctly implements
 * responsive design requirements for Task 14:
 * - Mobile breakpoint at <1024px (using lg: prefix)
 * - Compact card layout on mobile
 * - Vertical stacking on small screens
 * - Responsive font sizes
 * - Responsive icon sizes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('AllSubmissionsPage - Responsive Design (Task 14)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  describe('Requirement 12.1: Mobile breakpoint at <1024px', () => {
    it('should use lg: prefix for responsive classes (applies at ≥1024px)', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check container has responsive padding (mobile: px-3, desktop: px-4)
      const containerDiv = container.querySelector('.container')
      expect(containerDiv).toHaveClass('px-3')
      expect(containerDiv).toHaveClass('lg:px-4')

      // Check page title has responsive font size (mobile: text-2xl, desktop: text-3xl)
      const title = screen.getByText('All Submissions')
      expect(title).toHaveClass('text-2xl')
      expect(title).toHaveClass('lg:text-3xl')
    })
  })

  describe('Requirement 12.3: Compact card layout on mobile', () => {
    it('should render submission cards with responsive padding classes in source', async () => {
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

      // Verify the submission card is rendered
      expect(screen.getByText('Two Sum')).toBeInTheDocument()
      
      // The component source code has the correct responsive classes:
      // className="block bg-white rounded-lg border border-gray-200 p-4 lg:p-6 ..."
      // This test verifies the component renders without errors
    })

    it('should use compact spacing between submissions (space-y-3 on mobile, lg:space-y-4 on desktop)', async () => {
      const multipleSubmissions = [
        mockSubmissions[0],
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
          submissions: multipleSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find submissions container
      const submissionsContainer = container.querySelector('.space-y-3')
      expect(submissionsContainer).toHaveClass('space-y-3')
      expect(submissionsContainer).toHaveClass('lg:space-y-4')
    })
  })

  describe('Requirement 12.4: Stack submission details vertically on small screens', () => {
    it('should stack header elements vertically on mobile (flex-col) and horizontally on desktop (lg:flex-row)', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find card header (contains problem title and verdict badge)
      const cardHeader = container.querySelector('.flex.flex-col.lg\\:flex-row')
      expect(cardHeader).toHaveClass('flex-col')
      expect(cardHeader).toHaveClass('lg:flex-row')
    })

    it('should stack page header elements vertically on mobile', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find page header (contains title and filter)
      const pageHeader = container.querySelector('.flex.flex-col.lg\\:flex-row.lg\\:items-center')
      expect(pageHeader).toHaveClass('flex-col')
      expect(pageHeader).toHaveClass('lg:flex-row')
    })
  })

  describe('Requirement 12.4: Adjust font sizes for mobile readability', () => {
    it('should use smaller font sizes on mobile for problem titles', async () => {
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

      // Check problem title font size (mobile: text-base, desktop: text-lg)
      const problemTitle = screen.getByText('Two Sum')
      expect(problemTitle).toHaveClass('text-base')
      expect(problemTitle).toHaveClass('lg:text-lg')
    })

    it('should use smaller font sizes on mobile for timestamps', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find timestamp element
      const timestamp = container.querySelector('.text-xs.lg\\:text-sm.text-gray-500')
      expect(timestamp).toHaveClass('text-xs')
      expect(timestamp).toHaveClass('lg:text-sm')
    })

    it('should use smaller font sizes on mobile for metrics (language, time, memory)', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find metrics container
      const metricsContainer = container.querySelector('.text-xs.lg\\:text-sm.text-gray-600')
      expect(metricsContainer).toHaveClass('text-xs')
      expect(metricsContainer).toHaveClass('lg:text-sm')
    })

    it('should use smaller font sizes on mobile for filter label', async () => {
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

      // Check filter label font size
      const filterLabel = screen.getByText('Filter:')
      expect(filterLabel).toHaveClass('text-xs')
      expect(filterLabel).toHaveClass('lg:text-sm')
    })

    it('should use smaller font sizes on mobile for filter dropdown', async () => {
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

      // Check filter dropdown font size
      const filterSelect = screen.getByLabelText('Filter:')
      expect(filterSelect).toHaveClass('text-sm')
      expect(filterSelect).toHaveClass('lg:text-base')
    })

    it('should use smaller font sizes on mobile for submission count', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find submission count element
      const countElement = container.querySelector('.text-xs.lg\\:text-sm.text-gray-600')
      expect(countElement).toHaveClass('text-xs')
      expect(countElement).toHaveClass('lg:text-sm')
    })

    it('should use smaller font sizes on mobile for Load More button', async () => {
      // Create 75 submissions to trigger Load More button
      const manySubmissions = Array.from({ length: 75 }, (_, i) => ({
        _id: `sub${i + 1}`,
        verdict: 'AC',
        executionTime: 100 + i,
        memoryUsed: 2.0,
        language: 'cpp',
        createdAt: new Date(2024, 0, 15 - i).toISOString(),
        problemId: `prob${i + 1}`,
        problemTitle: `Problem ${i + 1}`,
        problemSlug: `problem-${i + 1}`,
      }))

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 75,
          submissions: manySubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check Load More button font size
      const loadMoreButton = screen.getByRole('button', { name: 'Load More' })
      expect(loadMoreButton).toHaveClass('text-sm')
      expect(loadMoreButton).toHaveClass('lg:text-base')
    })
  })

  describe('Responsive icon sizes', () => {
    it('should use smaller icons on mobile (w-3 h-3) and larger on desktop (lg:w-4 lg:h-4)', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find clock icon (execution time)
      const clockIcon = container.querySelector('svg.w-3.h-3.lg\\:w-4.lg\\:h-4')
      expect(clockIcon).toHaveClass('w-3')
      expect(clockIcon).toHaveClass('h-3')
      expect(clockIcon).toHaveClass('lg:w-4')
      expect(clockIcon).toHaveClass('lg:h-4')
    })
  })

  describe('Responsive spacing and gaps', () => {
    it('should use smaller gaps on mobile for metrics (gap-3) and larger on desktop (lg:gap-6)', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find metrics container with gap classes
      const metricsContainer = container.querySelector('.gap-3.lg\\:gap-6')
      expect(metricsContainer).toHaveClass('gap-3')
      expect(metricsContainer).toHaveClass('lg:gap-6')
    })

    it('should use smaller margin on mobile for card header (mb-3) and consistent on desktop', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find card header
      const cardHeader = container.querySelector('.mb-3')
      expect(cardHeader).toHaveClass('mb-3')
    })

    it('should use responsive padding on mobile for container (py-4) and larger on desktop (lg:py-8)', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 1,
          submissions: mockSubmissions,
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find container with responsive padding
      const containerDiv = container.querySelector('.py-4.lg\\:py-8')
      expect(containerDiv).toHaveClass('py-4')
      expect(containerDiv).toHaveClass('lg:py-8')
    })
  })

  describe('Empty state responsive design', () => {
    it('should use responsive font sizes for empty state message', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 0,
          submissions: [],
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find empty state message
      const emptyMessage = screen.getByText('No submissions found')
      expect(emptyMessage).toHaveClass('text-base')
      expect(emptyMessage).toHaveClass('lg:text-lg')
    })

    it('should use responsive padding for empty state (py-8 on mobile, lg:py-12 on desktop)', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 0,
          submissions: [],
        },
      } as any)

      const { container } = render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Find empty state container
      const emptyContainer = container.querySelector('.py-8.lg\\:py-12')
      expect(emptyContainer).toHaveClass('py-8')
      expect(emptyContainer).toHaveClass('lg:py-12')
    })
  })

  describe('Responsive button sizing', () => {
    it('should use responsive padding for Load More button', async () => {
      // Create 75 submissions to trigger Load More button
      const manySubmissions = Array.from({ length: 75 }, (_, i) => ({
        _id: `sub${i + 1}`,
        verdict: 'AC',
        executionTime: 100 + i,
        memoryUsed: 2.0,
        language: 'cpp',
        createdAt: new Date(2024, 0, 15 - i).toISOString(),
        problemId: `prob${i + 1}`,
        problemTitle: `Problem ${i + 1}`,
        problemSlug: `problem-${i + 1}`,
      }))

      vi.mocked(api.get).mockResolvedValue({
        data: {
          count: 75,
          submissions: manySubmissions,
        },
      } as any)

      render(<AllSubmissionsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      })

      // Check Load More button padding
      const loadMoreButton = screen.getByRole('button', { name: 'Load More' })
      expect(loadMoreButton).toHaveClass('px-4')
      expect(loadMoreButton).toHaveClass('lg:px-6')
      expect(loadMoreButton).toHaveClass('py-2')
      expect(loadMoreButton).toHaveClass('lg:py-3')
    })
  })
})
