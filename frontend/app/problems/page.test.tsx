/**
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * Property 1: Bug Condition - Frontend Extracts Problems Array
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * 
 * This test verifies that when the API returns { count: N, problems: [...] },
 * the frontend correctly extracts the problems array and renders it without errors.
 * 
 * On UNFIXED code (with setProblems(response.data)), this test will FAIL because:
 * - response.data is an object { count, problems }, not an array
 * - Calling .map() on this object throws "problems.map is not a function"
 * 
 * On FIXED code (with setProblems(response.data.problems)), this test will PASS because:
 * - response.data.problems is correctly extracted as an array
 * - The array supports .map() and renders successfully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ProblemsPage from './page'
import api from '@/lib/api'

// Mock the API module
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

// Mock the ProblemCard component to avoid rendering complexity
vi.mock('@/components/Problem/ProblemCard', () => ({
  default: ({ problem }: any) => (
    <div data-testid={`problem-card-${problem._id}`}>
      {problem.title}
    </div>
  ),
}))

describe('ProblemsPage - Bug Condition Exploration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Property 1: Frontend extracts problems array from API response { count, problems }', async () => {
    // Mock API response with the backend format: { count: N, problems: [...] }
    const mockResponse = {
      data: {
        count: 3,
        problems: [
          {
            _id: '1',
            title: 'Test Problem 1',
            slug: 'test-problem-1',
            description: 'Description 1',
            constraints: 'Constraints 1',
            timeLimit: 1000,
            memoryLimit: 256,
            difficulty: 'easy' as const,
            sampleTestCases: [],
            hiddenTestCasesS3Key: null,
            status: 'published' as const,
            rejectionReason: null,
            authorId: 'author1',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          {
            _id: '2',
            title: 'Test Problem 2',
            slug: 'test-problem-2',
            description: 'Description 2',
            constraints: 'Constraints 2',
            timeLimit: 2000,
            memoryLimit: 512,
            difficulty: 'medium' as const,
            sampleTestCases: [],
            hiddenTestCasesS3Key: null,
            status: 'published' as const,
            rejectionReason: null,
            authorId: 'author2',
            createdAt: '2024-01-02',
            updatedAt: '2024-01-02',
          },
          {
            _id: '3',
            title: 'Test Problem 3',
            slug: 'test-problem-3',
            description: 'Description 3',
            constraints: 'Constraints 3',
            timeLimit: 3000,
            memoryLimit: 1024,
            difficulty: 'hard' as const,
            sampleTestCases: [],
            hiddenTestCasesS3Key: null,
            status: 'published' as const,
            rejectionReason: null,
            authorId: 'author3',
            createdAt: '2024-01-03',
            updatedAt: '2024-01-03',
          },
        ],
      },
    }

    vi.mocked(api.get).mockResolvedValue(mockResponse)

    // Render the component
    render(<ProblemsPage />)

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // EXPECTED BEHAVIOR (will fail on unfixed code):
    // 1. The problems array should be extracted from response.data.problems
    // 2. Array.isArray(problems) should be true
    // 3. problems.map() should succeed without throwing "problems.map is not a function"
    // 4. ProblemCard components should render correctly

    // Verify that all three problem cards are rendered
    expect(screen.getByTestId('problem-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('problem-card-2')).toBeInTheDocument()
    expect(screen.getByTestId('problem-card-3')).toBeInTheDocument()

    // Verify the problem titles are displayed
    expect(screen.getByText('Test Problem 1')).toBeInTheDocument()
    expect(screen.getByText('Test Problem 2')).toBeInTheDocument()
    expect(screen.getByText('Test Problem 3')).toBeInTheDocument()

    // Verify the API was called correctly
    expect(api.get).toHaveBeenCalledWith('/problems')
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('Bug Condition: Single problem response', async () => {
    // Test with a single problem to verify the bug occurs with any array length
    const mockResponse = {
      data: {
        count: 1,
        problems: [
          {
            _id: '123',
            title: 'Single Test Problem',
            slug: 'single-test-problem',
            description: 'Description',
            constraints: 'Constraints',
            timeLimit: 1000,
            memoryLimit: 256,
            difficulty: 'easy' as const,
            sampleTestCases: [],
            hiddenTestCasesS3Key: null,
            status: 'published' as const,
            rejectionReason: null,
            authorId: 'author1',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      },
    }

    vi.mocked(api.get).mockResolvedValue(mockResponse)

    render(<ProblemsPage />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Should render the single problem card
    expect(screen.getByTestId('problem-card-123')).toBeInTheDocument()
    expect(screen.getByText('Single Test Problem')).toBeInTheDocument()
  })

  it('Bug Condition: Empty problems array', async () => {
    // Test with empty array to verify empty state handling
    const mockResponse = {
      data: {
        count: 0,
        problems: [],
      },
    }

    vi.mocked(api.get).mockResolvedValue(mockResponse)

    render(<ProblemsPage />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Should display the empty state message
    expect(screen.getByText(/No problems available yet/i)).toBeInTheDocument()
  })
})

/**
 * Preservation Property Tests
 * 
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
 * 
 * Property 2: Preservation - UI Behavior Unchanged
 * 
 * IMPORTANT: These tests follow observation-first methodology
 * - Observe behavior on UNFIXED code for non-buggy inputs
 * - Write property-based tests capturing observed behavior patterns
 * - Run tests on UNFIXED code
 * - EXPECTED OUTCOME: Tests PASS (confirms baseline behavior to preserve)
 * 
 * These tests verify that all UI behaviors (loading, error states)
 * remain unchanged after the fix is implemented. They test the preservation
 * requirements to ensure no regressions are introduced.
 * 
 * NOTE: These tests focus ONLY on behaviors that DON'T trigger the bug condition
 * (loading state, error state). Empty and success states are excluded because
 * they trigger the bug on unfixed code.
 */

