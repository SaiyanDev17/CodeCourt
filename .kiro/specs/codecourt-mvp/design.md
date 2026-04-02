# Design Document — CodeCourt MVP

## Overview

CodeCourt is a competitive programming judge and contest platform. The architecture is a polyglot monorepo with three independently deployable services: an Express.js API (backend), a FastAPI AI service (ai-service), and a Next.js frontend. A BullMQ + Redis queue decouples submission ingestion from Judge execution. Socket.io provides real-time push to clients. Docker containers sandbox code execution. Kubernetes Jobs run Judge workloads in production.

---

## Architecture Diagram

```
Browser (Next.js :3000)
    │
    ├── REST/WS ──────────────────► Express API (:5000)
    │                                    │
    │                                    ├── MongoDB Atlas
    │                                    ├── Redis (cache + queue + blacklist)
    │                                    ├── AWS S3 (test cases)
    │                                    ├── BullMQ Worker → Docker Judge (local)
    │                                    │                → K8s Job (prod)
    │                                    └── Socket.io (verdict + leaderboard)
    │
    └── REST ─────────────────────► FastAPI AI Service (:8000)
                                         │
                                         └── Groq API (Llama 3.3 70B)
                                              └── tools → Express API (internal)
```

---

## Technology Decisions

| Concern | Choice | Rationale |
|---------|--------|-----------|
| API framework | Express.js + Node 20 | Team familiarity, rich ecosystem |
| Database | MongoDB Atlas (Mongoose) | Flexible schema for problems/submissions |
| Auth | JWT (access 15min + refresh 7d) + bcrypt | Stateless API, secure rotation |
| Queue | BullMQ + Redis | Reliable job queue, retry support |
| Judge sandbox | Docker (local) + K8s Jobs (prod) | Isolation, resource limits |
| Real-time | Socket.io | Rooms, reconnect, wide browser support |
| AI | LangChain + Groq (Llama 3.3 70B) | Tool-calling agent loop, fast inference |
| Caching | Redis | Sub-millisecond reads for hot data |
| Storage | AWS S3 | Durable, cheap object storage for test ZIPs |
| Frontend | Next.js 14 App Router + Tailwind + Zustand | SSR, file-based routing, minimal state |
| IaC | Terraform | Reproducible infra across AWS + OCI |
| CI/CD | GitHub Actions + GHCR | Native GitHub integration |

---

## Data Models

### User

```js
{
  _id: ObjectId,
  username: String,       // unique, indexed
  email: String,          // unique, indexed
  passwordHash: String,   // bcrypt, cost 10
  role: String,           // enum: admin | problem_setter | contestant
  createdAt: Date,
  updatedAt: Date
}
```

### Problem

```js
{
  _id: ObjectId,
  title: String,
  slug: String,           // unique, indexed, URL-safe
  description: String,    // markdown
  constraints: String,
  timeLimit: Number,      // milliseconds
  memoryLimit: Number,    // megabytes
  difficulty: String,     // enum: easy | medium | hard
  sampleTestCases: [{ input: String, output: String }],
  hiddenTestCasesS3Key: String,   // e.g. test-cases/{id}/hidden.zip
  status: String,         // enum: draft | published | rejected
  rejectionReason: String,
  authorId: ObjectId,     // ref: User
  createdAt: Date,
  updatedAt: Date
}
```

### Submission

```js
{
  _id: ObjectId,
  userId: ObjectId,       // ref: User
  problemId: ObjectId,    // ref: Problem
  contestId: ObjectId,    // ref: Contest (nullable)
  language: String,       // enum: cpp | python
  code: String,
  verdict: String,        // enum: AC | WA | TLE | MLE | RE | CE | PENDING
  executionTime: Number,  // ms
  memoryUsed: Number,     // MB
  compilerError: String,  // populated for CE only
  createdAt: Date
}
```

### Contest

