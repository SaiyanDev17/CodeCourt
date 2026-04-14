# GitHub Secrets Setup Guide

## Repository
https://github.com/SaiyanDev17/CodeCourt

## How to Add Secrets

### Quick Link
Go directly to: https://github.com/SaiyanDev17/CodeCourt/settings/secrets/actions

### Manual Navigation
1. Go to your repository
2. Click "Settings" tab
3. Left sidebar → "Secrets and variables" → "Actions"
4. Click "New repository secret"

---

## Required Secrets for Phase 9

### ✅ Already Added (from your .env files)

1. **GROQ_API_KEY**
   - Get from: https://console.groq.com/keys
   - Copy from your `ai-service/.env` file

2. **AWS_ACCESS_KEY_ID**
   - Get from: AWS IAM Console
   - Copy from your `backend/.env` file

3. **AWS_SECRET_ACCESS_KEY**
   - Get from: AWS IAM Console
   - Copy from your `backend/.env` file

4. **MONGODB_URI**
   - Local: `mongodb://localhost:27017/codecourt`
   - Production: Get from MongoDB Atlas connection string
   - Copy from your `backend/.env` file

### ⏳ Still Needed

5. **GHCR_TOKEN** - GitHub Container Registry Token
   
   **How to create:**
   1. Go to: https://github.com/settings/tokens
   2. Click "Generate new token" → "Generate new token (classic)"
   3. Name: `CodeCourt GHCR`
   4. Expiration: Your choice (90 days or No expiration)
   5. Scopes: Check `write:packages` (this includes `read:packages`)
   6. Click "Generate token"
   7. Copy the token (starts with `ghp_`)
   8. Add to repository secrets as `GHCR_TOKEN`

### 🔮 For Later (Phase 10-11)

6. **KUBECONFIG_OKE** - Kubernetes Config (Only needed when deploying to production)
   - This will be set up in Phase 10-11 when you provision Kubernetes cluster
   - Can be skipped for now

---

## Testing After Setup

Once you've added `GHCR_TOKEN`, you can test the CI/CD pipeline:

1. Create a new branch: `git checkout -b test-ci`
2. Make a small change (e.g., update README)
3. Commit and push: `git add . && git commit -m "test: CI pipeline" && git push origin test-ci`
4. Open a Pull Request on GitHub
5. Watch the CI workflow run
6. Merge to main to trigger the deploy workflow

---

## Current Status

- ✅ CI Workflow configured
- ✅ Deploy Workflow configured  
- ✅ 4/6 secrets added
- ⏳ GHCR_TOKEN needed
- 🔮 KUBECONFIG_OKE for later

