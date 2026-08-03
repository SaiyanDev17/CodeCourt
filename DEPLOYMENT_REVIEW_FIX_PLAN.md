# Deployment Review Fix Plan

Date: August 2, 2026

Purpose: Track the deployment issues found after moving CodeCourt to AWS, especially the code submission failure:

```text
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

This file is intentionally implementation-oriented. Each item includes impact, root cause, recommended fix, and concrete tasks.

---

## Priority 0: Code Submissions Fail Because Judge Cannot Reach Docker

### Symptom

When submitting code, the verdict becomes `Compilation Error`, and the compiler/console message shows:

```text
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

### User-Facing Impact

- C++ submissions do not compile.
- Python submissions also fail when execution reaches the Docker-based runner.
- Correct user code can be marked as `CE`.
- The UI may remain in a judging-looking state or show confusing failure details.

### Relevant Files

- `backend/src/jobs/submission.worker.js`
- `backend/k8s/api-deployment.yaml`
- `backend/src/modules/submissions/*`
- `frontend/hooks/useSubmission.ts`
- `frontend/app/problems/[slug]/ProblemClient.tsx`

### Root Cause

The judge worker runs Docker commands directly:

```js
spawn('docker', ['run', ...])
```

The Kubernetes deployment tries to mount the host Docker socket:

```yaml
volumeMounts:
  - name: docker-socket
    mountPath: /var/run/docker.sock
volumes:
  - name: docker-socket
    hostPath:
      path: /var/run/docker.sock
```

On EKS, managed nodes normally use `containerd`, not Docker Engine. That means `/var/run/docker.sock` is usually missing or not backed by a running Docker daemon. Running the pod as root does not fix this if Docker Engine is not present on the node.

### Recommended Fix

Replace "Docker inside API pod" with a separate judge execution path.

Recommended production architecture:

1. API receives a submission and writes it to MongoDB/BullMQ.
2. A dedicated judge worker consumes the queue.
3. For each submission, the judge worker creates a short-lived Kubernetes Job or Pod.
4. The execution pod uses the relevant judge image:
   - `codecourt-judge:cpp`
   - `codecourt-judge:python`
5. The execution pod runs with locked-down security settings.
6. The worker collects output and updates the submission verdict.

This avoids requiring a Docker daemon inside the API container.

### Implementation Tasks

- [ ] Split the current submission worker away from the API deployment if it currently runs in the same image/process.
- [ ] Create a dedicated Kubernetes service account for the judge worker.
- [ ] Grant the worker minimum RBAC permissions to create/read/delete Jobs and Pods only in the `codecourt` namespace.
- [ ] Replace direct `spawn('docker', ...)` calls in `backend/src/jobs/submission.worker.js` with Kubernetes Job creation.
- [ ] Add a Kubernetes client dependency or use the official Kubernetes API from Node.
- [ ] Store submitted code and test input in one of these ways:
  - [ ] ConfigMap/Secret for small demo payloads.
  - [ ] S3 object per submission for production-sized payloads.
  - [ ] Mounted temporary volume for worker-managed execution.
- [ ] Make each execution Job run with:
  - [ ] `restartPolicy: Never`
  - [ ] `activeDeadlineSeconds` based on problem time limit plus grace period
  - [ ] CPU and memory limits
  - [ ] `runAsNonRoot: true`
  - [ ] `allowPrivilegeEscalation: false`
  - [ ] `readOnlyRootFilesystem: true` where possible
  - [ ] no hostPath mounts
  - [ ] no privileged mode
- [ ] Stream or fetch pod logs after Job completion.
- [ ] Map execution result to existing verdicts: `AC`, `WA`, `TLE`, `MLE`, `RE`, `CE`.
- [ ] Ensure failed infrastructure execution is not reported as user compilation error. Use a separate internal error message or `RE` with clear system text.
- [ ] Add cleanup logic for completed/failed Jobs and temporary S3 objects.
- [ ] Add tests around verdict mapping and worker failure handling.

### Short-Term Demo Fix

If the goal is only to make the current deployment demo work quickly:

- [ ] Run judge workers on a dedicated EC2 instance with Docker Engine installed.
- [ ] Point BullMQ worker to the same Redis/MongoDB/S3 services.
- [ ] Do not run untrusted code on the public API pod.
- [ ] Keep the EKS API deployment free of `/var/run/docker.sock`.

Avoid treating Docker socket mounting in the API pod as the final fix. It is fragile on EKS and creates a major security boundary problem.

### Acceptance Criteria

- [ ] Submitting valid C++ code returns a non-`CE` verdict.
- [ ] Submitting valid Python code returns a non-`CE` verdict.
- [ ] Submitting invalid C++ code returns real compiler output.
- [ ] Submitting code with an infinite loop returns `TLE`.
- [ ] A failed judge infrastructure call is logged internally and shown clearly, not as fake compiler output.
- [ ] API pod no longer mounts `/var/run/docker.sock`.

---

## Priority 1: CORS Allows Every Origin

### Symptom

