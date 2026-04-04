# Tasks — CodeCourt MVP (Full Project Execution)

## Legend
- [ ] Not started
- [-] In progress  
- [x] Complete
- Owner: P1 = Person 1, P2 = Person 2, P3 = Person 3, P4 = Person 4

---

## PHASE 0: Prerequisites & Setup (Week 0 - All Members)

### 0.1 Tool Installation
- [x] 0.1.1 Install Node.js 20.x: `nvm install 20 && nvm use 20` — **All**
- [x] 0.1.2 Install Python 3.11: `pyenv install 3.11 && pyenv global 3.11` — **All**
- [x] 0.1.3 Install Docker Desktop — **All**
- [x] 0.1.4 Install Minikube: `brew install minikube` — **All**
- [x] 0.1.5 Install kubectl: `brew install kubectl` — **All**
- [x] 0.1.6 Install Terraform: `brew install terraform` — **P1**
- [ ] 0.1.7 Install MongoDB Compass — **All**
- [x] 0.1.8 Install Postman — **All**

### 0.2 Cloud Accounts
- [ ] 0.2.1 Create MongoDB Atlas account + M0 cluster — **P1**
- [ ] 0.2.2 Create AWS account, generate access keys — **P1**
- [ ] 0.2.3 Create Groq account, get API key — **P4**
- [ ] 0.2.4 Create GitHub org/repo — **P1**

### 0.3 Local Redis
- [ ] 0.3.1 Start Redis: `docker run -d -p 6379:6379 --name codecourt-redis redis:alpine` — **All**

---

## PHASE 1: Folder Structure & Dependencies (Week 1)

### 1.1 Root Structure — P1
- [x] 1.1.1 Create `codecourt/` root directory
- [x] 1.1.2 Initialize Git: `git init && git branch -M main`
- [x] 1.1.3 Create `.gitignore` (node_modules, .env, __pycache__, .terraform, etc.)
- [x] 1.1.4 Create root `README.md` with project overview
- [x] 1.1.5 Create root `.env.example` with all required env vars documented

### 1.2 Backend Folder Structure — P1
- [x] 1.2.1 Create `backend/` directory
- [x] 1.2.2 Create `backend/src/config/` (db.js, redis.js, s3.js, bullmq.js, constants.js)
- [x] 1.2.3 Create `backend/src/modules/auth/` (routes.js, controller.js, service.js, model.js, test.js)
- [x] 1.2.4 Create `backend/src/modules/problems/` (routes.js, controller.js, service.js, model.js, test.js)
- [x] 1.2.5 Create `backend/src/modules/submissions/` (routes.js, controller.js, service.js, model.js, test.js)
- [x] 1.2.6 Create `backend/src/modules/contests/` (routes.js, controller.js, service.js, model.js, test.js)
- [x] 1.2.7 Create `backend/src/modules/users/` (routes.js, controller.js, service.js)
- [x] 1.2.8 Create `backend/src/modules/agent/` (routes.js, controller.js)
- [x] 1.2.9 Create `backend/src/middleware/` (authGuard.js, roleGuard.js, errorHandler.js, rateLimit.js, validate.js)
- [x] 1.2.10 Create `backend/src/jobs/` (submission.queue.js, submission.worker.js, k8s.spawner.js)
- [x] 1.2.11 Create `backend/src/socket/` (index.js, verdict.socket.js, leaderboard.socket.js)
- [x] 1.2.12 Create `backend/src/cron/` (contest.cron.js)
- [x] 1.2.13 Create `backend/src/app.js` (Express app initialization)
- [x] 1.2.14 Create `backend/server.js` (HTTP server entry point)
- [x] 1.2.15 Create `backend/docker/judges/cpp/Dockerfile`
- [x] 1.2.16 Create `backend/docker/judges/python/Dockerfile`
- [x] 1.2.17 Create `backend/docker/Dockerfile` (main API Dockerfile)
- [x] 1.2.18 Create `backend/k8s/` (namespace.yaml, api-deployment.yaml, redis-deployment.yaml, judge-job-template.yaml, configmap.yaml, secrets.example.yaml, ingress.yaml)
- [x] 1.2.19 Create `backend/swagger/swagger.yaml`
- [x] 1.2.20 Create `backend/.env.example`

### 1.3 Backend Dependencies — P1
- [x] 1.3.1 Create `backend/package.json` with scripts (dev, start, test, lint)
- [x] 1.3.2 Install core: `npm install express mongoose dotenv cors`
- [x] 1.3.3 Install auth: `npm install jsonwebtoken bcrypt cookie-parser`
- [x] 1.3.4 Install queue: `npm install bullmq ioredis`
- [x] 1.3.5 Install real-time: `npm install socket.io`
- [x] 1.3.6 Install storage: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
- [x] 1.3.7 Install validation: `npm install joi`
- [x] 1.3.8 Install rate limit: `npm install express-rate-limit rate-limit-redis`
- [x] 1.3.9 Install cron: `npm install node-cron`
- [x] 1.3.10 Install K8s client: `npm install @kubernetes/client-node`
- [x] 1.3.11 Install Swagger: `npm install swagger-ui-express yamljs`
- [x] 1.3.12 Install dev deps: `npm install -D nodemon eslint prettier jest supertest`

