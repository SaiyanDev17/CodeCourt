// User service
const User = require('../auth/model');
const redis = require('../../config/redis');
const { ROLES, LIMITS, REDIS_KEYS } = require('../../config/constants');

/**
 * Get user profile with Redis caching (TTL 300s)
 */
exports.getUserProfile = async (username) => {
  const cacheKey = `${REDIS_KEYS.USER_PROFILE}:${username}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from MongoDB
  const user = await User.findOne({ username }).select('-passwordHash').lean();
  
  if (user) {
    // Cache for 5 minutes
    await redis.setex(cacheKey, LIMITS.CACHE_TTL_USER_PROFILE, JSON.stringify(user));
  }
  
  return user;
};

/**
 * Update user role and invalidate cache
 */
exports.updateUserRole = async (userId, role) => {
  const validRoles = Object.values(ROLES);
  
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }
  
  const user = await User.findByIdAndUpdate(
    userId,
    { role, updatedAt: new Date() },
    { new: true }
  ).select('-passwordHash');
  
  if (user) {
    // Invalidate cache
    const cacheKey = `${REDIS_KEYS.USER_PROFILE}:${user.username}`;
    await redis.del(cacheKey);
  }
  
  return user;
};
