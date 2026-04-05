/**
 * Submission Model
 * 
 * VISION:
 * Provide a robust data model for tracking code submissions through the entire
 * judging lifecycle, from initial submission to final verdict. This model serves
 * as the central record for all code execution attempts in the platform.
 * 
 * WHY THIS EXISTS:
 * In a competitive programming platform, submissions are the core entity that
 * connects users, problems, and contests. We need to:
 * 1. Store user code securely for plagiarism detection and review
 * 2. Track execution results (verdict, time, memory) for leaderboards
 * 3. Support both practice mode (no contest) and contest mode submissions
 * 4. Enable efficient queries for user submission history and contest rankings
 * 5. Provide audit trail with timestamps for all submissions
 * 
 * WHAT IT DOES:
 * This Mongoose schema defines the Submission collection with:
 * - User and problem references for ownership and targeting
 * - Optional contest reference for competitive submissions
 * - Code storage with language specification (C++, Python)
 * - Verdict tracking through the judging lifecycle (PENDING → AC/WA/TLE/etc.)
 * - Execution metrics (time in ms, memory in MB) for performance analysis
 * - Compiler error storage for compilation failures
 * - Optimized indexes for common query patterns
 * 
 * DESIGN DECISIONS:
 * 1. **Verdict Enum**: Limited to 7 standard competitive programming verdicts
 *    - AC (Accepted), WA (Wrong Answer), TLE (Time Limit Exceeded)
 *    - MLE (Memory Limit Exceeded), RE (Runtime Error), CE (Compilation Error)
 *    - PENDING (awaiting judge processing)
 *    - Alternative: Could use numeric codes, but strings are more readable
 * 
 * 2. **Code Storage**: Store full source code in MongoDB (not S3)
 *    - Rationale: Code is typically small (<10KB), fast retrieval needed
 *    - Trade-off: Increases DB size but simplifies architecture
 *    - Future: Consider S3 for very large submissions or archival
 * 
 * 3. **Optional Contest**: contestId can be null for practice submissions
 *    - Enables dual-mode: practice (anytime) vs contest (time-bound)
 *    - Simplifies querying: filter by contestId presence
 * 
 * 4. **Execution Metrics**: Store time (ms) and memory (MB) as nullable numbers
 *    - Only populated for successful executions (AC, WA, TLE, MLE)
 *    - Null for CE, RE, or PENDING states
 *    - Used for leaderboard tie-breaking and performance analysis
 * 
 * 5. **Compound Indexes**: Optimized for common access patterns
 *    - {userId, problemId, createdAt}: User's submission history per problem
 *    - {contestId, createdAt}: Contest submissions chronologically
 *    - Individual indexes on userId, problemId, contestId for flexibility
 * 
 * 6. **Language Support**: Currently limited to C++ and Python
 *    - Extensible: Add more languages by updating enum
 *    - Each language requires corresponding Docker judge image
 * 
 * USAGE:
 * ```javascript
 * const Submission = require('./model');
 * 
 * // Create a new submission (initial state: PENDING)
 * const submission = await Submission.create({
 *   userId: '507f1f77bcf86cd799439011',
 *   problemId: '507f1f77bcf86cd799439012',
 *   contestId: '507f1f77bcf86cd799439013', // null for practice
 *   language: 'cpp',
 *   code: '#include <iostream>\nint main() { ... }',
 *   verdict: 'PENDING'
 * });
 * 
 * // Update verdict after judging
 * submission.verdict = 'AC';
 * submission.executionTime = 245; // ms
 * submission.memoryUsed = 2.5; // MB
 * await submission.save();
 * 
 * // Query user's submissions for a problem
 * const userSubmissions = await Submission.find({
 *   userId: userId,
 *   problemId: problemId
 * }).sort({ createdAt: -1 }).limit(10);
 * 
 * // Query contest submissions
 * const contestSubmissions = await Submission.find({
 *   contestId: contestId
 * }).populate('userId', 'username').sort({ createdAt: 1 });
 * ```
 */