```js
{
  _id: ObjectId,
  title: String,
  status: String,         // enum: upcoming | ongoing | ended
  startTime: Date,
  endTime: Date,
  problemIds: [ObjectId], // ref: Problem
  participants: [ObjectId], // ref: User
  createdBy: ObjectId,    // ref: User
  createdAt: Date,
  updatedAt: Date
}
```

### ContestScore

```js
{
  _id: ObjectId,
  contestId: ObjectId,    // ref: Contest
  userId: ObjectId,       // ref: User
  totalScore: Number,
  problemScores: [{
    problemId: ObjectId,
    solved: Boolean,
    attempts: Number,     // WA count before first AC
    firstAcTime: Number,  // minutes from contest start
    penalty: Number       // 20 * attempts + firstAcTime
  }],
  updatedAt: Date
}
```

### Hint

```js
{
  _id: ObjectId,
  userId: ObjectId,       // ref: User
  problemId: ObjectId,    // ref: Problem
  hintText: String,
  hintIndex: Number,      // 1, 2, or 3
  createdAt: Date
}
```

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | None | Register new user |
| POST | `/login` | None | Login, returns access token + sets refresh cookie |
| POST | `/refresh` | Cookie | Rotate refresh token |
| POST | `/logout` | Bearer | Blacklist refresh token |

### Problems — `/api/problems`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | List published problems (cached) |
| GET | `/:slug` | None | Get problem detail |
| POST | `/` | problem_setter | Create problem (draft) |
| PUT | `/:id` | problem_setter (owner) | Update problem |
| POST | `/:id/upload-tests` | problem_setter (owner) | Upload hidden test ZIP to S3 |
| POST | `/:id/approve` | admin | Approve problem → published |
| POST | `/:id/reject` | admin | Reject problem with reason |

### Submissions — `/api/submissions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | contestant | Submit code, enqueue job |
| GET | `/:id` | owner | Get submission detail + verdict |
| GET | `/problem/:problemId` | contestant | List own submissions for a problem |

### Contests — `/api/contests`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | List all contests |
| GET | `/:id` | None | Get contest detail |
| POST | `/` | admin \| problem_setter | Create contest |
| POST | `/:id/register` | contestant | Register for contest |
| GET | `/:id/leaderboard` | None | Get leaderboard (cached) |

### Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:username` | None | Get public user profile (cached) |
| PUT | `/:id/role` | admin | Update user role |

### Agent — `/api/agent`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/hint` | contestant | Proxy hint request to FastAPI |

### AI Service — FastAPI

| Method | Path | Description |
|--------|------|-------------|
| POST | `/hint` | Run agent loop, return hint |

---

## Component Design

### 1. Auth Flow

```
Client → POST /api/auth/login
  → Auth_Service validates credentials
  → Issues Access_Token (JWT, 15min, signed with ACCESS_SECRET)
  → Issues Refresh_Token (JWT, 7d, signed with REFRESH_SECRET)
  → Stores Refresh_Token hash in Redis: key=refresh:{userId}, TTL=7d
  → Sets Refresh_Token as HTTP-only cookie
  → Returns { accessToken } in body

Client → POST /api/auth/refresh (cookie: refreshToken)
  → Auth_Service verifies Refresh_Token signature
  → Checks Redis: if token hash is blacklisted → 401
  → Issues new Access_Token + new Refresh_Token
  → Blacklists old Refresh_Token in Redis
  → Sets new Refresh_Token cookie
  → Returns { accessToken }

Client → POST /api/auth/logout (Bearer: accessToken, cookie: refreshToken)
  → Auth_Service adds Refresh_Token to Redis blacklist
  → Clears cookie
```

### 2. Submission Pipeline

