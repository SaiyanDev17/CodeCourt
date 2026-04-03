// Leaderboard Socket.io events
const { getIO } = require('./index');

/**
 * Emit leaderboard update to contest room
 * @param {string} contestId - Contest ID
 * @param {Array} leaderboard - Top 50 rankings
 */
exports.emitLeaderboardUpdate = (contestId, leaderboard) => {
  try {
    const io = getIO();
    io.to(`contest:${contestId}`).emit('leaderboard:update', {
      contestId,
      leaderboard,
      timestamp: new Date().toISOString()
    });
    console.log(`Leaderboard update emitted to contest ${contestId}`);
  } catch (error) {
    console.error('Failed to emit leaderboard update:', error);
  }
};