const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    /**
     * @property {ObjectId} userId - Reference to the User who submitted the code
     * 
     * Purpose: Links the submission to its author for ownership tracking and history queries
     * 
     * Relationships:
     * - References User model (User._id)
     * - Used in user submission history queries
     * - Required for leaderboard calculations and plagiarism detection
     * 
     * Constraints:
     * - Required field (every submission must have an owner)
     * - Indexed for fast user-based queries
     * - Should be validated to ensure user exists before submission creation
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * @property {ObjectId} problemId - Reference to the Problem being solved
     * 
     * Purpose: Identifies which problem this submission attempts to solve
     * 
     * Relationships:
     * - References Problem model (Problem._id)
     * - Used to fetch test cases and constraints for judging
     * - Links to problem difficulty and tags for analytics
     * 
     * Constraints:
     * - Required field (every submission targets a specific problem)
     * - Indexed for fast problem-based queries
     * - Used in compound index with userId for submission history
     */
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
      index: true,
    },

    /**
     * @property {ObjectId|null} contestId - Reference to the Contest (if submitted during a contest)
     * 
     * Purpose: Distinguishes contest submissions from practice submissions
     * 
     * Relationships:
     * - References Contest model (Contest._id)
     * - Null for practice mode submissions (submitted outside any contest)
     * - Non-null for competitive submissions (submitted during active contest)
     * 
     * Constraints:
     * - Optional field (defaults to null)
     * - Indexed for fast contest leaderboard queries
     * - Used to enforce contest rules (time bounds, problem access)
     * 
     * Usage:
     * - Practice mode: contestId = null
     * - Contest mode: contestId = valid Contest ObjectId
     * - Leaderboard queries filter by contestId to rank participants
     */
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest',
      default: null,
      index: true,
    },

    /**
     * @property {String} language - Programming language of the submitted code
     * 
     * Purpose: Determines which Docker judge image to use for code execution
     * 
     * Valid Values:
     * - 'cpp': C++ code (compiled with g++)
     * - 'python': Python code (executed with python3)
     * 
     * Constraints:
     * - Required field (must specify language for compilation/execution)
     * - Enum restricted to supported languages only
     * - Each language requires corresponding Docker judge image in backend/docker/judges/
     * 
     * Extension:
     * - To add new languages: update enum, create Docker judge image, update worker logic
     */
    language: {
      type: String,
      enum: ['cpp', 'python'],
      required: true,
    },

    /**
     * @property {String} code - The full source code submitted by the user
     * 
     * Purpose: Stores the actual code for execution, review, and plagiarism detection
     * 
     * Constraints:
     * - Required field (cannot submit empty code)
     * - Stored directly in MongoDB (not S3) for fast retrieval
     * - Typically small (<10KB) for competitive programming solutions
     * 
     * Security Considerations:
     * - Code is executed in sandboxed Docker containers (see submission.worker.js)
     * - Resource limits enforced: CPU time, memory, network isolation
     * - Malicious code cannot escape sandbox or access host system
     * 
     * Usage:
     * - Retrieved by judge worker for execution
     * - Displayed in submission history for user review
     * - Used in plagiarism detection algorithms (future feature)
     */
    code: {
      type: String,
      required: true,
    },

    /**
     * @property {String} verdict - The judging result indicating correctness and execution status
     * 
     * Purpose: Tracks submission through the judging lifecycle and communicates final result
     * 
     * Submission Lifecycle:
     * 1. PENDING: Initial state when submission is created, awaiting judge processing
     *    - Submission added to BullMQ queue (see submission.queue.js)
     *    - Worker picks up job and begins execution (see submission.worker.js)
     * 
     * 2. Terminal States (judging complete):
     *    - AC (Accepted): Code passed all test cases, correct solution
     *    - WA (Wrong Answer): Code produced incorrect output for at least one test case
     *    - TLE (Time Limit Exceeded): Code exceeded time limit (e.g., 2 seconds)
     *    - MLE (Memory Limit Exceeded): Code exceeded memory limit (e.g., 256 MB)
     *    - RE (Runtime Error): Code crashed during execution (segfault, exception, etc.)
     *    - CE (Compilation Error): Code failed to compile (syntax errors, missing imports)
     * 
     * Valid Values:
     * - 'PENDING': Awaiting judge processing (default state)
     * - 'AC': Accepted (correct solution)
     * - 'WA': Wrong Answer (incorrect output)
     * - 'TLE': Time Limit Exceeded (too slow)
     * - 'MLE': Memory Limit Exceeded (too much memory)
     * - 'RE': Runtime Error (crashed during execution)
     * - 'CE': Compilation Error (failed to compile)
     * 
     * Verdict Mapping Logic (in submission.worker.js):
     * - Exit code 0 + output matches expected → AC
     * - Exit code 0 + output differs → WA
     * - Execution time > limit → TLE
     * - Memory usage > limit → MLE
     * - Non-zero exit code → RE
     * - Compilation fails → CE
     * 
     * Constraints:
     * - Enum restricted to 7 valid verdicts
     * - Defaults to 'PENDING' on creation
     * - Updated by judge worker after execution completes
     */
    verdict: {
      type: String,
      enum: ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING'],
      default: 'PENDING',
    },

    /**
     * @property {Number|null} executionTime - Time taken to execute the code in milliseconds
     * 
     * Purpose: Measures code performance for leaderboard tie-breaking and analytics
     * 
     * Valid Values:
     * - Positive number (milliseconds): Time from process start to completion
     * - null: Execution did not complete successfully or not yet judged
     * 
     * Population Rules:
     * - Populated for: AC, WA (successful execution, regardless of correctness)
     * - May be populated for: TLE (time at which limit was exceeded)
     * - Null for: CE (compilation failed, no execution), RE (crashed before completion), PENDING
     * 
     * Usage:
     * - Leaderboard tie-breaking: Among AC submissions, faster time ranks higher
     * - Performance analytics: Track average execution time per problem
     * - Problem difficulty calibration: Adjust time limits based on submission data
     * 
     * Constraints:
     * - Measured in milliseconds (e.g., 245 ms)
     * - Typically ranges from 10ms to 2000ms for competitive programming
     * - Defaults to null (not yet measured)
     */
    executionTime: {
      type: Number, // milliseconds
      default: null,
    },

    /**
     * @property {Number|null} memoryUsed - Memory consumed during execution in megabytes
     * 
     * Purpose: Tracks memory usage for leaderboard tie-breaking and resource monitoring
     * 
     * Valid Values:
     * - Positive number (megabytes): Peak memory usage during execution
     * - null: Execution did not complete successfully or not yet judged
     * 
     * Population Rules:
     * - Populated for: AC, WA (successful execution, regardless of correctness)
     * - May be populated for: MLE (memory at which limit was exceeded)
     * - Null for: CE (compilation failed, no execution), RE (crashed before measurement), PENDING
     * 
     * Usage:
     * - Leaderboard tie-breaking: Among AC submissions with same time, lower memory ranks higher
     * - Resource monitoring: Ensure judge containers have adequate memory limits
     * - Problem constraints: Verify memory limits are appropriate for expected solutions
     * 
     * Constraints:
     * - Measured in megabytes (e.g., 2.5 MB)
     * - Typically ranges from 1 MB to 256 MB for competitive programming
     * - Defaults to null (not yet measured)
     */
    memoryUsed: {
      type: Number, // megabytes
      default: null,
    },

    /**
     * @property {String|null} compilerError - Compilation error message for CE verdicts
     * 
     * Purpose: Stores compiler output to help users debug compilation failures
     * 
     * Valid Values:
     * - String: Compiler error message (stderr from g++, python3, etc.)
     * - null: No compilation error (code compiled successfully or not yet judged)
     * 
     * Population Rules:
     * - Populated for: CE (Compilation Error) verdicts only
     * - Null for: All other verdicts (AC, WA, TLE, MLE, RE, PENDING)
     * 
     * Content:
     * - Contains stderr output from compiler (syntax errors, missing imports, type errors)
     * - Truncated if excessively long (e.g., max 1000 characters)
     * - Sanitized to remove absolute paths that might leak system information
     * 
     * Usage:
     * - Displayed to user in submission details to help fix compilation issues
     * - Example: "error: expected ';' before '}' token"
     * 
     * Security Considerations:
     * - Sanitize paths to avoid leaking Docker container structure
     * - Limit length to prevent database bloat from verbose compiler output
     * 
     * Constraints:
     * - Defaults to null (no error)
     * - Only meaningful when verdict = 'CE'
     */
    compilerError: {
      type: String,
      default: null,
    },
  },
  {
    /**
     * Timestamps Configuration
     * 
     * Automatically adds two fields to every submission document:
     * 
     * @property {Date} createdAt - Timestamp when submission was created
     * - Set automatically on document creation
     * - Used for chronological sorting (submission history, contest timeline)
     * - Indexed in compound indexes for efficient time-based queries
     * - Immutable (never changes after creation)
     * 
     * @property {Date} updatedAt - Timestamp when submission was last modified
     * - Set automatically on document creation
     * - Updated automatically whenever document is saved
     * - Tracks when verdict was updated (PENDING → AC/WA/etc.)
     * - Used to detect stale PENDING submissions (judge failures)
     */
    timestamps: true,
  }
);

