# Requirements Document — CodeCourt MVP

## Prerequisites & Setup

Every team member must have the following tools installed before starting development.

### Required Tools

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x LTS | `nvm install 20 && nvm use 20` |
| Python | 3.11.x | `pyenv install 3.11 && pyenv global 3.11` |
| Docker Desktop1 | Latest stable | https://www.docker.com/products/docker-desktop |
| Minikube | Latest stable | `brew install minikube` / https://minikube.sigs.k8s.io/docs/start |
| kubectl | Latest stable | `brew install kubectl` / bundled with Docker Desktop |
| Terraform CLI | 1.7.x | `brew install terraform` / https://developer.hashicorp.com/terraform/install |
| MongoDB Compass | Latest stable | https://www.mongodb.com/try/download/compass |
| Postman | Latest stable | https://www.postman.com/downloads |
| Redis CLI | Bundled with Redis | `brew install redis` (for local CLI access only) |
| Git | 2.x | `brew install git` |

### Phase 1 Local Bootstrap

```bash
# 1. Clone repo
git clone https://github.com/<org>/codecourt.git && cd codecourt

# 2. Start Redis (single Docker command — no compose needed in Phase 1)
docker run -d -p 6379:6379 --name codecourt-redis redis:alpine

# 3. Backend
cd backend && cp .env.example .env
npm install
npm run dev

# 4. AI Service
cd ../ai-service && cp .env.example .env
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 5. Frontend
cd ../frontend && cp .env.example .env
npm install
npm run dev
```

---

## Folder Structure

```
codecourt/
├── backend/                    (Express API)
│   ├── src/
│   │   ├── config/             (db.js, redis.js, s3.js, bullmq.js, constants.js)
│   │   ├── modules/
│   │   │   ├── auth/           (routes, controller, service, model, test)
│   │   │   ├── problems/       (routes, controller, service, model, test)
│   │   │   ├── submissions/    (routes, controller, service, model, test)
│   │   │   ├── contests/       (routes, controller, service, model, test)
│   │   │   ├── users/          (routes, controller, service)
│   │   │   └── agent/          (routes, controller — proxy to FastAPI)
│   │   ├── middleware/         (authGuard, roleGuard, errorHandler, rateLimit, validate)
│   │   ├── jobs/               (submission.queue.js, submission.worker.js, k8s.spawner.js)
│   │   ├── socket/             (index.js, verdict.socket.js, leaderboard.socket.js)
│   │   ├── cron/               (contest.cron.js)
│   │   └── app.js
│   ├── docker/judges/cpp/Dockerfile
│   ├── docker/judges/python/Dockerfile
│   ├── docker/Dockerfile
│   ├── k8s/                    (namespace, api-deployment, redis-deployment, judge-job-template, configmap, secrets.example)
│   ├── swagger/swagger.yaml
│   ├── package.json
│   ├── .env.example
│   └── server.js
│
├── ai-service/                 (FastAPI — Python)
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/hint.py
│   │   ├── agent/
│   │   │   ├── executor.py
│   │   │   ├── tools.py
│   │   │   └── prompts.py
│   │   ├── models/schemas.py
│   │   └── config.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   (Next.js 14)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   ├── problems/page.tsx
│   │   ├── problems/[slug]/page.tsx
│   │   ├── contests/page.tsx
│   │   ├── contests/[id]/page.tsx
│   │   ├── contests/[id]/leaderboard/page.tsx
│   │   └── profile/[username]/page.tsx
│   ├── components/Editor/, Leaderboard/, Problem/, ui/
│   ├── hooks/                  (useSocket, useAuth, useSubmission)
│   ├── lib/                    (api.ts, aiApi.ts, socket.ts)
│   ├── store/auth.store.ts
│   ├── types/index.ts
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── terraform/
│   ├── main.tf, variables.tf, outputs.tf, terraform.tfvars.example
│   └── modules/s3/, atlas/, oke/
│
├── scripts/
│   ├── generate-status.js
│   └── seed.js
│
├── .github/workflows/          (ci.yml, deploy.yml)
├── docker-compose.yml
├── docker-compose.prod.yml
├── PROJECT_STATUS.md           (auto-generated)
├── .env.example
├── .gitignore
└── README.md
```

---

## Glossary

