/**
 * Contest State Transition Cron Job
 * 
 * VISION:
 * Automatically manage contest lifecycle by transitioning contests through their
 * state machine (upcoming -> ongoing -> ended) based on time boundaries. This ensures
 * contests start and end precisely on schedule without manual intervention.
 * 
 * WHY THIS EXISTS:
 * Contests have strict time boundaries that determine when users can submit:
 * 1. Users cannot submit before startTime (contest is "upcoming")
 * 2. Users can only submit during [startTime, endTime) (contest is "ongoing")
 * 3. Users cannot submit after endTime (contest is "ended")
 * 
 * Manual state transitions would be error-prone and require constant monitoring.
 * This cron job automates the process, ensuring contests transition states at the
 * exact moment their time boundaries are crossed.
 * 
 * WHAT IT DOES:
 * This cron job runs every 30 seconds and performs two state transitions:
 * 
 * 1. upcoming -> ongoing: When current time >= startTime
 *    - Finds all contests with status='upcoming' and startTime <= now
 *    - Updates their status to 'ongoing'
 *    - Enables users to start submitting solutions
 * 
 * 2. ongoing -> ended: When current time >= endTime
 *    - Finds all contests with status='ongoing' and endTime <= now
 *    - Updates their status to 'ended'
 *    - Prevents further submissions
 *    - Invalidates leaderboard cache (final standings are now immutable)
 * 
 * DESIGN DECISIONS:
 * 1. 30-Second Interval:
 *    - Cron schedule runs every 30 seconds
 *    - Rationale: Balance between precision and database load
 *    - Alternative: Every minute (less precise), every 10s (more DB queries)
 *    - Trade-off: Contests may start/end up to 30 seconds late, but this is acceptable
 * 
 * 2. Bulk Updates with updateMany():
 *    - Updates all matching contests in a single query
 *    - More efficient than updating contests one-by-one
 *    - Handles multiple contests transitioning simultaneously
 *    - Example: 5 contests ending at same time = 1 query instead of 5
 * 
 * 3. Cache Invalidation on Contest End:
 *    - When contest ends, leaderboard becomes immutable (no more submissions)
 *    - Invalidate Redis cache to force final leaderboard recalculation
 *    - Ensures final standings are accurate and not stale
 *    - Cache key format: leaderboard:{contestId}
 * 
 * 4. No Cache Invalidation on Contest Start:
 *    - When contest starts, leaderboard is empty (no submissions yet)
 *    - No need to invalidate cache (it doesn't exist yet)
 *    - Cache will be populated on first leaderboard request
 * 
 * 5. Error Handling:
 *    - Errors are logged but don't stop the cron job
 *    - Next iteration will retry failed transitions
 *    - Example: MongoDB connection lost -> error logged, retry in 30s
 * 
 * 6. State Machine Invariants:
 *    - Contests can only transition forward (never backward)
 *    - upcoming -> ongoing -> ended (no skipping states)
 *    - Once ended, contest status never changes again
 *    - Enforced by query filters (status='upcoming' for start, status='ongoing' for end)
 * 
 * USAGE:
 * const { startContestCron } = require('./cron/contest.cron');
 * 
 * // Start the cron job when server boots
 * startContestCron();
 * // Output: "Contest cron job started (runs every 30 seconds)"
 * 
 * // Cron job will automatically:
 * // - Start contests when startTime is reached
 * // - End contests when endTime is reached
 * // - Invalidate leaderboard cache for ended contests
 * 
 * // Example timeline:
 * // 10:00:00 - Contest created with startTime=10:05:00, endTime=10:35:00, status='upcoming'
 * // 10:05:15 - Cron runs, detects startTime passed, transitions to 'ongoing'
 * // 10:35:20 - Cron runs, detects endTime passed, transitions to 'ended', invalidates cache
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Query cost: 2 updateMany() queries every 30 seconds
 * - Index usage: Queries use {status, startTime} and {status, endTime} indexes
 * - Typical load: 0-2 contests transitioning per iteration (low impact)
 * - Peak load: 10+ contests transitioning simultaneously (still efficient with updateMany)
 * - Cache invalidation: O(n) where n = number of ended contests (typically 0-2)
 * 
 * MONITORING:
 * - Console logs show number of contests transitioned
 * - Example: "Started 3 contests" or "Ended 1 contests"
 * - Errors logged with full stack trace for debugging
 * - No logs if no contests transition (silent operation)
 */

const cron = require('node-cron');
const { Contest } = require('../modules/contests/model');
const redis = require('../config/redis');

/**
 * Start the contest state transition cron job
 * 
 * This function initializes a cron job that runs every 30 seconds to:
 * 1. Transition upcoming contests to ongoing when startTime is reached
 * 2. Transition ongoing contests to ended when endTime is reached
 * 3. Invalidate leaderboard cache for ended contests
 * 
 * The cron job runs continuously until the server shuts down.
 * 
 * @returns {void}
 */
const startContestCron = () => {
  // Schedule cron job to run every 30 seconds
  // Cron format: second minute hour day month weekday
  // Pattern: every 30 seconds (0, 30)
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date(); // Current server time (UTC)
      
      // ============================================================
      // STATE TRANSITION 1: upcoming -> ongoing
      // ============================================================
      // Find all contests that should have started by now:
      // - status='upcoming' (not yet started)
      // - startTime <= now (start time has passed)
      // Update their status to 'ongoing' to enable submissions
      const startedContests = await Contest.updateMany(
        { status: 'upcoming', startTime: { $lte: now } },
        { $set: { status: 'ongoing' } }
      );
      
      // Log successful transitions (only if contests were actually started)
      if (startedContests.modifiedCount > 0) {
        console.log(`Started ${startedContests.modifiedCount} contests`);
      }
      
      // ============================================================
      // STATE TRANSITION 2: ongoing -> ended
      // ============================================================
      // Find all contests that should have ended by now:
      // - status='ongoing' (currently in progress)
      // - endTime <= now (end time has passed)
      // Update their status to 'ended' to prevent further submissions
      const endedContests = await Contest.updateMany(
        { status: 'ongoing', endTime: { $lte: now } },
        { $set: { status: 'ended' } }
      );
      
      // Log successful transitions and invalidate cache
      if (endedContests.modifiedCount > 0) {
        console.log(`Ended ${endedContests.modifiedCount} contests`);
        
        // ============================================================
        // CACHE INVALIDATION
        // ============================================================
        // When a contest ends, its leaderboard becomes immutable (no more submissions).
        // Invalidate the Redis cache to force recalculation of final standings.
        // This ensures the final leaderboard is accurate and not stale.
        
        // Fetch the contests that just ended (need their IDs for cache keys)
        const contests = await Contest.find({ 
          status: 'ended', 
          endTime: { $lte: now } 
        });
        
        // Delete cache entry for each ended contest
        // Cache key format: 'leaderboard:{contestId}'
        for (const contest of contests) {
          await redis.del(`leaderboard:${contest._id}`);
        }
      }
    } catch (error) {
      // Log errors but don't crash the cron job
      // Next iteration (in 30 seconds) will retry the transitions
      console.error('Contest cron error:', error);
    }
  });
  
  // Confirmation message on server startup
  console.log('Contest cron job started (runs every 30 seconds)');
};

module.exports = { startContestCron };
