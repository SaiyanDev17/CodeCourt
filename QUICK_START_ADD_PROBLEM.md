# Quick Start: Add Your First Problem

**Time needed:** 5 minutes

---

## 🚀 Method 1: Automated (Easiest)

### Step 1: Add Sample Problem to MongoDB

```bash
cd backend
node add-sample-problem.js
```

**Output:**
```
✅ Problem created successfully!
   ID: 507f1f77bcf86cd799439011
   Title: Two Sum
   Status: draft
```

### Step 2: Generate Test Cases ZIP

```bash
npm install archiver  # Only needed once
node generate-test-cases.js
```

**Output:**
```
✅ Generated 20 test cases
✅ Created hidden-tests.zip (2.34 KB)
```

### Step 3: Upload to S3 via API

**Using curl:**
```bash
# First, login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_password"}'

# Then upload (replace PROBLEM_ID and TOKEN)
curl -X POST http://localhost:5000/api/problems/PROBLEM_ID/upload-tests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "testCases=@hidden-tests.zip"
```

**Or use Postman/Thunder Client:**
- URL: `POST http://localhost:5000/api/problems/{problemId}/upload-tests`
- Headers: `Authorization: Bearer YOUR_TOKEN`
- Body: form-data, field name: `testCases`, file: `hidden-tests.zip`

### Step 4: Approve Problem

```bash
curl -X POST http://localhost:5000/api/problems/PROBLEM_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Done!** Problem is now live! 🎉

---

## 🎯 Method 2: Manual (Full Control)

### Step 1: Create Problem via API

**Endpoint:** `POST http://localhost:5000/api/problems`

**Body:**
```json
{
  "title": "Your Problem Title",
  "slug": "your-problem-slug",
  "description": "Problem description here...",
  "constraints": "Input constraints...",
  "timeLimit": 2000,
  "memoryLimit": 256,
  "difficulty": "easy",
  "sampleTestCases": [
    {
      "input": "test input",
      "output": "expected output"
    }
  ]
}
```

### Step 2: Create Test Cases Manually

**Folder structure:**
```
test-cases/
├── input/
│   ├── 1.txt
│   ├── 2.txt
│   └── 3.txt
└── output/
    ├── 1.txt
    ├── 2.txt
    └── 3.txt
```

**Zip it:**
- Windows: Right-click → "Send to" → "Compressed folder"
- Mac: Right-click → "Compress"
- Linux: `zip -r hidden-tests.zip test-cases/`

### Step 3: Upload & Approve

Same as Method 1, Steps 3-4

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Add Problem Flow                      │
└─────────────────────────────────────────────────────────┘

1. CREATE PROBLEM
   ├─> POST /api/problems
   ├─> Saves to MongoDB
   │   ├─ Title, description, constraints
   │   ├─ Sample test cases (public)
   │   └─ Status: "draft"
   └─> Returns problem ID

2. UPLOAD HIDDEN TESTS
   ├─> POST /api/problems/:id/upload-tests
   ├─> Uploads ZIP to S3
   │   ├─ Bucket: codecourt-test-cases-...
   │   ├─ Key: test-cases/{problemId}/hidden.zip
   │   └─ Private (not publicly accessible)
   └─> Updates problem.hiddenTestCasesS3Key in MongoDB

3. APPROVE PROBLEM
   ├─> POST /api/problems/:id/approve
   ├─> Changes status: "draft" → "published"
   ├─> Invalidates Redis cache
   └─> Problem now visible to all users

4. USERS CAN NOW
   ├─> View problem in problem list
   ├─> See sample test cases
   ├─> Submit solutions
   └─> Judge downloads hidden tests from S3
```

---

## ✅ Verification Checklist

After adding a problem, verify:

- [ ] **MongoDB**: Problem exists
  ```bash
  mongosh mongodb://localhost:27017/codecourt
  db.problems.findOne({ slug: "your-slug" })
  ```

- [ ] **S3**: Hidden tests uploaded
  - Go to: https://s3.console.aws.amazon.com/s3/buckets/codecourt-test-cases-986966699295-eu-north-1-an
  - Check: `test-cases/{problemId}/hidden.zip` exists

- [ ] **API**: Problem appears in list
  ```bash
  curl http://localhost:5000/api/problems
  ```

- [ ] **Status**: Problem is "published" (not "draft")

- [ ] **Backend Logs**: Shows S3 upload
  ```
  ☁️  File uploaded to S3: test-cases/.../hidden.zip
  ```

---

## 🐛 Common Issues

### "No admin user found"
**Fix:** Create admin user first
```bash
# Register via API, then update role in MongoDB
mongosh mongodb://localhost:27017/codecourt
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

### "Slug already exists"
**Fix:** Use different slug or delete existing
```bash
mongosh mongodb://localhost:27017/codecourt
db.problems.deleteOne({ slug: "your-slug" })
```

### "Access Denied" on S3 upload
**Fix:** Check AWS credentials
```bash
node test-s3-connection.js
```

### ZIP file rejected
**Fix:** Ensure correct structure
```
hidden-tests.zip
├── input/     ← Must have this folder
│   └── 1.txt
└── output/    ← Must have this folder
    └── 1.txt
```

---

## 📚 Full Documentation

For detailed explanations, see:
- **HOW_TO_ADD_PROBLEMS.md** - Complete guide with all methods
- **S3_SETUP_GUIDE.md** - S3 configuration details
- **API Docs** - http://localhost:5000/api-docs

---

## 🎉 Quick Commands Reference

```bash
# Add sample problem
node add-sample-problem.js

# Generate test cases
node generate-test-cases.js

# Test S3 connection
node test-s3-connection.js

# Check MongoDB
mongosh mongodb://localhost:27017/codecourt
db.problems.find().pretty()

# Start backend
npm run dev

# View API docs
open http://localhost:5000/api-docs
```

---

**That's it!** You now know how to add problems to CodeCourt! 🚀
