/**
 * Contest Models
 * 
 * VISION:
 * Provide a robust contest management system with automatic state transitions,
 * ICPC-style scoring, and real-time leaderboard tracking. This model serves as
 * the foundation for competitive programming contests with time-bound problem solving.
 * 
 * WHY THIS EXISTS:
 * Competitive programming platforms need to support time-bound contests where:
 * 1. Multiple users compete simultaneously on a shared problem set
 * 2. Rankings are determined by problems solved and time penalties (ICPC rules)
 * 3. Contest state automatically transitions (upcoming → ongoing → ended)
 * 4. Leaderboards update in real-time as submissions are judged
 * 5. Participants must register before competing
 * 
 * WHAT IT DOES:
 * This file defines two Mongoose schemas:
 * 
 * 1. Contest Schema:
 *    - Stores contest metadata (title, time bounds, problems, participants)
 *    - Implements status state machine (upcoming → ongoing → ended)
 *    - Tracks contest creator and participant registrations
 *    - Provides indexes for efficient status and time-based queries
 * 
 * 2. ContestScore Schema:
 *    - Tracks individual participant scores within a contest
 *    - Implements ICPC scoring algorithm (problems solved + time penalties)
 *    - Stores per-problem statistics (solved, attempts, first AC time, penalty)
 *    - Enables fast leaderboard queries with compound indexes
 * 
 * DESIGN DECISIONS:
 * 1. **Contest Status State Machine**:
 *    - upcoming: Contest not yet started (startTime > now)
 *    - ongoing: Contest in progress (startTime <= now < endTime)
 *    - ended: Contest finished (endTime <= now)
 *    - Transitions handled by cron job (backend/src/cron/contest.cron.js)
 *    - Alternative: Could use virtual fields, but explicit status enables caching
 * 
 * 2. **Separate Score Collection**:
 *    - ContestScore is a separate collection (not embedded in Contest)
 *    - Rationale: Enables efficient leaderboard queries without loading full contest
 *    - Trade-off: Requires join queries, but leaderboard performance is critical
 *    - Unique index on {contestId, userId} prevents duplicate score records
 * 
 * 3. **ICPC Scoring Algorithm**:
 *    - totalScore = problems solved (primary ranking factor)
 *    - penalty = sum of (firstAcTime + 20 * wrongAttempts) for each solved problem
 *    - Ranking: Sort by totalScore DESC, then penalty ASC (lower penalty is better)
 *    - Time measured in minutes from contest start (not absolute timestamps)
 * 
 * 4. **Problem Scores Array**:
 *    - Each participant has array of per-problem statistics
 *    - Tracks: solved status, attempts, first AC time, penalty
 *    - Enables detailed analytics (which problems are hardest, attempt distribution)
 *    - Updated incrementally as submissions are judged
 * 
 * 5. **Participant Registration**:
 *    - Users must register before submitting (participants array)
 *    - Prevents unauthorized submissions to private contests
 *    - Enables participant count tracking and notifications
 * 
 * 6. **Time Bounds Validation**:
 *    - Minimum contest duration: 30 minutes (enforced in service layer)
 *    - startTime must be before endTime (enforced by application logic)
 *    - No maximum duration (supports multi-day contests)
 * 
 * USAGE:
 * ```javascript
 * const { Contest, ContestScore } = require('./model');
 * 
 * // Create a new contest
 * const contest = await Contest.create({
 *   title: 'Weekly Contest #42',
 *   status: 'upcoming',
 *   startTime: new Date('2024-01-15T10:00:00Z'),
 *   endTime: new Date('2024-01-15T12:00:00Z'),
 *   problemIds: [problemId1, problemId2, problemId3],
 *   participants: [],
 *   createdBy: adminUserId
 * });
 * 
 * // Register a participant
 * await Contest.findByIdAndUpdate(contestId, {
 *   $addToSet: { participants: userId }
 * });
 * 
 * // Initialize score record for participant
 * await ContestScore.create({
 *   contestId: contestId,
 *   userId: userId,
 *   totalScore: 0,
 *   problemScores: contest.problemIds.map(pid => ({
 *     problemId: pid,
 *     solved: false,
 *     attempts: 0,
 *     firstAcTime: null,
 *     penalty: 0
 *   }))
 * });
 * 
 * // Update score after AC submission
 * const score = await ContestScore.findOne({ contestId, userId });
 * const problemScore = score.problemScores.find(ps => 
 *   ps.problemId.equals(problemId)
 * );
 * if (!problemScore.solved) {
 *   problemScore.solved = true;
 *   problemScore.firstAcTime = minutesFromStart;
 *   problemScore.penalty = 20 * problemScore.attempts + minutesFromStart;
 *   score.totalScore += 1;
 *   await score.save();
 * }
 * 
 * // Get leaderboard (uses index for fast sorting)
 * const leaderboard = await ContestScore.find({ contestId })
 *   .populate('userId', 'username')
 *   .sort({ totalScore: -1, penalty: 1 })
 *   .limit(100);
 * ```
 */

