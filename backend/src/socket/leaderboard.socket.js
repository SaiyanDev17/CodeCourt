/**
 * Leaderboard Socket.io Events
 * 
 * VISION:
 * Provide live leaderboard updates to all contest participants in real-time.
 * Enable competitive atmosphere with instant rank changes when submissions are accepted.
 * 
 * WHY THIS EXISTS:
 * Contest leaderboards are highly dynamic:
 * - Ranks change every time someone solves a problem
 * - Users want to see their rank update instantly
 * - Competitive programming thrives on real-time competition
 * 
 * Without WebSockets, users would need to refresh the leaderboard page constantly,
 * creating poor UX and high server load.
 * 
 * WHAT IT DOES:
 * - Emits leaderboard updates to contest room (contest:{contestId})
 * - Sends top 50 rankings with scores and solve times
 * - Called by submission.worker.js after AC submission in contest
 * - Includes timestamp for client-side staleness detection
 * 
 * DESIGN DECISIONS:
 * 1. Contest Room Emission:
 *    - All participants in contest:{contestId} room receive update
 *    - Efficient broadcast to relevant users only
 *    - Users join room when viewing contest page
 * 
 * 2. Event Name 'leaderboard:update':
 *    - Namespaced event name (leaderboard:*)
 *    - Allows for future events (leaderboard:freeze, leaderboard:unfreeze)
 *    - Clear semantic meaning
 * 
 * 3. Top 50 Only:
 *    - Reduces payload size (contests can have 1000+ participants)
 *    - Most users care about top ranks
 *    - Full leaderboard available via API if needed
 * 
 * 4. Timestamp Included:
 *    - Enables client-side staleness detection
 *    - Useful for debugging race conditions
 *    - ISO 8601 format for consistency
 * 
 * 5. Graceful Error Handling:
 *    - Catches Socket.io errors (e.g., not initialized in tests)
 *    - Logs error but doesn't crash worker
 *    - Contest scores still update in MongoDB even if socket fails
 * 
 * USAGE:
 * ```javascript
 * // In submission.worker.js
 * const { emitLeaderboardUpdate } = require('../socket/leaderboard.socket');
 * const contestService = require('../modules/contests/service');
 * 
 * // After AC submission in contest
 * const leaderboard = await contestService.getLeaderboard(contestId);
 * emitLeaderboardUpdate(contestId, leaderboard);
 * ```
 * 
 * FRONTEND USAGE:
 * ```javascript
 * // Join contest room
 * socket.emit('join:contest', contestId);
 * 
 * // Listen for leaderboard updates
 * socket.on('leaderboard:update', (data) => {
 *   const { contestId, leaderboard, timestamp } = data;
 *   
 *   // Update leaderboard table
 *   updateLeaderboardTable(leaderboard);
 *   
 *   // Highlight rank changes with animation
 *   highlightRankChanges(leaderboard);
 *   
 *   // Show notification if user's rank changed
 *   const myRank = leaderboard.find(entry => entry.userId === currentUserId);
 *   if (myRank && myRank.rank !== previousRank) {
 *     showNotification(`Your rank: ${myRank.rank}`);
 *   }
 * });
 * ```
 */

const { getIO } = require('./index');

/**
 * Emit leaderboard update to contest room
 * 
 * Broadcasts updated leaderboard to all participants in a contest room.
 * Called by the submission worker after an AC submission updates contest scores.
 * 
 * @param {string} contestId - MongoDB ObjectId of the contest
 * @param {Array} leaderboard - Top 50 rankings from contestService.getLeaderboard()
 * @param {Object} leaderboard[].userId - User ID
 * @param {string} leaderboard[].username - Username
 * @param {number} leaderboard[].rank - Current rank (1-based)
 * @param {number} leaderboard[].totalScore - Total score (problems solved)
 * @param {number} leaderboard[].totalPenalty - Total penalty in minutes (ICPC scoring)
 * @param {Array} leaderboard[].problemScores - Per-problem scores
 * 
 * @example
 * const leaderboard = await contestService.getLeaderboard(contestId);
 * emitLeaderboardUpdate(contestId, leaderboard);
 * 
 * // Emitted data structure:
 * {
 *   contestId: '507f1f77bcf86cd799439014',
 *   leaderboard: [
 *     {
 *       userId: '507f1f77bcf86cd799439013',
 *       username: 'alice',
 *       rank: 1,
 *       totalScore: 5,
 *       totalPenalty: 120,
 *       problemScores: [...]
 *     },
 *     ...
 *   ],
 *   timestamp: '2024-01-15T10:30:45.123Z'
 * }
 */
exports.emitLeaderboardUpdate = (contestId, leaderboard) => {
  try {
    const io = getIO();
    
    // Emit to contest room (contest:{contestId})
    // All participants in this room receive the update
    io.to(`contest:${contestId}`).emit('leaderboard:update', {
      contestId,
      leaderboard,
      timestamp: new Date().toISOString() // ISO 8601 format
    });
    
    console.log(`Leaderboard update emitted to contest ${contestId}`);
  } catch (error) {
    // Socket.io may not be initialized (e.g., in test environment)
    // Log error but don't crash - contest scores are still updated in MongoDB
    console.error('Failed to emit leaderboard update:', error);
  }
};
