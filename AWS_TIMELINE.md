# AWS Account Creation Timeline - Strategic Approach

## 🎯 Your Strategy: Delay AWS Free Tier Start

**Goal**: Maximize your 12-month AWS free tier by starting it only when you're ready to deploy to production.

---

## ✅ What You Can Do WITHOUT AWS (Phases 2-9)

### Local Development & Testing (Phases 2-7)
You can complete almost everything locally without AWS:

#### Phase 2: Core Backend ✅ (Mostly Works Without AWS)
- ✅ Auth module (register, login, JWT) - NO AWS needed
- ✅ Problem CRUD (create, list, get) - NO AWS needed
- ✅ Submissions (create, judge) - NO AWS needed
- ✅ Contests (create, register, leaderboard) - NO AWS needed
- ✅ Socket.io real-time updates - NO AWS needed
- ⚠️ **Only blocked**: Task 2.3.6 - Upload test cases to S3

**Workaround for Phase 2**:
```javascript
// Instead of uploading to S3, store test cases locally
// backend/src/modules/problems/service.js

// TEMPORARY: Skip S3 upload for local development
async uploadTestCases(problemId, zipFile) {
  // Option 1: Store in local filesystem
  const localPath = `./test-cases/${problemId}.zip`;
  await fs.writeFile(localPath, zipFile);
  return { testCasesPath: localPath };
  
  // Option 2: Store in MongoDB GridFS (built-in file storage)
  // Option 3: Just skip this feature for now
}
```

#### Phase 3: AI Service ✅ (NO AWS needed)
- ✅ FastAPI setup - NO AWS needed
- ✅ LangChain agent - NO AWS needed (uses Groq, not AWS)
- ✅ Hint generation - NO AWS needed

#### Phase 4: Frontend ✅ (NO AWS needed)
- ✅ All React/Next.js pages - NO AWS needed
- ✅ Monaco Editor - NO AWS needed
- ✅ Socket.io client - NO AWS needed

#### Phase 5: Redis Caching ✅ (NO AWS needed)
- ✅ All caching logic - NO AWS needed

#### Phase 6: Documentation ✅ (NO AWS needed)
- ✅ Swagger docs - NO AWS needed
- ✅ Seed scripts - NO AWS needed

#### Phase 7: Docker Compose ✅ (NO AWS needed)
- ✅ Local multi-container setup - NO AWS needed
- ✅ Judge containers - NO AWS needed

#### Phase 8: Production Dockerfiles ✅ (NO AWS needed)
- ✅ Build Docker images - NO AWS needed
- ✅ Test locally - NO AWS needed

#### Phase 9: CI/CD ⚠️ (Partial AWS needed)
- ✅ GitHub Actions CI - NO AWS needed
- ⚠️ Deploy workflow - Needs AWS for S3 bucket in production

---

## ⚠️ When You ACTUALLY Need AWS

### Phase 11: Terraform Infrastructure (Week 7)
**This is when you should create your AWS account.**

#### Why Phase 11?
- You're provisioning production infrastructure
- You're ready to deploy to the cloud
- Your app is fully tested locally
- This is when the 12-month free tier clock starts

#### What You'll Create in Phase 11:
```
Task 11.1.1-11.1.4: Terraform AWS S3 Module
├── Create S3 bucket for test cases
├── Configure bucket policies
└── Get bucket credentials

Task 11.4.8: terraform apply
└── Provision all infrastructure (starts free tier)
```

### Phase 12: Production Deployment (Week 8)
**Use your AWS resources here.**

```
Task 12.1.1: Create K8s secrets with AWS credentials
Task 12.3.6: Test S3 uploads in production
```

---

## 🛠️ Local Development Workarounds (Until Phase 11)

### Option 1: Local File Storage (Simplest)
```javascript
// backend/src/config/s3.js
const USE_LOCAL_STORAGE = process.env.NODE_ENV === 'development';

if (USE_LOCAL_STORAGE) {
  // Store files locally in ./uploads/test-cases/
  module.exports = {
    uploadFile: async (key, buffer) => {
      const path = `./uploads/${key}`;
      await fs.writeFile(path, buffer);
      return { url: `file://${path}` };
    },
    downloadFile: async (key) => {
      const path = `./uploads/${key}`;
      return await fs.readFile(path);
    }
  };
} else {
  // Real S3 client (for production)
  const { S3Client } = require('@aws-sdk/client-s3');
  // ... actual S3 implementation
}
```

### Option 2: MongoDB GridFS (Database File Storage)
```javascript
// Store large files directly in MongoDB
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

// Upload test cases to MongoDB instead of S3
async function uploadTestCases(problemId, zipBuffer) {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo);
  const writeStream = gfs.createWriteStream({
    filename: `${problemId}-tests.zip`,
    metadata: { problemId }
  });
  
  writeStream.write(zipBuffer);
  writeStream.end();
  
  return { gridFsId: writeStream.id };
}
```

### Option 3: Mock S3 with MinIO (S3-Compatible Local Server)
```bash
# Run MinIO (S3-compatible) locally
docker run -d -p 9000:9000 -p 9001:9001 \
  --name codecourt-minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Update .env