### 1.4 AI Service Folder Structure — P4
- [x] 1.4.1 Create `ai-service/` directory
- [x] 1.4.2 Create `ai-service/app/main.py` (FastAPI app init)
- [x] 1.4.3 Create `ai-service/app/config.py` (env vars)
- [x] 1.4.4 Create `ai-service/app/routers/hint.py` (POST /hint endpoint)
- [x] 1.4.5 Create `ai-service/app/agent/executor.py` (LangChain AgentExecutor)
- [x] 1.4.6 Create `ai-service/app/agent/tools.py` (tool definitions)
- [x] 1.4.7 Create `ai-service/app/agent/prompts.py` (system prompts)
- [x] 1.4.8 Create `ai-service/app/models/schemas.py` (Pydantic models)
- [x] 1.4.9 Create `ai-service/Dockerfile`
- [x] 1.4.10 Create `ai-service/.env.example`

### 1.5 AI Service Dependencies — P4
- [x] 1.5.1 Create `ai-service/requirements.txt`
- [ ] 1.5.2 Create Python venv: `python -m venv venv && source venv/bin/activate`
- [ ] 1.5.3 Install FastAPI: `pip install fastapi uvicorn[standard]`
- [ ] 1.5.4 Install LangChain: `pip install langchain langchain-groq`
- [ ] 1.5.5 Install HTTP client: `pip install httpx`
- [ ] 1.5.6 Install env: `pip install python-dotenv`
- [ ] 1.5.7 Install dev deps: `pip install pytest ruff black`
- [ ] 1.5.8 Freeze deps: `pip freeze > requirements.txt`

### 1.6 Frontend Folder Structure — P3
- [x] 1.6.1 Create `frontend/` directory
- [x] 1.6.2 Initialize Next.js 14: `npx create-next-app@latest frontend --app --tailwind --typescript`
- [x] 1.6.3 Create `frontend/app/layout.tsx` (root layout)
- [x] 1.6.4 Create `frontend/app/page.tsx` (landing page)
- [x] 1.6.5 Create `frontend/app/(auth)/login/page.tsx`
- [x] 1.6.6 Create `frontend/app/(auth)/register/page.tsx`
- [x] 1.6.7 Create `frontend/app/problems/page.tsx`
- [x] 1.6.8 Create `frontend/app/problems/[slug]/page.tsx`
- [x] 1.6.9 Create `frontend/app/contests/page.tsx`
- [x] 1.6.10 Create `frontend/app/contests/[id]/page.tsx`
- [x] 1.6.11 Create `frontend/app/contests/[id]/leaderboard/page.tsx`
- [x] 1.6.12 Create `frontend/app/profile/[username]/page.tsx`
- [x] 1.6.13 Create `frontend/components/Editor/MonacoEditor.tsx`
- [x] 1.6.14 Create `frontend/components/Editor/SubmitButton.tsx`
- [x] 1.6.15 Create `frontend/components/Leaderboard/LeaderboardTable.tsx`
- [x] 1.6.16 Create `frontend/components/Problem/ProblemCard.tsx`
- [x] 1.6.17 Create `frontend/components/Problem/ProblemStatement.tsx`
- [x] 1.6.18 Create `frontend/components/ui/` (Button.tsx, Badge.tsx, Navbar.tsx)
- [x] 1.6.19 Create `frontend/hooks/` (useSocket.ts, useAuth.ts, useSubmission.ts)
- [x] 1.6.20 Create `frontend/lib/` (api.ts, aiApi.ts, socket.ts)
- [x] 1.6.21 Create `frontend/store/auth.store.ts` (Zustand)
- [x] 1.6.22 Create `frontend/types/index.ts`
- [x] 1.6.23 Create `frontend/.env.example`

### 1.7 Frontend Dependencies — P3
- [x] 1.7.1 Install state: `npm install zustand`
- [x] 1.7.2 Install HTTP: `npm install axios`
- [x] 1.7.3 Install Socket.io client: `npm install socket.io-client`
- [x] 1.7.4 Install Monaco Editor: `npm install @monaco-editor/react`
- [x] 1.7.5 Install markdown: `npm install react-markdown`
- [x] 1.7.6 Install UI: `npm install clsx tailwind-merge`

### 1.8 Terraform Folder Structure — P1
- [x] 1.8.1 Create `terraform/` directory
- [x] 1.8.2 Create `terraform/main.tf` (provider config)
- [x] 1.8.3 Create `terraform/variables.tf`
- [x] 1.8.4 Create `terraform/outputs.tf`
- [x] 1.8.5 Create `terraform/terraform.tfvars.example`
- [x] 1.8.6 Create `terraform/modules/s3/main.tf`
- [x] 1.8.7 Create `terraform/modules/s3/variables.tf`
- [x] 1.8.8 Create `terraform/modules/atlas/main.tf`
- [x] 1.8.9 Create `terraform/modules/atlas/variables.tf`
- [x] 1.8.10 Create `terraform/modules/oke/main.tf`
- [x] 1.8.11 Create `terraform/modules/oke/variables.tf`

### 1.9 Scripts & CI/CD Structure — P4
- [x] 1.9.1 Create `scripts/generate-status.js` (PROJECT_STATUS.md generator)
- [x] 1.9.2 Create `scripts/seed.js` (MongoDB seed data)
- [x] 1.9.3 Create `.github/workflows/ci.yml`
- [x] 1.9.4 Create `.github/workflows/deploy.yml`
- [x] 1.9.5 Create `.github/PULL_REQUEST_TEMPLATE.md`