- **System**: The CodeCourt platform as a whole
- **API**: The Express.js backend service running on port 5000
- **AI_Service**: The FastAPI Python service running on port 8000
- **Judge**: The Docker-sandboxed code execution engine
- **Queue**: The BullMQ + Redis submission queue
- **Auth_Service**: The authentication module within the API
- **Problem_Service**: The problem management module within the API
- **Submission_Service**: The submission processing module within the API
- **Contest_Service**: The contest management module within the API
- **Agent**: The LangChain + Groq tool-calling AI hint agent in the AI_Service
- **Leaderboard**: The real-time contest ranking view
- **Contestant**: A registered user with the contestant role
- **Problem_Setter**: A registered user with the problem_setter role
- **Admin**: A registered user with the admin role
- **Access_Token**: A short-lived JWT (15 minutes) used to authenticate API requests
- **Refresh_Token**: A long-lived JWT (7 days) used to obtain new Access_Tokens
- **Verdict**: The result of a Judge execution — one of: AC, WA, TLE, MLE, RE, CE
- **Slug**: A URL-safe unique identifier for a problem
- **ICPC_Score**: A contest score computed as number of problems solved minus 20-minute penalty per wrong attempt
- **Cron**: The node-cron scheduler that transitions contest states
- **Socket_Server**: The Socket.io server embedded in the API

---

## Requirements

### Requirement 1: User Registration and Login

**User Story:** As a visitor, I want to register and log in, so that I can access the platform as a Contestant, Problem_Setter, or Admin.

#### Acceptance Criteria

1. WHEN a visitor submits a registration form with a unique username, valid email, and password of at least 8 characters, THE Auth_Service SHALL create a new user account with the role `contestant` and return a 201 response.
2. IF a visitor submits a registration form with an email that already exists, THEN THE Auth_Service SHALL return a 409 Conflict response with a descriptive error message.
3. WHEN a user submits valid credentials, THE Auth_Service SHALL return an Access_Token (JWT, 15-minute expiry) and set a Refresh_Token (JWT, 7-day expiry) as an HTTP-only cookie.
4. WHEN a user submits invalid credentials, THE Auth_Service SHALL return a 401 Unauthorized response.
5. THE Auth_Service SHALL store passwords as bcrypt hashes with a minimum cost factor of 10.
6. WHEN a user requests a token refresh with a valid Refresh_Token, THE Auth_Service SHALL issue a new Access_Token and rotate the Refresh_Token, invalidating the previous Refresh_Token in Redis within 500ms.
7. IF a Refresh_Token has been invalidated (blacklisted in Redis), THEN THE Auth_Service SHALL return a 401 Unauthorized response and reject the refresh request.
8. WHEN a user logs out, THE Auth_Service SHALL add the current Refresh_Token to the Redis blacklist and clear the HTTP-only cookie.
9. THE Auth_Service SHALL enforce a rate limit of 10 login attempts per IP address per 15-minute window, returning 429 Too Many Requests when exceeded.

#### Property-Based Testing

- FOR ALL valid (username, email, password) triples, registering then logging in SHALL return a valid Access_Token (round-trip property).
- FOR ALL Refresh_Token rotation sequences of length N, each token in the sequence SHALL be usable exactly once (token uniqueness invariant).
- FOR ALL blacklisted Refresh_Tokens, re-submitting the same token SHALL always return 401 (idempotence of blacklist rejection).

---

### Requirement 2: Role-Based Access Control

**User Story:** As a platform operator, I want role-based access control, so that only authorized users can perform privileged actions.

#### Acceptance Criteria

1. THE API SHALL enforce three roles: `admin`, `problem_setter`, and `contestant`.
2. WHEN a request arrives without a valid Access_Token, THE API SHALL return a 401 Unauthorized response.
3. WHEN a Contestant attempts to access an admin-only or problem_setter-only endpoint, THE API SHALL return a 403 Forbidden response.
4. WHEN an Admin promotes a user to `problem_setter`, THE Auth_Service SHALL update the user's role in MongoDB and invalidate any cached user profile in Redis within 1 second.
5. THE API SHALL attach the authenticated user's id, username, and role to every request context after successful token verification.

---

### Requirement 3: Problem CRUD and Admin Approval

**User Story:** As a Problem_Setter, I want to create and manage problems, so that Contestants can solve them in contests and practice.

#### Acceptance Criteria

