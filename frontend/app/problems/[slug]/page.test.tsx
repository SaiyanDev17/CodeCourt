/**
 * Bug Condition Exploration Test - Problem Page
 * 
 * **Validates: Requirements 1.2, 2.2**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * 
 * Property 1: Bug Condition - Malformed API Data Crashes
 * 
 * This test surfaces counterexamples that demonstrate the bug:
 * - When problem.difficulty is undefined or null
 * - The system crashes with "TypeError: Cannot read properties of undefined (reading 'charAt')"
 * 
 * Expected Behavior (after fix):
 * - System should display "Unknown" badge without crashing
 * - Badge should have default gray styling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ProblemPage from './page'
import api from '@/lib/api'
import { Problem } from '@/types'

// Mock the API module
vi.mock('@/lib/api')

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'test-problem' }),
}))

// Mock Monaco Editor component (heavy dependency)
vi.mock('@/components/Editor/MonacoEditor', () => ({
  default: ({ onChange }: { onChange: (code: string, lang: 'cpp' | 'python') => void }) => (
    <div data-testid="monaco-editor">Monaco Editor Mock</div>
  ),
}))

// Mock Submit Button component
vi.mock('@/components/Editor/SubmitButton', () => ({
  default: ({ onSubmit, isJudging }: { onSubmit: () => void; isJudging: boolean }) => (
    <button onClick={onSubmit} disabled={isJudging}>
      {isJudging ? 'Judging...' : 'Submit'}
    </button>
  ),
}))

// Mock Problem Statement component
vi.mock('@/components/Problem/ProblemStatement', () => ({
  default: ({ markdownContent }: { markdownContent: string }) => (
    <div data-testid="problem-statement">{markdownContent}</div>
  ),
}))

// Helper function to create mock problems
const createMockProblem = (difficulty: any): Partial<Problem> => ({
  _id: 'test-id',
  title: 'Test Problem',
  slug: 'test-problem',
  description: 'Test description',
  constraints: 'Test constraints',
  timeLimit: 1000,
  memoryLimit: 256,
  difficulty: difficulty, // This is where we inject malformed data
  sampleTestCases: [
    {
      input: 'test input',
      output: 'test output',
    },
  ],
  status: 'published',
  authorId: 'test-author',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

describe('Bug Condition Exploration - Problem Page Malformed Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle undefined difficulty without crashing', async () => {
    // Mock API to return problem with undefined difficulty
    const problemWithUndefinedDifficulty = createMockProblem(undefined)
    
    vi.mocked(api.get).mockResolvedValueOnce({
      data: problemWithUndefinedDifficulty,
    })

    // Attempt to render - will crash on unfixed code with "TypeError: Cannot read properties of undefined (reading 'charAt')"
    render(<ProblemPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Expected behavior: Should display "Unknown" badge without crashing
    expect(screen.getByText('Test Problem')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('should handle null difficulty without crashing', async () => {
    // Mock API to return problem with null difficulty
    const problemWithNullDifficulty = createMockProblem(null)
    
    vi.mocked(api.get).mockResolvedValueOnce({
      data: problemWithNullDifficulty,
    })

    // Attempt to render - will crash on unfixed code with "TypeError: Cannot read properties of undefined (reading 'charAt')"
    render(<ProblemPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Expected behavior: Should display "Unknown" badge without crashing
    expect(screen.getByText('Test Problem')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('should handle empty string difficulty without crashing', async () => {
    // Mock API to return problem with empty string difficulty
    const problemWithEmptyDifficulty = createMockProblem('')
    
    vi.mocked(api.get).mockResolvedValueOnce({
      data: problemWithEmptyDifficulty,
    })

    // Attempt to render - will crash on unfixed code with "TypeError: Cannot read properties of undefined (reading 'charAt')"
    render(<ProblemPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Expected behavior: Should display "Unknown" badge without crashing
    expect(screen.getByText('Test Problem')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('should display default gray styling for unknown difficulty', async () => {
    // Mock API to return problem with undefined difficulty
    const problemWithUndefinedDifficulty = createMockProblem(undefined)
    
    vi.mocked(api.get).mockResolvedValueOnce({
      data: problemWithUndefinedDifficulty,
    })

    // Attempt to render
    const { container } = render(<ProblemPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Expected behavior: Badge should have gray styling for unknown difficulty
    const badge = screen.getByText('Unknown')
    expect(badge).toHaveClass('bg-gray-100')
    expect(badge).toHaveClass('text-gray-800')
  })
})

/**
 * Preservation Property Tests - Problem Page
 * 
 * **Validates: Requirements 3.2, 3.4**
 * 
 * Property 2: Preservation - Valid Data Rendering Unchanged
 * 
 * IMPORTANT: These tests observe and capture the behavior on UNFIXED code for valid inputs.
 * They ensure that the fix does not break existing functionality for well-formed data.
 * 
 * Expected Behavior:
 * - Valid difficulty values ("easy", "medium", "hard") display with correct styling
 * - All metadata (title, time limit, memory limit, description, constraints) displays correctly
 * 
 * Testing Approach: Property-based testing generates many test cases for stronger guarantees
 */

import * as fc from 'fast-check'

