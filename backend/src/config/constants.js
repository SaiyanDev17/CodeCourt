// Application constants
// Defines roles, verdicts, limits, and other application-wide constants

/**
 * User roles
 */
const ROLES = {
  ADMIN: 'admin',
  PROBLEM_SETTER: 'problem_setter',
  CONTESTANT: 'contestant',
};

/**
 * Submission verdicts
 */
const VERDICTS = {
  AC: 'AC',       // Accepted
  WA: 'WA',       // Wrong Answer
  TLE: 'TLE',     // Time Limit Exceeded
  MLE: 'MLE',     // Memory Limit Exceeded
  RE: 'RE',       // Runtime Error
  CE: 'CE',       // Compilation Error
  PENDING: 'PENDING', // Awaiting judgment
};

/**
 * Problem statuses
 */
const PROBLEM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
};

/**
 * Contest statuses
 */
const CONTEST_STATUS = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  ENDED: 'ended',
};

/**
 * Problem difficulty levels
 */
const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

/**
 * Supported programming languages
 */
const LANGUAGES = {
  CPP: 'cpp',
  PYTHON: 'python',
};

/**
 * System limits
 */
const LIMITS = {
  // Auth limits
  LOGIN_ATTEMPTS_PER_IP: 10,
  LOGIN_WINDOW_MINUTES: 15,
  
  // Token expiry
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  
  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  BCRYPT_COST_FACTOR: 10,
  
  // Problem limits
  MIN_TIME_LIMIT_MS: 100,
  MIN_MEMORY_LIMIT_MB: 16,
  
  // Contest limits
  MIN_CONTEST_DURATION_MINUTES: 30,
  
  // Judge limits
  MAX_CONCURRENT_JUDGES: 5,
  JUDGE_GRACE_PERIOD_SECONDS: 2,
  
  // AI hint limits
  MAX_HINTS_PER_PROBLEM: 3,
  
  // Cache TTL (seconds)
  CACHE_TTL_PROBLEM_LIST: 60,
  CACHE_TTL_USER_PROFILE: 300,
  CACHE_TTL_LEADERBOARD: 10,
  
  // Leaderboard
  LEADERBOARD_TOP_N: 50,
  
  // ICPC scoring
  ICPC_BASE_SCORE_PER_PROBLEM: 100,
  ICPC_PENALTY_PER_WA: 20, // minutes
  
  // Socket reconnection
  SOCKET_RECONNECT_TIMEOUT_SECONDS: 30,
  
  // MongoDB retry
  MAX_DB_RETRIES: 5,
  DB_RETRY_DELAY_MS: 5000,
};

/**
 * Redis key prefixes
 */
const REDIS_KEYS = {
  REFRESH_TOKEN: 'refresh',
  BLACKLIST: 'blacklist',
  PROBLEM_LIST: 'problems:list',
  USER_PROFILE: 'user:profile',
  LEADERBOARD: 'leaderboard',
};

module.exports = {
  ROLES,
  VERDICTS,
  PROBLEM_STATUS,
  CONTEST_STATUS,
  DIFFICULTY,
  LANGUAGES,
  LIMITS,
  REDIS_KEYS,
};