The backend CORS callback accepts all origins:

```js
if (...) {
  callback(null, true);
} else {
  callback(null, true);
}
```

### User-Facing Impact

This probably does not break normal app usage. It is a security issue.

Because `credentials: true` is enabled, any website can attempt credentialed requests to the API from a user's browser. Auth protections still matter, but the browser-origin boundary is weakened.

### Relevant Files

- `backend/src/app.js`
- `backend/k8s/configmap.yaml`

### Recommended Fix

Use an explicit allowlist.

### Implementation Tasks

- [ ] Add `CORS_ORIGINS` env var, comma-separated.
- [ ] Include only expected origins:
  - [ ] local dev frontend: `http://localhost:3000`
  - [ ] production CloudFront URL
  - [ ] any custom domain added later
- [ ] Replace broad `origin.includes('cloudfront.net')` with exact matches.
- [ ] Reject unknown origins with a CORS error.
- [ ] Add tests for allowed and rejected origins.

### Acceptance Criteria

- [ ] Production frontend can call the API.
- [ ] Local frontend can call the API in development.
- [ ] Random origins are rejected.
- [ ] Credentialed requests still work for the real frontend.

---

## Priority 1: Static Export Only Builds Demo Dynamic Routes

### Symptom

`next build` with `output: 'export'` generated only:

```text
/problems/two-sum
/problems/demo
/contests/demo
/contests/demo/leaderboard
/profile/demo
/submissions/demo
```

### User-Facing Impact

Direct navigation or refresh can fail for real dynamic pages:

- `/problems/<real-slug>`
- `/contests/<real-id>`
- `/contests/<real-id>/leaderboard`
- `/profile/<real-username>`
- `/submissions/<real-id>`

Client-side navigation may appear to work in some cases, but S3 static hosting cannot serve arbitrary dynamic routes unless those pages are generated or a fallback is configured correctly.

### Relevant Files

- `frontend/next.config.js`
- `frontend/app/problems/[slug]/page.tsx`
- `frontend/app/contests/[id]/page.tsx`
- `frontend/app/contests/[id]/leaderboard/page.tsx`
- `frontend/app/profile/[username]/page.tsx`
- `frontend/app/submissions/[id]/page.tsx`
- `terraform/modules/cloudfront/main.tf`

### Recommended Fix Options

Option A: Keep static export and generate all known public routes at build time.

Use this only if the data set is small and known before deploy.

Option B: Stop using static export for dynamic authenticated pages.

Deploy frontend to a runtime that supports Next.js dynamic routes, such as Vercel, ECS, Lambda, or a Next.js server container.

Option C: Keep S3/CloudFront for marketing/static pages and move dynamic app pages behind a runtime frontend.

This is usually the cleanest production architecture.

### Implementation Tasks

- [ ] Decide whether CodeCourt should be a fully static frontend or a dynamic Next.js app.
- [ ] If keeping static export:
  - [ ] Fetch all problem slugs during build.
  - [ ] Fetch all public contest IDs during build.
  - [ ] Avoid statically exporting private submission detail pages.
  - [ ] Configure CloudFront custom error fallback carefully.
- [ ] If moving to runtime frontend:
  - [ ] Remove `output: 'export'`.
  - [ ] Deploy frontend as a Next.js server.
  - [ ] Keep CloudFront in front of the frontend runtime.
  - [ ] Keep S3 only for static assets if desired.
- [ ] Add a deployment smoke test for direct URL refresh on:
  - [ ] real problem page
  - [ ] real submission page
  - [ ] real profile page

### Acceptance Criteria

- [ ] Directly opening a real problem URL works.
- [ ] Refreshing a real problem URL works.
- [ ] Directly opening a real submission URL works for an authenticated owner.
- [ ] Unknown routes return a correct 404 or app fallback, not a broken S3 object response.

---

## Priority 2: AI Hint Button Shows `NaN/3`

### Symptom

The deployed UI shows:

```text
Get AI Hint (NaN/3)
```

### User-Facing Impact

- AI hint quota appears broken.
- Users may think hints are unavailable or incorrectly counted.
- This is separate from the Docker submission failure.

### Relevant Files

- `frontend/app/problems/[slug]/ProblemClient.tsx`
- `backend/src/modules/agent/controller.js`
- `ai-service/app/main.py`

### Current Observation

The local `ProblemClient.tsx` has a guard in the button label:

```tsx
typeof hintsRemaining === 'number' && !isNaN(hintsRemaining) ? hintsRemaining : 3
```

If production still shows `NaN/3`, likely causes are:

- the latest frontend build was not uploaded to S3/CloudFront
- CloudFront is serving a cached older JS bundle
- another code path still computes `3 - undefined`
- backend returns unexpected hint count fields

### Implementation Tasks

- [ ] Extract a helper:
  - `getSafeHintsRemaining(value): number`
- [ ] Use the helper everywhere hints are displayed or compared.
- [ ] Make backend response always include numeric:
  - `hints_used`
  - `hints_remaining`