### 1.10 Docker Compose Files — P2
- [x] 1.10.1 Create `docker-compose.yml` (api, ai-service, mongo, redis services)
- [x] 1.10.2 Create `docker-compose.prod.yml` (production overrides)
- [x] 1.10.3 Create `backend/.dockerignore`
- [x] 1.10.4 Create `ai-service/.dockerignore`

### 1.11 PROJECT_STATUS.md Setup — P4
- [x] 1.11.1 Create initial `PROJECT_STATUS.md` template
- [x] 1.11.2 Configure `.git/hooks/pre-push` to run `node scripts/generate-status.js`

---

## PHASE 2: Core Backend Implementation (Week 2-3)

### 2.1 Database & Config Setup — P1
- [x] 2.1.1 Implement `backend/src/config/db.js` — Mongoose connection with retry logic
- [x] 2.1.2 Implement `backend/src/config/redis.js` — ioredis client with connection handling
- [x] 2.1.3 Implement `backend/src/config/s3.js` — AWS S3 client initialization
- [x] 2.1.4 Implement `backend/src/config/bullmq.js` — BullMQ connection config
- [x] 2.1.5 Implement `backend/src/config/constants.js` — roles, verdicts, limits

### 2.2 Auth Module Implementation — P1
- [x] 2.2.1 Implement `User` Mongoose model (username, email, passwordHash, role, timestamps)
- [x] 2.2.2 Implement `POST /api/auth/register` — bcrypt hash (cost 10), unique validation, return 201
- [x] 2.2.3 Implement `POST /api/auth/login` — validate credentials, issue JWT tokens, set cookie
- [x] 2.2.4 Implement `POST /api/auth/refresh` — verify refresh token, rotate tokens, blacklist old
- [x] 2.2.5 Implement `POST /api/auth/logout` — blacklist refresh token in Redis, clear cookie
- [x] 2.2.6 Implement `authGuard` middleware — verify Bearer JWT, attach req.user
- [x] 2.2.7 Implement `roleGuard` middleware — check req.user.role against allowed array
- [x] 2.2.8 Implement rate limit middleware — 10 login attempts/IP/15min using Redis store
- [x] 2.2.9 Write unit tests for auth service (register, login, refresh, logout, blacklist)
- [x] 2.2.10 **[PBT]** Write property test: refresh token uniqueness invariant (fast-check)

### 2.3 Problem Module Implementation — P1
- [x] 2.3.1 Implement `Problem` Mongoose model (title, slug, description, constraints, timeLimit, memoryLimit, difficulty, sampleTestCases, hiddenTestCasesS3Key, status, rejectionReason, authorId, timestamps)
- [x] 2.3.2 Implement `POST /api/problems` — create draft, validate fields, return 201
- [x] 2.3.3 Implement `GET /api/problems` — list published, Redis cache (TTL 60s), fallback MongoDB
- [x] 2.3.4 Implement `GET /api/problems/:slug` — get problem detail
- [x] 2.3.5 Implement `PUT /api/problems/:id` — update (owner only), revert to draft if tests changed
- [x] 2.3.6 Implement `POST /api/problems/:id/upload-tests` — upload ZIP to S3, store URL
- [x] 2.3.7 Implement `POST /api/problems/:id/approve` — admin only, draft→published, invalidate cache
- [x] 2.3.8 Implement `POST /api/problems/:id/reject` — admin only, set rejected + reason
- [x] 2.3.9 Write unit tests for problem service (CRUD, approval, cache invalidation)

### 2.4 Judge Engine Implementation — P2
- [x] 2.4.1 Implement `Submission` Mongoose model (userId, problemId, contestId, language, code, verdict, executionTime, memoryUsed, compilerError, createdAt)
- [x] 2.4.2 Implement `POST /api/submissions` — create PENDING, enqueue BullMQ, return 202
- [x] 2.4.3 Implement `GET /api/submissions/:id` — get detail (owner only)
- [x] 2.4.4 Implement `GET /api/submissions/problem/:problemId` — list own submissions
- [x] 2.4.5 Implement `jobs/submission.queue.js` — BullMQ Queue with Redis connection
- [x] 2.4.6 Implement `jobs/submission.worker.js` — dequeue, fetch problem, download S3 tests, spawn judge, collect verdict, update MongoDB, emit Socket.io
- [x] 2.4.7 Write `docker/judges/cpp/Dockerfile` — gcc:13-alpine, compile + timeout run, network=none
- [x] 2.4.8 Write `docker/judges/python/Dockerfile` — python:3.11-alpine, timeout run, network=none
- [x] 2.4.9 Implement verdict mapping logic — AC, WA, TLE (exit 124), MLE (OOM), RE, CE
- [x] 2.4.10 Write unit tests for verdict mapping
- [x] 2.4.11 **[PBT]** Write property test: verdict completeness (always one of AC/WA/TLE/MLE/RE/CE)
- [x] 2.4.12 **[PBT]** Write property test: judge determinism (same code → same verdict)

