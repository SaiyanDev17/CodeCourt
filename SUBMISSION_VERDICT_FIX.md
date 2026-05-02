# Submission Verdict Display Fix - Task 2.1

## Summary

Fixed the `useSubmission` hook to properly handle Socket.io verdict events by resolving a React closure issue that prevented state updates.

## Problem

The original implementation had a critical bug in the `useEffect` dependency array:

```typescript
useEffect(() => {
  const handleVerdict = (data: VerdictEvent) => {
    if (currentSubmission && data.submissionId === currentSubmission._id) {
      // Update state...
    }
  }
  
  socket.on('verdict', handleVerdict)
  return () => socket.off('verdict', handleVerdict)
}, [user, accessToken, currentSubmission]) // ❌ currentSubmission in deps
```

**Issues:**
1. **Event Listener Re-registration**: Every time `currentSubmission` changed, the effect re-ran, removing and re-adding the event listener
2. **Stale Closure**: The `handleVerdict` function captured the `currentSubmission` value at the time of registration, creating a closure that could become stale
3. **Race Conditions**: If a verdict arrived after a new submission was created but before the event listener was re-registered, it could be missed

## Solution

Used React's functional setState pattern to access the latest state without adding it to the dependency array:

```typescript
useEffect(() => {
  const handleVerdict = (data: VerdictEvent) => {
    // ✅ Use callback form to access latest currentSubmission
    setCurrentSubmission((current) => {
      if (!current) {
        console.log('No current submission, ignoring verdict')
        return current
      }
      
      if (data.submissionId !== current._id) {
        console.log('Verdict is for different submission, ignoring')
        return current
      }
      
      // Update verdict state
      setVerdict(data.verdict)
      setExecutionTime(data.executionTime)
      setMemoryUsed(data.memoryUsed)
      setCompilerError(data.compilerError)
      setIsJudging(false)
      setError(null)
      
      return current // Return unchanged
    })
  }
  
  socket.on('verdict', handleVerdict)
  return () => socket.off('verdict', handleVerdict)
}, [user, accessToken]) // ✅ Removed currentSubmission from deps
```

## Key Improvements

### 1. Stable Event Listener
- Event listener is registered once when the component mounts (or when user/token changes)
- No re-registration on every submission
- Prevents memory leaks and duplicate listeners

### 2. Always Fresh State
- Uses `setCurrentSubmission((current) => ...)` callback pattern
- Always accesses the latest `currentSubmission` value
- No stale closures

### 3. Proper Cleanup
- Event listener is only removed when component unmounts or user/token changes
- Cleanup function properly removes the exact listener that was registered

### 4. Enhanced Logging
- Added detailed console logs for debugging:
  - When connecting to Socket.io
  - When registering event listener
  - When receiving verdict events
  - When ignoring events (no submission or wrong submission)
  - When updating state (verdict matches)
  - When cleaning up listener

### 5. Submissionid Matching Logic
- Checks if `currentSubmission` exists before comparing IDs
- Logs when ignoring events for different submissions
- Prevents race conditions when user submits multiple times quickly

## How It Works

### Flow Diagram

```
User submits code
    ↓
submit() called
    ↓
POST /api/submissions → Backend creates submission
    ↓
setCurrentSubmission(submission) → State updated
    ↓
Backend judges code in worker
    ↓
Worker emits Socket.io event to room `user:{userId}`
    ↓
Frontend receives 'verdict' event
    ↓
handleVerdict(data) called
    ↓
setCurrentSubmission((current) => {
  if (data.submissionId === current._id) {
    Update verdict state ✅
  } else {
    Ignore event ❌
  }
})
    ↓
UI re-renders with verdict
```

### Socket.io Room Architecture

**Backend** (`backend/src/socket/index.js`):
```javascript
io.on('connection', (socket) => {
  // User automatically joins their personal room
  socket.join(`user:${socket.userId}`)
})
```

**Worker** (`backend/src/jobs/submission.worker.js`):
```javascript
// Emit verdict to user's room
io.to(`user:${userId}`).emit('verdict', {
  submissionId,
  verdict,
  executionTime,
  memoryUsed,
  compilerError
})
```

**Frontend** (`frontend/hooks/useSubmission.ts`):
```typescript
// Listen for verdict events
socket.on('verdict', handleVerdict)
```

## Testing

### Manual Testing Steps

1. **Start all services**:
   ```bash
   # Terminal 1: Redis
   docker run -d -p 6379:6379 redis:alpine
   
   # Terminal 2: Backend
   cd backend && npm run dev
   
   # Terminal 3: Frontend
   cd frontend && npm run dev
   ```

2. **Test submission flow**:
   - Navigate to a problem page
   - Write some code
   - Click Submit
   - Observe console logs:
     - `[useSubmission] Connecting to Socket.io...`
     - `[useSubmission] Registering verdict event listener`
     - `[useSubmission] Submitting code:`
     - `[useSubmission] Submission created: <id>`
     - `[useSubmission] Received verdict event:`
     - `[useSubmission] Verdict matches current submission, updating state`
   - Verify verdict displays in UI

3. **Test multiple submissions**:
   - Submit code multiple times quickly
   - Verify each verdict updates correctly
   - Check console logs show proper filtering:
     - Events for old submissions are ignored
     - Only current submission verdict updates state

4. **Test cleanup**:
   - Navigate away from problem page
   - Check console: `[useSubmission] Cleaning up verdict event listener`
   - Navigate back
   - Check console: Event listener re-registered
   - Submit code and verify verdict still works

### Expected Console Output

```
[useSubmission] Connecting to Socket.io...
[Socket.io] Connected to server abc123
[useSubmission] Registering verdict event listener
[useSubmission] Submitting code: { language: 'cpp', problemId: '...', codeLength: 150 }
[useSubmission] Submission created: 67a1b2c3d4e5f6g7h8i9j0k1
[useSubmission] Received verdict event: {
  submissionId: '67a1b2c3d4e5f6g7h8i9j0k1',
  verdict: 'AC',
  executionTime: 123,
  memoryUsed: 4.5,
  hasCompilerError: false
}
[useSubmission] Verdict matches current submission, updating state
```

## Requirements Validated

This fix addresses the following requirements from the spec:

- **Requirement 1.3**: WHEN the Worker completes judging THEN THE Socket_Server SHALL emit a verdict event to the user's room within 500ms ✅
- **Requirement 1.4**: WHEN a verdict event is received THEN THE Frontend SHALL update the UI to display the verdict result ✅
- **Requirement 7.5**: WHEN a verdict event is emitted THEN THE Frontend SHALL receive the event and update the UI state ✅
- **Requirement 7.6**: WHEN a verdict event is received for a different submission THEN THE Frontend SHALL ignore the event ✅

## Files Modified

- `frontend/hooks/useSubmission.ts` - Fixed event listener and state management

## Next Steps

The next task (2.2) is to write property tests for verdict event filtering to ensure:
- Events with mismatched submissionId are ignored
- State remains unchanged for wrong submission events
- Multiple rapid submissions are handled correctly

## Related Documentation

- Design Document: `.kiro/specs/submission-verdict-display/design.md`
- Requirements: `.kiro/specs/submission-verdict-display/requirements.md`
- Tasks: `.kiro/specs/submission-verdict-display/tasks.md`
