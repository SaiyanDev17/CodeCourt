# Tasks — CodeCourt MVP

## Legend
- [ ] Not started
- [-] In progress
- [x] Complete
- Owner tags: P1 = Person 1, P2 = Person 2, P3 = Person 3, P4 = Person 4

---

## Phase 1: Local Development (Node native + Redis via Docker)

### 1.1 Project Scaffolding & Shared Config

- [ ] 1.1.1 Initialize monorepo root: `.gitignore`, `.env.example`, `README.md` — **P1**
- [ ] 1.1.2 Scaffold `backend/` with `package.json`, `server.js`, `src/app.js`, `src/config/` files (`db.js`, `redis.js`, `s3.js`, `bullmq.js`, `constants.js`) — **P1**
- [ ] 1.1.3 Scaffold `ai-service/` with `requirements.txt`, `app/main.py`, `app/config.py`, `app/models/schemas.py` — **P4**
- [ ] 1.1.4 Scaffold `frontend/` with Next.js 14 App Router, Tailwind CSS, Zustand, Monaco Editor dependencies — **P3**
- [ ] 1.1.5 Create `scripts/seed.js` for seeding MongoDB with sample users, problems, and a contest — **P1**
- [ ] 1.1.6 Set up ESLint + Prettier for backend; Ruff + Black for ai-service — **P4**

### 1.2 Auth Module — P1

- [ ] 1.2.1 Create `User` Mongoose model with username, email, passwordHash, role fields
- [ ] 1.2.2 Implement `POST /api/auth/register` — bcrypt hash (cost 10), unique email/username validation, return 201
- [ ] 1.2.3 Implement `POST /api/auth/login` — credential validation, issue Access_Token (15min) + Refresh_Token (7d), set HTTP-only cookie
- [ ] 1.2.4 Implement `POST /api/auth/refresh` — verify Refresh_Token, check Redis blacklist, rotate tokens
- [ ] 1.2.5 Implement `POST /api/auth/logout` — blacklist Refresh_Token in Redis, clear cookie
- [ ] 1.2.6 Implement `authGuard` middleware — verify Bearer JWT, attach `req.user`
- [ ] 1.2.7 Implement `roleGuard` middleware — check `req.user.role` against allowed roles array
- [ ] 1.2.8 Implement rate limiting middleware (10 login attempts / IP / 15min) using `express-rate-limit` with Redis store
- [ ] 1.2.9 Write unit tests for auth service (register, login, refresh, logout, blacklist)
- [ ] 1.2.10 **[PBT]** Write property-based test: for any sequence of N refresh operations, each Refresh_Token is used exactly once (token uniqueness invariant) using fast-check

### 1.3 Problem Module — P1

- [ ] 1.3.1 Create `Problem` Mongoose model
- [ ] 1.3.2 Implement `POST /api/problems` — create draft problem, validate required fields, return 201
- [ ] 1.3.3 Implement `GET /api/problems` — list published problems, Redis cache (`problems:list`, TTL 60s), fallback to MongoDB
- [ ] 1.3.4 Implement `GET /api/problems/:slug` — get problem detail
- [ ] 1.3.5 Implement `PUT /api/problems/:id` — update problem (owner only), revert to draft if test cases changed, invalidate cache
- [ ] 1.3.6 Implement `POST /api/problems/:id/upload-tests` — upload ZIP to S3 key `test-cases/{id}/hidden.zip`, store URL in MongoDB
- [ ] 1.3.7 Implement `POST /api/problems/:id/approve` — admin only, transition draft → published, invalidate `problems:list` cache
- [ ] 1.3.8 Implement `POST /api/problems/:id/reject` — admin only, transition to rejected, record reason
- [ ] 1.3.9 Write unit tests for problem service (CRUD, approval flow, cache invalidation)

### 1.4 Judge Engine — P2