1. WHEN a Problem_Setter submits a new problem with title, slug, description, constraints, time limit (ms), memory limit (MB), difficulty, and at least one sample test case, THE Problem_Service SHALL persist the problem with status `draft` and return a 201 response.
2. THE Problem_Service SHALL enforce slug uniqueness across all problems, returning a 409 Conflict if a duplicate slug is submitted.
3. WHEN a Problem_Setter uploads hidden test cases as a ZIP file, THE Problem_Service SHALL store the file in AWS S3 under the key `test-cases/{problem_id}/hidden.zip` and record the S3 URL in MongoDB.
4. WHEN an Admin approves a problem, THE Problem_Service SHALL transition the problem status from `draft` to `published` and make it visible in the public problem list.
5. IF a Problem_Setter submits a problem without required fields, THEN THE Problem_Service SHALL return a 422 Unprocessable Entity response listing all missing fields.
6. WHEN an Admin rejects a problem, THE Problem_Service SHALL transition the problem status to `rejected` and record a rejection reason.
7. WHEN a published problem list is requested, THE Problem_Service SHALL return results from the Redis cache if the cache entry is valid, otherwise query MongoDB and populate the cache with a TTL of 60 seconds.
8. WHEN a Problem_Setter updates a published problem's test cases, THE Problem_Service SHALL transition the problem status back to `draft` and invalidate the Redis problem list cache.

---

### Requirement 4: Code Submission and Judge Engine

**User Story:** As a Contestant, I want to submit code and receive a verdict, so that I know whether my solution is correct.

#### Acceptance Criteria

1. WHEN a Contestant submits code in C++ or Python for a published problem, THE Submission_Service SHALL enqueue the submission in the BullMQ Queue and return a 202 Accepted response with a submission ID.
2. THE Queue SHALL process submissions in FIFO order with a concurrency limit of 5 simultaneous Judge executions.
3. WHEN the Queue processes a submission, THE Judge SHALL execute the code inside a Docker container with the network disabled, CPU limited to 1 core, and memory limited to the problem's memory limit (MB).
4. WHEN the Judge executes a submission, THE Judge SHALL compare the program's stdout against the expected output for every hidden test case using exact-match comparison after stripping trailing whitespace.
5. WHEN all test cases pass, THE Judge SHALL assign the verdict `AC` (Accepted).
6. WHEN any test case produces incorrect output, THE Judge SHALL assign the verdict `WA` (Wrong Answer) and stop execution on the first failing test case.
7. WHEN the program exceeds the problem's time limit, THE Judge SHALL assign the verdict `TLE` (Time Limit Exceeded) and terminate the container.
8. WHEN the program exceeds the problem's memory limit, THE Judge SHALL assign the verdict `MLE` (Memory Limit Exceeded) and terminate the container.
9. WHEN the program exits with a non-zero exit code, THE Judge SHALL assign the verdict `RE` (Runtime Error).
10. WHEN the code fails to compile (C++ only), THE Judge SHALL assign the verdict `CE` (Compilation Error) and include the compiler error message in the submission record.
11. WHEN a verdict is determined, THE Submission_Service SHALL persist the verdict, execution time (ms), and memory used (MB) to MongoDB and emit a `verdict` event via the Socket_Server to the submitting user's room.
12. THE Judge SHALL terminate any container that has been running for more than the problem's time limit plus a 2-second grace period.

#### Property-Based Testing

- FOR ALL submissions with syntactically valid code, THE Judge SHALL always return exactly one of: AC, WA, TLE, MLE, RE, CE (verdict completeness invariant).
- FOR ALL identical code submissions against the same problem, THE Judge SHALL return the same verdict (determinism property).
- FOR ALL CE submissions, THE Judge SHALL return a non-empty compiler error message (error completeness property).

---

### Requirement 5: Contest Engine

**User Story:** As an Admin or Problem_Setter, I want to create and manage contests, so that Contestants can compete in timed programming competitions.

#### Acceptance Criteria

1. WHEN an Admin or Problem_Setter creates a contest with a title, start time, end time, and a list of problem IDs, THE Contest_Service SHALL persist the contest with status `upcoming` and return a 201 response.
2. THE Contest_Service SHALL reject contest creation if the end time is not at least 30 minutes after the start time, returning a 422 response.
3. WHEN the current time reaches a contest's start time, THE Cron SHALL transition the contest status from `upcoming` to `ongoing`.
4. WHEN the current time reaches a contest's end time, THE Cron SHALL transition the contest status from `ongoing` to `ended`.
5. WHEN a Contestant registers for an `upcoming` or `ongoing` contest, THE Contest_Service SHALL add the Contestant to the contest's participant list and return a 200 response.
6. WHEN a registered Contestant submits code during an `ongoing` contest, THE Contest_Service SHALL record the submission against the contest and compute the ICPC_Score.
7. THE Contest_Service SHALL compute ICPC_Score as: (number of problems with AC verdict) × 100 minus (20 × number of WA submissions before first AC per problem) minus (minutes elapsed from contest start to first AC per problem).
8. WHEN a Contestant achieves AC on a problem they have already solved in the same contest, THE Contest_Service SHALL ignore the duplicate AC and not update the score.
9. WHEN a contest transitions to `ended`, THE Contest_Service SHALL freeze the final Leaderboard and persist the final rankings to MongoDB.
10. WHILE a contest is `ongoing`, THE Contest_Service SHALL return Leaderboard data from the Redis cache if valid, otherwise recompute from MongoDB and cache with a TTL of 10 seconds.

