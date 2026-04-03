// User service
const User = require('../auth/model');
const redis = require('../../config/redis');

/**
 * Get user profile with Redis caching (TTL 300s)
 */
exports.getUserProfile = async (username) => {
  const cacheKey = `user:profile:${username}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from MongoDB
  const user = await User.findOne({ username }).select('-passwordHash').lean();
  
  if (user) {
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(user));
  }
  
  return user;
};

/**
 * Update user role and invalidate cache
 */
exports.updateUserRole = async (userId, role) => {
  const validRoles = ['admin', 'problem_setter', 'contestant'];
  
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
    const cacheKey = `user:profile:${user.username}`;
    await redis.del(cacheKey);
  }
  
  return user;
};
