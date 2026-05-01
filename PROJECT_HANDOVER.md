# CodeCourt Project Handover Document

**Last Updated**: May 1, 2026  
**Purpose**: Complete project context for new AI assistant account

---

## 🎯 Project Overview

**CodeCourt** is a competitive programming judge and contest platform with AI-powered hints. Think LeetCode meets Codeforces with an AI assistant.

### Core Features
- **User Authentication**: JWT-based auth with role-based access (admin, problem_setter, contestant)
- **Problem Management**: Create, approve, and publish coding problems with test cases
- **Code Execution**: Sandboxed C++ and Python judge with resource limits
- **Contests**: ICPC-style scoring with real-time leaderboards
- **AI Hints**: LangChain agent provides up to 3 hints per problem using Groq (Llama 3.3 70B)
- **Real-time Updates**: Socket.io pushes verdicts and leaderboard changes

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend API** | Express.js, Node.js 20 |
| **Database** | MongoDB Atlas (Mongoose) |
| **Cache/Queue** | Redis, BullMQ |
| **AI Service** | FastAPI, LangChain, Groq API |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **State Management** | Zustand |
| **Real-time** | Socket.io |
| **Storage** | AWS S3 (test cases) |
| **Containerization** | Docker, Docker Compose |
| **Orchestration** | Kubernetes (Oracle Cloud OKE) |
| **IaC** | Terraform |
| **CI/CD** | GitHub Actions |

### System Architecture

```
┌─────────────┐
│   Frontend  │ (Next.js 14 - Port 3000)
│  (React UI) │
└──────┬──────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌─────────────┐                  ┌─────────────┐
│   Backend   │◄────────────────►│ AI Service  │
│  (Express)  │   HTTP Proxy     │  (FastAPI)  │
│  Port 5000  │                  │  Port 8000  │
└──────┬──────┘                  └──────┬──────┘
       │                                 │
       ├──────┬──────┬──────┬───────────┤
       ▼      ▼      ▼      ▼           ▼
   ┌─────┐ ┌────┐ ┌────┐ ┌─────┐   ┌──────┐
   │ DB  │ │ S3 │ │Redis│ │BullMQ│  │ Groq │
   │Mongo│ │AWS │ │Cache│ │Queue│   │ API  │
   └─────┘ └────┘ └────┘ └─────┘   └──────┘
                     │
                     ▼
              ┌──────────────┐
              │ Judge Workers│
              │ (Docker/K8s) │
              └──────────────┘
```

---

## 📁 Project Structure

```
codecourt/
├── backend/              # Express.js API
│   ├── src/
│   │   ├── config/       # db, redis, s3, bullmq, constants
│   │   ├── modules/      # auth, problems, submissions, contests, users, agent
│   │   ├── middleware/   # authGuard, roleGuard, errorHandler, rateLimit
│   │   ├── jobs/         # submission queue, worker, k8s spawner
│   │   ├── socket/       # verdict and leaderboard real-time updates
│   │   ├── cron/         # contest status updates
│   │   └── app.js
│   ├── docker/
│   │   └── judges/       # C++ and Python judge Dockerfiles
│   ├── k8s/              # Kubernetes manifests
│   └── swagger/          # API documentation
│
├── ai-service/           # FastAPI AI service
│   └── app/
│       ├── agent/        # LangChain executor, tools, prompts
│       ├── routers/      # hint endpoint
│       └── models/       # Pydantic schemas
│
├── frontend/             # Next.js 14 frontend
│   └── app/
│       ├── (auth)/       # login, register
│       ├── problems/     # problem list and detail pages
│       ├── contests/     # contest pages
│       └── submissions/  # submission history
│
├── terraform/            # Infrastructure as Code (AWS S3, MongoDB Atlas)
├── .github/workflows/    # CI/CD pipelines
└── docker-compose.yml    # Local development setup
```

---

## 🚀 Current Status

### ✅ Completed Features

#### Phase 0-1: Setup & Structure (100% Complete)
- ✅ All tools installed (Node.js, Python, Docker, Minikube, kubectl, Terraform)
- ✅ Folder structure created
- ✅ All dependencies installed
- ✅ Environment files configured

