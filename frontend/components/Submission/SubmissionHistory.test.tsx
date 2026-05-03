/**
 * Unit Tests for SubmissionHistory Component
 * 
 * **Validates: Requirements 4.1, 4.2, 4.4, 4.5**
 * 
 * Tests verify:
 * - Loading state displays spinner
 * - Empty state displays appropriate message
 * - Submissions list renders correctly with all required fields
 * - Each submission shows verdict badge, language, execution metrics, and timestamp
 * - Error state displays error message with retry button
 * - Component fetches submissions on mount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SubmissionHistory } from './SubmissionHistory'
import api from '@/lib/api'

// Mock the API module
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

// Mock VerdictBadge component to simplify testing
vi.mock('./VerdictBadge', () => ({
  VerdictBadge: ({ verdict, size }: { verdict: string; size?: string }) => (
    <div data-testid="verdict-badge" data-verdict={verdict} data-size={size}>
      {verdict}
    </div>
  ),
}))

describe('SubmissionHistory Component', () => {
  const mockProblemId = '507f1f77bcf86cd799439011'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Test: Loading state displays spinner
   * Validates: Requirement 4.5
   */
  it('should display loading spinner while fetching submissions', () => {
    // Mock API to never resolve (simulates loading state)
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))

    render(<SubmissionHistory problemId={mockProblemId} />)

    // Verify loading spinner is displayed
    expect(screen.getByRole('status', { name: /loading submissions/i })).toBeInTheDocument()
    expect(screen.getByRole('status').querySelector('.animate-spin')).toBeInTheDocument()
  })

  /**
   * Test: Empty state displays message when no submissions exist
   * Validates: Requirement 4.4
   */
  it('should display "No submissions yet" message when submissions array is empty', async () => {
    // Mock API to return empty submissions array
    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 0,
        submissions: [],
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify empty state message
    expect(screen.getByText('No submissions yet')).toBeInTheDocument()
    expect(screen.getByText('Submit your code to see results here')).toBeInTheDocument()
  })

  /**
   * Test: Submissions list renders correctly with all required fields
   * Validates: Requirements 4.1, 4.2
   */
  it('should render submissions list with verdict, language, metrics, and timestamp', async () => {
    const mockSubmissions = [
      {
        _id: '1',
        verdict: 'AC' as const,
        executionTime: 123,
        memoryUsed: 2.5,
        language: 'cpp' as const,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
      {
        _id: '2',
        verdict: 'WA' as const,
        executionTime: 95,
        memoryUsed: 1.8,
        language: 'python' as const,
        createdAt: '2024-01-15T10:25:00.000Z',
      },
    ]

    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 2,
        submissions: mockSubmissions,
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    // Wait for submissions to load
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify header with count
    expect(screen.getByText('Your Submissions (2)')).toBeInTheDocument()

    // Verify first submission
    expect(screen.getByText('CPP')).toBeInTheDocument()
    expect(screen.getByText('123ms')).toBeInTheDocument()
    expect(screen.getByText('2.5MB')).toBeInTheDocument()

    // Verify second submission
    expect(screen.getByText('PYTHON')).toBeInTheDocument()
    expect(screen.getByText('95ms')).toBeInTheDocument()
    expect(screen.getByText('1.8MB')).toBeInTheDocument()

    // Verify verdict badges are rendered
    const verdictBadges = screen.getAllByTestId('verdict-badge')
    expect(verdictBadges).toHaveLength(2)
    expect(verdictBadges[0]).toHaveAttribute('data-verdict', 'AC')
    expect(verdictBadges[1]).toHaveAttribute('data-verdict', 'WA')
  })

  /**
   * Test: Verdict badges use small size
   * Validates: Design consistency
   */
  it('should render verdict badges with small size', async () => {
    const mockSubmissions = [
      {
        _id: '1',
        verdict: 'AC' as const,
        executionTime: 123,
        memoryUsed: 2.5,
        language: 'cpp' as const,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    ]

    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 1,
        submissions: mockSubmissions,
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify verdict badge has small size
    const verdictBadge = screen.getByTestId('verdict-badge')
    expect(verdictBadge).toHaveAttribute('data-size', 'small')
  })

  /**
   * Test: Timestamp is formatted correctly
   * Validates: Requirement 4.2
   */
  it('should format timestamp using toLocaleString', async () => {
    const mockDate = '2024-01-15T10:30:00.000Z'
    const mockSubmissions = [
      {
        _id: '1',
        verdict: 'AC' as const,
        executionTime: 123,
        memoryUsed: 2.5,
        language: 'cpp' as const,
        createdAt: mockDate,
      },
    ]

    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 1,
        submissions: mockSubmissions,
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify timestamp is formatted (exact format depends on locale)
    const expectedTimestamp = new Date(mockDate).toLocaleString()
    expect(screen.getByText(expectedTimestamp)).toBeInTheDocument()
  })

  /**
   * Test: Null execution metrics don't break rendering
   * Validates: Robustness
   */
  it('should handle null execution time and memory gracefully', async () => {
    const mockSubmissions = [
      {
        _id: '1',
        verdict: 'CE' as const,
        executionTime: null,
        memoryUsed: null,
        language: 'cpp' as const,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    ]

    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 1,
        submissions: mockSubmissions,
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify submission is rendered
    expect(screen.getByText('CPP')).toBeInTheDocument()

    // Verify execution metrics are not displayed (null values)
    expect(screen.queryByText(/ms$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/MB$/)).not.toBeInTheDocument()
  })

  /**
   * Test: Component fetches submissions on mount with correct problemId
   * Validates: Requirement 4.1
   */
  it('should fetch submissions for the correct problemId on mount', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 0,
        submissions: [],
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/submissions/problem/${mockProblemId}`)
    })
  })

  /**
   * Test: Error state displays error message with retry button
   * Validates: Error handling
   */
  it('should display error message and retry button when API call fails', async () => {
    const errorMessage = 'Failed to load submissions'
    vi.mocked(api.get).mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    })

    render(<SubmissionHistory problemId={mockProblemId} />)

    // Wait for error state
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify error message is displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument()

    // Verify retry button is displayed
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  /**
   * Test: Error state with generic message when no error message in response
   * Validates: Error handling
   */
  it('should display generic error message when API error has no message', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    render(<SubmissionHistory problemId={mockProblemId} />)

    // Wait for error state
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify generic error message is displayed
    expect(screen.getByText('Failed to load submissions')).toBeInTheDocument()
  })

  /**
   * Test: Submissions are clickable
   * Validates: Requirement 4.3 (future enhancement)
   */
  it('should render submissions as clickable elements', async () => {
    const mockSubmissions = [
      {
        _id: '1',
        verdict: 'AC' as const,
        executionTime: 123,
        memoryUsed: 2.5,
        language: 'cpp' as const,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    ]

    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 1,
        submissions: mockSubmissions,
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify submission is clickable (has role="button")
    const submissionCard = screen.getByRole('button')
    expect(submissionCard).toBeInTheDocument()
    expect(submissionCard).toHaveAttribute('tabIndex', '0')
  })

  /**
   * Test: Multiple submissions render in correct order
   * Validates: List rendering
   */
  it('should render multiple submissions in the order received from API', async () => {
    const mockSubmissions = [
      {
        _id: '1',
        verdict: 'AC' as const,
        executionTime: 123,
        memoryUsed: 2.5,
        language: 'cpp' as const,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
      {
        _id: '2',
        verdict: 'WA' as const,
        executionTime: 95,
        memoryUsed: 1.8,
        language: 'python' as const,
        createdAt: '2024-01-15T10:25:00.000Z',
      },
      {
        _id: '3',
        verdict: 'TLE' as const,
        executionTime: 2000,
        memoryUsed: 3.2,
        language: 'cpp' as const,
        createdAt: '2024-01-15T10:20:00.000Z',
      },
    ]

    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 3,
        submissions: mockSubmissions,
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify all submissions are rendered
    const verdictBadges = screen.getAllByTestId('verdict-badge')
    expect(verdictBadges).toHaveLength(3)
    expect(verdictBadges[0]).toHaveAttribute('data-verdict', 'AC')
    expect(verdictBadges[1]).toHaveAttribute('data-verdict', 'WA')
    expect(verdictBadges[2]).toHaveAttribute('data-verdict', 'TLE')

    // Verify count in header
    expect(screen.getByText('Your Submissions (3)')).toBeInTheDocument()
  })

  /**
   * Test: Language is displayed in uppercase
   * Validates: Requirement 4.2
   */
  it('should display language in uppercase', async () => {
    const mockSubmissions = [
      {
        _id: '1',
        verdict: 'AC' as const,
        executionTime: 123,
        memoryUsed: 2.5,
        language: 'cpp' as const,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
      {
        _id: '2',
        verdict: 'WA' as const,
        executionTime: 95,
        memoryUsed: 1.8,
        language: 'python' as const,
        createdAt: '2024-01-15T10:25:00.000Z',
      },
    ]

    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 2,
        submissions: mockSubmissions,
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify languages are uppercase
    expect(screen.getByText('CPP')).toBeInTheDocument()
    expect(screen.getByText('PYTHON')).toBeInTheDocument()

    // Verify lowercase versions are not present
    expect(screen.queryByText('cpp')).not.toBeInTheDocument()
    expect(screen.queryByText('python')).not.toBeInTheDocument()
  })

  /**
   * Test: Execution time displays with "ms" suffix
   * Validates: Requirement 4.2
   */
  it('should display execution time with "ms" suffix', async () => {
    const mockSubmissions = [
      {
        _id: '1',
        verdict: 'AC' as const,
        executionTime: 123,
        memoryUsed: 2.5,
        language: 'cpp' as const,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    ]

    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 1,
        submissions: mockSubmissions,
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify execution time format
    expect(screen.getByText('123ms')).toBeInTheDocument()
  })

  /**
   * Test: Memory usage displays with "MB" suffix
   * Validates: Requirement 4.2
   */
  it('should display memory usage with "MB" suffix', async () => {
    const mockSubmissions = [
      {
        _id: '1',
        verdict: 'AC' as const,
        executionTime: 123,
        memoryUsed: 2.5,
        language: 'cpp' as const,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    ]

    vi.mocked(api.get).mockResolvedValue({
      data: {
        count: 1,
        submissions: mockSubmissions,
      },
    } as any)

    render(<SubmissionHistory problemId={mockProblemId} />)

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    })

    // Verify memory usage format
    expect(screen.getByText('2.5MB')).toBeInTheDocument()
  })
})