```
Client → POST /api/submissions
  → Submission_Service creates Submission doc (verdict: PENDING)
  → Enqueues job to BullMQ Queue: { submissionId, code, language, problemId }
  → Returns 202 { submissionId }

BullMQ Worker (submission.worker.js)
  → Dequeues job
  → Fetches problem (timeLimit, memoryLimit, hiddenTestCasesS3Key)
  → Downloads test cases ZIP from S3
  → Spawns Judge:
      Local (Phase 1-2): docker run --network none --memory={limit}m --cpus=1
      Prod (Phase 4): kubectl apply -f judge-job-template.yaml (K8s Job)
  → Collects verdict
  → Updates Submission doc in MongoDB
  → Emits Socket.io `verdict` event to user room
  → If contest submission: updates ContestScore, emits `leaderboard:update`
```

### 3. Judge Container Design

**C++ Judge** (`docker/judges/cpp/Dockerfile`):
```dockerfile
FROM gcc:13-alpine
WORKDIR /sandbox
# compile: g++ -O2 -o solution solution.cpp
# run: timeout {TL}s ./solution < input.txt > output.txt 2>&1
```

**Python Judge** (`docker/judges/python/Dockerfile`):
```dockerfile
FROM python:3.11-alpine
WORKDIR /sandbox
# run: timeout {TL}s python solution.py < input.txt > output.txt 2>&1
```

Verdict mapping:
- Exit 0 + output matches → AC
- Exit 0 + output mismatch → WA
- Exit 124 (timeout) → TLE
- OOM killed → MLE
- Exit non-zero (not 124) → RE
- Compile step non-zero → CE

### 4. AI Hint Agent Loop

```
POST /hint { user_id, problem_id, problem_slug }
  → AgentExecutor (LangChain + Groq Llama 3.3 70B)
  → Tool: get_hint_count(user_id, problem_id)
      → GET http://api:5000/api/agent/hint-count (internal)
  → If count >= 3: return 403
  → Tool: get_submission_history(user_id, problem_id)
      → GET http://api:5000/api/submissions/problem/{problemId}?userId={userId}
  → Tool: get_problem_metadata(problem_slug)
      → GET http://api:5000/api/problems/{slug}
  → LLM generates hint (no full solution, no code)
  → Tool: save_hint(user_id, problem_id, hint_text)
      → POST http://api:5000/api/agent/save-hint
  → Returns { hint, hints_used }
```

### 5. Contest State Machine

```
upcoming ──(startTime reached, Cron)──► ongoing ──(endTime reached, Cron)──► ended
```

`contest.cron.js` runs every 30 seconds:
```js
// Check for upcoming → ongoing
Contest.updateMany(
  { status: 'upcoming', startTime: { $lte: now } },
  { $set: { status: 'ongoing' } }
)
// Check for ongoing → ended
Contest.updateMany(
  { status: 'ongoing', endTime: { $lte: now } },
  { $set: { status: 'ended' } }
)
// Invalidate leaderboard cache for transitioned contests
```

### 6. ICPC Scoring

```js
function computeIcpcScore(problemScores) {
  return problemScores.reduce((total, ps) => {
    if (!ps.solved) return total;
    const penalty = 20 * ps.attempts + ps.firstAcTime;
    return total + 100 - penalty;  // base 100 per problem
  }, 0);
}
```

Penalty rule: 20 minutes per WA before first AC, plus minutes elapsed to first AC.

### 7. Socket.io Room Strategy

```
User connects with Bearer token → authenticated
  → joins room: user:{userId}          (personal verdict room)
  → joins room: contest:{contestId}    (on contest page load)

Events emitted:
  verdict         → room: user:{userId}
  leaderboard:update → room: contest:{contestId}
```

### 8. Redis Key Schema

| Key | Type | TTL | Content |
|-----|------|-----|---------|
| `refresh:{userId}` | String | 7d | current valid refresh token hash |
| `blacklist:{tokenHash}` | String | 7d | "1" (blacklisted flag) |
| `problems:list` | String (JSON) | 60s | serialized problem list |
| `user:profile:{userId}` | String (JSON) | 300s | serialized user profile |
| `leaderboard:{contestId}` | String (JSON) | 10s | serialized top-50 rankings |

