# Fix Judge System - Complete Guide

**Issue**: Code submissions are accepted but verdicts are not returned because judge Docker images are not built.

**Status**: 🔴 Critical Bug - Judge system non-functional

---

## 🐛 Problem Summary

The judge system has all the code in place but is missing a critical step: **building the custom Docker images**. 

### What's Happening:
1. ✅ User submits code → API accepts submission
2. ✅ Submission queued to BullMQ → Job created
3. ✅ Worker picks up job → Starts processing
4. ❌ Worker tries to spawn Docker container → **Image not found**
5. ❌ Job fails → No verdict returned

### Root Cause:
The worker was updated to use custom images (`codecourt-judge-cpp` and `codecourt-judge-python`) but these images were never built.

---

## 🔧 Quick Fix (5 minutes)

### Step 1: Start Docker Desktop
Make sure Docker Desktop is running on your machine.

### Step 2: Build Judge Images

**On Windows (PowerShell):**
```powershell
.\backend\docker\judges\build-judges.ps1
```

**On Mac/Linux (Bash):**
```bash
bash backend/docker/judges/build-judges.sh
```

**Or manually:**
```bash
# Build C++ judge
docker build -t codecourt-judge-cpp backend/docker/judges/cpp/

# Build Python judge
docker build -t codecourt-judge-python backend/docker/judges/python/
```

### Step 3: Verify Images Built
```bash
docker images | grep codecourt-judge
```

You should see:
```
codecourt-judge-cpp      latest    abc123...   2 minutes ago   150MB
codecourt-judge-python   latest    def456...   1 minute ago    120MB
```

### Step 4: Restart Services
```bash
docker compose restart api
```

### Step 5: Test Submission
1. Start all services: `docker compose up`
2. Submit code via API or frontend
3. Verify verdict is returned

---

## 📋 What Was Fixed

### Changes Made to `backend/src/jobs/submission.worker.js`:

#### Before (Broken):
```javascript
// Used base images that don't have judge scripts
'gcc:13'              // ❌ Generic compiler image
'python:3.11-alpine'  // ❌ Generic Python image
```

#### After (Fixed):
```javascript
// Uses custom images with judge scripts and security
'codecourt-judge-cpp'     // ✅ Custom C++ judge image
'codecourt-judge-python'  // ✅ Custom Python judge image
```

### What the Custom Images Include:
- ✅ Compiler/interpreter (g++ or python3)
- ✅ Timeout utility (coreutils)
- ✅ Judge scripts (judge.sh)
- ✅ Non-root user (security)
- ✅ Alpine Linux base (lightweight)

---

## 🧪 Testing the Fix

### Test 1: Simple Python Submission
```python
# Problem: Print "Hello World"
print("Hello World")
```

**Expected**: Verdict = AC (Accepted)

### Test 2: Simple C++ Submission
```cpp
// Problem: Print "Hello World"
#include <iostream>
int main() {
    std::cout << "Hello World" << std::endl;
    return 0;
}
```

**Expected**: Verdict = AC (Accepted)

### Test 3: Wrong Answer
```python
# Problem: Print "Hello World"
print("Goodbye World")  # Wrong output
```

**Expected**: Verdict = WA (Wrong Answer)

### Test 4: Time Limit Exceeded
```python
# Problem: Print "Hello World" (time limit: 1s)
import time
time.sleep(10)  # Sleep for 10 seconds
print("Hello World")
```

**Expected**: Verdict = TLE (Time Limit Exceeded)

### Test 5: Compilation Error (C++)
```cpp
// Missing semicolon
#include <iostream>
int main() {
    std::cout << "Hello World"  // ❌ Missing semicolon
    return 0;
}
```

**Expected**: Verdict = CE (Compilation Error)

---

## 🔍 Troubleshooting

### Issue: "Error: No such image: codecourt-judge-cpp"

**Solution**: Build the images using the script above.

### Issue: "Cannot connect to Docker daemon"

**Solution**: Start Docker Desktop.

### Issue: "Permission denied while trying to connect to Docker socket"

**Solution (Linux)**: Add your user to docker group:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Issue: Verdict still not returned after building images

**Checklist**:
1. ✅ Docker Desktop is running
2. ✅ Judge images are built (`docker images | grep codecourt-judge`)
3. ✅ Services restarted (`docker compose restart api`)
4. ✅ Redis is running (`docker compose ps redis`)
5. ✅ BullMQ worker is running (check API logs)

**Debug Steps**:
```bash
# Check API logs for worker errors
docker compose logs -f api

# Check if jobs are in queue
docker compose exec redis redis-cli
> KEYS *submissions*
> LLEN bull:submissions:waiting
```

### Issue: "Docker build fails with network error"

**Solution**: Check internet connection, Docker may need to pull base images.

---

## 📊 Verification Checklist

After applying the fix, verify:

- [ ] Docker Desktop is running
- [ ] Judge images are built (`docker images | grep codecourt-judge`)
- [ ] Services are running (`docker compose ps`)
- [ ] Can submit code via API
- [ ] Verdict is returned (check submission status)
- [ ] Socket.io event is emitted (check browser console)
- [ ] Correct verdict for AC submission
- [ ] Correct verdict for WA submission
- [ ] Correct verdict for TLE submission
- [ ] Correct verdict for CE submission (C++ only)

---

## 🎯 Next Steps

Once the judge system is working:

1. **Test with Real Problems**:
   - Add problems with multiple test cases
   - Test edge cases (empty input, large input)
   - Verify all verdict types work correctly

2. **Performance Testing**:
   - Submit multiple solutions simultaneously
   - Verify worker concurrency (5 simultaneous judges)
   - Check resource usage (CPU, memory)

3. **Contest Testing**:
   - Create a contest with multiple problems
   - Submit solutions during contest
   - Verify leaderboard updates correctly

4. **Production Preparation**:
   - Build images in CI/CD pipeline
   - Push images to container registry (GHCR)
   - Deploy to Kubernetes with judge images

---

## 📚 Related Documentation

- **Worker Code**: `backend/src/jobs/submission.worker.js`
- **Judge Dockerfiles**: `backend/docker/judges/*/Dockerfile`
- **Judge Scripts**: `backend/docker/judges/*/judge.sh`
- **Build Scripts**: `backend/docker/judges/build-judges.*`

---

## ✅ Success Criteria

The judge system is working when:

1. ✅ Code submissions return verdicts (AC/WA/TLE/MLE/RE/CE)
2. ✅ Verdicts are accurate (correct output = AC, wrong = WA)
3. ✅ Time limits are enforced (long-running code = TLE)
4. ✅ Memory limits are enforced (memory-intensive code = MLE)
5. ✅ Compilation errors are caught (invalid C++ = CE)
6. ✅ Socket.io events are emitted (real-time updates)
7. ✅ Contest scores are updated (AC submissions)

---

**Last Updated**: May 2, 2026  
**Status**: Fix applied, ready for testing