/**
 * Database Indexes for Query Optimization
 * 
 * OVERVIEW:
 * Indexes are critical for performance in a high-traffic competitive programming platform.
 * Without proper indexes, queries would require full collection scans (O(n) complexity),
 * causing severe performance degradation as submissions grow into millions of documents.
 * 
 * INDEX STRATEGY:
 * We use compound indexes optimized for the most common query patterns:
 * 1. User submission history per problem (practice mode)
 * 2. Contest submissions chronologically (leaderboard calculations)
 * 
 * PERFORMANCE IMPACT:
 * - Without indexes: O(n) full collection scan (seconds for millions of submissions)
 * - With indexes: O(log n) B-tree lookup (milliseconds even for millions of submissions)
 * - Example: Finding user's submissions for a problem drops from 2000ms to 5ms
 * 
 * TRADE-OFFS:
 * - Pros: Dramatically faster queries (100-1000x speedup)
 * - Cons: Slower writes (~10% overhead), increased storage (~10-20% per index)
 * - Decision: Read-heavy workload justifies write penalty (users query history frequently)
 */

/**
 * Compound Index 1: User Submission History per Problem
 * 
 * Index: { userId: 1, problemId: 1, createdAt: -1 }
 * 
 * PURPOSE:
 * Optimizes the most common query pattern: "Show me all submissions by user X for problem Y,
 * sorted by most recent first". This is used in:
 * - User submission history page (practice mode)
 * - "Your previous attempts" section on problem page
 * - Duplicate submission detection (has user already solved this?)
 * 
 * INDEX STRUCTURE:
 * - userId: 1 (ascending) - Primary filter, narrows to single user's submissions
 * - problemId: 1 (ascending) - Secondary filter, narrows to specific problem
 * - createdAt: -1 (descending) - Sort order, most recent submissions first
 * 
 * QUERY OPTIMIZATION:
 * This index enables MongoDB to:
 * 1. Use userId to jump directly to user's submissions (B-tree lookup)
 * 2. Within that subset, use problemId to filter to specific problem
 * 3. Return results already sorted by createdAt (no in-memory sort needed)
 * 
 * EXAMPLE QUERIES OPTIMIZED:
 * ```javascript
 * // Query 1: User's submission history for a problem (OPTIMIZED)
 * Submission.find({ userId: userId, problemId: problemId })
 *   .sort({ createdAt: -1 })
 *   .limit(10);
 * // Uses index: { userId: 1, problemId: 1, createdAt: -1 }
 * // Performance: O(log n) lookup + O(10) scan = ~5ms
 * 
 * // Query 2: Check if user has AC submission for problem (OPTIMIZED)
 * Submission.findOne({ 
 *   userId: userId, 
 *   problemId: problemId, 
 *   verdict: 'AC' 
 * }).sort({ createdAt: -1 });
 * // Uses index: { userId: 1, problemId: 1, createdAt: -1 }
 * // Note: verdict filter applied after index lookup (acceptable for small result set)
 * // Performance: O(log n) lookup + O(k) scan where k = user's submissions for problem
 * 
 * // Query 3: User's most recent submission for problem (OPTIMIZED)
 * Submission.findOne({ userId: userId, problemId: problemId })
 *   .sort({ createdAt: -1 });
 * // Uses index: { userId: 1, problemId: 1, createdAt: -1 }
 * // Performance: O(log n) lookup + O(1) = ~2ms
 * ```
 * 
 * INDEX SELECTIVITY:
 * - userId: High selectivity (1 user out of 10,000+ users)
 * - problemId: High selectivity (1 problem out of 1,000+ problems)
 * - Combined: Very high selectivity (typically 1-50 submissions per user per problem)
 * - Result: Index is highly efficient, minimal documents scanned after lookup
 * 
 * STORAGE OVERHEAD:
 * - Index size: ~24 bytes per submission (3 fields × 8 bytes each)
 * - For 1M submissions: ~24 MB index size
 * - Trade-off: Acceptable overhead for 100-1000x query speedup
 */
submissionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });

/**
 * Compound Index 2: Contest Submissions Chronologically
 * 
 * Index: { contestId: 1, createdAt: -1 }
 * 
 * PURPOSE:
 * Optimizes contest-related queries: "Show me all submissions for contest X, sorted by
 * submission time". This is critical for:
 * - Leaderboard calculations (process submissions in chronological order)
 * - Contest submission feed (real-time updates during contest)
 * - ICPC scoring (first AC time matters, penalties for earlier WA submissions)
 * - Contest analytics (submission rate over time)
 * 
 * INDEX STRUCTURE:
 * - contestId: 1 (ascending) - Primary filter, narrows to single contest's submissions
 * - createdAt: -1 (descending) - Sort order, most recent submissions first
 * 
 * QUERY OPTIMIZATION:
 * This index enables MongoDB to:
 * 1. Use contestId to jump directly to contest's submissions (B-tree lookup)
 * 2. Return results already sorted by createdAt (no in-memory sort needed)
 * 3. Support efficient pagination for large contests (skip/limit operations)
 * 
 * EXAMPLE QUERIES OPTIMIZED:
 * ```javascript
 * // Query 1: All submissions for a contest, chronologically (OPTIMIZED)
 * Submission.find({ contestId: contestId })
 *   .sort({ createdAt: -1 })
 *   .populate('userId', 'username')
 *   .limit(100);
 * // Uses index: { contestId: 1, createdAt: -1 }
 * // Performance: O(log n) lookup + O(100) scan = ~10ms
 * 
 * // Query 2: Contest leaderboard calculation (OPTIMIZED)
 * Submission.find({ contestId: contestId, verdict: 'AC' })
 *   .sort({ createdAt: 1 }); // ascending for ICPC scoring
 * // Uses index: { contestId: 1, createdAt: -1 }
 * // Note: Sort order reversed in query, MongoDB can traverse index backwards
 * // Performance: O(log n) lookup + O(k) scan where k = AC submissions in contest
 * 
 * // Query 3: User's submissions in a contest (PARTIALLY OPTIMIZED)
 * Submission.find({ contestId: contestId, userId: userId })
 *   .sort({ createdAt: -1 });
 * // Uses index: { contestId: 1, createdAt: -1 }
 * // Note: userId filter applied after index lookup (acceptable, contests have <10k submissions)
 * // Performance: O(log n) lookup + O(k) scan where k = submissions in contest
 * 
 * // Query 4: Practice submissions (contestId = null) (NOT OPTIMIZED)
 * Submission.find({ contestId: null })
 *   .sort({ createdAt: -1 });
 * // Uses index: { contestId: 1, createdAt: -1 }
 * // Note: null values are indexed, but less efficient than non-null lookups
 * // Performance: O(log n) lookup + O(k) scan where k = practice submissions
 * // Alternative: Could add separate index for practice mode if needed
 * ```
 * 
 * INDEX SELECTIVITY:
 * - contestId: High selectivity (1 contest out of 100+ contests)
 * - Combined with createdAt: Very high selectivity (submissions spread over time)
 * - Result: Index efficiently narrows to contest's submissions, then sorts chronologically
 * 
 * ICPC SCORING OPTIMIZATION:
 * This index is critical for ICPC leaderboard calculations:
 * 1. Fetch all submissions for contest, sorted by time (uses this index)
 * 2. Process submissions chronologically to compute scores
 * 3. Track first AC time per problem per user (for time-based ranking)
 * 4. Apply penalties for WA submissions before first AC (20 minutes per WA)
 * 
 * STORAGE OVERHEAD:
 * - Index size: ~16 bytes per submission (2 fields × 8 bytes each)
 * - For 1M submissions: ~16 MB index size
 * - Trade-off: Essential for real-time leaderboard updates during contests
 * 
 * ALTERNATIVE CONSIDERED:
 * Could use compound index { contestId: 1, userId: 1, createdAt: -1 } for user-specific
 * contest queries, but decided against it because:
 * - Adds storage overhead (~24 MB for 1M submissions)
 * - User-specific contest queries are less frequent than contest-wide queries
 * - Current index handles user-specific queries acceptably (filter userId after lookup)
 */