- [ ] 1.4.1 Create `Submission` Mongoose model
- [ ] 1.4.2 Implement `POST /api/submissions` — create PENDING submission, enqueue to BullMQ, return 202 with submissionId
- [ ] 1.4.3 Implement `GET /api/submissions/:id` — get submission detail (owner only)
- [ ] 1.4.4 Implement `GET /api/submissions/problem/:problemId` — list own submissions for a problem
- [ ] 1.4.5 Write `jobs/submission.queue.js` — BullMQ Queue setup with Redis connection
- [ ] 1.4.6 Write `jobs/submission.worker.js` — dequeue job, fetch problem + test cases from S3, spawn Judge, collect verdict, update MongoDB, emit Socket.io event
- [ ] 1.4.7 Write `docker/judges/cpp/Dockerfile` — gcc:13-alpine, compile + run with timeout, network disabled
- [ ] 1.4.8 Write `docker/judges/python/Dockerfile` — python:3.11-alpine, run with timeout, network disabled
- [ ] 1.4.9 Implement verdict mapping logic: AC, WA, TLE (exit 124), MLE (OOM), RE, CE
- [ ] 1.4.10 Write unit tests for verdict mapping logic
- [ ] 1.4.11 **[PBT]** Write property-based test: for any (code, language, problem) triple, Judge returns exactly one verdict from {AC, WA, TLE, MLE, RE, CE} — never PENDING after processing
- [ ] 1.4.12 **[PBT]** Write property-based test: identical code submitted twice for the same problem always yields the same verdict (determinism property)

### 1.5 Contest Engine — P3

- [ ] 1.5.1 Create `Contest` and `ContestScore` Mongoose models
- [ ] 1.5.2 Implement `POST /api/contests` — create contest (admin/problem_setter), validate endTime > startTime + 30min, return 201
- [ ] 1.5.3 Implement `GET /api/contests` — list all contests
- [ ] 1.5.4 Implement `GET /api/contests/:id` — get contest detail
- [ ] 1.5.5 Implement `POST /api/contests/:id/register` — add contestant to participants list
- [ ] 1.5.6 Implement contest submission flow — record submission against contest, compute ICPC_Score, ignore duplicate AC
- [ ] 1.5.7 Implement `GET /api/contests/:id/leaderboard` — return top-50, Redis cache (`leaderboard:{contestId}`, TTL 10s)
- [ ] 1.5.8 Write `cron/contest.cron.js` — node-cron every 30s, transition upcoming→ongoing→ended, invalidate leaderboard cache
- [ ] 1.5.9 Write unit tests for ICPC scoring logic and contest state transitions
- [ ] 1.5.10 **[PBT]** Write property-based test: adding a new AC verdict never decreases totalScore (score monotonicity)
- [ ] 1.5.11 **[PBT]** Write property-based test: leaderboard output is always sorted descending by totalScore, with ties broken by lower penalty (ordering invariant)

### 1.6 Socket.io Real-Time — P3

- [ ] 1.6.1 Write `socket/index.js` — initialize Socket.io on Express HTTP server, JWT auth middleware
- [ ] 1.6.2 Write `socket/verdict.socket.js` — join user to `user:{userId}` room, emit `verdict` event
- [ ] 1.6.3 Write `socket/leaderboard.socket.js` — join user to `contest:{contestId}` room, emit `leaderboard:update` event within 2s of verdict
- [ ] 1.6.4 Write integration test: submit code → receive `verdict` Socket.io event

### 1.7 AI Hint Agent — P4

- [ ] 1.7.1 Write `app/agent/tools.py` — define 4 LangChain tools: `get_hint_count`, `get_submission_history`, `get_problem_metadata`, `save_hint` (each calls Express API internally)
- [ ] 1.7.2 Write `app/agent/prompts.py` — system prompt instructing agent to give hints without revealing full solution
- [ ] 1.7.3 Write `app/agent/executor.py` — LangChain AgentExecutor with Groq (Llama 3.3 70B), tool-calling loop
- [ ] 1.7.4 Write `app/routers/hint.py` — `POST /hint` endpoint, validate request, run agent, return `{ hint, hints_used }`
- [ ] 1.7.5 Implement Express proxy: `POST /api/agent/hint` → FastAPI `/hint`, `GET /api/agent/hint-count`, `POST /api/agent/save-hint`
- [ ] 1.7.6 Create `Hint` Mongoose model
- [ ] 1.7.7 Write unit tests for hint count enforcement (max 3 per user/problem)
- [ ] 1.7.8 **[PBT]** Write property-based test: for any sequence of 1–10 hint requests for a (user, problem) pair, hints_used never exceeds 3 (ceiling invariant)
- [ ] 1.7.9 **[PBT]** Write property-based test: when hint count is already 3, Agent always returns 403 without calling `save_hint` (guard invariant)

### 1.8 Redis Caching — P4