const mongoose = require('mongoose');

/**
 * Contest Schema Definition
 * 
 * Fields:
 * - title: Display name of the contest
 * - status: Current state (upcoming, ongoing, ended)
 * - startTime: When the contest begins (UTC timestamp)
 * - endTime: When the contest ends (UTC timestamp)
 * - problemIds: Array of problems included in the contest
 * - participants: Array of registered users who can submit
 * - createdBy: Admin/problem_setter who created the contest
 * - createdAt: Contest creation timestamp (auto-generated)
 * - updatedAt: Last modification timestamp (auto-generated)
 */
const contestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true, // Remove leading/trailing whitespace
      // Example: "Weekly Contest #42", "Codeforces Round 850"
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'ended'], // Contest state machine
      default: 'upcoming',
      // Contest Status State Machine:
      // 
      // State Definitions:
      // - upcoming: Contest not yet started (current time < startTime)
      //   - Users can view contest details and register
      //   - Users CANNOT submit solutions
      //   - Leaderboard is empty
      // 
      // - ongoing: Contest in progress (startTime <= current time < endTime)
      //   - Users can submit solutions to contest problems
      //   - Leaderboard updates in real-time as submissions are judged
      //   - New users can still register and participate
      // 
      // - ended: Contest finished (current time >= endTime)
      //   - Users CANNOT submit solutions (submissions rejected)
      //   - Leaderboard is frozen (final standings)
      //   - Contest results are immutable
      // 
      // State Transitions (automatic via cron job):
      // 1. upcoming → ongoing: Triggered when current time >= startTime
      //    - Cron job: backend/src/cron/contest.cron.js (runs every 30 seconds)
      //    - Query: { status: 'upcoming', startTime: { $lte: now } }
      //    - Effect: Users can now submit solutions
      // 
      // 2. ongoing → ended: Triggered when current time >= endTime
      //    - Cron job: backend/src/cron/contest.cron.js (runs every 30 seconds)
      //    - Query: { status: 'ongoing', endTime: { $lte: now } }
      //    - Effect: Submissions blocked, leaderboard cache invalidated
      // 
      // State Machine Invariants:
      // - Contests can only transition forward (never backward)
      // - No state can be skipped (must go: upcoming → ongoing → ended)
      // - Once 'ended', status never changes again
      // - Transitions are time-based (not manual)
      // 
      // Example Timeline:
      // - 10:00 AM: Contest created (status='upcoming', startTime=10:30, endTime=11:30)
      // - 10:30 AM: Cron detects startTime reached → status='ongoing'
      // - 11:30 AM: Cron detects endTime reached → status='ended'
    },
    startTime: {
      type: Date,
      required: true,
      // UTC timestamp when contest begins
      // Users can only submit during [startTime, endTime)
      // Must be before endTime (validated in service layer)
    },
    endTime: {
      type: Date,
      required: true,
      // UTC timestamp when contest ends
      // Submissions after endTime are rejected
      // Must be at least 30 minutes after startTime (validated in service layer)
    },
    problemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem',
        // Array of problems included in this contest
        // Problems must be in 'published' status
        // Order matters: displayed to users in this order
        // Typically 3-6 problems per contest
      },
    ],
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // Array of users registered for this contest
        // Users must register before submitting solutions
        // Registration can happen before or during contest
        // Used to track participant count and send notifications
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // Admin or problem_setter who created the contest
      // Used for ownership checks and audit trail
      // Only creator or admins can modify contest
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