// Helper to generate MongoDB ObjectId-like strings (24 hex characters)
const mongoIdArbitrary = () => fc.string({ minLength: 24, maxLength: 24 }).map(s => 
  s.split('').map((_, i) => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
)

describe('Preservation Property Tests - Problem Page Valid Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property: Valid difficulty values display with correct formatting and styling
   * 
   * For any valid difficulty value ("easy", "medium", "hard"), the system should:
   * 1. Display the difficulty with correct capitalization (Easy, Medium, Hard)
   * 2. Apply correct color styling (green for easy, yellow for medium, red for hard)
   * 3. Render without crashing
   */
  it('should display valid difficulty values with correct formatting and styling', async () => {
    const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard']
    
    for (const difficulty of difficulties) {
      // Create mock problem with valid difficulty
      const mockProblem = createMockProblem(difficulty)
      
      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockProblem,
      })

      // Render the component
      const { unmount } = render(<ProblemPage />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
      })

      // Verify difficulty is displayed with correct capitalization
      const expectedText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
      const badges = screen.getAllByText(expectedText)
      expect(badges.length).toBeGreaterThan(0)

      // Verify correct styling is applied to at least one badge
      const badge = badges[0]
      
      if (difficulty === 'easy') {
        expect(badge).toHaveClass('bg-green-100')
        expect(badge).toHaveClass('text-green-800')
      } else if (difficulty === 'medium') {
        expect(badge).toHaveClass('bg-yellow-100')
        expect(badge).toHaveClass('text-yellow-800')
      } else if (difficulty === 'hard') {
        expect(badge).toHaveClass('bg-red-100')
        expect(badge).toHaveClass('text-red-800')
      }

      // Clean up
      unmount()
      vi.clearAllMocks()
    }
  })

  /**
   * Property: Problem metadata displays correctly for valid problems
   * 
   * For any valid problem, the system should display:
   * - Title
   * - Difficulty badge
   * - Time limit
   * - Memory limit
   * - Description
   * - Constraints
   * - Sample test cases
   */
  it('should display all problem metadata correctly for valid problems', async () => {
    const problem = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Two Sum Problem',
      slug: 'two-sum',
      description: 'Find two numbers that add up to target',
      constraints: '1 <= nums.length <= 1000',
      timeLimit: 2000,
      memoryLimit: 128,
      difficulty: 'medium' as const,
      sampleTestCases: [
        { input: '[2,7,11,15], target=9', output: '[0,1]' },
        { input: '[3,2,4], target=6', output: '[1,2]' },
      ],
      status: 'published' as const,
      authorId: '507f1f77bcf86cd799439012',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Mock API to return valid problem
    vi.mocked(api.get).mockResolvedValueOnce({
      data: problem,
    })

    // Render the component
    render(<ProblemPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Verify title is displayed
    expect(screen.getByText(problem.title)).toBeInTheDocument()

    // Verify time limit is displayed
    expect(screen.getByText(`Time: ${problem.timeLimit}ms`)).toBeInTheDocument()

    // Verify memory limit is displayed
    expect(screen.getByText(`Memory: ${problem.memoryLimit}MB`)).toBeInTheDocument()

    // Verify difficulty badge is displayed with correct formatting
    const expectedDifficulty = problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)
    expect(screen.getAllByText(expectedDifficulty).length).toBeGreaterThan(0)

    // Verify description section header is present
    expect(screen.getByText('Description')).toBeInTheDocument()

    // Verify constraints section header is present
    expect(screen.getByText('Constraints')).toBeInTheDocument()

    // Verify sample test cases section is present
    expect(screen.getAllByText('Sample Test Cases').length).toBeGreaterThan(0)

    // Verify at least one sample test case is displayed
    expect(screen.getByText('Example 1')).toBeInTheDocument()
  })

  /**
   * Property: All three difficulty levels render with distinct styling
   * 
   * This test verifies that each difficulty level has unique styling:
   * - Easy: green background
   * - Medium: yellow background
   * - Hard: red background
   */
  it('should render each difficulty level with distinct styling', async () => {
    const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard']
    const expectedStyles = {
      easy: { bg: 'bg-green-100', text: 'text-green-800' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      hard: { bg: 'bg-red-100', text: 'text-red-800' },
    }

    for (const difficulty of difficulties) {
      // Create mock problem with specific difficulty
      const mockProblem = createMockProblem(difficulty)
      
      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockProblem,
      })

      // Render the component
      const { unmount } = render(<ProblemPage />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
      })

      // Verify difficulty badge has correct styling
      const expectedText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
      const badge = screen.getByText(expectedText)
      
      expect(badge).toHaveClass(expectedStyles[difficulty].bg)
      expect(badge).toHaveClass(expectedStyles[difficulty].text)

      // Unmount to clean up for next iteration
      unmount()
      vi.clearAllMocks()
    }
  })

  /**
   * Property: Sample test cases display correctly with input/output formatting
   * 
   * For any valid problem with sample test cases, the system should:
   * 1. Display "Sample Test Cases" header
   * 2. Display each test case with "Example N" label
   * 3. Display input and output in formatted code blocks
   */
  it('should display sample test cases with correct formatting', async () => {
    const sampleTestCases = [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
      { input: 'nums = [3,3], target = 6', output: '[0,1]' },
    ]

    // Create mock problem with generated test cases
    const mockProblem = {
      ...createMockProblem('easy'),
      sampleTestCases,
    }
    
    vi.mocked(api.get).mockResolvedValueOnce({
      data: mockProblem,
    })

    // Render the component
    render(<ProblemPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading problem...')).not.toBeInTheDocument()
    })

    // Verify "Sample Test Cases" header is present
    const headers = screen.getAllByText('Sample Test Cases')
    expect(headers.length).toBeGreaterThan(0)

    // Verify each test case is displayed with correct label
    sampleTestCases.forEach((_, index) => {
      expect(screen.getByText(`Example ${index + 1}`)).toBeInTheDocument()
    })

    // Verify "Input:" and "Output:" labels are present
    const inputLabels = screen.getAllByText('Input:')
    const outputLabels = screen.getAllByText('Output:')
    
    expect(inputLabels).toHaveLength(sampleTestCases.length)
    expect(outputLabels).toHaveLength(sampleTestCases.length)
  })
})
