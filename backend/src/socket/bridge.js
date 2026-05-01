/**
 * Socket.io ↔ Redis Bridge
 * 
 * Bridges the gap between BullMQ worker processes and the Socket.io server.
 * 
 * WHY THIS EXISTS:
 * BullMQ workers run in separate contexts where Socket.io is not initialized.
 * Workers cannot call getIO() because initSocket() only runs in the main server
 * process. This bridge uses Redis pub/sub as a communication channel:
 * 
 *   Worker → Redis.publish() → Redis channel → this bridge → Socket.io → Client
 * 
 * WHAT IT DOES:
 * 1. Creates a dedicated Redis subscriber (separate from the main client)
 * 2. Subscribes to 'verdict' and 'leaderboard:update' channels
 * 3. When a message arrives, calls the existing Socket.io emit helpers
 * 
 * DESIGN DECISIONS:
 * - Separate Redis client for subscriber (ioredis requires this — a subscribed
 *   client cannot run other commands)
 * - JSON serialization for structured event data
 * - Graceful error handling (logs but doesn't crash)
 * 
 * USAGE:
 * Called once in server.js AFTER initSocket():
 *   const { initSocketBridge } = require('./socket/bridge');
 *   initSocket(server);
 *   initSocketBridge();
 */

const Redis = require('ioredis');
const { emitVerdict } = require('./verdict.socket');
const { emitLeaderboardUpdate } = require('./leaderboard.socket');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let subscriber = null;

/**
 * Initialize the Redis → Socket.io bridge
 * 
 * Creates a dedicated Redis subscriber client and listens for
 * verdict and leaderboard events published by the worker process.
 */
function initSocketBridge() {
  subscriber = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });

  subscriber.subscribe('socket:verdict', 'socket:leaderboard', (err, count) => {
    if (err) {
      console.error('✗ Failed to subscribe to socket channels:', err.message);
      return;
    }
    console.log(`✓ Socket bridge subscribed to ${count} Redis channels`);
  });

  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);

      if (channel === 'socket:verdict') {
        emitVerdict(data.userId, data.verdictData);
      } else if (channel === 'socket:leaderboard') {
        emitLeaderboardUpdate(data.contestId, data.leaderboard);
      }
    } catch (error) {
      console.error('Socket bridge message error:', error.message);
    }
  });

  subscriber.on('error', (error) => {
    console.error('Socket bridge Redis error:', error.message);
  });
}

/**
 * Close the bridge subscriber (for graceful shutdown)
 */
async function closeSocketBridge() {
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
}

module.exports = { initSocketBridge, closeSocketBridge };