submissionSchema.index({ contestId: 1, createdAt: -1 });

/**
 * Individual Field Indexes (Implicit)
 * 
 * MongoDB automatically creates single-field indexes for:
 * - userId (from compound index { userId: 1, problemId: 1, createdAt: -1 })
 * - contestId (from compound index { contestId: 1, createdAt: -1 })
 * 
 * These implicit indexes optimize queries that filter by only one field:
 * 
 * EXAMPLE QUERIES USING IMPLICIT INDEXES:
 * ```javascript
 * // Query 1: All submissions by a user (OPTIMIZED by implicit userId index)
 * Submission.find({ userId: userId }).sort({ createdAt: -1 });
 * // Uses index: { userId: 1, problemId: 1, createdAt: -1 } (prefix match)
 * // Performance: O(log n) lookup + O(k) scan where k = user's total submissions
 * 
 * // Query 2: All submissions for a problem (NOT OPTIMIZED)
 * Submission.find({ problemId: problemId }).sort({ createdAt: -1 });
 * // Cannot use index: problemId is not a prefix of any compound index
 * // Performance: O(n) full collection scan (SLOW for large collections)
 * // Note: This query is rare (admin analytics only), so no dedicated index needed
 * ```
 * 
 * INDEX PREFIX RULE:
 * MongoDB can use a compound index for queries that match a prefix of the index fields.
 * - Index { userId: 1, problemId: 1, createdAt: -1 } can optimize:
 *   ✅ { userId: ... }
 *   ✅ { userId: ..., problemId: ... }
 *   ✅ { userId: ..., problemId: ..., createdAt: ... }
 * - But CANNOT optimize:
 *   ❌ { problemId: ... } (not a prefix)
 *   ❌ { createdAt: ... } (not a prefix)
 */

