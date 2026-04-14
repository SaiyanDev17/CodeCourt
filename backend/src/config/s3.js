const { S3Client } = require('@aws-sdk/client-s3');

/**
 * AWS S3 Configuration Module

/**
 * Create and configure AWS S3 client for test case storage
 * 
 * Initializes S3 client with:
 * - Region configuration (default: us-east-1)
 * - IAM credentials from environment variables
 * - Graceful handling of missing credentials (warns but doesn't crash)
 * 
 * @returns {S3Client} Configured S3 client instance
 */
const createS3Client = () => {
  // Get AWS region from environment or use default
  // us-east-1 is the default region for most AWS services
  const region = process.env.AWS_REGION || 'us-east-1';
  
  // Get AWS credentials from environment variables
  // These should be IAM credentials with S3 permissions:
  // - s3:PutObject (for uploading test cases)
  // - s3:GetObject (for downloading test cases in judge)
  // - s3:DeleteObject (for removing test cases when problems are deleted)
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Validate required credentials
  // In production, these MUST be set. In local development, you can work
  // without S3 by using mock data or skipping test case uploads.
  if (!accessKeyId || !secretAccessKey) {
    console.warn('⚠ AWS credentials not configured. S3 operations will fail.');
    console.warn('⚠ Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    console.warn('⚠ For local development, you can skip test case uploads or use LocalStack.');
  }

  // Build S3 client configuration
  const config = {
    region,
    // Only include credentials if both are present
    // This allows the SDK to fall back to other credential sources
    // (IAM roles, EC2 instance profiles, etc.) in production
    credentials: accessKeyId && secretAccessKey ? {
      accessKeyId,
      secretAccessKey,
    } : undefined,
  };

  // Create S3 client with configuration
  const client = new S3Client(config);

  console.log(`✓ S3 client initialized (region: ${region})`);

  return client;
};

// Create and export the S3 client instance
// This singleton instance is shared across the entire application
// Used by: problems service (upload test cases), judge worker (download test cases)
const s3Client = createS3Client();

/**
 * Get the configured S3 bucket name
 * 
 * Returns the S3 bucket name from environment variables or default.
 * The bucket should be created manually in AWS console or via Terraform
 * with appropriate permissions:
 * - Private access (no public read)
 * - Versioning enabled (for test case history)
 * - Lifecycle policy (optional: delete old versions after 30 days)
 * 
 * Bucket structure:
 * ```
 * codecourt-test-cases/
 *   test-cases/
 *     {problemId}/
 *       hidden.zip          # Hidden test cases (input/output pairs)
 *       sample.zip          # Sample test cases (optional)
 * ```
 * 
 * @returns {string} S3 bucket name
 * 
 * @example
 * const bucketName = getBucketName(); // 'codecourt-test-cases'
 */
const getBucketName = () => {
  const bucketName = process.env.S3_BUCKET_NAME || 'codecourt-test-cases';
  return bucketName;
};

module.exports = s3Client;
module.exports.getBucketName = getBucketName;
module.exports.createS3Client = createS3Client;
