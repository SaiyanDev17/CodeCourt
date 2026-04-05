/**
 * Verdict Socket.io Events
 * 
 * VISION:
 * Provide instant verdict notifications to users when their submissions are judged.
 * Enable real-time feedback without page refresh or polling.
 * 
 * WHY THIS EXISTS:
 * Judging can take 1-10 seconds depending on test case count and execution time.
 * Users need immediate feedback when their submission completes. Without WebSockets,
 * they would need to:
 * - Refresh the page repeatedly
 * - Poll the API every few seconds (wasteful)
 * - Wait for manual page navigation
 * 
 * Real-time verdicts provide better UX and reduce server load.
 * 
 * WHAT IT DOES:
 * - Emits verdict events to user's personal room (user:{userId})
 * - Sends verdict data (AC/WA/TLE/etc.) with execution metrics
 * - Called by submission.worker.js after judging completes
 * - Gracefully handles Socket.io initialization errors
 * 
 * DESIGN DECISIONS:
 * 1. Personal Room Emission:
 *    - Each user has a personal room (user:{userId})
 *    - Only the submitter receives the verdict
 *    - Prevents leaking verdicts to other users
 * 
 * 2. Event Name 'verdict':
 *    - Simple, descriptive event name
 *    - Frontend listens for this event
 *    - Consistent with domain terminology
 * 
 * 3. Graceful Error Handling:
 *    - Catches Socket.io errors (e.g., not initialized in tests)
 *    - Logs error but doesn't crash worker
 *    - Submission still updates in MongoDB even if socket fails
 * 
 * 4. Verdict Data Structure:
 *    - submissionId: For frontend to update specific submission
 *    - verdict: AC, WA, TLE, MLE, RE, CE
 *    - executionTime: In milliseconds
 *    - memoryUsed: In MB
 * 
 * USAGE:
 * ```javascript
 * // In submission.worker.js
 * const { emitVerdict } = require('../socket/verdict.socket');
 * 
 * // After judging completes
 * emitVerdict(userId, {
 *   submissionId: '507f1f77bcf86cd799439011',
 *   verdict: 'AC',
 *   executionTime: 245,
 *   memoryUsed: 12
 * });
 * ```
 * 
 * FRONTEND USAGE:
 * ```javascript
 * // Listen for verdict events
 * socket.on('verdict', (data) => {
 *   const { submissionId, verdict, executionTime, memoryUsed } = data;
 *   
 *   // Update UI with verdict
 *   updateSubmissionStatus(submissionId, verdict);
 *   
 *   // Show notification
 *   if (verdict === 'AC') {
 *     showSuccessNotification('Accepted!');
 *   } else {
 *     showErrorNotification(`${verdict} - Try again!`);
 *   }
 * });
 * ```
 */

const { getIO } = require('./index');

/**
 * Emit verdict event to user's personal room
 * 
 * Sends a verdict notification to a specific user via their personal Socket.io room.
 * Called by the submission worker after judging completes.
 * 
 * @param {string} userId - MongoDB ObjectId of the user who submitted
 * @param {Object} verdictData - Verdict details
 * @param {string} verdictData.submissionId - MongoDB ObjectId of submission
 * @param {string} verdictData.verdict - Verdict code (AC, WA, TLE, MLE, RE, CE)
 * @param {number} verdictData.executionTime - Execution time in milliseconds
 * @param {number} verdictData.memoryUsed - Memory used in MB
 * 
 * @example
 * emitVerdict('507f1f77bcf86cd799439013', {
 *   submissionId: '507f1f77bcf86cd799439011',
 *   verdict: 'AC',
 *   executionTime: 245,
 *   memoryUsed: 12
 * });
 */
exports.emitVerdict = (userId, verdictData) => {
  try {
    const io = getIO();
    
    // Emit to user's personal room (user:{userId})
    // Only the submitter receives this event
    io.to(`user:${userId}`).emit('verdict', verdictData);
    
    console.log(`Verdict emitted to user ${userId}:`, verdictData);
  } catch (error) {
    // Socket.io may not be initialized (e.g., in test environment)
    // Log error but don't crash - submission is still updated in MongoDB
    console.error('Failed to emit verdict:', error);
  }
};
