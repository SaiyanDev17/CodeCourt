# AWS S3 Setup Guide for CodeCourt

## ✅ Prerequisites
- AWS Account with 12-month free tier
- IAM user with full access

---

## 📦 Step 1: Create S3 Bucket

1. Go to **AWS S3 Console**: https://s3.console.aws.amazon.com/
2. Click **"Create bucket"**
3. Configure:
   - **Bucket name**: `codecourt-test-cases` (or add suffix if taken)
   - **Region**: `us-east-1` (or your preferred region)
   - **Block Public Access**: ✅ Keep all boxes CHECKED (private bucket)
   - **Bucket Versioning**: Disabled (optional)
   - **Encryption**: Enable (recommended)
4. Click **"Create bucket"**

---

## 🔑 Step 2: Get AWS Credentials

### Option A: Use Existing IAM User (You Have Full Access)
1. Go to **IAM Console**: https://console.aws.amazon.com/iam/
2. Click **"Users"** → Find your user
3. Click **"Security credentials"** tab
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **"Next"** → **"Create access key"**
7. **COPY BOTH**:
   - Access Key ID: `AKIAIOSFODNN7EXAMPLE`
   - Secret Access Key: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
   - ⚠️ **Save these now! You can't see the secret key again.**

### Option B: Create New IAM User (Recommended for Security)
1. Go to **IAM Console**: https://console.aws.amazon.com/iam/
2. Click **"Users"** → **"Create user"**
3. **User name**: `codecourt-s3-user`
4. Click **"Next"**
5. **Permissions**: Click "Attach policies directly"
6. Search and select: **`AmazonS3FullAccess`**
7. Click **"Next"** → **"Create user"**
8. Click on the new user → **"Security credentials"** tab
9. Click **"Create access key"** → Follow steps above

---

## ⚙️ Step 3: Configure Your Project

1. Open `backend/.env` file
2. Replace the placeholder values:

```env
# Storage Configuration
USE_LOCAL_STORAGE=false  # ← Set to false to use S3

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE  # ← Paste your Access Key ID
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY  # ← Paste your Secret Key
AWS_REGION=us-east-1  # ← Match your bucket region
S3_BUCKET_NAME=codecourt-test-cases  # ← Match your bucket name
```

3. **Save the file**

---

## 🧪 Step 4: Test S3 Integration

### Start Your Backend
```bash
cd backend
npm install  # Install AWS SDK if not already installed
npm start
```

### Test File Upload (Using API or Admin Panel)
1. Create a problem as admin
2. Upload hidden test cases (ZIP file)
3. Check AWS S3 Console to verify file appears in bucket

### Expected S3 Structure
```
codecourt-test-cases/
└── test-cases/
    └── {problemId}/
        └── hidden.zip
```

---

## 🔍 Verify It's Working

### Check Backend Logs
You should see:
```
📦 Storage mode: S3
☁️  File uploaded to S3: test-cases/507f1f77bcf86cd799439011/hidden.zip
```

### Check S3 Console
1. Go to your bucket: https://s3.console.aws.amazon.com/s3/buckets/codecourt-test-cases
2. Navigate to `test-cases/` folder
3. You should see uploaded ZIP files

---

## 🔒 Security Best Practices

### 1. Never Commit Credentials
- ✅ `.env` is in `.gitignore`
- ❌ Never commit AWS keys to GitHub

### 2. Use Environment Variables in Production
```bash
# On production server
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

### 3. Rotate Keys Regularly
- Create new access keys every 90 days
- Delete old keys after rotation

### 4. Use IAM Roles (Advanced)
If deploying to AWS EC2/ECS:
- Attach IAM role to instance
- Remove hardcoded credentials
- AWS SDK automatically uses instance role

---

## 💰 Monitor Free Tier Usage

### Check Usage Dashboard
1. Go to **AWS Billing Console**: https://console.aws.amazon.com/billing/
2. Click **"Free Tier"** in left menu
3. Monitor:
   - S3 storage (5 GB free)
   - GET requests (20,000/month free)
   - PUT requests (2,000/month free)

### Set Up Billing Alerts
1. Go to **CloudWatch Console**: https://console.aws.amazon.com/cloudwatch/
2. Click **"Alarms"** → **"Billing"**
3. Create alarm for $1 threshold
4. Get email when approaching free tier limits

---

## 🐛 Troubleshooting

### Error: "Access Denied"
- ✅ Check IAM user has S3 permissions
- ✅ Verify bucket name matches `.env`
- ✅ Check bucket region matches `.env`

### Error: "Bucket does not exist"
- ✅ Verify bucket name is correct
- ✅ Check you're in the right AWS region
- ✅ Ensure bucket was created successfully

### Error: "Invalid credentials"
- ✅ Verify Access Key ID is correct
- ✅ Verify Secret Access Key is correct
- ✅ Check for extra spaces in `.env` file

### Files Not Appearing in S3
- ✅ Check backend logs for upload confirmation
- ✅ Verify `USE_LOCAL_STORAGE=false` in `.env`
- ✅ Restart backend after changing `.env`

---

## 🔄 Switch Between Local and S3 Storage

### Use Local Storage (Development)
```env
USE_LOCAL_STORAGE=true
```
- Files stored in `backend/uploads/test-cases/`
- Free, no AWS needed
- Files lost on container restart

### Use S3 Storage (Production)
```env
USE_LOCAL_STORAGE=false
```
- Files stored in AWS S3
- Persistent, scalable
- Costs money after free tier

---

## 📊 Cost Estimation

### Small Scale (100 problems, 1000 submissions/month)
- Storage: 500 MB = **$0.01/month**
- Requests: 1,000 downloads = **$0.0004/month**
- Data transfer: 5 GB = **$0.45/month**
- **Total: ~$0.46/month**

### Free Tier Covers
- First 12 months: **5 GB storage + 20K GET + 2K PUT = FREE**
- Your usage will likely stay within free tier limits

---

## ✅ Checklist

- [ ] Created S3 bucket `codecourt-test-cases`
- [ ] Created IAM user or got credentials
- [ ] Copied Access Key ID and Secret Access Key
- [ ] Updated `backend/.env` with credentials
- [ ] Set `USE_LOCAL_STORAGE=false`
- [ ] Restarted backend server
- [ ] Tested file upload
- [ ] Verified files appear in S3 Console
- [ ] Set up billing alerts (optional but recommended)

---

## 🎉 You're Done!

Your CodeCourt application is now using AWS S3 for test case storage. Files will persist across deployments and scale automatically.

**Next Steps:**
- Test problem creation with test case uploads
- Monitor S3 usage in AWS Console
- Consider setting up CloudFront CDN for faster downloads (optional)