#### Phase 2: Core Backend (Mostly Complete)
- ✅ Auth module (register, login, JWT, refresh tokens)
- ✅ Problem CRUD (create, list, get, update, delete)
- ✅ Submission system (create, judge, get results)
- ✅ Contest system (create, register, leaderboard)
- ✅ Socket.io real-time updates
- ⚠️ **Partial**: S3 test case uploads (can use local storage workaround)

#### Phase 3: AI Service (100% Complete)
- ✅ FastAPI setup
- ✅ LangChain agent with Groq (Llama 3.3 70B)
- ✅ Hint generation (up to 3 hints per problem)
- ✅ Integration with backend

#### Phase 4: Frontend (100% Complete)
- ✅ All pages (login, register, problems, contests, submissions)
- ✅ Monaco Editor for code submission
- ✅ Socket.io client for real-time updates
- ✅ Zustand state management

#### Phase 5: Redis Caching (100% Complete)
- ✅ Problem list caching
- ✅ Leaderboard caching
- ✅ Cache invalidation on updates

#### Phase 6: Documentation (100% Complete)
- ✅ Swagger API docs at `/api-docs`
- ✅ Seed scripts for sample data
- ✅ Comprehensive guides (see below)

#### Phase 7: Docker Compose (100% Complete)
- ✅ Multi-container local setup
- ✅ Judge containers (C++ and Python)
- ✅ All services orchestrated

### 🔧 In Progress / Pending

#### Phase 8: Production Dockerfiles (Pending)
- [ ] Optimize Docker images for production
- [ ] Multi-stage builds
- [ ] Security hardening

#### Phase 9: CI/CD (Partial)
- ✅ GitHub Actions CI (lint, test)
- [ ] Automated deployment workflow

#### Phase 10: Property-Based Testing (Partial)
- ✅ Test framework setup
- [ ] Comprehensive PBT coverage

#### Phase 11: Terraform Infrastructure (Pending - Week 7)
- [ ] AWS S3 module
- [ ] MongoDB Atlas module
- [ ] Oracle Cloud K8s module
- [ ] `terraform apply` to provision

#### Phase 12: Production Deployment (Pending - Week 8)
- [ ] Deploy to Kubernetes
- [ ] Configure secrets
- [ ] Test in production

---

## 🐛 Known Issues & Fixes

### ✅ Fixed Bugs (All Critical)

#### 1. Frontend Runtime Errors
**Problem**: TypeErrors crashing contests and problems pages  
**Root Cause**: Missing defensive programming (no type guards, null checks)  
**Fix**: Added `Array.isArray()` checks and optional chaining (`?.`)  
**Status**: ✅ Fixed

#### 2. Login Problems - Map Error
**Problem**: Problems page crashed after login with "map is not a function"  
**Root Cause**: Backend returns `{ count, problems }` but frontend expected plain array  
**Fix**: Changed `setProblems(response.data)` to `setProblems(response.data.problems)`  
**Status**: ✅ Fixed

#### 3. Backend Nodemon Restart Loop
**Problem**: Backend stuck in infinite restart loop  
**Root Cause**: 
- Duplicate Mongoose indexes (field-level + explicit)
- Redis wrong eviction policy (`allkeys-lru` instead of `noeviction`)
- Nodemon reacting to warnings

**Fix**: 
- Removed duplicate `schema.index()` calls
- Changed Redis to `noeviction` policy
- Configured nodemon to ignore logs

**Status**: ✅ Fixed

**See `BUGS_AND_FIXES_HISTORY.md` for detailed analysis and interview-ready explanations.**

---

## 📚 Important Documentation Files

### Setup & Quick Start
- **`README.md`**: Main project overview and quick start
- **`WINDOWS_QUICK_START.md`**: Windows-specific PowerShell commands
- **`CREATE_ADMIN_GUIDE.md`**: How to create admin users
- **`QUICK_START_ADD_PROBLEM.md`**: Complete workflow for adding problems