- [ ] 1.8.1 Implement Redis cache helpers in `src/config/redis.js` — `get`, `set`, `del` wrappers with JSON serialization
- [ ] 1.8.2 Integrate `problems:list` cache in Problem_Service (TTL 60s, invalidate on approve/update)
- [ ] 1.8.3 Integrate `user:profile:{userId}` cache in Users module (TTL 300s, invalidate on role change)
- [ ] 1.8.4 Integrate `leaderboard:{contestId}` cache in Contest_Service (TTL 10s, invalidate on new AC)
- [ ] 1.8.5 Implement Redis unavailability fallback — catch connection errors, log warning, fall through to MongoDB

### 1.9 Frontend — P3 + P4

- [ ] 1.9.1 Implement Zustand `auth.store.ts` — store accessToken in memory, expose login/logout/refresh actions — **P4**
- [ ] 1.9.2 Implement `lib/api.ts` — Axios instance pointing to Express :5000, auto-attach Bearer token, auto-refresh on 401 — **P4**
- [ ] 1.9.3 Implement `lib/aiApi.ts` — Axios instance pointing to FastAPI :8000 — **P4**
- [ ] 1.9.4 Implement `lib/socket.ts` — Socket.io client, connect with auth token, export typed event hooks — **P3**
- [ ] 1.9.5 Build `(auth)/login/page.tsx` and `(auth)/register/page.tsx` — form validation, call auth API — **P3**
- [ ] 1.9.6 Build `problems/page.tsx` — fetch + display problem list with difficulty badges — **P3**
- [ ] 1.9.7 Build `problems/[slug]/page.tsx` — problem statement + Monaco Editor + language selector + submit button + verdict display — **P3**
- [ ] 1.9.8 Implement `hooks/useSubmission.ts` — submit code, listen for `verdict` Socket.io event, update UI state — **P3**
- [ ] 1.9.9 Build `contests/page.tsx` and `contests/[id]/page.tsx` — contest list + detail + register button — **P3**
- [ ] 1.9.10 Build `contests/[id]/leaderboard/page.tsx` — real-time leaderboard, listen for `leaderboard:update` event — **P3**
- [ ] 1.9.11 Build `profile/[username]/page.tsx` — user stats, submission history — **P3**
- [ ] 1.9.12 Implement protected route redirect to `/login` for unauthenticated users — **P4**
- [ ] 1.9.13 Implement AI hint panel in problem detail page — call `/api/agent/hint`, display hint, show hints remaining — **P4**

### 1.10 Swagger Docs — P1

- [ ] 1.10.1 Write `swagger/swagger.yaml` — document all endpoints (auth, problems, submissions, contests, users, agent) with request/response schemas and auth requirements
- [ ] 1.10.2 Mount Swagger UI at `GET /api-docs` using `swagger-ui-express`

### 1.11 PROJECT_STATUS.md Hook — P4

- [ ] 1.11.1 Write `scripts/generate-status.js` — parse tasks.md, count completed/in-progress/pending tasks per phase and per person, output `PROJECT_STATUS.md`
- [ ] 1.11.2 Configure `.git/hooks/pre-push` to run `node scripts/generate-status.js` and stage `PROJECT_STATUS.md`

---

## Phase 2: docker-compose (Full Local Parity)

### 2.1 Docker Compose Setup — P2

- [ ] 2.1.1 Write `docker-compose.yml` — services: `api` (Express :5000), `ai-service` (FastAPI :8000), `mongo` (MongoDB :27017), `redis` (Redis :6379); shared `codecourt-network`; volumes: `mongo-data`, `redis-data`
- [ ] 2.1.2 Write `docker-compose.prod.yml` — override for production image tags and resource limits
- [ ] 2.1.3 Update all service `.env.example` files to use docker-compose service hostnames (`mongo`, `redis`, `api`)
- [ ] 2.1.4 Verify full stack boots with `docker-compose up` and all health checks pass — **P2**

### 2.2 Judge Integration in Compose — P2

- [ ] 2.2.1 Mount Docker socket into `api` container so `submission.worker.js` can spawn Judge containers from within compose
- [ ] 2.2.2 Test end-to-end submission flow: submit → queue → judge container → verdict → Socket.io event

---

## Phase 3: Dockerfiles + GHCR Push

### 3.1 Production Dockerfiles — P2 + P4

