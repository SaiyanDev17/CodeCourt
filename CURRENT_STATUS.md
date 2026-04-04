# CodeCourt - Current Status

## ✅ What's Running Right Now

### Docker Containers
```
┌─────────────────────────────────────────────────────────┐
│  codecourt-mongo  (MongoDB 7)                           │
│  Port: 27017                                            │
│  Status: ✅ Running                                     │
│  Connection: mongodb://localhost:27017/codecourt        │
│  Data: Empty (no codecourt database yet)                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  codecourt-redis  (Redis Alpine)                        │
│  Port: 6379                                             │
│  Status: ✅ Running                                     │
│  Connection: redis://localhost:6379                     │
│  Data: Empty (no keys yet)                              │
└─────────────────────────────────────────────────────────┘
```

### Backend Configuration
```
✅ backend/.env created
✅ MongoDB URI configured
✅ Redis URL configured
⚠️  AWS credentials needed (for S3 uploads)
```

---

## 📊 Your MongoDB Container Details

### Current State:
- **Container Name**: `codecourt-mongo`
- **Image**: `mongo:7` (latest MongoDB 7.x)
- **Port Mapping**: `27017:27017` (host:container)
- **Network**: Default Docker bridge
- **Volumes**: None (data will be lost if container is removed)
- **Databases**: Only default system databases (admin, config, local)

### What Happens When You Start Your Backend:
1. Backend connects to `mongodb://localhost:27017/codecourt`
2. MongoDB automatically creates `codecourt` database on first write
3. Mongoose creates collections when you save first document:
   - `users` collection (first user registration)
   - `problems` collection (first problem creation)
   - `submissions` collection (first code submission)
   - etc.

### Data Persistence:
⚠️ **Important**: Your current setup does NOT persist data!

If you remove the container (`docker rm codecourt-mongo`), all data is lost.

**To persist data** (recommended for development):
```bash
# Stop and remove current container
docker stop codecourt-mongo
docker rm codecourt-mongo

# Recreate with volume for persistence
docker run -d -p 27017:27017 --name codecourt-mongo \
  -v codecourt-mongo-data:/data/db \
  mongo:7
```

Now data survives container restarts and removals!

---

## 🔴 Your Redis Container Details

### Current State:
- **Container Name**: `codecourt-redis`
- **Image**: `redis:alpine` (lightweight Redis)
- **Port Mapping**: `6379:6379` (host:container)
- **Network**: Default Docker bridge
- **Volumes**: None (data will be lost on restart)
- **Keys**: None yet (empty)

### What Happens When You Start Your Backend:
1. Backend connects to `redis://localhost:6379`
2. Redis is ready immediately (no database creation needed)
3. Your app starts writing keys:
   - JWT blacklist: `blacklist:refresh_token_xyz`
   - Cache: `problems:list`, `leaderboard:contest_123`
   - BullMQ queues: `bull:submission:*`

### Data Persistence:
⚠️ **Redis is designed to be temporary!**

- Data stored in RAM (fast but volatile)
- Data lost on container restart (by design)
- This is NORMAL for cache and queues
- Important data should be in MongoDB

**If you want Redis persistence** (optional):
```bash
# Stop and remove current container
docker stop codecourt-redis
docker rm codecourt-redis

# Recreate with persistence
docker run -d -p 6379:6379 --name codecourt-redis \
  -v codecourt-redis-data:/data \
  redis:alpine redis-server --appendonly yes
```

---

## 🎯 What Each Service Does in Your App

### MongoDB (Permanent Storage)
```
User Registration
    ↓
Save to MongoDB users collection
    ↓
Data persists forever (until deleted)

Problem Creation
    ↓
Save to MongoDB problems collection
    ↓
Upload test cases to S3
    ↓
Store S3 URL in MongoDB

Code Submission
    ↓
Save to MongoDB submissions collection (status: PENDING)
    ↓
Add job to Redis queue
    ↓
Worker judges code
    ↓
Update MongoDB submission (status: AC/WA/TLE/etc.)
```