### 2.5 Contest Module Implementation — P3
- [x] 2.5.1 Implement `Contest` model (title, status, startTime, endTime, problemIds, participants, createdBy, timestamps)
- [x] 2.5.2 Implement `ContestScore` model (contestId, userId, totalScore, problemScores array, updatedAt)
- [x] 2.5.3 Implement `POST /api/contests` — create (admin/problem_setter), validate endTime > startTime + 30min
- [x] 2.5.4 Implement `GET /api/contests` — list all contests
- [x] 2.5.5 Implement `GET /api/contests/:id` — get contest detail
- [x] 2.5.6 Implement `POST /api/contests/:id/register` — add contestant to participants
- [x] 2.5.7 Implement contest submission flow — record against contest, compute ICPC score, ignore duplicate AC
- [x] 2.5.8 Implement `GET /api/contests/:id/leaderboard` — top-50, Redis cache (TTL 10s)
- [x] 2.5.9 Implement `cron/contest.cron.js` — every 30s, transition upcoming→ongoing→ended, invalidate cache
- [x] 2.5.10 Write unit tests for ICPC scoring and state transitions
- [x] 2.5.11 **[PBT]** Write property test: score monotonicity (new AC never decreases score)
- [x] 2.5.12 **[PBT]** Write property test: leaderboard ordering invariant

### 2.6 Socket.io Implementation — P3
- [x] 2.6.1 Implement `socket/index.js` — Socket.io init on HTTP server, JWT auth middleware
- [x] 2.6.2 Implement `socket/verdict.socket.js` — join user:{userId} room, emit verdict event
- [x] 2.6.3 Implement `socket/leaderboard.socket.js` — join contest:{contestId} room, emit leaderboard:update
- [x] 2.6.4 Write integration test: submit code → receive verdict Socket.io event

### 2.7 Users Module Implementation — P1
- [x] 2.7.1 Implement `GET /api/users/:username` — get public profile, Redis cache (TTL 300s)
- [x] 2.7.2 Implement `PUT /api/users/:id/role` — admin only, update role, invalidate cache

### 2.8 Middleware Implementation — P1 + P4
- [x] 2.8.1 Implement `errorHandler.js` — global error handler, structured JSON errors — **P1**
- [x] 2.8.2 Implement `validate.js` — Joi schema validation middleware — **P1**
- [x] 2.8.3 Implement Redis cache helpers in `config/redis.js` — get, set, del with JSON — **P4**

### 2.9 Express App Assembly — P1
- [x] 2.9.1 Implement `src/app.js` — mount all routes, middleware stack (cors, json, authGuard, errorHandler)
- [x] 2.9.2 Implement `server.js` — HTTP server, attach Socket.io, start listening
- [x] 2.9.3 Test full backend locally: `npm run dev` → verify all endpoints work

---

## PHASE 3: AI Service Implementation (Week 3)

### 3.1 FastAPI Setup — P4
- [ ] 3.1.1 Implement `app/main.py` — FastAPI init, CORS middleware (allow localhost:3000)
- [ ] 3.1.2 Implement `app/config.py` — load env vars (GROQ_API_KEY, EXPRESS_API_URL, PORT)
- [ ] 3.1.3 Implement `app/models/schemas.py` — Pydantic models (HintRequest, HintResponse)

### 3.2 LangChain Agent Implementation — P4
- [ ] 3.2.1 Implement `app/agent/tools.py` — define 4 tools: get_hint_count, get_submission_history, get_problem_metadata, save_hint (each calls Express API via httpx)
- [ ] 3.2.2 Implement `app/agent/prompts.py` — system prompt (give hints without full solution)
- [ ] 3.2.3 Implement `app/agent/executor.py` — LangChain AgentExecutor with Groq (Llama 3.3 70B), tool-calling loop
- [ ] 3.2.4 Implement `app/routers/hint.py` — POST /hint endpoint, validate request, run agent, return hint + hints_used

### 3.3 Express Proxy Endpoints — P1
- [ ] 3.3.1 Implement `POST /api/agent/hint` — proxy to FastAPI /hint
- [ ] 3.3.2 Implement `GET /api/agent/hint-count` — return hint count for (user, problem)
- [ ] 3.3.3 Implement `POST /api/agent/save-hint` — persist hint, increment count
- [ ] 3.3.4 Create `Hint` Mongoose model (userId, problemId, hintText, hintIndex, createdAt)

### 3.4 AI Service Testing — P4
- [ ] 3.4.1 Write unit tests for hint count enforcement (max 3)
- [ ] 3.4.2 **[PBT]** Write property test: hint count ceiling (never exceeds 3)
- [ ] 3.4.3 **[PBT]** Write property test: guard invariant (count=3 → 403 without save_hint call)
- [ ] 3.4.4 Test AI service locally: `uvicorn app.main:app --reload --port 8000`

---

## PHASE 4: Frontend Implementation (Week 4)

### 4.1 Core Frontend Setup — P3 + P4
- [ ] 4.1.1 Implement `store/auth.store.ts` — Zustand store (accessToken, user, login, logout, refresh) — **P4**
- [ ] 4.1.2 Implement `lib/api.ts` — Axios instance (Express :5000), auto-attach Bearer, auto-refresh on 401 — **P4**
- [ ] 4.1.3 Implement `lib/aiApi.ts` — Axios instance (FastAPI :8000) — **P4**
- [ ] 4.1.4 Implement `lib/socket.ts` — Socket.io client, connect with auth token — **P3**
- [ ] 4.1.5 Implement `types/index.ts` — TypeScript types (User, Problem, Submission, Contest, etc.) — **P4**