### Problem Management
- **`HOW_TO_ADD_PROBLEMS.md`**: Detailed guide for adding problems with test cases
- **`S3_SETUP_GUIDE.md`**: AWS S3 configuration for test case storage

### Development
- **`BUGS_AND_FIXES_HISTORY.md`**: All bugs, fixes, and lessons learned
- **`AWS_TIMELINE.md`**: Strategy for maximizing AWS free tier
- **`GITHUB_SECRETS_SETUP.md`**: CI/CD secrets configuration

### Scripts
- **`backend/create-admin.js`**: Create admin user
- **`backend/add-sample-problem.js`**: Add sample problem
- **`backend/generate-test-cases.js`**: Generate test case ZIP files
- **`backend/approve-problem.js`**: Approve problems
- **`backend/test-api-windows.ps1`**: PowerShell API testing script
- **`backend/test-s3-connection.js`**: Verify S3 connectivity

---

## 🔑 Environment Configuration

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/codecourt

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Storage (Local vs S3)
USE_LOCAL_STORAGE=true  # Set to false for S3

# AWS S3 (when USE_LOCAL_STORAGE=false)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=codecourt-test-cases

# Services
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Judge
JUDGE_MODE=docker  # or 'kubernetes' for production
```

### AI Service (.env)
```env
PORT=8000
GROQ_API_KEY=your_groq_api_key_here
EXPRESS_API_URL=http://localhost:5000
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

---

## 🎯 Development Workflow

### Starting the Application

#### Option 1: Docker Compose (Recommended)
```bash
docker compose up
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- AI Service: http://localhost:8000
- Swagger Docs: http://localhost:5000/api-docs

#### Option 2: Manual Start
```bash
# Terminal 1: Redis
docker run -d -p 6379:6379 --name codecourt-redis redis:alpine

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: AI Service
cd ai-service
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 4: Frontend
cd frontend
npm run dev
```

### Adding a Problem (Complete Workflow)

1. **Create admin user**:
   ```bash
   cd backend
   node create-admin.js
   ```

2. **Add sample problem**:
   ```bash
   node add-sample-problem.js
   ```

3. **Generate test cases**:
   ```bash
   npm install archiver
   node generate-test-cases.js
   ```

4. **Upload test cases** (via Swagger UI or Postman):
   - Open http://localhost:5000/api-docs
   - Login to get token
   - Upload `hidden-tests.zip` to problem

5. **Approve problem**:
   ```bash
   node approve-problem.js
   ```

### Testing

```bash
# Backend tests
cd backend
npm test

# AI Service tests
cd ai-service
pytest