### Redis (Temporary Storage)
```
User Views Problem List
    ↓
Check Redis cache: problems:list
    ↓
If found → return instantly (cache hit)
    ↓
If not found → query MongoDB → cache in Redis (60s TTL)

User Logs Out
    ↓
Add refresh token to Redis blacklist
    ↓
Token expires after 7 days (auto-deleted)

Code Submission
    ↓
Add job to Redis BullMQ queue
    ↓
Worker picks job from queue
    ↓
Job deleted after processing
```

---

## 🔍 Quick Health Check

### Test MongoDB:
```bash
docker exec -it codecourt-mongo mongosh --eval "db.adminCommand('ping')"
```
Expected: `{ ok: 1 }`

### Test Redis:
```bash
docker exec -it codecourt-redis redis-cli PING
```
Expected: `PONG`

### Test Backend Connection:
```bash
cd backend
npm run dev
```
Expected:
```
✅ MongoDB connected successfully
✅ Redis connected successfully
✅ Server listening on port 5000
```

---

## 📦 Container Management Cheat Sheet

### Daily Operations:
```bash
# Start containers (if stopped)
docker start codecourt-mongo codecourt-redis

# Stop containers (end of day)
docker stop codecourt-mongo codecourt-redis

# Check status
docker ps

# View logs
docker logs codecourt-mongo
docker logs codecourt-redis

# Follow logs in real-time
docker logs -f codecourt-mongo
```

### Data Operations:
```bash
# MongoDB shell
docker exec -it codecourt-mongo mongosh

# Redis CLI
docker exec -it codecourt-redis redis-cli

# Clear Redis cache
docker exec codecourt-redis redis-cli FLUSHALL

# Backup MongoDB
docker exec codecourt-mongo mongodump --db codecourt --out /tmp/backup
docker cp codecourt-mongo:/tmp/backup ./mongodb-backup
```

### Troubleshooting:
```bash
# Restart containers
docker restart codecourt-mongo codecourt-redis

# Remove and recreate (DELETES DATA!)
docker rm -f codecourt-mongo codecourt-redis
# Then run docker run commands again

# Check resource usage
docker stats codecourt-mongo codecourt-redis
```

---

## 🚀 Next Steps

### 1. Test Your Backend (Recommended First Step)
```bash
cd backend
npm run dev
```

This will:
- Connect to MongoDB (creates `codecourt` database on first write)
- Connect to Redis (ready immediately)
- Start Express server on port 5000
- Enable all API endpoints

### 2. Install MongoDB Compass (Optional but Helpful)
- Download: https://www.mongodb.com/try/download/compass
- Connect to: `mongodb://localhost:27017`
- Visually browse your data as you create it

### 3. Test API Endpoints
Use Postman or curl:
```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Check MongoDB
docker exec -it codecourt-mongo mongosh
use codecourt
db.users.find()
```

### 4. Setup AWS S3 (When Ready)
- Needed for: Uploading problem test cases
- Can skip for now if just testing auth/problems without uploads

---

## 📚 Documentation Files Created

1. **SERVICES_SETUP.md** - Quick setup guide
2. **MONGODB_REDIS_GUIDE.md** - Detailed beginner guide
3. **CURRENT_STATUS.md** - This file (current state)

Read these in order:
1. Start with CURRENT_STATUS.md (you are here)
2. Read MONGODB_REDIS_GUIDE.md for concepts
3. Reference SERVICES_SETUP.md for commands

---

## ✅ Summary

**You have:**
- ✅ MongoDB running (empty, ready for data)
- ✅ Redis running (empty, ready for cache/queues)
- ✅ Backend configured to connect to both
- ✅ All Phase 1 & 2 code implemented

**You need:**
- ⏳ Test backend: `cd backend && npm run dev`
- ⏳ AWS S3 setup (for test case uploads)
- ⏳ Groq API key (for Phase 3 AI service)

**You're ready to start testing your backend!** 🎉
