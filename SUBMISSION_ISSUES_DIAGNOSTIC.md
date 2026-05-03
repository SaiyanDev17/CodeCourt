# Submission Issues Diagnostic Guide

## Issues Reported

1. **Submit button stuck on "Judging"** - Verdict never arrives
2. **Can't click on submissions** - No way to view submission details
3. **Can't see test cases, code, or compiler messages** - Missing features

## Root Causes

### Issue 1: Submit Button Stuck on "Judging"

**Possible Causes:**

1. **Socket.io not connected**
   - Check browser console for Socket.io connection logs
   - Look for: `[useSubmission] Connecting to Socket.io...`
   - Look for: `[useSubmission] Received verdict event:`

2. **Worker not processing submissions**
   - Check backend logs for BullMQ worker activity
   - Look for: `Processing submission job`
   - Look for: `Verdict emitted via Socket.io`

3. **Judge containers not running**
   - Check if judge Docker images are built
   - Check if containers are spawning correctly
   - Look for Docker errors in backend logs

4. **Polling fallback not working**
   - Check if polling starts after Socket.io fails
   - Look for: `[useSubmission] Socket.io disconnected, starting polling fallback`
   - Look for: `[useSubmission] Polling attempt X/30`

**How to Diagnose:**

```bash
# 1. Check browser console (F12)
# Look for Socket.io connection and verdict events

# 2. Check backend logs
docker-compose logs -f backend

# 3. Check if worker is running
docker-compose ps

# 4. Check Redis connection
docker-compose logs -f redis

# 5. Check if judge images exist
docker images | grep judge
```

**Quick Fixes:**

1. **Restart all services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Check if judges are built:**
   ```bash
   cd backend/docker/judges
   ./build-judges.ps1  # or build-judges.sh on Linux/Mac
   ```

3. **Check Socket.io connection:**
   - Open browser console (F12)
   - Look for WebSocket connection in Network tab
   - Should see `ws://localhost:5000/socket.io/...`

4. **Manually check submission status:**
   - Get submission ID from network tab (POST /api/submissions response)
   - Call GET /api/submissions/:id manually
   - Check if verdict is still PENDING

### Issue 2: Can't Click on Submissions

**Root Cause:** Submission detail page doesn't exist yet.

The current implementation has a TODO comment in `SubmissionHistory.tsx`:

```tsx
onClick={() => {
  // TODO: Navigate to submission detail view
  // For now, just log the submission ID
  console.log('Clicked submission:', submission._id)
}}
```

**What's Missing:**

1. **Submission detail page** at `/submissions/[id]/page.tsx`
2. **API endpoint** to fetch full submission with code: `GET /api/submissions/:id`
3. **UI to display:**
   - Submitted code
   - Test case results (which tests passed/failed)
   - Compiler error messages
   - Execution metrics

**Workaround:**

For now, you can view submission details via API:

```bash
# Get submission ID from the UI (check browser console when clicking)
# Then call the API directly:
curl http://localhost:5000/api/submissions/<SUBMISSION_ID> \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### Issue 3: Can't See Test Cases, Code, or Compiler Messages

**Root Cause:** These features are partially implemented but not fully wired up.

**What Works:**
- ✅ Compiler errors are shown in `SubmissionResult` component
- ✅ Execution time and memory are displayed
- ✅ Overall verdict (AC, WA, TLE, etc.) is shown

**What's Missing:**
- ❌ Individual test case results (which tests passed/failed)
- ❌ Submitted code display
- ❌ Test case inputs/outputs
- ❌ Detailed error messages per test case

**Why Test Cases Aren't Shown:**

The `SubmissionResult` component expects a `testCases` array:

```tsx
<SubmissionResult
  verdict={verdict}
  testCases={[]}  // ← Empty array! No test case data
  executionTime={executionTime}
  memoryUsed={memoryUsed}
  compilerError={compilerError}
/>
```

But the backend doesn't currently return test case results in the verdict event.

## Immediate Actions

### 1. Fix "Judging" Stuck Issue

**Step 1: Check if services are running**

```bash
docker-compose ps
```

Expected output:
```
NAME                COMMAND                  SERVICE             STATUS
backend             "docker-entrypoint.s…"   backend             Up
frontend            "docker-entrypoint.s…"   frontend            Up
mongodb             "docker-entrypoint.s…"   mongodb             Up
redis               "docker-entrypoint.s…"   redis               Up
```

**Step 2: Check backend logs for errors**

```bash
docker-compose logs -f backend | grep -i error
```

**Step 3: Check if Socket.io is working**

Open browser console (F12) and look for:
```
[useSubmission] Connecting to Socket.io...
[useSubmission] Registering verdict event listener
```

If you see connection errors, Socket.io is not working.

**Step 4: Try submitting again and watch logs**

```bash
# Terminal 1: Watch backend logs
docker-compose logs -f backend

