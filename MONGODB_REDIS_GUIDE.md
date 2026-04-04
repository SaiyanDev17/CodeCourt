# MongoDB & Redis Guide for Beginners

## 📦 What You Have Running

### Current Setup (Local Docker Containers)
```
codecourt-mongo  → MongoDB on port 27017
codecourt-redis  → Redis on port 6379
```

---

## 🍃 MongoDB Explained

### What is MongoDB?
MongoDB is your **main database** where all your application data is stored permanently:
- User accounts
- Problems
- Submissions
- Contests
- Leaderboards

### Your Current MongoDB Setup

**Type**: Local Docker Container  
**Connection**: `mongodb://localhost:27017/codecourt`  
**Database Name**: `codecourt`  
**Port**: 27017

#### What's Inside Your MongoDB Container:

```
codecourt-mongo (Docker Container)
├── codecourt (database)
│   ├── users (collection)
│   ├── problems (collection)
│   ├── submissions (collection)
│   ├── contests (collection)
│   └── contestscores (collection)
```

### MongoDB Concepts:

1. **Database**: `codecourt` - Your app's database
2. **Collections**: Like tables in SQL (users, problems, etc.)
3. **Documents**: Individual records (like rows in SQL)
4. **Schema**: Defined by Mongoose models in your code

### Useful MongoDB Commands:

```bash
# Connect to MongoDB shell
docker exec -it codecourt-mongo mongosh

# Inside mongosh:
show dbs                    # List all databases
use codecourt              # Switch to codecourt database
show collections           # List all collections
db.users.find()           # Show all users
db.problems.find()        # Show all problems
db.users.countDocuments() # Count users
exit                       # Exit mongosh
```

### MongoDB GUI Tool (Recommended):

**MongoDB Compass** - Visual tool to browse your database

1. Download: https://www.mongodb.com/try/download/compass
2. Install and open
3. Connect with: `mongodb://localhost:27017`
4. Browse your `codecourt` database visually

---

## 🔴 Redis Explained

### What is Redis?
Redis is an **in-memory cache** - super fast temporary storage:
- Session tokens (JWT blacklist)
- Cached data (problem lists, leaderboards)
- Job queues (submission processing with BullMQ)

**Key Difference**: Redis stores data in RAM (fast but temporary), MongoDB stores on disk (slower but permanent).

### Your Current Redis Setup

**Type**: Local Docker Container  
**Connection**: `redis://localhost:6379`  
**Port**: 6379

#### What's Inside Your Redis Container:

```
codecourt-redis (Docker Container)
├── Key-Value Store (in RAM)
│   ├── "blacklist:refresh_token_xyz" → "1" (JWT blacklist)
│   ├── "problems:list" → "[{...}, {...}]" (cached problem list)
│   ├── "leaderboard:contest_123" → "[{...}]" (cached leaderboard)
│   └── "bull:submission:..." → job data (BullMQ queues)
```

### Redis Concepts:

1. **Key-Value Store**: Everything is stored as `key → value`
2. **TTL (Time To Live)**: Keys auto-expire after set time
3. **In-Memory**: Data stored in RAM (fast but lost on restart)
4. **Persistence**: Can be configured to save to disk

### How Your App Uses Redis:

#### 1. **JWT Token Blacklist** (Auth Module)
```javascript
// When user logs out:
redis.set('blacklist:refresh_token_abc123', '1', 'EX', 604800) // 7 days
// Check if token is blacklisted:
const isBlacklisted = await redis.get('blacklist:refresh_token_abc123')
```

#### 2. **Caching** (Performance Optimization)
```javascript
// Cache problem list for 60 seconds:
redis.set('problems:list', JSON.stringify(problems), 'EX', 60)
// Get cached data:
const cached = await redis.get('problems:list')
```

#### 3. **Job Queue** (BullMQ for Submissions)
```javascript
// Add submission to queue:
await submissionQueue.add('judge', { submissionId, code, problemId })
// Worker processes jobs from queue
```

### Useful Redis Commands:

```bash
# Connect to Redis CLI
docker exec -it codecourt-redis redis-cli

# Inside redis-cli:
KEYS *                          # List all keys
GET problems:list               # Get value of a key
TTL problems:list               # Check time-to-live (seconds remaining)
DEL problems:list               # Delete a key
FLUSHALL                        # Delete ALL keys (careful!)
INFO                            # Redis server info
exit                            # Exit redis-cli
```

### Redis GUI Tool (Optional):

**RedisInsight** - Visual tool to browse Redis

1. Download: https://redis.io/insight/
2. Install and open
3. Add connection: `localhost:6379`
4. Browse keys visually

---

## 🔄 MongoDB vs Redis in Your App

| Feature | MongoDB | Redis |
|---------|---------|-------|
| **Purpose** | Permanent data storage | Temporary cache & queues |
| **Speed** | Slower (disk) | Super fast (RAM) |
| **Data Loss** | Never (persisted to disk) | On restart (unless configured) |
| **Use Cases** | Users, Problems, Submissions | Cache, Sessions, Job Queues |
| **Query** | Complex queries, filters | Simple key-value lookup |
| **Size** | Large datasets (GBs) | Small hot data (MBs) |