/**
 * Contest Database Indexes
 * 
 * These indexes optimize common query patterns:
 * - status index: Fast filtering for active/upcoming contests
 * - startTime index: Chronological contest listings
 * - endTime index: Finding contests that need state transitions
 * - createdBy index: "My contests" page for admins/problem_setters
 * 
 * Performance impact:
 * - Without index: O(n) full collection scan
 * - With index: O(log n) B-tree lookup
 */
contestSchema.index({ status: 1 }); // Filter by status (upcoming/ongoing/ended)
contestSchema.index({ startTime: 1 }); // Sort contests chronologically
contestSchema.index({ endTime: 1 }); // Find contests needing state transition (cron job)
contestSchema.index({ createdBy: 1 }); // Query contests by creator

/**
 * ContestScore Schema Definition
 * 
 * Purpose: Tracks individual participant performance within a contest using ICPC scoring rules
 * 
 * ICPC Scoring Algorithm Explained:
 * The International Collegiate Programming Contest (ICPC) uses a two-factor ranking system:
 * 
 * 1. Primary Factor - totalScore (number of problems solved):
 *    - Higher is better (more problems solved = higher rank)
 *    - Range: 0 to contest.problemIds.length
 *    - A problem is "solved" when user gets first AC (Accepted) verdict
 *    - Subsequent AC submissions on same problem don't increase score
 * 
 * 2. Tie-Breaker - penalty (time + wrong attempt penalties):
 *    - Lower is better (less time/mistakes = higher rank)
 *    - Only applies to SOLVED problems (unsolved problems contribute 0 penalty)
 *    - Formula for each solved problem:
 *      penalty = firstAcTime + ICPC_PENALTY_PER_WA * wrongAttempts
 *      where:
 *        - firstAcTime = minutes elapsed from contest start to first AC
 *        - ICPC_PENALTY_PER_WA = 20 minutes (constant from backend/src/config/constants.js)
 *        - wrongAttempts = number of non-AC submissions before first AC
 * 
 * 3. Total Penalty Calculation:
 *    - Sum penalties across all solved problems
 *    - Example: User solves 3 problems:
 *      Problem A: AC at 15 min, 1 attempt → penalty = 15 + 20*0 = 15
 *      Problem B: AC at 45 min, 3 attempts → penalty = 45 + 20*2 = 85
 *      Problem C: AC at 60 min, 2 attempts → penalty = 60 + 20*1 = 80
 *      Total: totalScore = 3, penalty = 15 + 85 + 80 = 180
 * 
 * 4. Ranking Logic:
 *    - Sort by totalScore DESC (more problems = better)
 *    - If tied, sort by penalty ASC (less penalty = better)
 *    - If still tied, sort by userId (deterministic tie-breaking)
 * 
 * 5. Real-World Example:
 *    Leaderboard during contest:
 *    Rank | User    | Solved | Penalty | Explanation
 *    -----|---------|--------|---------|------------------------------------------
 *    1    | Alice   | 5      | 250     | Solved all 5, fast with few mistakes
 *    2    | Bob     | 5      | 320     | Solved all 5, but slower/more mistakes
 *    3    | Charlie | 4      | 180     | Solved 4 problems efficiently
 *    4    | Dave    | 4      | 200     | Solved 4, but with more penalty
 *    5    | Eve     | 3      | 150     | Solved only 3 problems
 * 
 * Fields:
 * - contestId: Reference to the Contest
 * - userId: Reference to the participant User
 * - totalScore: Number of problems solved (0 to problemIds.length)
 * - problemScores: Array of per-problem statistics (see detailed comments below)
 * - createdAt: Score record creation timestamp (auto-generated)
 * - updatedAt: Last score update timestamp (auto-generated)
 */