# Frontend tests
cd frontend
npm test
```

---

## 🔐 User Roles

| Role | Permissions |
|------|-------------|
| **contestant** | View problems, submit solutions, participate in contests |
| **problem_setter** | All contestant permissions + create problems, upload test cases, create contests |
| **admin** | All permissions + approve/reject problems, manage users |

---

## 📊 API Endpoints (Key Routes)

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT tokens)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Problems
- `GET /api/problems` - List all published problems
- `GET /api/problems/:slug` - Get problem details
- `POST /api/problems` - Create problem (admin/problem_setter)
- `POST /api/problems/:id/upload-tests` - Upload test cases (S3)
- `POST /api/problems/:id/approve` - Approve problem (admin)

### Submissions
- `POST /api/submissions` - Submit code
- `GET /api/submissions/:id` - Get submission result
- `GET /api/submissions/user/:userId` - User's submissions

### Contests
- `GET /api/contests` - List contests
- `POST /api/contests` - Create contest (admin/problem_setter)
- `POST /api/contests/:id/register` - Register for contest
- `GET /api/contests/:id/leaderboard` - Get leaderboard

### AI Hints
- `POST /api/agent/hint` - Request AI hint (proxied to FastAPI)

**Full API docs**: http://localhost:5000/api-docs

---

## 🧪 Testing Strategy

### Property-Based Testing (PBT)
The project uses property-based testing for strong correctness guarantees:

1. **Auth Token Rotation**: Ensures refresh tokens are always unique
2. **Judge Verdict Completeness**: All test cases must have verdicts
3. **Hint Count Ceiling**: Users can't exceed 3 hints per problem
4. **ICPC Score Monotonicity**: Scores never decrease
5. **Leaderboard Ordering**: Rankings are always correct

### Test Files
- `backend/src/modules/auth/test.js` - Auth tests
- `backend/src/modules/problems/test.js` - Problem tests
- `backend/src/modules/submissions/test.js` - Submission tests
- `ai-service/app/test_main.py` - AI service tests

---

## 🚢 Deployment Strategy

### Local Development (Current)
- Docker Compose for all services
- Local MongoDB (or MongoDB Atlas)
- Local Redis
- Local file storage (or S3)

### Production (Planned - Phase 11-12)
- **Kubernetes** (Oracle Cloud OKE)
- **MongoDB Atlas** (M0 free tier)
- **AWS S3** (test case storage)
- **Redis** (managed or self-hosted)
- **Docker images** pushed to GitHub Container Registry
- **CI/CD** via GitHub Actions

---

## 💰 AWS Free Tier Strategy

**IMPORTANT**: Don't create AWS account until Phase 11 (Week 7)!

### Why Wait?
- Most development can be done locally
- Only S3 needed for test case storage
- Creating AWS account too early wastes free tier months

### Workarounds Until Phase 11
1. **Local File Storage**: Set `USE_LOCAL_STORAGE=true` in `.env`
2. **MongoDB GridFS**: Store files in MongoDB
3. **MinIO**: S3-compatible local server

### When to Create AWS Account
- **Phase 11 (Week 7)**: When running Terraform to provision infrastructure
- **12-month free tier** starts at optimal time
- **Phase 12+**: Deploy to production with real S3

**See `AWS_TIMELINE.md` for detailed strategy.**

---

## 🎓 Key Learnings & Best Practices

### Defensive Programming
- Always validate external data (API responses, user input)
- Use type guards (`Array.isArray()`) before calling array methods
- Use optional chaining (`?.`) for potentially undefined properties
- Provide fallback values for missing data

### Infrastructure
- Match infrastructure to application requirements (Redis `noeviction` for BullMQ)
- Don't define indexes twice (field-level `unique: true` auto-creates)
- Configure dev tools properly (nodemon watch patterns)
- Monitor container logs for repeated patterns

### API Design
- Document API contracts clearly (response structure)
- Design for future extensibility (pagination metadata)
- Extract nested data correctly from responses
- Test full user flows (registration → login → feature usage)

### Testing
- Write tests before fixing bugs (bug condition exploration)
- Ensure no regressions (preservation testing)
- Use property-based testing for strong guarantees
- Test with malformed data, not just happy path

---

## 🔧 Common Tasks

### Create Admin User
```bash
cd backend
node create-admin.js
```

### Add Sample Problem
```bash
node add-sample-problem.js
```

### Test API (Windows PowerShell)
```powershell
.\test-api-windows.ps1
```

### Check MongoDB
```bash
mongosh mongodb://localhost:27017/codecourt
db.problems.find().pretty()
```

### Check Redis
```bash
redis-cli
KEYS *
GET problems:list
```

### View Container Logs
```bash
docker compose logs -f api
docker compose logs -f ai-service
```

### Restart Services
```bash
docker compose restart api
docker compose restart ai-service
```

---

## 📞 Troubleshooting

### Backend Won't Start
- Check MongoDB is running: `docker ps`
- Check Redis is running: `redis-cli ping`
- Check `.env` file exists and has correct values
- Check port 5000 is not in use

### Frontend Can't Connect to Backend
- Verify backend is running: http://localhost:5000/api-docs
- Check `NEXT_PUBLIC_API_URL` in frontend `.env`
- Check CORS settings in backend

### AI Service Errors
- Verify Groq API key is valid
- Check `EXPRESS_API_URL` points to backend
- Check Python venv is activated

### S3 Upload Fails
- Verify AWS credentials in `.env`
- Run `node test-s3-connection.js`
- Check bucket name and region match
- Or use local storage: `USE_LOCAL_STORAGE=true`

### Judge Not Working
- Check Docker is running
- Verify judge images are built
- Check BullMQ queue is processing
- View worker logs: `docker compose logs -f api`

---

## 🎯 Next Steps for New AI Assistant

### Immediate Actions
1. Read this document thoroughly
2. Review `README.md` for project overview
3. Check `BUGS_AND_FIXES_HISTORY.md` for context on fixes
4. Review `.kiro/specs/codecourt-mvp/` for detailed requirements and tasks

### When User Asks for Help
1. **Check existing specs** in `.kiro/specs/` first
2. **Review relevant documentation** files
3. **Understand current status** from tasks.md
4. **Follow established patterns** from existing code

### Common User Requests
- **Add new feature**: Create spec using spec workflow
- **Fix bug**: Use bugfix workflow with bug condition methodology
- **Deploy to production**: Follow Phase 11-12 tasks
- **Add problem**: Use guides in `HOW_TO_ADD_PROBLEMS.md`
- **Troubleshoot**: Check relevant troubleshooting sections

---

## 📝 Spec Files Overview

### Completed Specs
1. **codecourt-mvp**: Main project spec (design-first workflow)
2. **frontend-errors**: Fixed TypeErrors in React components (bugfix)
3. **login-problems-map-error-fix**: Fixed data structure mismatch (bugfix)
4. **backend-nodemon-restart-loop-fix**: Fixed restart loop (bugfix)
5. **add-backend-comments**: Added code documentation (feature)

### Spec Workflow
- **Feature specs**: Requirements → Design → Tasks OR Design → Requirements → Tasks
- **Bugfix specs**: Bugfix Requirements → Design → Tasks
- **Property-based testing**: Bug condition exploration → Preservation testing → Fix validation

---

## 🎉 Project Highlights

### What Makes This Project Special
- **Full-stack**: Frontend, backend, AI service, infrastructure
- **Real-world complexity**: Auth, real-time updates, job queues, containerization
- **AI integration**: LangChain agent with Groq
- **Production-ready**: Kubernetes, Terraform, CI/CD
- **Best practices**: Property-based testing, defensive programming, comprehensive docs

### Technical Achievements
- ✅ JWT auth with refresh token rotation
- ✅ Sandboxed code execution (Docker/K8s)
- ✅ Real-time updates (Socket.io)
- ✅ AI-powered hints (LangChain + Groq)
- ✅ ICPC-style contest scoring
- ✅ Comprehensive testing (unit, integration, PBT)
- ✅ Infrastructure as Code (Terraform)

---

## 📚 Additional Resources

### External Documentation
- **Express.js**: https://expressjs.com/
- **Next.js**: https://nextjs.org/docs
- **FastAPI**: https://fastapi.tiangolo.com/
- **LangChain**: https://python.langchain.com/
- **MongoDB**: https://www.mongodb.com/docs/
- **Redis**: https://redis.io/docs/
- **BullMQ**: https://docs.bullmq.io/
- **Socket.io**: https://socket.io/docs/
- **Kubernetes**: https://kubernetes.io/docs/
- **Terraform**: https://developer.hashicorp.com/terraform/docs

### Project-Specific Guides
- All guides are in the root directory with descriptive names
- Check file tree for complete list
- Most guides are Windows-friendly with PowerShell examples

---

## ✅ Handover Checklist

- [x] Project overview and architecture documented
- [x] Current status and completed features listed
- [x] Known issues and fixes documented
- [x] Environment configuration explained
- [x] Development workflow described
- [x] API endpoints listed
- [x] Testing strategy explained
- [x] Deployment strategy outlined
- [x] Common tasks documented
- [x] Troubleshooting guide provided
- [x] Next steps for new AI assistant outlined
- [x] All important files referenced

---

**Welcome to CodeCourt!** 🚀

This document should give you complete context to continue development. If you need more details on any specific area, check the referenced documentation files or ask the user.

**Key Philosophy**: 
- Write defensive code
- Test thoroughly (especially with PBT)
- Document everything
- Think about future extensibility
- Follow established patterns

Good luck! 🎉