### Example Flow in Your App:

**User submits code:**
1. Save submission to **MongoDB** (permanent record)
2. Add job to **Redis** queue (BullMQ)
3. Worker picks job from **Redis** queue
4. Judge code, update verdict in **MongoDB**
5. Cache leaderboard in **Redis** (60s TTL)

**User views problem list:**
1. Check **Redis** cache first (`problems:list`)
2. If cache hit → return instantly (fast!)
3. If cache miss → query **MongoDB** → cache result in **Redis**

---

## 🚀 Quick Start Guide

### 1. Check Containers Are Running
```bash
docker ps
```
You should see both `codecourt-mongo` and `codecourt-redis`.

### 2. Test MongoDB Connection
```bash
docker exec -it codecourt-mongo mongosh
```
```javascript
// Inside mongosh:
use codecourt
db.users.insertOne({ username: "test", email: "test@example.com" })
db.users.find()
exit
```

### 3. Test Redis Connection
```bash
docker exec -it codecourt-redis redis-cli
```
```bash
# Inside redis-cli:
SET test:key "Hello Redis"
GET test:key
DEL test:key
exit
```

### 4. Start Your Backend
```bash
cd backend
npm run dev
```

Watch for:
```
✅ MongoDB connected successfully
✅ Redis connected successfully
✅ Server listening on port 5000
```

---

## 🛠️ Common Operations

### View Your Data

**MongoDB (via Compass):**
1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Click `codecourt` database
4. Browse collections (users, problems, etc.)

**Redis (via CLI):**
```bash
docker exec -it codecourt-redis redis-cli
KEYS *                    # See all keys
GET problems:list         # View cached data
```

### Clear Cache (Redis)
```bash
docker exec -it codecourt-redis redis-cli FLUSHALL
```

### Backup MongoDB Data
```bash
docker exec codecourt-mongo mongodump --db codecourt --out /tmp/backup
docker cp codecourt-mongo:/tmp/backup ./mongodb-backup
```

### Stop Containers (End of Day)
```bash
docker stop codecourt-mongo codecourt-redis
```

### Start Containers (Next Day)
```bash
docker start codecourt-mongo codecourt-redis
```

### Remove Containers (Clean Slate)
```bash
docker rm -f codecourt-mongo codecourt-redis
# Then recreate with docker run commands
```

---

## 📊 Monitoring Your Services

### Check MongoDB Status
```bash
docker exec -it codecourt-mongo mongosh --eval "db.adminCommand('ping')"
```

### Check Redis Status
```bash
docker exec -it codecourt-redis redis-cli PING
# Should return: PONG
```

### View Container Logs
```bash
# MongoDB logs
docker logs codecourt-mongo

# Redis logs
docker logs codecourt-redis

# Follow logs in real-time
docker logs -f codecourt-mongo
```

---

## 🎯 Your CodeCourt Usage

### MongoDB Collections You'll Have:

1. **users** - User accounts, roles, passwords
2. **problems** - Problem statements, test cases metadata
3. **submissions** - Code submissions, verdicts, execution time
4. **contests** - Contest details, participants
5. **contestscores** - ICPC scoring, leaderboard data
6. **hints** - AI-generated hints (Phase 3)

### Redis Keys You'll Have:

1. **blacklist:*** - Logged out JWT tokens
2. **problems:list** - Cached problem list (TTL: 60s)
3. **user:profile:{userId}** - Cached user profiles (TTL: 300s)
4. **leaderboard:{contestId}** - Cached leaderboards (TTL: 10s)
5. **bull:submission:*** - BullMQ job queue data

---

## 🔧 Troubleshooting

### MongoDB Won't Connect
```bash
# Check if container is running
docker ps | findstr mongo

# Check logs
docker logs codecourt-mongo

# Restart container
docker restart codecourt-mongo
```

### Redis Won't Connect
```bash
# Check if container is running
docker ps | findstr redis

# Check logs
docker logs codecourt-redis

# Restart container
docker restart codecourt-redis
```

### Port Already in Use
```bash
# Find what's using port 27017
netstat -ano | findstr :27017

# Find what's using port 6379
netstat -ano | findstr :6379

# Kill process or use different port
```

---

## 📚 Learn More

### MongoDB Resources:
- Official Docs: https://docs.mongodb.com/
- Mongoose (ODM): https://mongoosejs.com/
- MongoDB University: https://university.mongodb.com/ (free courses)

### Redis Resources:
- Official Docs: https://redis.io/docs/
- Redis Commands: https://redis.io/commands/
- BullMQ (Job Queue): https://docs.bullmq.io/

---

## ✅ Next Steps

1. ✅ MongoDB and Redis are running
2. ⏳ Install MongoDB Compass (optional but recommended)
3. ⏳ Test backend: `cd backend && npm run dev`
4. ⏳ Create some test data via API
5. ⏳ View data in MongoDB Compass
6. ⏳ Check Redis cache keys via redis-cli

**You're all set!** Your local development environment is ready for Phase 2 testing.
