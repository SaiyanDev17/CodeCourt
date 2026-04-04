// User service
const User = require('../auth/model');
const redis = require('../../config/redis');
const { ROLES, LIMITS, REDIS_KEYS } = require('../../config/constants');

/**
 * Get user profile with Redis caching (TTL 300s)
 * Uses dual-key strategy: username->userId mapping + userId->profile cache
 */
exports.getUserProfile = async (username) => {
  // First, try to get userId from username mapping cache
  try {
    const usernameMappingKey = `${REDIS_KEYS.USER_PROFILE}:username:${username}`;
    const cachedUserId = await redis.get(usernameMappingKey);
    
    if (cachedUserId) {
      // Try to get profile from userId cache
      const profileCacheKey = `${REDIS_KEYS.USER_PROFILE}:${cachedUserId}`;
      const cachedProfile = await redis.get(profileCacheKey);
      
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }
    }
  } catch (error) {
    console.warn('Redis cache read failed, falling back to MongoDB:', error.message);
  }
  
  // Cache miss - fetch from MongoDB
  const user = await User.findOne({ username }).select('-passwordHash').lean();
  
  if (!user) {
    return null;
  }
  
  // Cache both the username->userId mapping and the profile
  const profileCacheKey = `${REDIS_KEYS.USER_PROFILE}:${user._id}`;
  const usernameMappingKeyFinal = `${REDIS_KEYS.USER_PROFILE}:username:${username}`;
  
  try {
    // Cache profile by userId (300 seconds)
    await redis.setex(profileCacheKey, LIMITS.CACHE_TTL_USER_PROFILE, JSON.stringify(user));
    
    // Cache username->userId mapping (300 seconds)
    await redis.setex(usernameMappingKeyFinal, LIMITS.CACHE_TTL_USER_PROFILE, user._id.toString());
  } catch (error) {
    console.warn('Redis cache write failed:', error.message);
  }
  
  return user;
};

/**
 * Update user role and invalidate cache
 * Invalidates both userId->profile and username->userId mapping caches
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
    // Invalidate both cache keys
    const profileCacheKey = `${REDIS_KEYS.USER_PROFILE}:${user._id}`;
    const usernameMappingKey = `${REDIS_KEYS.USER_PROFILE}:username:${user.username}`;
    
    try {
      await Promise.all([
        redis.del(profileCacheKey),
        redis.del(usernameMappingKey)
      ]);
    } catch (error) {
      console.warn('Redis cache invalidation failed:', error.message);
    }
  }
  
  return user;
};