const contestScoreSchema = new mongoose.Schema(
  {
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest',
      required: true,
      // Links this score record to a specific contest
      // Used in leaderboard queries and score updates
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // Links this score record to a specific participant
      // Populated in leaderboard queries to show username
    },
    totalScore: {
      type: Number,
      default: 0,
      // Number of problems solved (AC submissions)
      // Primary ranking factor in ICPC scoring
      // Range: 0 to contest.problemIds.length
      // Incremented when user gets first AC on a problem
    },
    problemScores: [
      // Per-Problem Score Tracking Array
      // 
      // Structure: One entry per problem in the contest
      // - Initialized when user registers for contest
      // - Length equals contest.problemIds.length
      // - Order matches contest.problemIds order
      // - Updated incrementally as user submits solutions
      // 
      // Purpose:
      // 1. Track which problems user has solved
      // 2. Calculate ICPC penalty for each problem
      // 3. Enable detailed analytics (hardest problems, attempt distribution)
      // 4. Support partial scoring and progress tracking
      // 
      // Update Flow (when submission is judged):
      // 1. Find problemScore entry matching submission.problemId
      // 2. Increment attempts counter (regardless of verdict)
      // 3. If verdict is AC and !solved:
      //    a. Set solved = true
      //    b. Set firstAcTime = (submission.createdAt - contest.startTime) in minutes
      //    c. Calculate penalty = firstAcTime + 20 * (attempts - 1)
      //    d. Increment parent totalScore by 1
      // 4. If verdict is AC and solved:
      //    - Do nothing (duplicate AC, no score change)
      // 5. If verdict is not AC:
      //    - Only increment attempts (penalty calculated later if AC achieved)
      // 
      // Example Lifecycle:
      // Initial state (user just registered):
      //   { problemId: A, solved: false, attempts: 0, firstAcTime: null, penalty: 0 }
      // 
      // After WA submission at 10 minutes:
      //   { problemId: A, solved: false, attempts: 1, firstAcTime: null, penalty: 0 }
      // 
      // After another WA at 25 minutes:
      //   { problemId: A, solved: false, attempts: 2, firstAcTime: null, penalty: 0 }
      // 
      // After AC at 45 minutes:
      //   { problemId: A, solved: true, attempts: 3, firstAcTime: 45, penalty: 85 }
      //   Penalty calculation: 45 + 20*(3-1) = 45 + 40 = 85
      // 
      // After another AC at 60 minutes (duplicate):
      //   { problemId: A, solved: true, attempts: 4, firstAcTime: 45, penalty: 85 }
      //   Note: attempts incremented, but solved/firstAcTime/penalty unchanged
      {
        problemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Problem',
          required: true,
          // Which problem this score entry tracks
          // Must be one of contest.problemIds
          // Used to match submissions to score entries
        },
        solved: {
          type: Boolean,
          default: false,
          // Has user achieved AC (Accepted) on this problem?
          // 
          // State Transitions:
          // - false → true: When user gets first AC verdict
          // - true → true: Remains true forever (immutable once solved)
          // - true → false: NEVER (no way to "unsolve" a problem)
          // 
          // Usage:
          // - Prevents duplicate AC counting (totalScore incremented only once)
          // - Determines if penalty should be calculated (only for solved problems)
          // - Displayed in leaderboard (✓ or ✗ icon per problem)
          // 
          // Example:
          // - User submits WA, WA, AC, AC → solved becomes true after 3rd submission
          // - 4th submission (duplicate AC) doesn't change solved flag
        },
        attempts: {
          type: Number,
          default: 0,
          // Total number of submissions for this problem (all verdicts)
          // 
          // Incremented on EVERY submission:
          // - AC (Accepted) ✓
          // - WA (Wrong Answer) ✓
          // - TLE (Time Limit Exceeded) ✓
          // - MLE (Memory Limit Exceeded) ✓
          // - RE (Runtime Error) ✓
          // - CE (Compilation Error) ✓
          // 
          // Used to calculate penalty:
          // - wrongAttempts = attempts - 1 (when solved)
          // - penalty = firstAcTime + 20 * wrongAttempts
          // 
          // Example Timeline:
          // - Submit WA → attempts = 1
          // - Submit TLE → attempts = 2
          // - Submit WA → attempts = 3
          // - Submit AC → attempts = 4, wrongAttempts = 3, penalty = firstAcTime + 60
          // - Submit AC (duplicate) → attempts = 5, but penalty unchanged
          // 
          // Analytics Use Cases:
          // - Average attempts per problem (difficulty metric)
          // - Attempt distribution (histogram of 1, 2, 3+ attempts)
          // - Identify problems with high attempt counts (likely harder)
        },
        firstAcTime: {
          type: Number,
          default: null, // minutes from contest start
          // Time when user first achieved AC on this problem
          // 
          // Measurement:
          // - Unit: Minutes (integer)
          // - Reference point: contest.startTime
          // - Calculation: Math.floor((submission.createdAt - contest.startTime) / 60000)
          // - Null if problem not yet solved
          // 
          // Example:
          // - Contest starts: 2024-01-15 10:00:00 UTC
          // - User submits AC: 2024-01-15 10:45:30 UTC
          // - firstAcTime = floor((45.5 minutes)) = 45 minutes
          // 
          // Used in:
          // 1. Penalty calculation: penalty = firstAcTime + 20 * wrongAttempts
          // 2. Leaderboard tie-breaking: Lower total penalty ranks higher
          // 3. Analytics: Problem solve time distribution
          // 
          // Edge Cases:
          // - AC within first minute → firstAcTime = 0
          // - AC after contest ends → Should be rejected by submission service
          // - Multiple ACs → Only first AC time is recorded (subsequent ACs ignored)
          // 
          // Immutability:
          // - Once set (on first AC), never changes
          // - Duplicate ACs don't update this field
        },
        penalty: {
          type: Number,
          default: 0, // 20 * (attempts - 1) + firstAcTime
          // ICPC penalty for this problem (only applies to solved problems)
          // 
          // Formula:
          //   penalty = firstAcTime + ICPC_PENALTY_PER_WA * wrongAttempts
          //   where:
          //     - firstAcTime = minutes from contest start to first AC
          //     - ICPC_PENALTY_PER_WA = 20 (constant)
          //     - wrongAttempts = attempts - 1 (submissions before first AC)
          // 
          // Calculation Examples:
          // 
          // Example 1: Perfect solve (AC on first try at 30 minutes)
          //   attempts = 1, firstAcTime = 30
          //   penalty = 30 + 20*(1-1) = 30 + 0 = 30
          // 
          // Example 2: Two wrong attempts, then AC at 45 minutes
          //   attempts = 3, firstAcTime = 45
          //   penalty = 45 + 20*(3-1) = 45 + 40 = 85
          // 
          // Example 3: Many attempts, late solve at 120 minutes
          //   attempts = 7, firstAcTime = 120
          //   penalty = 120 + 20*(7-1) = 120 + 120 = 240
          // 
          // Example 4: Unsolved problem
          //   solved = false, attempts = 5
          //   penalty = 0 (no penalty for unsolved problems)
          // 
          // Penalty Impact on Ranking:
          // - Lower penalty is better (tie-breaker after totalScore)
          // - Encourages: Fast solves, fewer wrong submissions
          // - Discourages: Guessing, submitting without testing
          // 
          // Total Penalty:
          // - Sum of penalties across all solved problems
          // - Used in leaderboard sorting: ORDER BY totalScore DESC, penalty ASC
          // 
          // Immutability:
          // - Calculated once when problem is first solved
          // - Never changes after that (even if more submissions made)
          // - Duplicate ACs don't affect penalty
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

/**
 * ContestScore Database Indexes
 * 
 * These indexes are critical for contest performance, especially during live contests
 * with hundreds of participants and real-time leaderboard updates.
 * 
 * Index 1: Unique Constraint on {contestId, userId}
 * Purpose: Ensure each user has exactly one score record per contest
 * 
 * Why This Matters:
 * - Prevents duplicate score entries that would corrupt leaderboard
 * - Without this: User could have multiple score records, causing:
 *   * Incorrect totalScore (counted multiple times)
 *   * Leaderboard showing same user multiple times
 *   * Race conditions when updating scores from parallel submissions
 * 
 * Query Optimization:
 * - Fast lookup: "Find user X's score in contest Y"
 * - Query: ContestScore.findOne({ contestId, userId })
 * - Performance: O(log n) B-tree lookup instead of O(n) scan
 * - Example: 1000 participants → 10 comparisons instead of 500 average
 * 
 * Uniqueness Enforcement:
 * - MongoDB rejects duplicate inserts with E11000 error
 * - Application must handle this gracefully (use findOneAndUpdate instead)
 * - Prevents race conditions during concurrent score updates
 * 
 * Index Structure:
 * - Compound index: {contestId: 1, userId: 1}
 * - Order matters: contestId first (more selective)
 * - Unique: true (enforces one score per user per contest)
 * 
 * 
 * Index 2: Leaderboard Sorting on {contestId, totalScore DESC}
 * Purpose: Optimize leaderboard queries during live contests
 * 
 * Why This Matters:
 * - Leaderboard is the most frequently accessed feature during contests
 * - Updated every time a submission is judged (potentially 100s per minute)
 * - Must be fast (<100ms) to support real-time updates via Socket.io
 * - Without index: O(n log n) in-memory sort of all participants
 * - With index: O(log n) lookup + O(k) scan where k = limit (e.g., 100)
 * 
 * Query Pattern:
 * ```javascript
 * // Typical leaderboard query
 * const leaderboard = await ContestScore.find({ contestId })
 *   .populate('userId', 'username')
 *   .sort({ totalScore: -1, penalty: 1 })  // Index covers first sort key
 *   .limit(100);
 * ```
 * 
 * Index Coverage:
 * - Covers: contestId filter + totalScore sort
 * - Partial coverage: penalty sort done in-memory (acceptable trade-off)
 * - Why not index penalty? Would require compound index {contestId, totalScore, penalty}
 *   which is larger and rarely needed (penalty only matters for ties)
 * 
 * Performance Impact (Real-World Example):
 * - Contest with 1000 participants
 * - Without index:
 *   * Fetch all 1000 documents: ~200ms
 *   * Sort in memory: ~300ms
 *   * Total: ~500ms per leaderboard query
 * - With index:
 *   * B-tree lookup to contestId: ~2ms
 *   * Scan top 100 in sorted order: ~8ms
 *   * Total: ~10ms per leaderboard query
 * - Speedup: 50x faster!
 * 
 * Index Structure:
 * - Compound index: {contestId: 1, totalScore: -1}
 * - contestId ascending (filter key)
 * - totalScore descending (sort key, higher scores first)
 * - Not unique (multiple users can have same score)
 * 
 * Sorting Details:
 * - Primary sort: totalScore DESC (covered by index)
 * - Secondary sort: penalty ASC (done in-memory, only for ties)
 * - Tertiary sort: userId ASC (deterministic tie-breaking)
 * 
 * Cache Strategy:
 * - Leaderboard cached in Redis with 10-second TTL
 * - Cache key: `leaderboard:${contestId}`
 * - Cache invalidated on: score updates, contest state changes
 * - Index still critical for cache misses and cache rebuilds
 * 
 * Alternative Considered:
 * - Triple compound index: {contestId, totalScore, penalty}
 * - Rejected because:
 *   * Larger index size (3 fields vs 2)
 *   * Penalty ties are rare (most users have different penalties)
 *   * In-memory sort of ties is fast enough (<10ms for typical tie group)
 *   * Diminishing returns (10ms → 8ms not worth the index overhead)
 */
contestScoreSchema.index({ contestId: 1, userId: 1 }, { unique: true }); // Unique score per user per contest
contestScoreSchema.index({ contestId: 1, totalScore: -1 }); // Leaderboard sorting (descending score)

const Contest = mongoose.model('Contest', contestSchema);
const ContestScore = mongoose.model('ContestScore', contestScoreSchema);

module.exports = { Contest, ContestScore };
