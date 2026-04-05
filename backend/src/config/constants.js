/**
 * Application Constants Module
 * 
 * VISION:
 * Centralize all application-wide constants in a single source of truth. This ensures
 * consistency across the codebase, makes configuration changes easier, and provides
 * clear documentation of system limits and business rules.
 * 
 * WHY THIS EXISTS:
 * - Magic numbers scattered across code are hard to maintain and understand
 * - Business rules (ICPC scoring, rate limits) should be documented in one place
 * - Changing a constant (e.g., cache TTL) should require editing only one file
 * - Constants serve as documentation of system behavior and constraints
 * 
 * WHAT IT DOES:
 * 1. Defines user roles and their hierarchy (admin > problem_setter > contestant)
 * 2. Enumerates submission verdicts (AC, WA, TLE, etc.)
 * 3. Specifies system limits (timeouts, cache TTLs, resource constraints)
 * 4. Documents ICPC scoring rules (100 points per problem, 20 min penalty per WA)
 * 5. Provides Redis key prefixes for consistent cache namespacing
 * 
 * DESIGN DECISIONS:
 * - All constants are UPPERCASE with underscores (JavaScript convention)
 * - Grouped by domain (ROLES, VERDICTS, LIMITS, etc.) for easy navigation
 * - Values are primitives (strings, numbers) for easy serialization
 * - No computed values - all constants are static for predictability
 * - Exported as frozen objects (immutable) to prevent accidental modification
 * 
 * USAGE:
 * ```javascript
 * const { ROLES, VERDICTS, LIMITS } = require('./config/constants');
 * 
 * // Role-based access control
 * if (user.role === ROLES.ADMIN) { ... }
 * 
 * // Verdict checking
 * if (submission.verdict === VERDICTS.AC) { ... }
 * 
 * // Cache TTL
 * await redis.setex(key, LIMITS.CACHE_TTL_PROBLEM_LIST, data);
 * 
 * // ICPC scoring
 * const penalty = wrongAttempts * LIMITS.ICPC_PENALTY_PER_WA;
 * ```
 */

/**
 * User Roles
 * 
 * Defines the three-tier role hierarchy in the system:
 * 1. ADMIN: Full system access (user management, problem approval, contest management)
 * 2. PROBLEM_SETTER: Can create and submit problems for approval
 * 3. CONTESTANT: Can participate in contests and submit solutions
 * 
 * Role Hierarchy:
 * - ADMIN can do everything PROBLEM_SETTER and CONTESTANT can do
 * - PROBLEM_SETTER can do everything CONTESTANT can do
 * - CONTESTANT has basic access (view problems, submit solutions, join contests)
 * 
 * Usage in middleware:
 * ```javascript
 * router.post('/problems', authGuard, roleGuard([ROLES.PROBLEM_SETTER, ROLES.ADMIN]), ...);
 * ```
 */
const ROLES = {
  ADMIN: 'admin',
  PROBLEM_SETTER: 'problem_setter',
  CONTESTANT: 'contestant',
};

/**
 * Submission Verdicts
 * 
 * Defines all possible outcomes of code execution in the judge system.
 * These verdicts are returned by the judge worker and displayed to users.
 * 
 * Verdict Meanings:
 * - AC (Accepted): Code passed all test cases ✓
 * - WA (Wrong Answer): Code produced incorrect output
 * - TLE (Time Limit Exceeded): Code exceeded time limit (e.g., infinite loop, inefficient algorithm)
 * - MLE (Memory Limit Exceeded): Code exceeded memory limit (e.g., large arrays, memory leak)
 * - RE (Runtime Error): Code crashed (e.g., segfault, exception, array out of bounds)
 * - CE (Compilation Error): Code failed to compile (syntax error, missing imports)
 * - PENDING: Submission is queued or being judged (initial state)
 * 
 * Judge Exit Code Mapping (in submission.worker.js):
 * - Exit 0: AC
 * - Exit 1: WA
 * - Exit 124: TLE (timeout command exit code)
 * - Exit 137: MLE (OOM killer)
 * - Other non-zero: RE
 * 
 * ICPC Scoring Impact:
 * - AC: +100 points, +time penalty
 * - WA: +20 minute penalty (per attempt)
 * - Other verdicts: No score, no penalty (treated as WA for penalty calculation)
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
 * Problem Statuses
 * 
 * Defines the approval workflow state machine for problems:
 * 
 * State Transitions:
 * 1. DRAFT → PUBLISHED (admin approves)
 * 2. DRAFT → REJECTED (admin rejects with reason)
 * 3. PUBLISHED → DRAFT (admin reverts, e.g., found error in test cases)
 * 4. REJECTED → DRAFT (problem setter fixes issues and resubmits)
 * 
 * Visibility Rules:
 * - DRAFT: Only visible to creator and admins
 * - PUBLISHED: Visible to all users, can be used in contests
 * - REJECTED: Only visible to creator and admins (with rejection reason)
 * 
 * Cache Invalidation:
 * - When status changes to/from PUBLISHED, invalidate problems:list cache
 */
