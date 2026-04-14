# How to Add Problems to CodeCourt

This guide shows you how to add competitive programming problems with test cases to your CodeCourt platform.

---

## 📊 Data Storage Overview

| Data Type | Storage Location | Purpose |
|-----------|-----------------|---------|
| **Problem metadata** | MongoDB | Title, description, constraints, difficulty |
| **Sample test cases** | MongoDB | Public examples visible to users |
| **Hidden test cases** | AWS S3 | Private test cases for judging (ZIP file) |

---

## 🎯 Method 1: Using API Endpoints (Recommended)

### Prerequisites

1. **Backend running**: `npm run dev` in `backend/` folder
2. **Admin account**: You need admin or problem_setter role
3. **API client**: Use Postman, Thunder Client, or curl

### Step 1: Login and Get Auth Token

**Endpoint**: `POST http://localhost:5000/api/auth/login`

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Save the `accessToken`** - you'll need it for all subsequent requests!

---

### Step 2: Create a Problem

**Endpoint**: `POST http://localhost:5000/api/problems`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "Two Sum",
  "slug": "two-sum",
  "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\n**Example 1:**\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n```\n\n**Example 2:**\n```\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n```",
  "constraints": "- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9\n- Only one valid answer exists.",
  "timeLimit": 2000,
  "memoryLimit": 256,
  "difficulty": "easy",
  "sampleTestCases": [
    {
      "input": "4\n2 7 11 15\n9",
      "output": "0 1"
    },
    {
      "input": "3\n3 2 4\n6",
      "output": "1 2"
    }
  ]
}
```

**Field Explanations**:
- `title`: Problem name (displayed to users)
- `slug`: URL-friendly identifier (must be unique, lowercase)
- `description`: Problem statement with examples (supports Markdown)
- `constraints`: Input constraints and limits
- `timeLimit`: Maximum execution time in milliseconds (e.g., 2000 = 2 seconds)
- `memoryLimit`: Maximum memory in megabytes (e.g., 256 = 256 MB)
- `difficulty`: One of: `easy`, `medium`, `hard`
- `sampleTestCases`: Public test cases visible to users (array of input/output pairs)

**Response**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Two Sum",
  "slug": "two-sum",
  "status": "draft",
  "authorId": "507f1f77bcf86cd799439012",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Save the `_id`** - you'll need it to upload hidden test cases!

---

### Step 3: Upload Hidden Test Cases to S3

**Endpoint**: `POST http://localhost:5000/api/problems/:id/upload-tests`

Replace `:id` with the problem ID from Step 2.

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data
```

**Request Body** (form-data):
- **Field name**: `testCases`
- **Field type**: File
- **File**: `hidden-tests.zip`

**ZIP File Structure**:
```
hidden-tests.zip
├── input/
│   ├── 1.txt
│   ├── 2.txt
│   ├── 3.txt
│   └── ...
└── output/
    ├── 1.txt
    ├── 2.txt
    ├── 3.txt
    └── ...
```

**Example Test Case Files**:

`input/1.txt`:
```
4
2 7 11 15
9
```

`output/1.txt`:
```
0 1
```

`input/2.txt`:
```
3
3 2 4
6
```

`output/2.txt`:
```
1 2
```

**Response**:
```json
{
  "message": "Test cases uploaded successfully",
  "s3Key": "test-cases/507f1f77bcf86cd799439011/hidden.zip",
  "url": "https://codecourt-test-cases-986966699295-eu-north-1-an.s3.eu-north-1.amazonaws.com/test-cases/507f1f77bcf86cd799439011/hidden.zip"
}
```

**Backend Logs** (you'll see):
```
☁️  File uploaded to S3: test-cases/507f1f77bcf86cd799439011/hidden.zip
```

**Verify in S3 Console**:
1. Go to: https://s3.console.aws.amazon.com/s3/buckets/codecourt-test-cases-986966699295-eu-north-1-an
2. Navigate to `test-cases/507f1f77bcf86cd799439011/`
3. You should see `hidden.zip`

---

### Step 4: Approve Problem (Admin Only)

**Endpoint**: `POST http://localhost:5000/api/problems/:id/approve`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response**:
```json
{
  "message": "Problem approved successfully",
  "problem": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "published",
    "title": "Two Sum"
  }
}
```

**Backend Logs**:
```
✓ Problem approved: Two Sum
Redis cache invalidated: problems:list
```

Now the problem is **visible to all users** and can be used in contests!

---

## 🧪 Method 2: Using Swagger UI (Interactive)

Your backend has Swagger UI for interactive API testing!

### Access Swagger UI

1. **Start backend**: `npm run dev`
2. **Open browser**: http://localhost:5000/api-docs
3. **You'll see all API endpoints** with interactive forms

### Steps in Swagger:

1. **Authorize**:
   - Click "Authorize" button (top right)
   - Login first via `/api/auth/login` to get token
   - Enter: `Bearer YOUR_ACCESS_TOKEN`
   - Click "Authorize"

2. **Create Problem**:
   - Find `POST /api/problems`
   - Click "Try it out"
   - Fill in the JSON body
   - Click "Execute"

3. **Upload Test Cases**:
   - Find `POST /api/problems/{id}/upload-tests`
   - Click "Try it out"
   - Enter problem ID
   - Upload ZIP file
   - Click "Execute"

4. **Approve Problem**:
   - Find `POST /api/problems/{id}/approve`
   - Click "Try it out"
   - Enter problem ID
   - Click "Execute"

---

## 🖥️ Method 3: Using Frontend Admin Panel

If you have a frontend running:

1. **Login as admin**
2. **Navigate to "Problems" section**
3. **Click "Create Problem"**
4. **Fill in the form**:
   - Title, slug, description
   - Constraints, time/memory limits
   - Difficulty level
   - Sample test cases