- [ ] Add frontend tests for missing, null, string, and `NaN` values.
- [ ] Rebuild frontend.
- [ ] Upload the new `frontend/out` build to S3.
- [ ] Invalidate CloudFront cache.

### Acceptance Criteria

- [ ] Button never shows `NaN/3`.
- [ ] Logged-out users see a clear login-related hint state.
- [ ] Users with 0 hints see `No hints remaining`.
- [ ] Users with hints remaining see `Get AI Hint (N/3)`.

---

## Priority 2: Terraform Lambda Module Deploys Dummy Code Unless Image URI Is Passed

### Symptom

The Lambda module falls back to a dummy zip:

```py
def handler(event, context):
    return {'statusCode': 200, 'body': 'CodeCourt Lambda Initialized'}
```

The root module does not pass `image_uri`.

### User-Facing Impact

If infrastructure is recreated from Terraform as written, the AI hint endpoint may deploy a placeholder instead of the real FastAPI/Mangum service.

### Relevant Files

- `terraform/main.tf`
- `terraform/modules/lambda/main.tf`
- `terraform/modules/lambda/variables.tf`
- `ai-service/app/main.py`
- `ai-service/requirements.txt`

### Recommended Fix

Make Lambda deployment explicit. Do not silently deploy dummy code for production.

### Implementation Tasks

- [ ] Add root variable `ai_service_image_uri`.
- [ ] Pass `image_uri = var.ai_service_image_uri` into `module "lambda"`.
- [ ] Remove dummy fallback for production or guard it behind a `allow_dummy_lambda` variable defaulting to `false`.
- [ ] Add required Lambda environment variables:
  - [ ] LLM provider/API key reference
  - [ ] allowed origins if needed
  - [ ] runtime environment
- [ ] Build and push the real AI service image.
- [ ] Run Terraform apply with the real image URI.

### Acceptance Criteria

- [ ] Terraform plan shows Lambda using the real AI image.
- [ ] `/health` returns the FastAPI health response.
- [ ] `/hint` returns a valid hint through the deployed API Gateway endpoint.

---

## Priority 3: `.gitignore` Contains Embedded NUL Characters

### Symptom

Git reports `.gitignore` as a binary diff. The file contains embedded NUL characters around:

```text
g h c r   t o k e n . t x t 
```

### User-Facing Impact

No runtime impact, but it can break or confuse ignore behavior, diffs, reviews, and merge conflict handling.

### Relevant Files

- `.gitignore`

### Implementation Tasks

- [ ] Rewrite `.gitignore` as plain UTF-8 text.
- [ ] Keep intended sensitive-file ignores:
  - [ ] `ghcr token.txt`
  - [ ] `*.token.txt`
  - [ ] `*token*.txt`
  - [ ] `backend/k8s/secrets.yaml`
- [ ] Confirm `git diff -- .gitignore` is text, not binary.
- [ ] Remove any accidentally tracked token files if they are not supposed to be committed.

### Acceptance Criteria

- [ ] `git diff -- .gitignore` shows a normal text diff.
- [ ] Token and secret files are ignored.

---

## Priority 3: Deployment Documentation Encoding Is Corrupted

### Symptom

`DEPLOYMENT_PROGRESS.md` and `walkthrough final.md` show mojibake such as:

```text
ðŸš€
â€” 
â”Œ
```

### User-Facing Impact

No runtime impact. It makes documentation harder to read and less professional for handoff/resume material.

### Relevant Files

- `DEPLOYMENT_PROGRESS.md`
- `walkthrough final.md`

### Implementation Tasks

- [ ] Re-save the documents as UTF-8.
- [ ] Replace corrupted emoji/box drawing characters or convert diagrams to ASCII.
- [ ] Remove duplicated content if both files are meant to hold the same report.
- [ ] Keep live endpoints, but avoid committing secrets or short-lived operational values.

### Acceptance Criteria

- [ ] Markdown renders cleanly.
- [ ] No mojibake remains.
- [ ] Deployment status is accurate and not overstated.

---

## Suggested Work Order

1. Fix judge execution architecture or apply the short-term dedicated Docker worker demo fix.
2. Fix AI hint `NaN/3` display and redeploy frontend with CloudFront invalidation.
3. Tighten CORS allowlist.
4. Decide static export versus runtime Next.js deployment.
5. Fix Terraform Lambda to deploy the real AI service.
6. Clean `.gitignore` and deployment documentation encoding.

---

## Verification Checklist

Run these after fixes:

```powershell
terraform -chdir=terraform validate
```

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

From `frontend/`:

```powershell
npm.cmd run build
```

Manual production checks:

- [ ] Open frontend CloudFront URL.
- [ ] Open `/problems/two-sum/`.
- [ ] Submit valid C++ code.
- [ ] Submit valid Python code.
- [ ] Submit invalid C++ code and confirm real compiler error appears.
- [ ] Request AI hint and verify counter.
- [ ] Refresh a real dynamic route.
- [ ] Call API from an unapproved origin and confirm CORS blocks it.