---

### Requirement 6: Real-Time Verdict and Leaderboard via Socket.io

**User Story:** As a Contestant, I want to see my verdict and the leaderboard update in real time, so that I have immediate feedback during a contest.

#### Acceptance Criteria

1. WHEN a Contestant connects to the Socket_Server with a valid Access_Token, THE Socket_Server SHALL authenticate the connection and join the user to a personal room identified by the user's ID.
2. WHEN a verdict is ready, THE Socket_Server SHALL emit a `verdict` event to the submitting user's personal room containing the submission ID, verdict, execution time, and memory used.
3. WHEN a Contestant joins a contest page, THE Socket_Server SHALL join the user to a contest room identified by the contest ID.
4. WHEN a submission verdict changes the Leaderboard ranking, THE Socket_Server SHALL emit a `leaderboard:update` event to the contest room with the updated top-50 rankings within 2 seconds of the verdict being recorded.
5. IF a Socket_Server connection drops, THEN THE Socket_Server SHALL allow the client to reconnect and rejoin rooms within 30 seconds without losing room membership state.

---

### Requirement 7: AI Hint Agent

**User Story:** As a Contestant, I want to request AI-generated hints for a problem, so that I can get guidance without seeing a full solution.

#### Acceptance Criteria

1. WHEN a Contestant requests a hint for a problem, THE Agent SHALL invoke the `get_hint_count` tool to retrieve the number of hints already given for that (user, problem) pair.
2. IF the hint count for a (user, problem) pair is 3 or more, THEN THE Agent SHALL return a 403 response with the message "Maximum hints reached for this problem" without invoking any further tools.
3. WHEN the hint count is below 3, THE Agent SHALL invoke `get_submission_history` and `get_problem_metadata` tools to gather context before generating a hint.
4. WHEN the Agent generates a hint, THE Agent SHALL invoke the `save_hint` tool to persist the hint and increment the hint count for the (user, problem) pair.
5. THE Agent SHALL generate hints that guide the Contestant toward the solution without revealing the complete algorithm or code.
6. THE Agent SHALL use the Groq API (Llama 3.3 70B model) as the underlying LLM for hint generation.
7. WHEN the Groq API returns an error, THE AI_Service SHALL return a 502 Bad Gateway response with a descriptive error message.
8. THE AI_Service SHALL expose a `POST /hint` endpoint that accepts `{ user_id, problem_id, problem_slug }` and returns `{ hint: string, hints_used: number }`.

#### Property-Based Testing

- FOR ALL (user, problem) pairs, the hint count SHALL never exceed 3 after any sequence of hint requests (hint count ceiling invariant).
- FOR ALL hint requests where hint count is already 3, THE Agent SHALL always return 403 without calling `save_hint` (guard invariant).

---

### Requirement 8: Redis Caching

**User Story:** As a platform operator, I want Redis caching on hot data, so that the API can handle concurrent users without overloading MongoDB.

#### Acceptance Criteria

1. THE API SHALL cache the published problem list in Redis with the key `problems:list` and a TTL of 60 seconds.
2. THE API SHALL cache individual user profiles in Redis with the key `user:profile:{user_id}` and a TTL of 300 seconds.
3. THE API SHALL cache contest leaderboards in Redis with the key `leaderboard:{contest_id}` and a TTL of 10 seconds.
4. WHEN a cached resource is updated (problem approved, user role changed, new AC submission), THE API SHALL invalidate the corresponding Redis cache key within 1 second of the update.
5. IF Redis is unavailable, THEN THE API SHALL fall back to querying MongoDB directly and log a warning, without returning an error to the client.

---

### Requirement 9: Frontend — Next.js 14

**User Story:** As a Contestant, I want a responsive web interface, so that I can browse problems, submit code, and participate in contests from a browser.

#### Acceptance Criteria

