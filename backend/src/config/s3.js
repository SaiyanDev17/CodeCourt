const { S3Client } = require('@aws-sdk/client-s3');

/**
 * AWS S3 Configuration Module
 * 
 * VISION:
 * Provide secure, scalable storage for problem test cases using AWS S3. This enables
 * the platform to handle large test case files (up to 10MB) without bloating the
 * MongoDB database, while ensuring fast access during judge execution.
 * 
 * WHY THIS EXISTS:
 * - Test cases can be large (multiple input/output files, binary data)
 * - Storing large files in MongoDB is inefficient and expensive
 * - S3 provides 99.999999999% durability and unlimited scalability
 * - Judges need fast access to test cases during code execution
 * - Separation of concerns: MongoDB for metadata, S3 for file storage
 * 
 * WHAT IT DOES:
 * 1. Initializes AWS S3 client with credentials from environment variables
 * 2. Validates AWS credentials and warns if missing (graceful degradation)
 * 3. Provides helper function to get the configured bucket name
 * 4. Exports singleton S3 client for use across the application
 * 
 * DESIGN DECISIONS:
 * - Uses AWS SDK v3 (@aws-sdk/client-s3) for smaller bundle size and better tree-shaking
 * - Credentials from environment variables (12-factor app principle)
 * - Graceful degradation: warns but doesn't crash if credentials missing (useful for local dev)
 * - Default region: us-east-1 (most common, lowest latency for US users)
 * - Default bucket: codecourt-test-cases (can be overridden per environment)
 * - Singleton pattern: one S3 client instance shared across the app
 * 
 * USAGE:
 * ```javascript
 * const s3Client = require('./config/s3');
 * const { getBucketName } = require('./config/s3');
 * const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
 * 
 * // Upload test cases (in problems service)
 * const command = new PutObjectCommand({
 *   Bucket: getBucketName(),
 *   Key: `test-cases/${problemId}/hidden.zip`,
 *   Body: fileBuffer,
 *   ContentType: 'application/zip',
 * });
 * await s3Client.send(command);
 * 
 * // Download test cases (in judge worker)
 * const getCommand = new GetObjectCommand({
 *   Bucket: getBucketName(),
 *   Key: `test-cases/${problemId}/hidden.zip`,
 * });
 * const response = await s3Client.send(getCommand);
 * const fileBuffer = await response.Body.transformToByteArray();
 * ```
 * 
 * ENVIRONMENT VARIABLES:
 * - AWS_ACCESS_KEY_ID: AWS IAM access key (required for S3 operations)
 * - AWS_SECRET_ACCESS_KEY: AWS IAM secret key (required for S3 operations)
 * - AWS_REGION: AWS region (default: us-east-1)
 * - S3_BUCKET_NAME: S3 bucket name (default: codecourt-test-cases)
 */

const { S3Client } = require('@aws-sdk/client-s3');

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