# Terminal 2: Watch worker logs (if separate)
docker-compose logs -f backend | grep -i "worker\|submission\|verdict"

# Browser: Submit code and watch console
```

**Step 5: If Socket.io fails, polling should start**

After 2-3 seconds, you should see in browser console:
```
[useSubmission] Socket.io disconnected, starting polling fallback
[useSubmission] Polling attempt 1/30
[useSubmission] Polling attempt 2/30
...
```

If polling doesn't start, there's a bug in the polling logic.

### 2. Add Submission Detail Page (Quick Fix)

Create a basic submission detail page:

**File: `frontend/app/submissions/[id]/page.tsx`**

```tsx
'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { VerdictBadge } from '@/components/Submission/VerdictBadge'
import type { Submission } from '@/types'

export default function SubmissionDetailPage() {
  const params = useParams()
  const id = params.id as string
  
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/submissions/${id}`)
        setSubmission(response.data.submission || response.data)
      } catch (err: any) {
        console.error('Failed to fetch submission:', err)
        setError(err.response?.data?.message || 'Failed to load submission')
      } finally {
        setLoading(false)
      }
    }
    
    fetchSubmission()
  }, [id])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (error || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || 'Submission not found'}</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Submission Details</h1>
        
        {/* Verdict */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Verdict</h2>
          <VerdictBadge verdict={submission.verdict} size="large" />
          
          {submission.executionTime && (
            <p className="mt-2 text-gray-600">
              Execution Time: {submission.executionTime}ms
            </p>
          )}
          
          {submission.memoryUsed && (
            <p className="text-gray-600">
              Memory Used: {submission.memoryUsed.toFixed(2)}MB
            </p>
          )}
        </div>
        
        {/* Code */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Submitted Code</h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
            <code>{submission.code}</code>
          </pre>
        </div>
        
        {/* Compiler Error */}
        {submission.compilerError && (
          <div className="bg-red-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-red-700">
              Compiler Error
            </h2>
            <pre className="text-red-600 whitespace-pre-wrap">
              {submission.compilerError}
            </pre>
          </div>
        )}
        
        {/* Metadata */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Metadata</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="font-medium text-gray-600">Language</dt>
              <dd className="text-gray-900">{submission.language.toUpperCase()}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Submitted At</dt>
              <dd className="text-gray-900">
                {new Date(submission.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
```

**Then update `SubmissionHistory.tsx` to navigate:**

```tsx
import { useRouter } from 'next/navigation'

// Inside component:
const router = useRouter()

// Update onClick:
onClick={() => {
  router.push(`/submissions/${submission._id}`)
}}
```

### 3. Add Test Case Results (Requires Backend Changes)

This requires modifying the backend to return test case results in the verdict event.

**Backend changes needed:**

1. **Worker** (`backend/src/jobs/submission.worker.js`):
   - Include test case results in verdict event
   - Format: `{ testNumber: 1, passed: true }`

2. **Socket.io event**:
   ```js
   io.to(`user:${submission.userId}`).emit('verdict', {
     submissionId: submission._id,
     verdict: 'WA',
     executionTime: 123,
     memoryUsed: 4.5,
     compilerError: null,
     testCases: [
       { testNumber: 1, passed: true },
       { testNumber: 2, passed: true },
       { testNumber: 3, passed: false },  // ← Failed test
     ]
   })
   ```

3. **Frontend** (`useSubmission.ts`):
   - Add `testCases` state
   - Update verdict handler to store test cases

4. **Problem page** (`page.tsx`):
   - Pass `testCases` to `SubmissionResult` component

## Next Steps

1. **Diagnose the "Judging" stuck issue first** - This is the most critical
2. **Add submission detail page** - Quick win for better UX
3. **Add test case results** - Requires backend changes (new spec/task)

## Creating a New Spec for Missing Features

If you want to implement the missing features properly, create a new spec:

```bash
# Option 1: Use Kiro to create a spec
# Tell Kiro: "Create a spec for submission detail page with test case results"

# Option 2: Manually create spec files
mkdir -p .kiro/specs/submission-detail-view
touch .kiro/specs/submission-detail-view/requirements.md
touch .kiro/specs/submission-detail-view/design.md
touch .kiro/specs/submission-detail-view/tasks.md
```

**Features to include in new spec:**

1. Submission detail page (`/submissions/[id]`)
2. Display submitted code with syntax highlighting
3. Show individual test case results (pass/fail)
4. Show test case inputs/outputs (for failed tests)
5. Show compiler error messages
6. Show execution metrics
7. Add "Run Again" button to resubmit same code
8. Add navigation back to problem page

## Summary

- **Issue 1 (Stuck on Judging)**: Diagnostic steps provided above
- **Issue 2 (Can't click submissions)**: Quick fix provided (create detail page)
- **Issue 3 (Can't see test cases)**: Requires backend changes (new spec needed)

Start with diagnosing Issue 1 first, as that's blocking everything else.