### 4.2 Auth Pages — P3
- [ ] 4.2.1 Implement `app/(auth)/login/page.tsx` — form validation, call POST /api/auth/login, store token
- [ ] 4.2.2 Implement `app/(auth)/register/page.tsx` — form validation, call POST /api/auth/register
- [ ] 4.2.3 Implement protected route redirect — unauthenticated → /login

### 4.3 Problem Pages — P3
- [ ] 4.3.1 Implement `app/problems/page.tsx` — fetch problem list, display with difficulty badges
- [ ] 4.3.2 Implement `components/Problem/ProblemCard.tsx` — problem card component
- [ ] 4.3.3 Implement `app/problems/[slug]/page.tsx` — problem detail + Monaco Editor + submit button
- [ ] 4.3.4 Implement `components/Problem/ProblemStatement.tsx` — markdown renderer
- [ ] 4.3.5 Implement `components/Editor/MonacoEditor.tsx` — Monaco wrapper with language select (C++, Python)
- [ ] 4.3.6 Implement `components/Editor/SubmitButton.tsx` — submit code, show "Judging..." state
- [ ] 4.3.7 Implement `hooks/useSubmission.ts` — submit code, listen for verdict Socket.io event, update UI

### 4.4 Contest Pages — P3
- [ ] 4.4.1 Implement `app/contests/page.tsx` — contest list with status badges
- [ ] 4.4.2 Implement `app/contests/[id]/page.tsx` — contest detail + problem list + register button
- [ ] 4.4.3 Implement `app/contests/[id]/leaderboard/page.tsx` — real-time leaderboard table
- [ ] 4.4.4 Implement `components/Leaderboard/LeaderboardTable.tsx` — listen for leaderboard:update Socket.io event

### 4.5 User Profile — P3
- [ ] 4.5.1 Implement `app/profile/[username]/page.tsx` — user stats, submission history

### 4.6 AI Hint Panel — P4
- [ ] 4.6.1 Implement AI hint panel in `app/problems/[slug]/page.tsx` — call POST /api/agent/hint
- [ ] 4.6.2 Display hint text + hints remaining counter

### 4.7 UI Components — P3
- [ ] 4.7.1 Implement `components/ui/Button.tsx` — reusable button component
- [ ] 4.7.2 Implement `components/ui/Badge.tsx` — verdict badges (AC=green, WA=red, etc.)
- [ ] 4.7.3 Implement `components/ui/Navbar.tsx` — navigation with auth state

### 4.8 Hooks — P3
- [ ] 4.8.1 Implement `hooks/useAuth.ts` — auth state + token refresh logic
- [ ] 4.8.2 Implement `hooks/useSocket.ts` — Socket.io connection hook

### 4.9 Frontend Testing — P3
- [ ] 4.9.1 Test frontend locally: `npm run dev` → verify all pages render
- [ ] 4.9.2 Test end-to-end flow: register → login → browse problems → submit code → see verdict

---

## PHASE 5: Redis Caching Integration (Week 4)

### 5.1 Cache Integration — P4
- [ ] 5.1.1 Integrate `problems:list` cache in Problem_Service (TTL 60s, invalidate on approve/update)
- [ ] 5.1.2 Integrate `user:profile:{userId}` cache in Users module (TTL 300s, invalidate on role change)
- [ ] 5.1.3 Integrate `leaderboard:{contestId}` cache in Contest_Service (TTL 10s, invalidate on new AC)
- [ ] 5.1.4 Implement Redis unavailability fallback — catch errors, log warning, fall through to MongoDB

---

## PHASE 6: Documentation & Tooling (Week 5)

### 6.1 Swagger Documentation — P1
- [ ] 6.1.1 Write `swagger/swagger.yaml` — document all endpoints (auth, problems, submissions, contests, users, agent) with schemas
- [ ] 6.1.2 Mount Swagger UI at `GET /api-docs` using swagger-ui-express
- [ ] 6.1.3 Test Swagger UI — verify all endpoints documented

### 6.2 Seed Data Script — P1
- [ ] 6.2.1 Implement `scripts/seed.js` — seed MongoDB with sample users (admin, problem_setter, contestant), 10 problems, 1 contest
- [ ] 6.2.2 Test seed script: `node scripts/seed.js` → verify data in MongoDB Compass

### 6.3 PROJECT_STATUS.md Generator — P4
- [ ] 6.3.1 Implement `scripts/generate-status.js` — parse tasks.md, scan route files, generate PROJECT_STATUS.md with API health map, module status, completion %
- [ ] 6.3.2 Test generator: `node scripts/generate-status.js` → verify PROJECT_STATUS.md created
- [ ] 6.3.3 Configure pre-push hook: `.git/hooks/pre-push` → run generator, stage file

---

## PHASE 7: Docker Compose (Week 5)

