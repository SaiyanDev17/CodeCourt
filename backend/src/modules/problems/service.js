// Problems service
// Business logic for problem management: CRUD, approval workflow, S3 uploads

const Problem = require('./model');
const redis = require('../../config/redis');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'codecourt-test-cases';
const CACHE_TTL = 60; // 60 seconds

class ProblemService {
  async listPublished() {
    try {
      // Check Redis cache for 'problems:list' (TTL 60s)
      const cached = await redis.get('problems:list');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache read failed, falling back to MongoDB:', error.message);
    }

    // Cache miss or Redis unavailable, query MongoDB
    const problems = await Problem.find({ status: 'published' })
      .select('-hiddenTestCasesS3Key') // Don't expose S3 keys
      .sort({ createdAt: -1 })
      .lean();

    // Populate cache (best effort)
    try {
      await redis.setex('problems:list', CACHE_TTL, JSON.stringify(problems));
    } catch (error) {
      console.warn('Redis cache write failed:', error.message);
    }

    return problems;
  }

  async getBySlug(slug) {
    const problem = await Problem.findOne({ slug })
      .populate('authorId', 'username')
      .lean();
    
    return problem;
  }

  async getById(problemId) {
    const problem = await Problem.findById(problemId).lean();
    return problem;
  }

  async create(problemData, authorId) {
    // Check slug uniqueness
    const existing = await Problem.findOne({ slug: problemData.slug });
    if (existing) {
      const error = new Error('Problem with this slug already exists');
      error.statusCode = 409;
      throw error;
    }

    // Create problem document with status 'draft' and authorId
    const problem = await Problem.create({
      ...problemData,
      authorId,
      status: 'draft'
    });

    return problem.toObject();
  }

  async update(problemId, updateData, userId) {
    // Find problem by ID
    const problem = await Problem.findById(problemId);
    
    if (!problem) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify ownership
    if (problem.authorId.toString() !== userId) {
      const error = new Error('Not authorized to update this problem');
      error.statusCode = 403;
      throw error;
    }

    // If problem is 'published' and test cases are updated, transition to 'draft'
    if (problem.status === 'published' && updateData.sampleTestCases) {
      updateData.status = 'draft';
    }

    // Update problem document
    Object.assign(problem, updateData);
    await problem.save();

    // Invalidate Redis cache
    try {
      await redis.del('problems:list');
    } catch (error) {
      console.warn('Redis cache invalidation failed:', error.message);
    }

    return problem.toObject();
  }

  async uploadTestCases(problemId, zipBuffer, userId) {
    // Find problem by ID
    const problem = await Problem.findById(problemId);
    
    if (!problem) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify ownership
    if (problem.authorId.toString() !== userId) {
      const error = new Error('Not authorized to upload test cases for this problem');
      error.statusCode = 403;
      throw error;
    }

    // Upload ZIP to S3 with key: test-cases/{problemId}/hidden.zip
    const s3Key = `test-cases/${problemId}/hidden.zip`;
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: zipBuffer,
      ContentType: 'application/zip'
    });

    await s3Client.send(command);

    // Update problem.hiddenTestCasesS3Key in MongoDB
    problem.hiddenTestCasesS3Key = s3Key;
    await problem.save();

    return {
      s3Key,
      url: `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`
    };
  }

  async approve(problemId) {
    // Find problem by ID
    const problem = await Problem.findById(problemId);
    
    if (!problem) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }

    // Transition status from 'draft' to 'published'
    problem.status = 'published';
    problem.rejectionReason = null; // Clear any previous rejection reason
    await problem.save();

    // Invalidate Redis cache
    try {
      await redis.del('problems:list');
    } catch (error) {
      console.warn('Redis cache invalidation failed:', error.message);
    }

    return problem.toObject();
  }

  async reject(problemId, rejectionReason) {
    // Find problem by ID
    const problem = await Problem.findById(problemId);
    
    if (!problem) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }

    // Transition status to 'rejected'
    problem.status = 'rejected';
    problem.rejectionReason = rejectionReason;
    await problem.save();

    return problem.toObject();
  }
}

module.exports = new ProblemService();