/**
 * Index Maintenance and Monitoring
 * 
 * AUTOMATIC MAINTENANCE:
 * - MongoDB automatically updates indexes on insert/update/delete operations
 * - Index updates happen synchronously (write completes after index update)
 * - Write performance penalty: ~10% slower due to index maintenance
 * 
 * MONITORING:
 * Use MongoDB explain() to verify index usage:
 * ```javascript
 * Submission.find({ userId: userId, problemId: problemId })
 *   .sort({ createdAt: -1 })
 *   .explain('executionStats');
 * // Check output:
 * // - "stage": "IXSCAN" (index scan, good)
 * // - "stage": "COLLSCAN" (collection scan, bad - missing index)
 * // - "nReturned": number of documents returned
 * // - "executionTimeMillis": query execution time
 * ```
 * 
 * INDEX REBUILD:
 * If indexes become fragmented or corrupted:
 * ```javascript
 * // Rebuild all indexes (requires downtime)
 * db.submissions.reIndex();
 * 
 * // Or rebuild specific index
 * db.submissions.dropIndex({ userId: 1, problemId: 1, createdAt: -1 });
 * db.submissions.createIndex({ userId: 1, problemId: 1, createdAt: -1 });
 * ```
 * 
 * FUTURE OPTIMIZATIONS:
 * If new query patterns emerge, consider adding indexes for:
 * - { problemId: 1, verdict: 1 } - Problem-wide statistics (AC rate, avg time)
 * - { userId: 1, verdict: 1, createdAt: -1 } - User's AC submissions only
 * - { contestId: 1, userId: 1, problemId: 1 } - User's submissions per problem in contest
 * 
 * Always measure query performance before adding new indexes (storage/write trade-off).
 */

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