### 7.1 Docker Compose Setup — P2
- [ ] 7.1.1 Write `docker-compose.yml` — services: api (Express :5000), ai-service (FastAPI :8000), mongo (MongoDB :27017), redis (Redis :6379)
- [ ] 7.1.2 Configure shared network: `codecourt-network`
- [ ] 7.1.3 Configure volumes: `mongo-data`, `redis-data`
- [ ] 7.1.4 Update `.env.example` files — use docker-compose service hostnames (mongo, redis, api)
- [ ] 7.1.5 Write `docker-compose.prod.yml` — production overrides (image tags, resource limits)

### 7.2 Judge Integration in Compose — P2
- [ ] 7.2.1 Mount Docker socket into api container: `/var/run/docker.sock:/var/run/docker.sock`
- [ ] 7.2.2 Update `jobs/submission.worker.js` — spawn judge containers from within compose
- [ ] 7.2.3 Test end-to-end: `docker compose up` → submit code → verify verdict

### 7.3 Compose Testing — All
- [ ] 7.3.1 Test full stack: `docker compose up` → verify all services start
- [ ] 7.3.2 Test health checks: verify mongo, redis, api, ai-service all healthy
- [ ] 7.3.3 Test submission flow: submit → queue → judge → verdict → Socket.io event

---

## PHASE 8: Production Dockerfiles (Week 6)

### 8.1 Backend Dockerfile — P2
- [ ] 8.1.1 Write `backend/docker/Dockerfile` — multi-stage: build stage (npm ci), production stage (node:20-alpine, non-root user)
- [ ] 8.1.2 Write `backend/.dockerignore` — exclude node_modules, .env, tests
- [ ] 8.1.3 Build image: `docker build -t codecourt-api:latest -f backend/docker/Dockerfile backend/`
- [ ] 8.1.4 Test image: `docker run -p 5000:5000 codecourt-api:latest`

### 8.2 AI Service Dockerfile — P4
- [ ] 8.2.1 Write `ai-service/Dockerfile` — multi-stage: python:3.11-slim, non-root user, pip install --no-cache-dir
- [ ] 8.2.2 Write `ai-service/.dockerignore` — exclude venv, __pycache__, .env
- [ ] 8.2.3 Build image: `docker build -t codecourt-ai:latest ai-service/`
- [ ] 8.2.4 Test image: `docker run -p 8000:8000 codecourt-ai:latest`

### 8.3 Judge Dockerfiles — P2
- [ ] 8.3.1 Verify `backend/docker/judges/cpp/Dockerfile` builds: `docker build -t codecourt-judge-cpp backend/docker/judges/cpp/`
- [ ] 8.3.2 Verify `backend/docker/judges/python/Dockerfile` builds: `docker build -t codecourt-judge-python backend/docker/judges/python/`
- [ ] 8.3.3 Test C++ judge: run sample AC code → verify verdict
- [ ] 8.3.4 Test Python judge: run sample WA code → verify verdict

---

## PHASE 9: CI/CD Pipeline (Week 6)

### 9.1 CI Workflow — P4
- [ ] 9.1.1 Write `.github/workflows/ci.yml` — trigger on PR
- [ ] 9.1.2 Add job: checkout, setup Node 20 + cache, `cd backend && npm ci && npm run lint && npm test`
- [ ] 9.1.3 Add job: setup Python 3.11 + cache, `cd ai-service && pip install -r requirements.txt && pytest`
- [ ] 9.1.4 Test CI: open PR → verify pipeline runs

### 9.2 Deploy Workflow — P4
- [ ] 9.2.1 Write `.github/workflows/deploy.yml` — trigger on push to main
- [ ] 9.2.2 Add step: run CI jobs first
- [ ] 9.2.3 Add step: Docker login to GHCR
- [ ] 9.2.4 Add step: build + push `ghcr.io/<org>/codecourt-api:${{ github.sha }}`
- [ ] 9.2.5 Add step: build + push `ghcr.io/<org>/codecourt-ai:${{ github.sha }}`
- [ ] 9.2.6 Add step: build + push `ghcr.io/<org>/codecourt-judge-cpp:${{ github.sha }}`
- [ ] 9.2.7 Add step: build + push `ghcr.io/<org>/codecourt-judge-python:${{ github.sha }}`
- [ ] 9.2.8 Add step: `kubectl apply -f backend/k8s/` (using OKE kubeconfig secret)

### 9.3 GitHub Secrets — P1
- [ ] 9.3.1 Add secret: `GHCR_TOKEN` (GitHub Container Registry token)
- [ ] 9.3.2 Add secret: `KUBECONFIG_OKE` (Oracle Cloud K8s kubeconfig)
- [ ] 9.3.3 Add secret: `GROQ_API_KEY`
- [ ] 9.3.4 Add secret: `AWS_ACCESS_KEY_ID`
- [ ] 9.3.5 Add secret: `AWS_SECRET_ACCESS_KEY`
- [ ] 9.3.6 Add secret: `MONGODB_URI` (Atlas connection string)

### 9.4 CI/CD Testing — P4
- [ ] 9.4.1 Test CI pipeline: open feature branch PR → verify lint + test pass
- [ ] 9.4.2 Test deploy pipeline: merge to main → verify images pushed to GHCR

---

## PHASE 10: Kubernetes Manifests (Week 7)