- [ ] 3.1.1 Write `backend/docker/Dockerfile` — multi-stage: build (npm ci) → production (node:20-alpine, non-root user) — **P2**
- [ ] 3.1.2 Write `ai-service/Dockerfile` — multi-stage: python:3.11-slim, non-root user, `pip install --no-cache-dir` — **P4**
- [ ] 3.1.3 Verify `docker/judges/cpp/Dockerfile` and `docker/judges/python/Dockerfile` build cleanly — **P2**
- [ ] 3.1.4 Add `.dockerignore` files for backend and ai-service — **P4**

### 3.2 GitHub Actions CI/CD — P4

- [ ] 3.2.1 Write `.github/workflows/ci.yml` — trigger on PR: checkout, setup Node 20 + cache, `npm ci && npm run lint && npm test` for backend; setup Python 3.11 + cache, `pytest` for ai-service
- [ ] 3.2.2 Write `.github/workflows/deploy.yml` — trigger on push to `main`: run CI steps, docker login GHCR, build + push 4 images with SHA tag, `kubectl apply -f backend/k8s/`
- [ ] 3.2.3 Add GitHub Actions secrets: `GHCR_TOKEN`, `KUBECONFIG_OKE`, `GROQ_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- [ ] 3.2.4 Test CI pipeline on a feature branch PR — **P4**

---

## Phase 4: Kubernetes + Terraform + Production Deploy

### 4.1 Kubernetes Manifests — P2

- [ ] 4.1.1 Write `backend/k8s/namespace.yaml` — `codecourt` namespace
- [ ] 4.1.2 Write `backend/k8s/configmap.yaml` — non-secret env vars (PORT, REDIS_URL, AI_SERVICE_URL, FRONTEND_URL)
- [ ] 4.1.3 Write `backend/k8s/secrets.example.yaml` — template for secrets (MONGODB_URI, JWT secrets, AWS keys, GROQ key)
- [ ] 4.1.4 Write `backend/k8s/api-deployment.yaml` — Deployment (2 replicas) + ClusterIP Service for Express API
- [ ] 4.1.5 Write `backend/k8s/redis-deployment.yaml` — Deployment (1 replica) + ClusterIP Service for Redis
- [ ] 4.1.6 Write `backend/k8s/judge-job-template.yaml` — K8s Job template for Judge execution (resource limits: 1 CPU, memory per problem config)
- [ ] 4.1.7 Update `jobs/k8s.spawner.js` — replace `docker run` with `kubectl create job` using judge-job-template, collect logs for verdict
- [ ] 4.1.8 Write `backend/k8s/ingress.yaml` — NGINX Ingress routing `/api` and `/socket.io` to api Service

### 4.2 Terraform Infrastructure — P1

- [ ] 4.2.1 Write `terraform/modules/s3/main.tf` — S3 bucket with versioning enabled, public access blocked, output bucket name
- [ ] 4.2.2 Write `terraform/modules/atlas/main.tf` — MongoDB Atlas M10 cluster, IP allowlist, output connection string
- [ ] 4.2.3 Write `terraform/modules/oke/main.tf` — Oracle Cloud OKE cluster, 2 worker nodes (VM.Standard.E4.Flex), output kubeconfig path
- [ ] 4.2.4 Write `terraform/main.tf` — compose all three modules, `terraform/variables.tf`, `terraform/outputs.tf`, `terraform/terraform.tfvars.example`
- [ ] 4.2.5 Validate `terraform init && terraform plan` runs without errors against real credentials
- [ ] 4.2.6 Apply Terraform to provision production infrastructure: `terraform apply`

### 4.3 Production Deploy & Smoke Test — All

- [ ] 4.3.1 Push all Docker images to GHCR via deploy.yml pipeline — **P4**
- [ ] 4.3.2 Apply K8s manifests to OKE cluster: `kubectl apply -f backend/k8s/` — **P2**
- [ ] 4.3.3 Verify all pods are Running: `kubectl get pods -n codecourt` — **P2**
- [ ] 4.3.4 Run smoke tests: register user, login, create problem, submit code, check verdict, request hint — **All**
- [ ] 4.3.5 Verify Socket.io real-time verdict and leaderboard updates work in production — **P3**
- [ ] 4.3.6 Verify Swagger UI accessible at production `/api-docs` — **P1**
- [ ] 4.3.7 Final PROJECT_STATUS.md generation and push — **P4**
