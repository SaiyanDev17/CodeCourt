/**
 * User Profile Service
 * 
 * VISION:
 * Provide fast, cached access to user profile data while maintaining data consistency
 * across the platform. Enable efficient user lookups by username with minimal database load.
 * 
 * WHY THIS EXISTS:
 * User profiles are frequently accessed (leaderboards, submission lists, contest participants)
 * but rarely change. Without caching, every profile view would hit MongoDB, creating
 * unnecessary load. This service implements a dual-key caching strategy to optimize
 * both username-based and ID-based lookups.
 * 
 * WHAT IT DOES:
 * - Fetches user profiles with Redis caching (5-minute TTL)
 * - Implements dual-key cache strategy (username→userId + userId→profile)
 * - Updates user roles with automatic cache invalidation
 * - Filters sensitive data (passwordHash) from public profiles
 * - Gracefully falls back to MongoDB when Redis is unavailable
 * 
 * DESIGN DECISIONS:
 * 1. Dual-Key Caching Strategy:
 *    - username→userId mapping allows fast username lookups
 *    - userId→profile cache enables efficient ID-based access
 *    - Both keys share the same TTL (300s) to prevent stale mappings
 * 
 * 2. Cache TTL (300 seconds):
 *    - Long enough to reduce database load significantly
 *    - Short enough that role changes propagate within 5 minutes
 *    - Balances performance vs data freshness
 * 
 * 3. Graceful Degradation:
 *    - Redis failures don't break functionality
 *    - Falls back to MongoDB with console warnings
 *    - Continues to attempt caching on subsequent requests
 * 
 * 4. Cache Invalidation on Role Update:
 *    - Immediately invalidates both cache keys
 *    - Ensures role changes are reflected instantly
 *    - Prevents privilege escalation from stale cache
 * 
 * USAGE:
 * ```javascript
 * const userService = require('./modules/users/service');
 * 
 * // Get user profile (cached)
 * const profile = await userService.getUserProfile('john_doe');
 * // Returns: { _id, username, email, role, createdAt, updatedAt }
 * 
 * // Update user role (invalidates cache)
 * const updated = await userService.updateUserRole(userId, 'admin');
 * // Cache is automatically cleared for this user
 * ```
 */

const User = require('../auth/model');
const redis = require('../../config/redis');
const { ROLES, LIMITS, REDIS_KEYS } = require('../../config/constants');

/**
 * Get user profile with Redis caching (TTL 300s)
 * 
 * Implements a dual-key caching strategy:
 * 1. username→userId mapping (fast username lookups)
 * 2. userId→profile cache (efficient profile retrieval)
 * 
 * @param {string} username - The username to look up
 * @returns {Promise<Object|null>} User profile object (without passwordHash) or null if not found
 * 
 * @example
 * const profile = await getUserProfile('john_doe');
 * // Returns: { _id, username, email, role, createdAt, updatedAt }
 */
exports.getUserProfile = async (username) => {
  // First, try to get userId from username mapping cache
  // This allows fast username→userId resolution without hitting MongoDB
  try {
    const usernameMappingKey = `${REDIS_KEYS.USER_PROFILE}:username:${username}`;
    const cachedUserId = await redis.get(usernameMappingKey);
    
    if (cachedUserId) {
      // Try to get profile from userId cache
      // This is the second level of the dual-key strategy
      const profileCacheKey = `${REDIS_KEYS.USER_PROFILE}:${cachedUserId}`;
      const cachedProfile = await redis.get(profileCacheKey);
      
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }
    }
  } catch (error) {
    // Redis failures should not break functionality
    // Log warning and fall through to MongoDB query
    console.warn('Redis cache read failed, falling back to MongoDB:', error.message);
  }
  
  // Cache miss or Redis unavailable - fetch from MongoDB
  // Use .lean() for better performance (returns plain JS object)
  const user = await User.findOne({ username }).select('-passwordHash').lean();
  
  if (!user) {
    return null;
  }
  
  // Cache both the username→userId mapping and the full profile
  // This enables fast lookups from both username and userId
  const profileCacheKey = `${REDIS_KEYS.USER_PROFILE}:${user._id}`;
  const usernameMappingKeyFinal = `${REDIS_KEYS.USER_PROFILE}:username:${username}`;
  
  try {
    // Cache profile by userId (300 seconds = 5 minutes)
    await redis.setex(profileCacheKey, LIMITS.CACHE_TTL_USER_PROFILE, JSON.stringify(user));
    
    // Cache username→userId mapping (same TTL to prevent stale mappings)
    await redis.setex(usernameMappingKeyFinal, LIMITS.CACHE_TTL_USER_PROFILE, user._id.toString());
  } catch (error) {
    // Cache write failures are non-critical - log and continue
    console.warn('Redis cache write failed:', error.message);
  }
  
  return user;
};

/**
 * Update user role and invalidate cache
 * 
 * Updates a user's role and immediately invalidates both cache keys to ensure
 * the role change is reflected instantly across the platform. This prevents
 * privilege escalation from stale cache data.
 * 
 * @param {string} userId - The MongoDB ObjectId of the user
 * @param {string} role - The new role ('user', 'admin', or 'problem_setter')
 * @returns {Promise<Object|null>} Updated user object or null if not found
 * @throws {Error} If the role is invalid
 * 
 * @example
 * // Promote user to admin
 * const updated = await updateUserRole('507f1f77bcf86cd799439011', 'admin');
 * 
 * // Invalid role throws error
 * await updateUserRole(userId, 'superuser'); // throws Error
 */
exports.updateUserRole = async (userId, role) => {
  // Validate role against allowed values from constants
  const validRoles = Object.values(ROLES);
  
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }
  
  // Update user in MongoDB with new role and timestamp
  const user = await User.findByIdAndUpdate(
    userId,
    { role, updatedAt: new Date() },
    { new: true } // Return updated document
  ).select('-passwordHash');
  
  if (user) {
    // Invalidate both cache keys to ensure role change is reflected immediately
    // This is critical for security - stale cache could allow unauthorized access
    const profileCacheKey = `${REDIS_KEYS.USER_PROFILE}:${user._id}`;
    const usernameMappingKey = `${REDIS_KEYS.USER_PROFILE}:username:${user.username}`;
    
    try {
      // Delete both cache keys in parallel for efficiency
      await Promise.all([
        redis.del(profileCacheKey),
        redis.del(usernameMappingKey)
      ]);
    } catch (error) {
      // Cache invalidation failure is non-critical (cache will expire naturally)
      // but log warning for monitoring
      console.warn('Redis cache invalidation failed:', error.message);
    }
  }
  
  return user;
};