### 10.1 K8s Base Config — P2
- [ ] 10.1.1 Write `backend/k8s/namespace.yaml` — create `codecourt` namespace
- [ ] 10.1.2 Write `backend/k8s/configmap.yaml` — non-secret env vars (PORT, REDIS_URL, AI_SERVICE_URL, FRONTEND_URL)
- [ ] 10.1.3 Write `backend/k8s/secrets.example.yaml` — template for secrets (MONGODB_URI, JWT secrets, AWS keys, GROQ key)

### 10.2 K8s Deployments — P2
- [ ] 10.2.1 Write `backend/k8s/api-deployment.yaml` — Deployment (2 replicas, resource limits) + ClusterIP Service
- [ ] 10.2.2 Write `backend/k8s/redis-deployment.yaml` — Deployment (1 replica) + ClusterIP Service
- [ ] 10.2.3 Write `backend/k8s/judge-job-template.yaml` — K8s Job template (resource limits: 1 CPU, memory per problem)

### 10.3 K8s Ingress — P2
- [ ] 10.3.1 Write `backend/k8s/ingress.yaml` — NGINX Ingress routing `/api` and `/socket.io` to api Service

### 10.4 K8s Spawner — P2
- [ ] 10.4.1 Update `jobs/k8s.spawner.js` — replace `docker run` with `kubectl create job` using judge-job-template
- [ ] 10.4.2 Implement log collection from K8s Job for verdict
- [ ] 10.4.3 Implement Job cleanup after verdict collected

---

## PHASE 11: Terraform Infrastructure (Week 7)

### 11.1 Terraform AWS S3 Module — P1
- [ ] 11.1.1 Write `terraform/modules/s3/main.tf` — S3 bucket with versioning enabled, public access blocked
- [ ] 11.1.2 Write `terraform/modules/s3/variables.tf` — bucket_name, region
- [ ] 11.1.3 Add output: bucket_name, bucket_arn
- [ ] 11.1.4 Test: `cd terraform/modules/s3 && terraform init && terraform plan`

### 11.2 Terraform MongoDB Atlas Module — P1
- [ ] 11.2.1 Write `terraform/modules/atlas/main.tf` — MongoDB Atlas M10 cluster, IP allowlist
- [ ] 11.2.2 Write `terraform/modules/atlas/variables.tf` — project_id, cluster_name, region
- [ ] 11.2.3 Add output: connection_string
- [ ] 11.2.4 Test: `cd terraform/modules/atlas && terraform init && terraform plan`

### 11.3 Terraform Oracle Cloud K8s Module — P1
- [ ] 11.3.1 Write `terraform/modules/oke/main.tf` — Oracle Cloud OKE cluster, 2 worker nodes (VM.Standard.E4.Flex)
- [ ] 11.3.2 Write `terraform/modules/oke/variables.tf` — compartment_id, cluster_name, node_count
- [ ] 11.3.3 Add output: kubeconfig_path, cluster_endpoint
- [ ] 11.3.4 Test: `cd terraform/modules/oke && terraform init && terraform plan`

### 11.4 Terraform Root Config — P1
- [ ] 11.4.1 Write `terraform/main.tf` — compose all three modules (s3, atlas, oke)
- [ ] 11.4.2 Write `terraform/variables.tf` — all input variables
- [ ] 11.4.3 Write `terraform/outputs.tf` — S3 bucket name, MongoDB connection string, OKE kubeconfig path
- [ ] 11.4.4 Write `terraform/terraform.tfvars.example` — example values for all variables
- [ ] 11.4.5 Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in real values
- [ ] 11.4.6 Run: `terraform init`
- [ ] 11.4.7 Run: `terraform plan` → verify no errors
- [ ] 11.4.8 Run: `terraform apply` → provision production infrastructure

---

## PHASE 12: Production Deployment (Week 8)

### 12.1 K8s Secrets Setup — P1
- [ ] 12.1.1 Create K8s secrets from Terraform outputs: `kubectl create secret generic codecourt-secrets --from-literal=MONGODB_URI=... --from-literal=JWT_ACCESS_SECRET=... --from-literal=JWT_REFRESH_SECRET=... --from-literal=AWS_ACCESS_KEY_ID=... --from-literal=AWS_SECRET_ACCESS_KEY=... --from-literal=GROQ_API_KEY=... -n codecourt`
- [ ] 12.1.2 Verify secrets created: `kubectl get secrets -n codecourt`

### 12.2 Deploy to K8s — P2
- [ ] 12.2.1 Apply namespace: `kubectl apply -f backend/k8s/namespace.yaml`
- [ ] 12.2.2 Apply configmap: `kubectl apply -f backend/k8s/configmap.yaml`
- [ ] 12.2.3 Apply secrets: `kubectl apply -f backend/k8s/secrets.yaml` (real secrets, not example)
- [ ] 12.2.4 Apply Redis deployment: `kubectl apply -f backend/k8s/redis-deployment.yaml`
- [ ] 12.2.5 Apply API deployment: `kubectl apply -f backend/k8s/api-deployment.yaml`
- [ ] 12.2.6 Apply Ingress: `kubectl apply -f backend/k8s/ingress.yaml`
- [ ] 12.2.7 Verify all pods running: `kubectl get pods -n codecourt`
- [ ] 12.2.8 Check logs: `kubectl logs -n codecourt -l app=api`

