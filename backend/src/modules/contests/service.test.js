// Contest service integration tests
// Tests for leaderboard caching functionality

const ContestService = require('./service');
const { Contest, ContestScore } = require('./model');
const redis = require('../../config/redis');

// Mock dependencies
jest.mock('./model');
jest.mock('../../config/redis');

describe('ContestService - Leaderboard Caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    const contestId = 'test-contest-123';
    const mockLeaderboard = [
      {
        rank: 1,
        username: 'user1',
        userId: 'user1-id',
        totalScore: 200,
        problemsSolved: 2,
        totalPenalty: 50
      },
      {
        rank: 2,
        username: 'user2',
        userId: 'user2-id',
        totalScore: 150,
        problemsSolved: 1,
        totalPenalty: 30
      }
    ];

    it('should return cached leaderboard if available', async () => {
      // Mock Redis cache hit
      redis.get.mockResolvedValue(JSON.stringify(mockLeaderboard));

      const result = await ContestService.getLeaderboard(contestId);

      expect(redis.get).toHaveBeenCalledWith(`leaderboard:${contestId}`);
      expect(result).toEqual(mockLeaderboard);
      // MongoDB should not be queried
      expect(ContestScore.find).not.toHaveBeenCalled();
    });

    it('should fetch from MongoDB and cache if cache miss', async () => {
      // Mock Redis cache miss
      redis.get.mockResolvedValue(null);
      
      // Mock MongoDB response
      const mockScores = [
        {
          userId: { _id: 'user1-id', username: 'user1' },
          totalScore: 200,
          problemScores: [
            { solved: true, penalty: 30 },
            { solved: true, penalty: 20 }
          ]
        },
        {
          userId: { _id: 'user2-id', username: 'user2' },
          totalScore: 150,
          problemScores: [
            { solved: true, penalty: 30 },
            { solved: false, penalty: 0 }
          ]
        }
      ];

      ContestScore.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockScores)
      });

      redis.setex.mockResolvedValue('OK');

      const result = await ContestService.getLeaderboard(contestId);

      // Verify Redis cache was checked
      expect(redis.get).toHaveBeenCalledWith(`leaderboard:${contestId}`);
      
      // Verify MongoDB was queried
      expect(ContestScore.find).toHaveBeenCalledWith({ contestId });
      
      // Verify result was cached with 10 second TTL
      expect(redis.setex).toHaveBeenCalledWith(
        `leaderboard:${contestId}`,
        10,
        expect.any(String)
      );

      // Verify leaderboard structure
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        rank: 1,
        username: 'user1',
        totalScore: 200,
        problemsSolved: 2
      });
    });

    it('should handle Redis cache read failure gracefully', async () => {
      // Mock Redis error
      redis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      // Mock MongoDB response
      const mockScores = [
        {
          userId: { _id: 'user1-id', username: 'user1' },
          totalScore: 200,
          problemScores: [{ solved: true, penalty: 30 }]
        }
      ];

      ContestScore.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockScores)
      });

      const result = await ContestService.getLeaderboard(contestId);

      // Should fall back to MongoDB
      expect(ContestScore.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should handle Redis cache write failure gracefully', async () => {
      // Mock Redis cache miss
      redis.get.mockResolvedValue(null);
      
      // Mock MongoDB response
      const mockScores = [
        {
          userId: { _id: 'user1-id', username: 'user1' },
          totalScore: 200,
          problemScores: [{ solved: true, penalty: 30 }]
        }
      ];

      ContestScore.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockScores)
      });

      // Mock Redis write failure
      redis.setex.mockRejectedValue(new Error('Redis write failed'));

      const result = await ContestService.getLeaderboard(contestId);

      // Should still return data from MongoDB
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('user1');
    });
  });

  describe('recordSubmission - Cache Invalidation', () => {
    const contestId = 'test-contest-123';
    const userId = 'user1-id';
    const problemId = 'problem1-id';

    it('should invalidate leaderboard cache on AC submission', async () => {
      // Mock contest
      Contest.findById.mockResolvedValue({
        _id: contestId,
        startTime: new Date('2024-01-01T00:00:00Z'),
        problemIds: [problemId]
      });

      // Mock existing contest score
      const mockContestScore = {
        contestId,
        userId,
        totalScore: 100,
        problemScores: [
          {
            problemId,
            solved: false,
            attempts: 0,
            firstAcTime: null,
            penalty: 0
          }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      ContestScore.findOne.mockResolvedValue(mockContestScore);
      redis.del.mockResolvedValue(1);

      const submittedAt = new Date('2024-01-01T00:10:00Z');
      await ContestService.recordSubmission(contestId, userId, problemId, 'AC', submittedAt);

      // Verify cache was invalidated
      expect(redis.del).toHaveBeenCalledWith(`leaderboard:${contestId}`);
    });

    it('should handle cache invalidation failure gracefully', async () => {
      // Mock contest
      Contest.findById.mockResolvedValue({
        _id: contestId,
        startTime: new Date('2024-01-01T00:00:00Z'),
        problemIds: [problemId]
      });

      // Mock existing contest score
      const mockContestScore = {
        contestId,
        userId,
        totalScore: 100,
        problemScores: [
          {
            problemId,
            solved: false,
            attempts: 0,
            firstAcTime: null,
            penalty: 0
          }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      ContestScore.findOne.mockResolvedValue(mockContestScore);
      
      // Mock Redis delete failure
      redis.del.mockRejectedValue(new Error('Redis delete failed'));

      const submittedAt = new Date('2024-01-01T00:10:00Z');
      
      // Should not throw error
      await expect(
        ContestService.recordSubmission(contestId, userId, problemId, 'AC', submittedAt)
      ).resolves.toBeDefined();
    });
  });
});
