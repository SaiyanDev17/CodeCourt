// Verdict Socket.io events
const { getIO } = require('./index');

/**
 * Emit verdict event to user's personal room
 * @param {string} userId - User ID
 * @param {Object} verdictData - { submissionId, verdict, executionTime, memoryUsed }
 */
exports.emitVerdict = (userId, verdictData) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('verdict', verdictData);
    console.log(`Verdict emitted to user ${userId}:`, verdictData);
  } catch (error) {
    console.error('Failed to emit verdict:', error);
  }
};
