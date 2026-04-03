// TypeScript type definitions

export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'problem_setter' | 'contestant'
  createdAt: string
  updatedAt: string
}

export interface Problem {
  id: string
  title: string
  slug: string
  description: string
  constraints: string
  timeLimit: number
  memoryLimit: number
  difficulty: 'easy' | 'medium' | 'hard'
  sampleTestCases: TestCase[]
  status: 'draft' | 'published' | 'rejected'
  authorId: string
  createdAt: string
  updatedAt: string
}

export interface TestCase {
  input: string
  output: string
}

export interface Submission {
  id: string
  userId: string
  problemId: string
  contestId?: string
  language: 'cpp' | 'python'
  code: string
  verdict: 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE' | 'PENDING'
  executionTime?: number
  memoryUsed?: number
  compilerError?: string
  createdAt: string
}

export interface Contest {
  id: string
  title: string
  status: 'upcoming' | 'ongoing' | 'ended'
  startTime: string
  endTime: string
  problemIds: string[]
  participants: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ContestScore {
  id: string
  contestId: string
  userId: string
  totalScore: number
  problemScores: ProblemScore[]
  updatedAt: string
}

export interface ProblemScore {
  problemId: string
  solved: boolean
  attempts: number
  firstAcTime?: number
  penalty: number
}

export interface Hint {
  id: string
  userId: string
  problemId: string
  hintText: string
  hintIndex: number
  createdAt: string
}
