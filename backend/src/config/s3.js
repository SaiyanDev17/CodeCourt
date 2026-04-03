const { S3Client } = require('@aws-sdk/client-s3');

/**
 * AWS S3 Configuration Module
 * 
 * This module initializes and exports an AWS S3 client for storing test case files.
 * 
 * Environment Variables Required:
 * - AWS_ACCESS_KEY_ID: AWS access key
 * - AWS_SECRET_ACCESS_KEY: AWS secret key
 * - AWS_REGION: AWS region (default: us-east-1)
 * - S3_BUCKET_NAME: S3 bucket name (default: codecourt-test-cases)
 * 
 * Usage Example:
 * ```javascript
 * const s3Client = require('./config/s3');
 * const { getBucketName } = require('./config/s3');
 * const { PutObjectCommand } = require('@aws-sdk/client-s3');
 * 
 * // Upload a file
 * const command = new PutObjectCommand({
 *   Bucket: getBucketName(),
 *   Key: 'test-cases/problem-id/hidden.zip',
 *   Body: fileBuffer,
 * });
 * await s3Client.send(command);
 * ```
 */

/**
 * Create and configure AWS S3 client for test case storage
 * @returns {S3Client} Configured S3 client instance
 */
const createS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Validate required credentials
  if (!accessKeyId || !secretAccessKey) {
    console.warn('⚠ AWS credentials not configured. S3 operations will fail.');
    console.warn('⚠ Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  }

  const config = {
    region,
    credentials: accessKeyId && secretAccessKey ? {
      accessKeyId,
      secretAccessKey,
    } : undefined,
  };

  const client = new S3Client(config);

  console.log(`✓ S3 client initialized (region: ${region})`);

  return client;
};

// Create and export the S3 client instance
const s3Client = createS3Client();

/**
 * Get the configured S3 bucket name
 * @returns {string} S3 bucket name
 */
const getBucketName = () => {
  const bucketName = process.env.S3_BUCKET_NAME || 'codecourt-test-cases';
  return bucketName;
};

module.exports = s3Client;
module.exports.getBucketName = getBucketName;
module.exports.createS3Client = createS3Client;
