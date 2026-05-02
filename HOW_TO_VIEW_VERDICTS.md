# How to View Submission Verdicts

After submitting code, there are **3 ways** to see the verdict:

---

## Method 1: Frontend UI (Recommended)

### On Problem Page:
1. Go to problem page: `http://localhost:3000/problems/[slug]`
2. Submit your code using the Monaco Editor
3. Click "Submit" button
4. **Watch for real-time update** - verdict appears automatically via Socket.io
5. Verdict shows: AC (green), WA (red), TLE (yellow), etc.

### On Submissions List:
1. After submitting, the problem page shows "Your Submissions" section
2. Lists all your attempts with verdicts
3. Click any submission to see full details

---

## Method 2: API Direct (For Testing)

### Step 1: Submit Code
```bash
POST http://localhost:5000/api/submissions
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "problemId": "PROBLEM_ID",
  "code": "print('Hello World')",
  "language": "python"
}
```

**Response**:
```json
{
  "submissionId": "674a1b2c3d4e5f6g7h8i9j0k",
  "status": "queued"
}
```

### Step 2: Check Verdict (Poll)
```bash
GET http://localhost:5000/api/submissions/674a1b2c3d4e5f6g7h8i9j0k
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response** (after judging completes):
```json
{
  "_id": "674a1b2c3d4e5f6g7h8i9j0k",
  "userId": "...",
  "problemId": {
    "_id": "...",
    "title": "Two Sum",
    "slug": "two-sum"
  },
  "code": "print('Hello World')",
  "language": "python",
  "verdict": "AC",           // ✅ The verdict!
  "executionTime": 45,       // milliseconds
  "memoryUsed": 2048,        // KB
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Verdict Values:
- **AC** = Accepted (Correct answer) ✅
- **WA** = Wrong Answer ❌
- **TLE** = Time Limit Exceeded ⏱️
- **MLE** = Memory Limit Exceeded 💾
- **RE** = Runtime Error 💥
- **CE** = Compilation Error (C++ only) 🔧
- **PENDING** = Still judging... ⏳

---

## Method 3: Database Direct (For Debugging)

### Using MongoDB Compass:
1. Connect to: `mongodb://localhost:27017`
2. Database: `codecourt`
3. Collection: `submissions`
4. Find your submission by `_id` or `userId`
5. Check the `verdict` field

### Using MongoDB CLI:
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/codecourt

# Find your submissions
db.submissions.find({ userId: ObjectId("YOUR_USER_ID") }).sort({ createdAt: -1 })

# Find specific submission
db.submissions.findOne({ _id: ObjectId("SUBMISSION_ID") })

# Check verdict field
db.submissions.find({}, { verdict: 1, executionTime: 1, memoryUsed: 1 })
```

---

## Method 4: Real-Time Socket.io (For Developers)

### Browser Console:
```javascript
// Connect to Socket.io
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Listen for verdict events
socket.on('verdict', (data) => {
  console.log('Verdict received:', data);
  // data = { submissionId, verdict, executionTime, memoryUsed }
});

// Submit code (via API)
// Then wait for verdict event
```

### Frontend Code (Already Implemented):
The frontend automatically listens for Socket.io events in `hooks/useSubmission.ts`:
```typescript
useEffect(() => {
  socket.on('verdict', (data) => {
    if (data.submissionId === submissionId) {
      setVerdict(data.verdict);
      setExecutionTime(data.executionTime);
      setMemoryUsed(data.memoryUsed);
    }
  });
}, [submissionId]);
```

---

## Troubleshooting: Verdict Not Appearing

### Issue: Verdict stays "PENDING" forever

**Check 1: Are judge images built?**
```bash
docker images | grep codecourt-judge
```
Should show:
```
codecourt-judge-cpp      latest    ...
codecourt-judge-python   latest    ...
```

If not, build them:
```powershell
.\backend\docker\judges\build-judges.ps1
```

**Check 2: Is worker running?**
```bash
docker compose logs -f api
```
Look for:
```
Processing submission 674a1b2c3d4e5f6g7h8i9j0k
Job 674a1b2c3d4e5f6g7h8i9j0k completed
```

**Check 3: Are there worker errors?**
```bash
docker compose logs api | grep -i error
```

Common errors:
- "No such image: codecourt-judge-cpp" → Build images
- "Cannot connect to Docker daemon" → Start Docker Desktop
- "spawn docker ENOENT" → Docker not in PATH

**Check 4: Is Redis working?**
```bash
docker compose exec redis redis-cli ping
```
Should return: `PONG`

**Check 5: Is BullMQ queue processing?**
```bash
docker compose exec redis redis-cli
> LLEN bull:submissions:waiting
> LLEN bull:submissions:active
> LLEN bull:submissions:completed
```

---

## Quick Test Script

Save as `test-submission.js`:
```javascript
const axios = require('axios');

async function testSubmission() {
  // 1. Login
  const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'testuser',
    password: 'password123'
  });
  const token = loginRes.data.accessToken;
  
  // 2. Submit code
  const submitRes = await axios.post('http://localhost:5000/api/submissions', {
    problemId: 'YOUR_PROBLEM_ID',
    code: 'print("Hello World")',
    language: 'python'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const submissionId = submitRes.data.submissionId;
  console.log('Submitted:', submissionId);
  
  // 3. Poll for verdict (every 1 second)
  const checkVerdict = async () => {
    const res = await axios.get(`http://localhost:5000/api/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Verdict:', res.data.verdict);
    
    if (res.data.verdict === 'PENDING') {
      setTimeout(checkVerdict, 1000);
    } else {
      console.log('Final verdict:', res.data.verdict);
      console.log('Execution time:', res.data.executionTime, 'ms');
      console.log('Memory used:', res.data.memoryUsed, 'KB');
    }
  };
  
  setTimeout(checkVerdict, 2000); // Wait 2 seconds before first check
}

testSubmission();
```

Run:
```bash
node test-submission.js
```

---

## Expected Timeline

After submitting code:

| Time | Status | What's Happening |
|------|--------|------------------|
| 0s | PENDING | Submission created in MongoDB |
| 0s | queued | Job added to BullMQ queue |
| 0-1s | active | Worker picks up job |
| 1-5s | judging | Docker container executes code |
| 5s | completed | Verdict updated in MongoDB |
| 5s | emitted | Socket.io event sent to frontend |
| 5s | displayed | Verdict appears in UI |

**Total time**: Usually 2-5 seconds for simple problems

---

## Summary

**Easiest way**: Use the frontend UI - verdicts appear automatically!

**For debugging**: Check API endpoint or MongoDB directly

**For development**: Use Socket.io events in browser console

**If stuck**: Check worker logs and verify judge images are built