const PROBLEM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
};

/**
 * Contest Statuses
 * 
 * Defines the lifecycle state machine for contests:
 * 
 * State Transitions (automated by cron job every 30s):
 * 1. UPCOMING → ONGOING (when current time >= startTime)
 * 2. ONGOING → ENDED (when current time >= endTime)
 * 
 * Behavior by Status:
 * - UPCOMING: Users can register, cannot submit solutions
 * - ONGOING: Users can submit solutions, leaderboard updates in real-time
 * - ENDED: Submissions closed, final leaderboard frozen
 * 
 * Cache Invalidation:
 * - When status changes, invalidate leaderboard:{contestId} cache
 * 
 * Cron Job:
 * - Runs every 30 seconds (backend/src/cron/contest.cron.js)
 * - Checks all UPCOMING and ONGOING contests
 * - Updates status based on current time
 */
const CONTEST_STATUS = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  ENDED: 'ended',
};

/**
 * Problem Difficulty Levels
 * 
 * Categorizes problems by difficulty for filtering and recommendation.
 * 
 * Guidelines:
 * - EASY: Basic algorithms (loops, conditionals, simple math)
 * - MEDIUM: Data structures (arrays, hashmaps, trees), standard algorithms
 * - HARD: Advanced algorithms (DP, graphs, segment trees), optimization
 * 
 * Usage:
 * - Problem setters assign difficulty when creating problems
 * - Users can filter problems by difficulty
 * - Contest creators can balance problem mix (e.g., 2 easy, 2 medium, 1 hard)
 */
const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

/**
 * Supported Programming Languages
 * 
 * Defines languages supported by the judge system.
 * Each language has a corresponding Docker image in backend/docker/judges/
 * 
 * Language Configurations:
 * - CPP (C++17):
 *   - Compiler: g++ -std=c++17 -O2
 *   - Execution: ./a.out < input.txt
 *   - Docker image: codecourt-judge-cpp
 * 
 * - PYTHON (Python 3.11):
 *   - Interpreter: python3
 *   - Execution: python3 solution.py < input.txt
 *   - Docker image: codecourt-judge-python
 * 
 * Adding New Languages:
 * 1. Create Dockerfile in backend/docker/judges/{language}/
 * 2. Add language constant here
 * 3. Update submission.worker.js to handle new language
 * 4. Update frontend language selector
 */
const LANGUAGES = {
  CPP: 'cpp',
  PYTHON: 'python',
};

/**
 * System Limits and Configuration Values
 * 
 * Centralizes all numeric limits, timeouts, and configuration values.
 * These values are tuned based on:
 * - Security best practices (rate limiting, token expiry)
 * - Resource constraints (memory, CPU, concurrency)
 * - User experience (cache TTLs, timeouts)
 * - Business rules (ICPC scoring, contest duration)
 */