5. **Click "Create"**
6. **Upload hidden test cases** (ZIP file)
7. **Submit for approval** (or auto-approve if admin)

---

## 📦 Creating Test Case ZIP Files

### Option 1: Manual Creation

1. **Create folder structure**:
   ```
   hidden-tests/
   ├── input/
   └── output/
   ```

2. **Add test files**:
   - `input/1.txt`, `input/2.txt`, etc.
   - `output/1.txt`, `output/2.txt`, etc.
   - File names must match (1.txt → 1.txt)

3. **Zip the folder**:
   - **Windows**: Right-click → "Send to" → "Compressed (zipped) folder"
   - **Mac**: Right-click → "Compress"
   - **Linux**: `zip -r hidden-tests.zip hidden-tests/`

### Option 2: Script to Generate Test Cases

Create `generate-tests.js`:

```javascript
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Test case generator for Two Sum problem
function generateTwoSumTests(numTests = 10) {
  const inputDir = './test-cases/input';
  const outputDir = './test-cases/output';
  
  // Create directories
  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  
  for (let i = 1; i <= numTests; i++) {
    // Generate random test case
    const n = Math.floor(Math.random() * 100) + 2; // 2 to 101 elements
    const nums = Array.from({ length: n }, () => Math.floor(Math.random() * 2000) - 1000);
    
    // Pick two random indices
    const idx1 = Math.floor(Math.random() * n);
    let idx2 = Math.floor(Math.random() * n);
    while (idx2 === idx1) idx2 = Math.floor(Math.random() * n);
    
    const target = nums[idx1] + nums[idx2];
    
    // Write input file
    const input = `${n}\n${nums.join(' ')}\n${target}`;
    fs.writeFileSync(path.join(inputDir, `${i}.txt`), input);
    
    // Write output file
    const output = `${Math.min(idx1, idx2)} ${Math.max(idx1, idx2)}`;
    fs.writeFileSync(path.join(outputDir, `${i}.txt`), output);
  }
  
  console.log(`✅ Generated ${numTests} test cases`);
}

// Create ZIP file
function createZip() {
  const output = fs.createWriteStream('./hidden-tests.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', () => {
    console.log(`✅ Created hidden-tests.zip (${archive.pointer()} bytes)`);
  });
  
  archive.on('error', (err) => {
    throw err;
  });
  
  archive.pipe(output);
  archive.directory('./test-cases/input', 'input');
  archive.directory('./test-cases/output', 'output');
  archive.finalize();
}

// Run
generateTwoSumTests(20); // Generate 20 test cases
createZip();
```

Run:
```bash
npm install archiver
node generate-tests.js
```

---

## 🔍 Verify Everything Works

### 1. Check MongoDB

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/codecourt

# List problems
db.problems.find().pretty()

# Check specific problem
db.problems.findOne({ slug: "two-sum" })
```

### 2. Check S3

1. Go to S3 Console: https://s3.console.aws.amazon.com/s3/buckets/codecourt-test-cases-986966699295-eu-north-1-an
2. Navigate to `test-cases/`
3. You should see folders for each problem ID
4. Each folder contains `hidden.zip`

### 3. Test Problem Listing

**Endpoint**: `GET http://localhost:5000/api/problems`

Should return all published problems:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Two Sum",
    "slug": "two-sum",
    "difficulty": "easy",
    "status": "published"
  }
]
```

---

## 📝 Complete Example: Adding "Two Sum" Problem

### Using curl (Command Line)

```bash
# 1. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# Save the accessToken from response

# 2. Create problem
curl -X POST http://localhost:5000/api/problems \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Two Sum",
    "slug": "two-sum",
    "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    "constraints": "2 <= nums.length <= 10^4",
    "timeLimit": 2000,
    "memoryLimit": 256,
    "difficulty": "easy",
    "sampleTestCases": [
      {
        "input": "4\n2 7 11 15\n9",
        "output": "0 1"
      }
    ]
  }'

# Save the _id from response

# 3. Upload test cases
curl -X POST http://localhost:5000/api/problems/PROBLEM_ID/upload-tests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "testCases=@hidden-tests.zip"

# 4. Approve problem
curl -X POST http://localhost:5000/api/problems/PROBLEM_ID/approve \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🐛 Troubleshooting

### Error: "Slug already exists"
- **Fix**: Use a different slug (must be unique)
- **Check**: `db.problems.find({ slug: "your-slug" })`

### Error: "Access Denied" when uploading to S3
- **Fix**: Check AWS credentials in `.env`
- **Verify**: Run `node test-s3-connection.js`

### Error: "Not authorized"
- **Fix**: Make sure you're logged in as admin or problem_setter
- **Check**: User role in JWT token

### Hidden test cases not uploading
- **Check**: ZIP file structure (must have `input/` and `output/` folders)
- **Check**: File names match (1.txt in both folders)
- **Check**: Backend logs for S3 upload confirmation

### Problem not visible to users
- **Check**: Problem status is "published" (not "draft")
- **Fix**: Call approve endpoint

---

## ✅ Checklist

- [ ] Backend running with S3 configured
- [ ] Admin account created
- [ ] Got auth token from login
- [ ] Created problem via API
- [ ] Prepared hidden test cases ZIP
- [ ] Uploaded test cases to S3
- [ ] Approved problem
- [ ] Verified problem appears in list
- [ ] Verified test cases in S3 console

---

## 🎉 You're Done!

Your problem is now:
- ✅ Stored in MongoDB (metadata + sample tests)
- ✅ Hidden test cases in S3 (private, secure)
- ✅ Visible to users (if approved)
- ✅ Ready for submissions and judging

**Next Steps:**
- Add more problems
- Create contests with these problems
- Test submissions with the judge system
