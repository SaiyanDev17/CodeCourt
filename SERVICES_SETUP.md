# CodeCourt Services Setup Guide

## ✅ Completed Setup

### 1. Docker Containers Running
- **Redis**: `codecourt-redis` on port 6379
- **MongoDB**: `codecourt-mongo` on port 27017

### 2. Backend Environment File
Created `backend/.env` with local development configuration.

## 🔧 What's Working Now

You can now run your backend with:
```bash
cd backend
npm run dev
```

The backend will connect to:
- MongoDB at `localhost:27017`
- Redis at `localhost:6379`

## ⚠️ Still Need to Setup

### AWS S3 (Required for Phase 2.3.6 - Upload Test Cases)

1. **Create AWS Account**:
   - Go to https://aws.amazon.com/free
   - Sign up (requires credit card, but free tier is sufficient)

2. **Create IAM User**:
   - Go to AWS Console → IAM → Users → Create User
   - User name: `codecourt-s3-user`
   - Attach policy: `AmazonS3FullAccess`
   - Create access keys → Download credentials

3. **Create S3 Bucket**:
   - Go to S3 → Create Bucket
   - Bucket name: `codecourt-test-cases` (must be globally unique)
   - Region: `us-east-1`
   - Block all public access: ✅ (keep enabled)

4. **Update backend/.env**:
   ```env
   AWS_ACCESS_KEY_ID=your_actual_access_key
   AWS_SECRET_ACCESS_KEY=your_actual_secret_key
   S3_BUCKET_NAME=codecourt-test-cases
   ```

### Groq API (Required for Phase 3 - AI Service)

1. Go to https://console.groq.com/
2. Sign up (free)
3. Create API key
4. Save for Phase 3

## 🚀 Quick Start Commands

### Start Backend Server
```bash
cd backend
npm run dev
```

### Check Docker Containers
```bash
docker ps
```

### Stop Containers (when done)
```bash
docker stop codecourt-redis codecourt-mongo
```

### Restart Containers (next time)
```bash
docker start codecourt-redis codecourt-mongo
```

### Remove Containers (if needed)
```bash
docker rm -f codecourt-redis codecourt-mongo
```

## 📝 Next Steps

1. ✅ Redis and MongoDB are running
2. ⏳ Create AWS account and S3 bucket (needed before testing problem uploads)
3. ⏳ Test backend: `cd backend && npm run dev`
4. ⏳ Move to Phase 3 (AI Service) or Phase 4 (Frontend)

## 🔍 Verify Setup

Test if backend connects successfully:
```bash
cd backend
npm run dev
```

You should see:
- ✅ MongoDB connected successfully
- ✅ Redis connected successfully
- ✅ Server listening on port 5000
