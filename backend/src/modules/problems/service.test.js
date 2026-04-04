// Problems service tests - Redis fallback
const ProblemService = require('./service');
const Problem = require('./model');
const redis = require('../../config/redis');

// Mock dependencies
jest.mock('./model');
jest.mock('../../config/redis');
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn()
}));

describe('ProblemService - Redis Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listPublished', () => {
    const mockProblems = [
      {
        _id: 'problem1',
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'easy',
        status: 'published'
      },
      {
        _id: 'problem2',
        title: 'Add Two Numbers',
        slug: 'add-two-numbers',
        difficulty: 'medium',
        status: 'published'
      }
    ];

    it('should return cached problems if available', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockProblems));

      const result = await ProblemService.listPublished();

      expect(redis.get).toHaveBeenCalledWith('problems:list');
      expect(result).toEqual(mockProblems);
      expect(Problem.find).not.toHaveBeenCalled();
    });

    it('should fetch from MongoDB and cache if cache miss', async () => {
      redis.get.mockResolvedValue(null);
      
      Problem.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProblems)
      });

      redis.setex.mockResolvedValue('OK');

      const result = await ProblemService.listPublished();

      expect(redis.get).toHaveBeenCalledWith('problems:list');
      expect(Problem.find).toHaveBeenCalledWith({ status: 'published' });
      expect(redis.setex).toHaveBeenCalledWith(
        'problems:list',
        60,
        JSON.stringify(mockProblems)
      );
      expect(result).toEqual(mockProblems);
    });

    it('should fall back to MongoDB when Redis read fails', async () => {
      redis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      Problem.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProblems)
      });

      const result = await ProblemService.listPublished();

      expect(Problem.find).toHaveBeenCalled();
      expect(result).toEqual(mockProblems);
    });

    it('should continue when Redis write fails after MongoDB fetch', async () => {
      redis.get.mockResolvedValue(null);
      redis.setex.mockRejectedValue(new Error('Redis write failed'));
      
      Problem.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProblems)
      });

      const result = await ProblemService.listPublished();

      expect(Problem.find).toHaveBeenCalled();
      expect(result).toEqual(mockProblems);
    });
  });

  describe('update - Cache Invalidation', () => {
    const problemId = 'problem1';
    const userId = 'author1';
    const updateData = { title: 'Updated Title' };
    const mockProblem = {
      _id: problemId,
      title: 'Original Title',
      slug: 'original-title',
      authorId: userId,
      status: 'draft',
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: problemId,
        title: 'Updated Title',
        slug: 'original-title'
      })
    };

    it('should invalidate cache after update', async () => {
      Problem.findById.mockResolvedValue(mockProblem);
      redis.del.mockResolvedValue(1);

      await ProblemService.update(problemId, updateData, userId);

      expect(redis.del).toHaveBeenCalledWith('problems:list');
    });

    it('should continue when cache invalidation fails', async () => {
      Problem.findById.mockResolvedValue(mockProblem);
      redis.del.mockRejectedValue(new Error('Redis delete failed'));

      const result = await ProblemService.update(problemId, updateData, userId);

      expect(result).toBeDefined();
      expect(mockProblem.save).toHaveBeenCalled();
    });
  });

  describe('approve - Cache Invalidation', () => {
    const problemId = 'problem1';
    const mockProblem = {
      _id: problemId,
      title: 'Test Problem',
      status: 'draft',
      rejectionReason: 'Previous rejection',
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: problemId,
        title: 'Test Problem',
        status: 'published'
      })
    };

    it('should invalidate cache after approval', async () => {
      Problem.findById.mockResolvedValue(mockProblem);
      redis.del.mockResolvedValue(1);

      await ProblemService.approve(problemId);

      expect(redis.del).toHaveBeenCalledWith('problems:list');
      expect(mockProblem.status).toBe('published');
    });

    it('should continue when cache invalidation fails', async () => {
      Problem.findById.mockResolvedValue(mockProblem);
      redis.del.mockRejectedValue(new Error('Redis delete failed'));

      const result = await ProblemService.approve(problemId);

      expect(result).toBeDefined();
      expect(mockProblem.save).toHaveBeenCalled();
    });
  });
});
