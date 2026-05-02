require('dotenv').config();
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const [userId, submissionId, verdict] = process.argv.slice(2);

if (!userId || !submissionId) {
  console.error('Usage: node test-socket-bridge.js <userId> <submissionId> [verdict]');
  process.exit(1);
}

const payload = {
  userId,
  verdictData: {
    submissionId,
    verdict: verdict || 'AC',
    executionTime: 123,
    memoryUsed: 16,
  },
};

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis
  .publish('socket:verdict', JSON.stringify(payload))
  .then(() => {
    console.log('Published socket:verdict test event.');
  })
  .catch((error) => {
    console.error('Failed to publish socket:verdict test event:', error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    redis.quit();
  });
