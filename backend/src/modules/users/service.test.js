// User service tests
const userService = require('./service');
const User = require('../auth/model');
const redis = require('../../config/redis');
const { ROLES, LIMITS, REDIS_KEYS } = require('../../config/constants');

// Mock dependencies
jest.mock('../auth/model');
jest.mock('../../config/redis');

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    const mockUsername = 'testuser';
    const mockUserId = '507f1f77bcf86cd799439011';
    const mockUser = {
      _id: mockUserId,
      username: mockUsername,
      email: 'test@example.com',
      role: 'contestant',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return cached profile when both caches hit', async () => {
      const mockUserCached = {
        ...mockUser,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString()
      };
      
      // Mock username->userId mapping cache hit
      redis.get.mockResolvedValueOnce(mockUserId);
      // Mock profile cache hit
      redis.get.mockResolvedValueOnce(JSON.stringify(mockUserCached));

      const result = await userService.getUserProfile(mockUsername);

      expect(result).toEqual(mockUserCached);
      expect(redis.get).toHaveBeenCalledTimes(2);
      expect(redis.get).toHaveBeenNthCalledWith(1, `${REDIS_KEYS.USER_PROFILE}:username:${mockUsername}`);
      expect(redis.get).toHaveBeenNthCalledWith(2, `${REDIS_KEYS.USER_PROFILE}:${mockUserId}`);
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from MongoDB and cache when username mapping cache misses', async () => {
      // Mock cache miss
      redis.get.mockResolvedValue(null);
      
      // Mock MongoDB query
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser)
      };
      User.findOne.mockReturnValue(mockQuery);

      const result = await userService.getUserProfile(mockUsername);

      expect(result).toEqual(mockUser);
      expect(User.findOne).toHaveBeenCalledWith({ username: mockUsername });
      expect(redis.setex).toHaveBeenCalledTimes(2);
      expect(redis.setex).toHaveBeenCalledWith(
        `${REDIS_KEYS.USER_PROFILE}:${mockUserId}`,
        LIMITS.CACHE_TTL_USER_PROFILE,
        JSON.stringify(mockUser)
      );
      expect(redis.setex).toHaveBeenCalledWith(
        `${REDIS_KEYS.USER_PROFILE}:username:${mockUsername}`,
        LIMITS.CACHE_TTL_USER_PROFILE,
        mockUserId.toString()
      );
    });

    it('should fetch from MongoDB when username mapping hits but profile cache misses', async () => {
      // Mock username mapping cache hit
      redis.get.mockResolvedValueOnce(mockUserId);
      // Mock profile cache miss
      redis.get.mockResolvedValueOnce(null);
      
      // Mock MongoDB query
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser)
      };
      User.findOne.mockReturnValue(mockQuery);

      const result = await userService.getUserProfile(mockUsername);

      expect(result).toEqual(mockUser);
      expect(User.findOne).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalledTimes(2);
    });

    it('should return null when user not found', async () => {
      // Mock cache miss
      redis.get.mockResolvedValue(null);
      
      // Mock MongoDB query returning null
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null)
      };
      User.findOne.mockReturnValue(mockQuery);

      const result = await userService.getUserProfile(mockUsername);

      expect(result).toBeNull();
      expect(redis.setex).not.toHaveBeenCalled();
    });

    it('should use TTL of 300 seconds', async () => {
      redis.get.mockResolvedValue(null);
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser)
      };
      User.findOne.mockReturnValue(mockQuery);

      await userService.getUserProfile(mockUsername);

      expect(redis.setex).toHaveBeenCalledWith(
        expect.any(String),
        300,
        expect.any(String)
      );
    });

    it('should fall back to MongoDB when Redis read fails', async () => {
      // Mock Redis failure
      redis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      // Mock MongoDB query
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser)
      };
      User.findOne.mockReturnValue(mockQuery);

      const result = await userService.getUserProfile(mockUsername);

      expect(result).toEqual(mockUser);
      expect(User.findOne).toHaveBeenCalledWith({ username: mockUsername });
    });

    it('should continue when Redis write fails after MongoDB fetch', async () => {
      // Mock cache miss
      redis.get.mockResolvedValue(null);
      // Mock Redis write failure
      redis.setex.mockRejectedValue(new Error('Redis connection failed'));
      
      // Mock MongoDB query
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser)
      };
      User.findOne.mockReturnValue(mockQuery);

      const result = await userService.getUserProfile(mockUsername);

      expect(result).toEqual(mockUser);
      expect(User.findOne).toHaveBeenCalled();
    });
  });

  describe('updateUserRole', () => {
    const mockUserId = '507f1f77bcf86cd799439011';
    const mockUsername = 'testuser';
    const newRole = ROLES.PROBLEM_SETTER;
    const mockUpdatedUser = {
      _id: mockUserId,
      username: mockUsername,
      email: 'test@example.com',
      role: newRole,
      updatedAt: new Date()
    };

    it('should update user role and invalidate both caches', async () => {
      // Mock MongoDB update
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUpdatedUser)
      };
      User.findByIdAndUpdate.mockReturnValue(mockQuery);
      redis.del.mockResolvedValue(1);

      const result = await userService.updateUserRole(mockUserId, newRole);

      expect(result).toEqual(mockUpdatedUser);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { role: newRole, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(redis.del).toHaveBeenCalledTimes(2);
      expect(redis.del).toHaveBeenCalledWith(`${REDIS_KEYS.USER_PROFILE}:${mockUserId}`);
      expect(redis.del).toHaveBeenCalledWith(`${REDIS_KEYS.USER_PROFILE}:username:${mockUsername}`);
    });

    it('should throw error for invalid role', async () => {
      await expect(
        userService.updateUserRole(mockUserId, 'invalid_role')
      ).rejects.toThrow('Invalid role');

      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null)
      };
      User.findByIdAndUpdate.mockReturnValue(mockQuery);

      const result = await userService.updateUserRole(mockUserId, newRole);

      expect(result).toBeNull();
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should accept all valid roles', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUpdatedUser)
      };
      User.findByIdAndUpdate.mockReturnValue(mockQuery);
      redis.del.mockResolvedValue(1);

      for (const role of Object.values(ROLES)) {
        await userService.updateUserRole(mockUserId, role);
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUserId,
          { role, updatedAt: expect.any(Date) },
          { new: true }
        );
      }
    });

    it('should invalidate cache within 1 second of update', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUpdatedUser)
      };
      User.findByIdAndUpdate.mockReturnValue(mockQuery);
      redis.del.mockResolvedValue(1);

      const startTime = Date.now();
      await userService.updateUserRole(mockUserId, newRole);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(redis.del).toHaveBeenCalled();
    });

    it('should continue when Redis cache invalidation fails', async () => {
      // Mock MongoDB update
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUpdatedUser)
      };
      User.findByIdAndUpdate.mockReturnValue(mockQuery);
      // Mock Redis failure
      redis.del.mockRejectedValue(new Error('Redis connection failed'));

      const result = await userService.updateUserRole(mockUserId, newRole);

      expect(result).toEqual(mockUpdatedUser);
      expect(User.findByIdAndUpdate).toHaveBeenCalled();
    });
  });
});
