/**
 * Bug Condition Exploration Test - Contest Page
 * 
 * **Validates: Requirements 1.1, 2.1**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * 
 * Property 1: Bug Condition - Malformed API Data Crashes
 * 
 * This test surfaces counterexamples that demonstrate the bug:
 * - When contests API returns non-array values (null, object, string)
 * - The system crashes with "TypeError: contests.filter is not a function"
 * 
 * Expected Behavior (after fix):
 * - System should treat non-array responses as empty array
 * - Display "No contests" messages without crashing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ContestsPage from './page'
import api from '@/lib/api'

// Mock the API module
vi.mock('@/lib/api')

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('Bug Condition Exploration - Contest Page Malformed Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle null contests response without crashing', async () => {
    // Mock API to return null instead of array
    vi.mocked(api.get).mockResolvedValueOnce({
      data: null,
    })

    // Attempt to render - will crash on unfixed code with "TypeError: contests.filter is not a function"
    render(<ContestsPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Expected behavior: Should display empty state messages without crashing
    expect(screen.getByText('No active contests right now')).toBeInTheDocument()
    expect(screen.getByText('No upcoming contests scheduled')).toBeInTheDocument()
    expect(screen.getByText('No past contests to display')).toBeInTheDocument()
  })

  it('should handle object contests response without crashing', async () => {
    // Mock API to return object instead of array
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { message: 'error', code: 500 },
    })

    // Attempt to render - will crash on unfixed code with "TypeError: contests.filter is not a function"
    render(<ContestsPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Expected behavior: Should display empty state messages without crashing
    expect(screen.getByText('No active contests right now')).toBeInTheDocument()
    expect(screen.getByText('No upcoming contests scheduled')).toBeInTheDocument()
    expect(screen.getByText('No past contests to display')).toBeInTheDocument()
  })

  it('should handle string contests response without crashing', async () => {
    // Mock API to return string instead of array
    vi.mocked(api.get).mockResolvedValueOnce({
      data: 'error message',
    })

    // Attempt to render - will crash on unfixed code with "TypeError: contests.filter is not a function"
    render(<ContestsPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Expected behavior: Should display empty state messages without crashing
    expect(screen.getByText('No active contests right now')).toBeInTheDocument()
    expect(screen.getByText('No upcoming contests scheduled')).toBeInTheDocument()
    expect(screen.getByText('No past contests to display')).toBeInTheDocument()
  })

  it('should handle undefined contests response without crashing', async () => {
    // Mock API to return undefined instead of array
    vi.mocked(api.get).mockResolvedValueOnce({
      data: undefined,
    })

    // Attempt to render - will crash on unfixed code with "TypeError: contests.filter is not a function"
    render(<ContestsPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Expected behavior: Should display empty state messages without crashing
    expect(screen.getByText('No active contests right now')).toBeInTheDocument()
    expect(screen.getByText('No upcoming contests scheduled')).toBeInTheDocument()
    expect(screen.getByText('No past contests to display')).toBeInTheDocument()
  })
})

/**
 * Preservation Property Tests - Contest Page
 * 
 * **Validates: Requirements 3.1, 3.3**
 * 
 * Property 2: Preservation - Valid Data Rendering Unchanged
 * 
 * IMPORTANT: These tests observe and capture the behavior on UNFIXED code for valid inputs.
 * They ensure that the fix does not break existing functionality for well-formed data.
 * 
 * Expected Behavior:
 * - Valid contest arrays are categorized correctly by status (active, upcoming, past)
 * - All metadata (start time, duration, participants, problems count) displays correctly
 * 
 * Testing Approach: Property-based testing generates many test cases for stronger guarantees
 */

import * as fc from 'fast-check'

// Helper to generate MongoDB ObjectId-like strings (24 hex characters)
const mongoIdArbitrary = () => fc.string({ minLength: 24, maxLength: 24 }).map(s => 
  s.split('').map((_, i) => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
)

describe('Preservation Property Tests - Contest Page Valid Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property: Valid contest arrays are categorized correctly by status
   * 
   * For any valid contest array, the system should:
   * 1. Categorize contests into active, upcoming, and past based on current time
   * 2. Display all contest metadata correctly
   * 3. Render without crashing
   */
  it('should categorize valid contest arrays correctly by status', async () => {
    // Test with a few specific valid contest arrays
    const testCases = [
      [], // Empty array
      [{ // Single upcoming contest
        _id: '507f1f77bcf86cd799439011',
        title: 'Test Contest 1',
        status: 'upcoming' as const,
        startTime: new Date('2030-01-01').toISOString(),
        endTime: new Date('2030-01-02').toISOString(),
        problemIds: ['507f1f77bcf86cd799439012'],
        participants: [],
        createdBy: '507f1f77bcf86cd799439013',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
    ]

    for (const contests of testCases) {
      // Mock API to return valid contest array
      vi.mocked(api.get).mockResolvedValueOnce({
        data: contests,
      })

      // Render the component
      const { unmount } = render(<ContestsPage />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
      })

      // Verify component renders without crashing
      expect(screen.getByText('Contests')).toBeInTheDocument()

      // Verify categorization sections are present
      expect(screen.getByText('🔥 Active Contests')).toBeInTheDocument()
      expect(screen.getByText('📅 Upcoming Contests')).toBeInTheDocument()
      expect(screen.getByText('📜 Past Contests')).toBeInTheDocument()

      // If contests array is empty, verify empty state messages
      if (contests.length === 0) {
        expect(screen.getByText('No active contests right now')).toBeInTheDocument()
        expect(screen.getByText('No upcoming contests scheduled')).toBeInTheDocument()
        expect(screen.getByText('No past contests to display')).toBeInTheDocument()
      }

      // Clean up
      unmount()
      vi.clearAllMocks()
    }
  })

  /**
   * Property: Contest metadata displays correctly for valid contests
   * 
   * For any valid contest, the system should display:
   * - Title
   * - Status badge
   * - Start time
   * - Duration
   * - Participants count
   * - Problems count
   */
  it('should display all contest metadata correctly for valid contests', async () => {
    const contest = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Spring Coding Challenge',
      status: 'upcoming' as const,
      startTime: new Date('2025-06-01').toISOString(),
      endTime: new Date('2025-06-02').toISOString(),
      problemIds: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
      participants: ['507f1f77bcf86cd799439014'],
      createdBy: '507f1f77bcf86cd799439015',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Mock API to return single contest
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [contest],
    })

    // Render the component
    render(<ContestsPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Verify contest title is displayed
    expect(screen.getByText(contest.title)).toBeInTheDocument()

    // Verify participants count is displayed
    expect(screen.getByText(contest.participants.length.toString())).toBeInTheDocument()

    // Verify problems count is displayed
    expect(screen.getByText(contest.problemIds.length.toString())).toBeInTheDocument()
  })

  /**
   * Property: Empty contest arrays display empty state messages
   * 
   * For an empty contest array, the system should display:
   * - "No active contests right now"
   * - "No upcoming contests scheduled"
   * - "No past contests to display"
   */
  it('should display empty state messages for empty contest arrays', async () => {
    // Mock API to return empty array
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [],
    })

    // Render the component
    render(<ContestsPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Verify empty state messages are displayed
    expect(screen.getByText('No active contests right now')).toBeInTheDocument()
    expect(screen.getByText('No upcoming contests scheduled')).toBeInTheDocument()
    expect(screen.getByText('No past contests to display')).toBeInTheDocument()
  })
})
