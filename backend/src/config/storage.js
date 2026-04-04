const fs = require('fs').promises;
const path = require('path');

const USE_LOCAL = process.env.USE_LOCAL_STORAGE === 'true';
const UPLOAD_DIR = path.join(__dirname, '../../uploads/test-cases');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log('✅ Local storage directory ready:', UPLOAD_DIR);
  } catch (err) {
    console.error('❌ Failed to create upload directory:', err);
  }
}

// Local storage implementation (for development)
const localStorage = {
  async uploadFile(key, buffer) {
    await ensureUploadDir();
    const filePath = path.join(UPLOAD_DIR, key);
    
    // Create subdirectories if needed
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, buffer);
    console.log('📁 File uploaded locally:', key);
    
    return { 
      url: `file://${filePath}`,
      key,
      location: 'local'
    };
  },
  
  async downloadFile(key) {
    const filePath = path.join(UPLOAD_DIR, key);
    console.log('📥 Downloading file locally:', key);
    return await fs.readFile(filePath);
  },
  
  async deleteFile(key) {
    const filePath = path.join(UPLOAD_DIR, key);
    await fs.unlink(filePath);
    console.log('🗑️  File deleted locally:', key);
  },
  
  async fileExists(key) {
    const filePath = path.join(UPLOAD_DIR, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
};

// S3 storage implementation (for production)
const s3Storage = {
  async uploadFile(key, buffer) {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer
    }));
    
    console.log('☁️  File uploaded to S3:', key);
    
    return {
      url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      key,
      location: 's3'
    };
  },
  
  async downloadFile(key) {
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    console.log('📥 Downloading file from S3:', key);
    
    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    }));
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  },
  
  async deleteFile(key) {
    const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    }));
    
    console.log('🗑️  File deleted from S3:', key);
  },
  
  async fileExists(key) {
    const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    try {
      await s3.send(new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      }));
      return true;
    } catch {
      return false;
    }
  }
};

// Export the appropriate storage based on environment
const storage = USE_LOCAL ? localStorage : s3Storage;

console.log(`📦 Storage mode: ${USE_LOCAL ? 'LOCAL' : 'S3'}`);

module.exports = storage;
