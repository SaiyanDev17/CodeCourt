# Quick Fix: Build Error

## Your Error:
```
codecourt-judge-python : The term 'codecourt-judge-python' is not recognized
```

## Root Cause:
The build script failed to build the Python judge image, so it doesn't exist yet.

---

## Solution: Build Images Manually

### Step 1: Build C++ Judge (This one worked ✅)
```powershell
docker build -t codecourt-judge-cpp -f backend/docker/judges/cpp/Dockerfile backend/docker/judges/cpp/
```

### Step 2: Build Python Judge (This one failed ❌)
```powershell
docker build -t codecourt-judge-python -f backend/docker/judges/python/Dockerfile backend/docker/judges/python/
```

### Step 3: Verify Both Images Exist
```powershell
docker images | Select-String "codecourt-judge"
```

You should see:
```
codecourt-judge-cpp      latest    ...   2 minutes ago   150MB
codecourt-judge-python   latest    ...   1 minute ago    120MB
```

---

## Alternative: Use Fixed Build Script

The build script has been fixed. Try again:

```powershell
.\backend\docker\judges\build-judges.ps1
```

---

## After Building: How to See Verdicts

### Option 1: Frontend UI (Easiest)
1. Go to: `http://localhost:3000/problems/[problem-slug]`
2. Submit code using the editor
3. Verdict appears automatically (real-time via Socket.io)

### Option 2: API Endpoint
```bash
# After submitting, you get a submissionId
# Check verdict with:
GET http://localhost:5000/api/submissions/YOUR_SUBMISSION_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

Response shows:
```json
{
  "verdict": "AC",  // or WA, TLE, MLE, RE, CE, PENDING
  "executionTime": 45,
  "memoryUsed": 2048
}
```

### Option 3: MongoDB
```bash
mongosh mongodb://localhost:27017/codecourt
db.submissions.find().sort({ createdAt: -1 }).limit(1)
```

---

## Verdict Values:
- **PENDING** = Still judging (wait a few seconds)
- **AC** = Accepted ✅
- **WA** = Wrong Answer ❌
- **TLE** = Time Limit Exceeded ⏱️
- **MLE** = Memory Limit Exceeded 💾
- **RE** = Runtime Error 💥
- **CE** = Compilation Error 🔧

---

## Full Documentation:
- **Build issues**: See `FIX_JUDGE_SYSTEM.md`
- **Viewing verdicts**: See `HOW_TO_VIEW_VERDICTS.md`