### 12.3 Smoke Tests — All
- [ ] 12.3.1 Test: register user via production API
- [ ] 12.3.2 Test: login via production API
- [ ] 12.3.3 Test: create problem (problem_setter role)
- [ ] 12.3.4 Test: approve problem (admin role)
- [ ] 12.3.5 Test: submit code → verify verdict returned
- [ ] 12.3.6 Test: request AI hint → verify hint returned
- [ ] 12.3.7 Test: create contest
- [ ] 12.3.8 Test: register for contest
- [ ] 12.3.9 Test: submit during contest → verify leaderboard updates
- [ ] 12.3.10 Test: Socket.io real-time verdict in production
- [ ] 12.3.11 Test: Socket.io real-time leaderboard in production
- [ ] 12.3.12 Test: Swagger UI accessible at production `/api-docs`

### 12.4 Frontend Production Deploy — P3
- [ ] 12.4.1 Update `frontend/.env.production` with production API URLs
- [ ] 12.4.2 Build frontend: `npm run build`
- [ ] 12.4.3 Deploy to Netlify or Vercel (or add to K8s if preferred)
- [ ] 12.4.4 Test frontend in production: verify all pages load, all features work

---

## PHASE 13: Final Polish & Documentation (Week 8)

### 13.1 README Documentation — P1
- [ ] 13.1.1 Write comprehensive `README.md` — project overview, architecture diagram, tech stack, setup instructions, team roles
- [ ] 13.1.2 Add architecture diagram (draw.io or mermaid)
- [ ] 13.1.3 Add setup guide for local development
- [ ] 13.1.4 Add deployment guide for production
- [ ] 13.1.5 Add API documentation link (Swagger)
- [ ] 13.1.6 Add demo video link (record 3-min demo)

### 13.2 Demo Video — All
- [ ] 13.2.1 Record 3-minute demo video showing: register → login → browse problems → submit code → see verdict → request hint → create contest → leaderboard updates
- [ ] 13.2.2 Upload to YouTube (unlisted)
- [ ] 13.2.3 Add link to README

### 13.3 Load Testing — P2
- [ ] 13.3.1 Write load test script (k6 or artillery) — simulate 100 concurrent users submitting code
- [ ] 13.3.2 Run load test against production
- [ ] 13.3.3 Verify judge queue handles load without failures
- [ ] 13.3.4 Verify Redis cache reduces MongoDB load

### 13.4 Bug Fixes & Refinement — All
- [ ] 13.4.1 Fix any bugs discovered during smoke tests
- [ ] 13.4.2 Refine UI/UX based on team feedback
- [ ] 13.4.3 Add error handling for edge cases
- [ ] 13.4.4 Add loading states for all async operations

### 13.5 Final PROJECT_STATUS.md — P4
- [ ] 13.5.1 Run `node scripts/generate-status.js` → generate final PROJECT_STATUS.md
- [ ] 13.5.2 Verify all tasks marked complete
- [ ] 13.5.3 Commit and push

---

## PHASE 14: Resume Preparation (Week 8)

### 14.1 Resume Bullet Points — All
- [ ] 14.1.1 Write resume bullet point: "Built a competitive programming platform with Kubernetes-orchestrated sandboxed code execution, BullMQ/Redis submission queue, real-time Socket.io leaderboard, and an AI hint agent using LLM tool-calling with Groq — deployed on Oracle Cloud K8s with GitHub Actions CI/CD and Terraform IaC"
- [ ] 14.1.2 Prepare technical deep-dive answers for interviews:
  - How does the judge engine work? (Docker sandboxing, resource limits, verdict mapping)
  - How does the AI agent work? (LangChain tool-calling loop, not a chatbot)
  - How does the submission queue work? (BullMQ + Redis, FIFO, concurrency limit)
  - How does real-time work? (Socket.io rooms, verdict + leaderboard events)
  - How does caching work? (Redis with TTLs, cache invalidation strategy)
  - How does CI/CD work? (GitHub Actions → GHCR → kubectl apply)
  - How does Terraform work? (modules for S3, Atlas, OKE)

### 14.2 GitHub Repo Polish — P1
- [ ] 14.2.1 Add GitHub repo description
- [ ] 14.2.2 Add topics/tags: competitive-programming, judge, kubernetes, docker, langchain, groq, terraform, ci-cd
- [ ] 14.2.3 Pin repo to GitHub profile
- [ ] 14.2.4 Add LICENSE file (MIT)
- [ ] 14.2.5 Add CONTRIBUTING.md (if open-sourcing)

---

## Summary

**Total Phases:** 14  
**Total Tasks:** 300+  
**Timeline:** 8 weeks  
**Team:** 4 members  

**Key Deliverables:**
- Full-stack competitive programming platform
- Kubernetes-orchestrated judge engine
- AI hint agent with LangChain tool-calling
- Real-time Socket.io updates
- Redis caching layer
- Terraform infrastructure as code
- GitHub Actions CI/CD pipeline
- Comprehensive documentation + demo video

**Resume Impact:**
- Backend: Express + MongoDB + Redis + BullMQ
- DevOps: Docker + Kubernetes + Terraform + GitHub Actions
- AI: LangChain + Groq tool-calling agent
- Real-time: Socket.io
- Cloud: AWS S3 + MongoDB Atlas + Oracle Cloud K8s

This is a production-grade, interview-ready project that demonstrates full-stack + DevOps + AI capabilities.
