// Contest state transition cron job
const cron = require('node-cron');
const Contest = require('../modules/contests/model');
const redis = require('../config/redis');

/**
 * Transition contest states every 30 seconds
 * upcoming → ongoing (when startTime reached)
 * ongoing → ended (when endTime reached)
 */
const startContestCron = () => {
  // Run every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();
      
      // Transition upcoming → ongoing
      const startedContests = await Contest.updateMany(
        { status: 'upcoming', startTime: { $lte: now } },
        { $set: { status: 'ongoing' } }
      );
      
      if (startedContests.modifiedCount > 0) {
        console.log(`Started ${startedContests.modifiedCount} contests`);
      }
      
      // Transition ongoing → ended
      const endedContests = await Contest.updateMany(
        { status: 'ongoing', endTime: { $lte: now } },
        { $set: { status: 'ended' } }
      );
      
      if (endedContests.modifiedCount > 0) {
        console.log(`Ended ${endedContests.modifiedCount} contests`);
        
        // Invalidate leaderboard cache for ended contests
        const contests = await Contest.find({ status: 'ended', endTime: { $lte: now } });
        for (const contest of contests) {
          await redis.del(`leaderboard:${contest._id}`);
        }
      }
    } catch (error) {
      console.error('Contest cron error:', error);
    }
  });
  
  console.log('Contest cron job started (runs every 30 seconds)');
};

module.exports = { startContestCron };
