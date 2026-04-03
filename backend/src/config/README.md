# Configuration Module

This directory contains configuration files for the CodeCourt backend.

## Files

- **constants.js** - Application-wide constants (roles, verdicts, limits, etc.)
- **db.js** - MongoDB connection configuration
- **redis.js** - Redis client configuration
- **s3.js** - AWS S3 client configuration
- **bullmq.js** - BullMQ queue configuration

## Using Constants

The `constants.js` file exports the following constant groups:

### ROLES
User roles for role-based access control:
```javascript
const { ROLES } = require('./config/constants');

// Usage
if (user.role === ROLES.ADMIN) {
  // Admin-only logic
}
```

### VERDICTS
Submission verdict types:
```javascript
const { VERDICTS } = require('./config/constants');

// Usage
submission.verdict = VERDICTS.AC; // Accepted
submission.verdict = VERDICTS.WA; // Wrong Answer
```

### PROBLEM_STATUS
Problem workflow statuses:
```javascript
const { PROBLEM_STATUS } = require('./config/constants');

// Usage
problem.status = PROBLEM_STATUS.DRAFT;
problem.status = PROBLEM_STATUS.PUBLISHED;
```

### CONTEST_STATUS
Contest lifecycle statuses:
```javascript
const { CONTEST_STATUS } = require('./config/constants');

// Usage
contest.status = CONTEST_STATUS.UPCOMING;
contest.status = CONTEST_STATUS.ONGOING;
```

### DIFFICULTY
Problem difficulty levels:
```javascript
const { DIFFICULTY } = require('./config/constants');

// Usage
problem.difficulty = DIFFICULTY.EASY;
```

### LANGUAGES
Supported programming languages:
```javascript
const { LANGUAGES } = require('./config/constants');

// Usage
submission.language = LANGUAGES.CPP;
submission.language = LANGUAGES.PYTHON;
```

### LIMITS
System-wide limits and thresholds:
```javascript
const { LIMITS } = require('./config/constants');

// Usage examples
if (password.length < LIMITS.MIN_PASSWORD_LENGTH) {
  throw new Error('Password too short');
}

await redis.setex(key, LIMITS.CACHE_TTL_PROBLEM_LIST, value);

if (hintCount >= LIMITS.MAX_HINTS_PER_PROBLEM) {
  throw new Error('Maximum hints reached');
}
```

### REDIS_KEYS
Redis key prefixes for consistent caching:
```javascript
const { REDIS_KEYS } = require('./config/constants');

// Usage
const cacheKey = `${REDIS_KEYS.USER_PROFILE}:${userId}`;
const leaderboardKey = `${REDIS_KEYS.LEADERBOARD}:${contestId}`;
```

## Benefits of Using Constants

1. **Type Safety**: Prevents typos in string literals
2. **Maintainability**: Single source of truth for all constants
3. **Consistency**: Ensures same values used across codebase
4. **Documentation**: Self-documenting code with clear constant names
5. **Refactoring**: Easy to update values in one place

## Example: Refactoring to Use Constants

**Before:**
```javascript
const validRoles = ['admin', 'problem_setter', 'contestant'];
if (user.role === 'admin') {
  // ...
}
```

**After:**
```javascript
const { ROLES } = require('./config/constants');

const validRoles = Object.values(ROLES);
if (user.role === ROLES.ADMIN) {
  // ...
}
```