1. THE Frontend SHALL provide pages for: login, register, problem list, problem detail (with Monaco Editor), contest list, contest detail, contest leaderboard, and user profile.
2. WHEN a user logs in successfully, THE Frontend SHALL store the Access_Token in memory (Zustand store) and handle token refresh transparently using the HTTP-only Refresh_Token cookie.
3. WHEN a Contestant submits code from the Monaco Editor, THE Frontend SHALL display a "Judging..." state and update to the final verdict when the `verdict` Socket.io event is received.
4. WHEN the `leaderboard:update` Socket.io event is received, THE Frontend SHALL re-render the Leaderboard component with the updated rankings without a full page reload.
5. THE Frontend SHALL enforce CORS by sending API requests to `http://localhost:5000` (Express) and AI requests to `http://localhost:8000` (FastAPI) during local development.
6. WHEN a user is not authenticated and attempts to access a protected page, THE Frontend SHALL redirect to `/login`.

---

### Requirement 10: Swagger API Documentation

**User Story:** As a developer, I want Swagger documentation, so that I can explore and test all API endpoints without reading source code.

#### Acceptance Criteria

1. THE API SHALL serve a Swagger UI at `GET /api-docs` using the `swagger.yaml` definition file.
2. THE swagger.yaml SHALL document all endpoints across auth, problems, submissions, contests, users, and agent modules.
3. THE swagger.yaml SHALL include request body schemas, response schemas, and authentication requirements for every endpoint.

---

### Requirement 11: Terraform Infrastructure

**User Story:** As the infrastructure owner, I want Terraform modules for AWS S3, MongoDB Atlas, and Oracle Cloud Kubernetes, so that the production environment can be provisioned reproducibly.

#### Acceptance Criteria

1. THE Terraform configuration SHALL provision an AWS S3 bucket for test case storage with versioning enabled and public access blocked.
2. THE Terraform configuration SHALL provision a MongoDB Atlas cluster (M10 or higher) with network peering or IP allowlist configured.
3. THE Terraform configuration SHALL provision an Oracle Cloud Kubernetes Engine (OKE) cluster with at least 2 worker nodes.
4. THE Terraform configuration SHALL use separate modules for `s3`, `atlas`, and `oke` under `terraform/modules/`.
5. THE Terraform configuration SHALL output the S3 bucket name, MongoDB Atlas connection string, and OKE kubeconfig path.
6. IF a `terraform.tfvars` file is absent, THEN the Terraform configuration SHALL fail with a descriptive error listing all required variables.

---

### Requirement 12: GitHub Actions CI/CD

**User Story:** As a developer, I want automated CI/CD, so that every push is linted, tested, built, and deployed without manual steps.

#### Acceptance Criteria

1. WHEN a pull request is opened or updated, THE CI pipeline SHALL run lint and unit tests for the backend and AI service.
2. WHEN a push is made to the `main` branch, THE CI pipeline SHALL build Docker images for the API, AI_Service, and Judge containers and push them to GitHub Container Registry (GHCR).
3. WHEN Docker images are pushed to GHCR, THE deploy pipeline SHALL apply the Kubernetes manifests to the OKE cluster using `kubectl apply`.
4. IF any CI step fails (lint, test, or build), THEN THE CI pipeline SHALL stop and mark the pipeline as failed without proceeding to the next step.
5. THE CI pipeline SHALL cache Node.js and Python dependencies between runs to reduce build time.

---

### Requirement 13: PROJECT_STATUS.md Auto-Generation

**User Story:** As a team member, I want PROJECT_STATUS.md auto-generated on every push, so that the repo always reflects the current implementation state.

#### Acceptance Criteria

1. THE System SHALL include a `scripts/generate-status.js` script that reads the task list and outputs a `PROJECT_STATUS.md` file summarizing completed, in-progress, and pending tasks.
2. WHEN a developer runs `git push`, THE pre-push git hook SHALL execute `scripts/generate-status.js` and stage the updated `PROJECT_STATUS.md` before the push completes.
3. THE generated PROJECT_STATUS.md SHALL include: overall completion percentage, per-phase status, and per-team-member task counts.

---

### Requirement 14: CORS Configuration

**User Story:** As a developer, I want correct CORS configuration, so that the frontend and services can communicate without browser security errors.

#### Acceptance Criteria

1. THE API SHALL allow CORS requests from `http://localhost:3000` (Frontend) during local development.
2. THE AI_Service SHALL allow CORS requests from `http://localhost:3000` (Frontend) during local development.
3. THE API SHALL allow internal requests from the AI_Service without CORS headers (same-network communication).
4. THE AI_Service SHALL allow internal requests from the API without CORS headers (same-network communication).
5. WHEN deployed to production, THE API SHALL restrict CORS to the production frontend domain only.