AWS_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=test-cases
```

---

## 📅 Recommended Timeline

### Now - Phase 10 (Weeks 1-7)
**DO NOT create AWS account yet!**

✅ Use local file storage workaround  
✅ Use MongoDB GridFS for test cases  
✅ Or use MinIO for S3-compatible local testing  
✅ Complete all development and testing locally  

### Phase 11 (Week 7) - CREATE AWS ACCOUNT
**This is the optimal time!**

✅ Your app is fully built and tested  
✅ You're ready to provision production infrastructure  
✅ Terraform will create real S3 bucket  
✅ 12-month free tier starts now  

### Phase 12-14 (Week 8)
**Use AWS for production deployment**

✅ Deploy to production with real S3  
✅ Test in production environment  
✅ Keep running for 12 months on free tier  

---

## 💰 AWS Free Tier Details

### What's Free for 12 Months:
- **S3**: 5 GB storage, 20,000 GET requests, 2,000 PUT requests/month
- **EC2**: 750 hours/month of t2.micro or t3.micro instances
- **RDS**: 750 hours/month of db.t2.micro, 20 GB storage (if you use RDS)

### Your Usage (CodeCourt):
- **S3 only**: Storing test case ZIP files
- **Estimated usage**: < 1 GB (well within free tier)
- **Cost after 12 months**: ~$0.50-2/month for S3 storage

### Oracle Cloud (K8s) - Always Free:
- **OKE**: Oracle Kubernetes Engine on Always Free tier
- **No time limit**: Free forever (not 12 months)
- **Your K8s cluster**: Runs on Oracle, not AWS

---

## 🎯 Your Optimal Strategy

### Phases 2-10 (Now - Week 7):
```
✅ Use local MongoDB (Docker)
✅ Use local Redis (Docker)
✅ Use local file storage OR MinIO for S3
✅ Test everything locally
✅ Build frontend
✅ Create Docker images
✅ Test with Docker Compose
```

### Phase 11 (Week 7):
```
🆕 CREATE AWS ACCOUNT (free tier starts)
✅ Run terraform apply
✅ Create real S3 bucket
✅ Get AWS credentials
```

### Phase 12+ (Week 8):
```
✅ Deploy to production
✅ Use real S3 for test cases
✅ Run for 12 months on free tier
✅ After 12 months: ~$1-2/month for S3
```

---

## 🔧 Implementation: Local File Storage

Let me create a simple local storage adapter for you:

### backend/src/config/storage.js (NEW FILE)
```javascript
const fs = require('fs').promises;
const path = require('path');

const USE_LOCAL = process.env.USE_LOCAL_STORAGE === 'true';
const UPLOAD_DIR = path.join(__dirname, '../../uploads/test-cases');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create upload directory:', err);
  }
}

// Local storage implementation
const localStorage = {
  async uploadFile(key, buffer) {
    await ensureUploadDir();
    const filePath = path.join(UPLOAD_DIR, key);
    await fs.writeFile(filePath, buffer);
    return { 
      url: `file://${filePath}`,
      key 
    };
  },
  
  async downloadFile(key) {
    const filePath = path.join(UPLOAD_DIR, key);
    return await fs.readFile(filePath);
  },
  
  async deleteFile(key) {
    const filePath = path.join(UPLOAD_DIR, key);
    await fs.unlink(filePath);
  }
};

// S3 storage implementation (for production)
const s3Storage = {
  async uploadFile(key, buffer) {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer
    }));
    
    return {
      url: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`,
      key
    };
  },
  
  async downloadFile(key) {
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    
    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    }));
    
    return response.Body;
  },
  
  async deleteFile(key) {
    const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    }));
  }
};

// Export the appropriate storage based on environment
module.exports = USE_LOCAL ? localStorage : s3Storage;
```

### Update backend/.env
```env
# Storage Configuration
USE_LOCAL_STORAGE=true  # Set to false when you have AWS in Phase 11
```

### Usage in your code:
```javascript
// backend/src/modules/problems/service.js
const storage = require('../config/storage');

async uploadTestCases(problemId, zipBuffer) {
  const key = `problems/${problemId}/tests.zip`;
  const result = await storage.uploadFile(key, zipBuffer);
  return result;
}
```

---

## ✅ Summary

**Your Plan:**
1. ✅ **Now - Phase 10**: Use local storage, complete all development
2. 🆕 **Phase 11 (Week 7)**: Create AWS account, run Terraform
3. ✅ **Phase 12+**: Deploy to production, use real S3

**Benefits:**
- ✅ Maximize 12-month free tier
- ✅ No AWS costs during development
- ✅ App fully tested before cloud deployment
- ✅ Easy switch from local to S3 (just change env var)

**You're good to proceed with Phases 2-10 without AWS!** 🎉