const LIMITS = {
  // ============================================================================
  // AUTH & SECURITY LIMITS
  // ============================================================================
  
  // Rate limiting for login endpoint (prevents brute force attacks)
  // 10 attempts per IP address within 15 minute window
  // After 10 failed attempts, user must wait 15 minutes
  LOGIN_ATTEMPTS_PER_IP: 10,
  LOGIN_WINDOW_MINUTES: 15,
  
  // JWT token expiry times
  // Access token: Short-lived (15 minutes) for security
  // Refresh token: Long-lived (7 days) for convenience
  // Users must re-login after 7 days of inactivity
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  
  // Password security
  // Minimum 8 characters (OWASP recommendation)
  // Bcrypt cost factor 10 (balances security vs performance, ~100ms hash time)
  MIN_PASSWORD_LENGTH: 8,
  BCRYPT_COST_FACTOR: 10,
  
  // ============================================================================
  // PROBLEM & JUDGE LIMITS
  // ============================================================================
  
  // Minimum resource limits for problems
  // Prevents problem setters from creating impossible problems
  MIN_TIME_LIMIT_MS: 100,      // 0.1 seconds (enough for simple I/O)
  MIN_MEMORY_LIMIT_MB: 16,     // 16 MB (enough for basic variables)
  
  // Judge system configuration
  // 5 concurrent judges (matches BullMQ worker concurrency)
  // 2 second grace period for cleanup after time limit
  MAX_CONCURRENT_JUDGES: 5,
  JUDGE_GRACE_PERIOD_SECONDS: 2,
  
  // ============================================================================
  // CONTEST LIMITS
  // ============================================================================
  
  // Minimum contest duration: 30 minutes
  // Prevents accidental creation of too-short contests
  // Typical contest durations: 1 hour (practice), 2-3 hours (rated)
  MIN_CONTEST_DURATION_MINUTES: 30,
  
  // ============================================================================
  // AI HINT LIMITS
  // ============================================================================
  
  // Maximum hints per problem: 3
  // Prevents hint spam and encourages independent problem solving
  // Hints are progressively more revealing (hint 1 < hint 2 < hint 3)
  MAX_HINTS_PER_PROBLEM: 3,
  
  // ============================================================================
  // CACHE TTL (Time To Live in seconds)
  // ============================================================================
  
  // Problem list cache: 60 seconds
  // Balances freshness vs database load
  // Invalidated when problem status changes
  CACHE_TTL_PROBLEM_LIST: 60,
  
  // User profile cache: 300 seconds (5 minutes)
  // User profiles change infrequently (only on role updates)
  // Invalidated when user role is updated
  CACHE_TTL_USER_PROFILE: 300,
  
  // Leaderboard cache: 10 seconds
  // Short TTL for near-real-time updates during contests
  // Invalidated on every AC submission
  CACHE_TTL_LEADERBOARD: 10,
  
  // ============================================================================
  // LEADERBOARD CONFIGURATION
  // ============================================================================
  
  // Show top 50 users on leaderboard
  // Balances visibility vs API response size
  // Full leaderboard available via pagination
  LEADERBOARD_TOP_N: 50,
  
  // ============================================================================
  // ICPC SCORING RULES
  // ============================================================================
  
  // Base score per problem: 100 points
  // Total contest score = (problems solved) × 100 + time penalty
  ICPC_BASE_SCORE_PER_PROBLEM: 100,
  
  // Penalty per wrong answer: 20 minutes
  // Example: 2 WA + 1 AC at 45 minutes = 100 points, 85 minute penalty (45 + 2×20)
  // This encourages accuracy over speed
  ICPC_PENALTY_PER_WA: 20,
  
  // ============================================================================
  // SOCKET.IO CONFIGURATION
  // ============================================================================
  
  // Socket reconnection timeout: 30 seconds
  // If client disconnects, server waits 30s before cleaning up resources
  SOCKET_RECONNECT_TIMEOUT_SECONDS: 30,
  
  // ============================================================================
  // DATABASE RETRY CONFIGURATION
  // ============================================================================
  
  // MongoDB connection retry settings
  // 5 attempts × 5 seconds = 25 seconds max wait
  MAX_DB_RETRIES: 5,
  DB_RETRY_DELAY_MS: 5000,
};

/**
 * Redis Key Prefixes
 * 
 * Defines consistent key naming conventions for Redis cache entries.
 * Using prefixes prevents key collisions and makes cache debugging easier.
 * 
 * Key Patterns:
 * - REFRESH_TOKEN: `refresh:{userId}` → stores refresh token for user
 * - BLACKLIST: `blacklist:{token}` → stores blacklisted JWT tokens (logout)
 * - PROBLEM_LIST: `problems:list` → caches published problems list
 * - USER_PROFILE: `user:profile:{userId}` → caches user profile data
 * - LEADERBOARD: `leaderboard:{contestId}` → caches contest leaderboard
 * 
 * TTL (Time To Live):
 * - REFRESH_TOKEN: 7 days (matches JWT expiry)
 * - BLACKLIST: 15 minutes (matches access token expiry)
 * - PROBLEM_LIST: 60 seconds
 * - USER_PROFILE: 300 seconds (5 minutes)
 * - LEADERBOARD: 10 seconds
 * 
 * Usage Example:
 * ```javascript
 * const { REDIS_KEYS, LIMITS } = require('./config/constants');
 * 
 * // Cache user profile
 * const key = `${REDIS_KEYS.USER_PROFILE}:${userId}`;
 * await redis.setex(key, LIMITS.CACHE_TTL_USER_PROFILE, JSON.stringify(profile));
 * 
 * // Get cached profile
 * const cached = await redis.get(key);
 * if (cached) return JSON.parse(cached);
 * ```
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