### 9. Middleware Stack (Express)

```
Request
  → rateLimit (express-rate-limit, Redis store)
  → cors (origin: frontend URL)
  → json body parser
  → authGuard (verify JWT, attach req.user)
  → roleGuard (check req.user.role against allowed roles)
  → validate (Joi/Zod schema validation)
  → route handler
  → errorHandler (catch-all, structured JSON errors)
```

### 10. Environment Variables

**backend/.env.example**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/codecourt
REDIS_URL=redis://localhost:6379
ACCESS_TOKEN_SECRET=changeme_access
REFRESH_TOKEN_SECRET=changeme_refresh
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_NAME=codecourt-test-cases
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

**ai-service/.env.example**
```
GROQ_API_KEY=
EXPRESS_API_URL=http://localhost:5000
PORT=8000
```

**frontend/.env.example**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_AI_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## Kubernetes Manifests (Phase 4)

Located in `backend/k8s/`:

- `namespace.yaml` — `codecourt` namespace
- `configmap.yaml` — non-secret env vars
- `secrets.example.yaml` — secret template (never committed with real values)
- `api-deployment.yaml` — Express API Deployment + Service (ClusterIP)
- `redis-deployment.yaml` — Redis Deployment + Service
- `judge-job-template.yaml` — K8s Job template for Judge execution
- `ingress.yaml` — NGINX Ingress for external traffic

---

## docker-compose.yml (Phase 2)

Services: `api` (Express :5000), `ai-service` (FastAPI :8000), `mongo` (MongoDB :27017), `redis` (Redis :6379).

All services share a `codecourt-network` bridge network. Volumes: `mongo-data`, `redis-data`.

---

## CI/CD Pipeline

### ci.yml (on: pull_request)
1. Checkout
2. Setup Node 20, cache npm
3. `cd backend && npm ci && npm run lint && npm test`
4. Setup Python 3.11, cache pip
5. `cd ai-service && pip install -r requirements.txt && pytest`

### deploy.yml (on: push to main)
1. Run ci.yml steps
2. Docker login to GHCR
3. Build + push `ghcr.io/<org>/codecourt-api:sha`
4. Build + push `ghcr.io/<org>/codecourt-ai:sha`
5. Build + push `ghcr.io/<org>/codecourt-judge-cpp:sha`
6. Build + push `ghcr.io/<org>/codecourt-judge-python:sha`
7. `kubectl apply -f backend/k8s/` (using OKE kubeconfig secret)

---

## Correctness Properties (Property-Based Tests)

### Auth Token Rotation
- Property: For any sequence of N refresh operations, each Refresh_Token is used exactly once. Implement with fast-check: generate random sequences of login → refresh → refresh chains and assert no token appears twice.

### Judge Verdict Completeness
- Property: For any (code, language, problem) triple, the Judge returns exactly one verdict from {AC, WA, TLE, MLE, RE, CE}. No submission should remain in PENDING state after worker processing.

### Judge Determinism
- Property: Submitting identical code for the same problem twice always yields the same verdict. Test with fast-check by generating random valid programs and asserting verdict equality across two runs.

### Hint Count Ceiling
- Property: For any sequence of hint requests for a (user, problem) pair, the hint count never exceeds 3. Test by generating sequences of 1–10 requests and asserting `hints_used <= 3` always holds.

### ICPC Score Monotonicity
- Property: Adding a new AC verdict to a ContestScore never decreases the total score. Test with fast-check by generating random problem score arrays and asserting score(arr ∪ {newAC}) >= score(arr).

### Leaderboard Ordering
- Property: The leaderboard is always sorted in descending order of totalScore. For equal scores, lower penalty time ranks higher. Test by generating random ContestScore arrays and asserting the sorted output satisfies the ordering invariant.
