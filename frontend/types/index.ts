// Core TypeScript types for CodeCourt
// These interfaces mirror the backend Mongoose models to ensure type safety across the stack

// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'admin' | 'problem_setter' | 'contestant';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Problem Types
// ============================================================================

export type ProblemDifficulty = 'easy' | 'medium' | 'hard';
export type ProblemStatus = 'draft' | 'published' | 'rejected';

export interface SampleTestCase {
  input: string;
  output: string;
}

export interface Problem {
  _id: string;
  id?: string; // Optional alias for _id (used in some contexts)
  title: string;
  slug: string;
  description: string;
  constraints: string;
  timeLimit: number; // milliseconds
  memoryLimit: number; // megabytes
  difficulty: ProblemDifficulty;
  sampleTestCases: SampleTestCase[];
  hiddenTestCasesS3Key?: string | null;
  status: ProblemStatus;
  rejectionReason?: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Submission Types
// ============================================================================

export type SubmissionLanguage = 'cpp' | 'python';
export type SubmissionVerdict = 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE' | 'PENDING';

export interface Submission {
  _id: string;
  userId: string;
  problemId: string;
  contestId: string | null;
  language: SubmissionLanguage;
  code: string;
  verdict: SubmissionVerdict;
  executionTime: number | null; // milliseconds
  memoryUsed: number | null; // megabytes
  compilerError: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Contest Types
// ============================================================================

export type ContestStatus = 'upcoming' | 'ongoing' | 'ended';

export interface Contest {
  _id: string;
  title: string;
  status: ContestStatus;
  startTime: string;
  endTime: string;
  problemIds: string[];
  participants: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemScore {
  problemId: string;
  solved: boolean;
  attempts: number;
  firstAcTime: number | null; // minutes from contest start
  penalty: number; // 20 * attempts + firstAcTime
}

export interface ContestScore {
  _id: string;
  contestId: string;
  userId: string;
  totalScore: number;
  problemScores: ProblemScore[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalScore: number;
  problemScores: ProblemScore[];
}

// ============================================================================
// AI Hint Types
// ============================================================================

export interface Hint {
  _id: string;
  userId: string;
  problemId: string;
  hintText: string;
  hintIndex: number;
  createdAt: string;
}

export interface HintRequest {
  userId: string;
  problemId: string;
  userCode: string;
  problemStatement: string;
}

export interface HintResponse {
  hint: string;
  hints_used?: number;
  hints_remaining?: number;
  hint_index?: number;
  hintsUsed?: number;
  hintsRemaining?: number;
  hintIndex?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Auth API responses
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

// ============================================================================
// Socket.io Event Types
// ============================================================================

export interface VerdictEvent {
  submissionId: string;
  verdict: SubmissionVerdict;
  executionTime: number | null;
  memoryUsed: number | null;
  compilerError: string | null;
}

export interface LeaderboardUpdateEvent {
  contestId: string;
  leaderboard: LeaderboardEntry[];
}

// ============================================================================
// Form Types
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SubmissionFormData {
  problemId: string;
  language: SubmissionLanguage;
  code: string;
  contestId?: string;
}

export interface ProblemFormData {
  title: string;
  slug: string;
  description: string;
  constraints: string;
  timeLimit: number;
  memoryLimit: number;
  difficulty: ProblemDifficulty;
  sampleTestCases: SampleTestCase[];
}