import * as fc from 'fast-check'

describe('ProblemsPage - Preservation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Property 2.1: Loading state displays spinner while fetching', async () => {
    // Create a promise that we can control to keep the component in loading state
    let resolvePromise: (value: any) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    vi.mocked(api.get).mockReturnValue(pendingPromise as any)

    const { container } = render(<ProblemsPage />)

    // Verify loading spinner is displayed
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner?.className).toContain('rounded-full')
    expect(spinner?.className).toContain('h-12')
    expect(spinner?.className).toContain('w-12')
    expect(spinner?.className).toContain('border-b-2')
    expect(spinner?.className).toContain('border-blue-600')

    // Verify the heading is still displayed during loading
    expect(screen.getByText('Problems')).toBeInTheDocument()

    // Verify the loading container has correct styling
    const loadingContainer = container.querySelector('.flex.items-center.justify-center.py-12')
    expect(loadingContainer).toBeInTheDocument()

    // Clean up by resolving the promise
    resolvePromise!({ data: { count: 0, problems: [] } })
  })

  it('Property 2.2: Error state displays error message and retry button on API failure', async () => {
    // Property-based test: for any non-empty error message, the UI should display it correctly
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 })
          .filter(s => s.trim().length > 0)
          .map(s => s.trim()), // Trim the string to match UI behavior
        async (errorMessage) => {
          vi.clearAllMocks()

          // Mock API to reject with an error
          vi.mocked(api.get).mockRejectedValue({
            response: {
              data: {
                message: errorMessage,
              },
            },
          })

          const { container, unmount } = render(<ProblemsPage />)

          // Wait for error state to be displayed
          await waitFor(() => {
            const errorContainer = container.querySelector('.bg-red-50')
            expect(errorContainer).toBeInTheDocument()
          })

          // Verify error message is displayed (use regex for flexible matching)
          expect(screen.getByText(errorMessage, { exact: true })).toBeInTheDocument()

          // Verify retry button is displayed
          const retryButton = screen.getByRole('button', { name: /retry/i })
          expect(retryButton).toBeInTheDocument()
          expect(retryButton.className).toContain('bg-red-600')
          expect(retryButton.className).toContain('text-white')
          expect(retryButton.className).toContain('rounded')
          expect(retryButton.className).toContain('hover:bg-red-700')

          // Verify error container has correct styling
          const errorContainer = container.querySelector('.bg-red-50')
          expect(errorContainer).toBeInTheDocument()
          expect(errorContainer?.className).toContain('border')
          expect(errorContainer?.className).toContain('border-red-200')
          expect(errorContainer?.className).toContain('rounded-lg')
          expect(errorContainer?.className).toContain('p-6')
          expect(errorContainer?.className).toContain('text-center')

          // Clean up
          unmount()
        }
      ),
      { numRuns: 10 }
    )
  })

  it('Property 2.3: Error state with network error displays fallback message', async () => {
    // Test error handling when no response message is provided
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    const { container } = render(<ProblemsPage />)

    await waitFor(() => {
      const errorContainer = container.querySelector('.bg-red-50')
      expect(errorContainer).toBeInTheDocument()
    })

    // Verify fallback error message is displayed
    expect(screen.getByText('Failed to load problems')).toBeInTheDocument()

    // Verify retry button is still displayed
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('Property 2.4: Page heading is displayed in loading and error states', async () => {
    // Test 1: Loading state
    let resolvePromise: (value: any) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    vi.mocked(api.get).mockReturnValue(pendingPromise as any)

    const { unmount: unmount1 } = render(<ProblemsPage />)

    // Verify heading is displayed in loading state
    let heading = screen.getByText('Problems')
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H1')
    expect(heading.className).toContain('text-3xl')
    expect(heading.className).toContain('font-bold')
    expect(heading.className).toContain('mb-6')

    unmount1()
    resolvePromise!({ data: { count: 0, problems: [] } })

    // Test 2: Error state
    vi.clearAllMocks()
    vi.mocked(api.get).mockRejectedValue(new Error('Test error'))

    const { container } = render(<ProblemsPage />)

    await waitFor(() => {
      const errorContainer = container.querySelector('.bg-red-50')
      expect(errorContainer).toBeInTheDocument()
    })

    // Verify heading is displayed in error state
    heading = screen.getByText('Problems')
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H1')
    expect(heading.className).toContain('text-3xl')
    expect(heading.className).toContain('font-bold')
    expect(heading.className).toContain('mb-6')
  })
})
