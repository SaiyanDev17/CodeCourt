# Bugfix Requirements Document

## Introduction

The backend server is experiencing a nodemon restart loop that prevents stable operation. Container logs show the startup sequence repeating continuously, with three underlying issues:

1. Mongoose emits duplicate schema index warnings for User model (username, email) and Problem model (slug)
2. Redis is configured with "allkeys-lru" eviction policy but the application requires "noeviction" for BullMQ job queue reliability
3. The combination of these warnings and potential Redis behavior issues causes nodemon to detect changes and restart repeatedly

This bugfix addresses all three root causes to ensure the backend runs stably without unnecessary restarts.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the backend server starts THEN Mongoose emits duplicate index warnings for User.username, User.email, and Problem.slug indexes

1.2 WHEN the backend server starts THEN Redis is configured with "allkeys-lru" eviction policy which can evict BullMQ job data

1.3 WHEN Mongoose emits index warnings during startup THEN nodemon detects changes and triggers a restart

1.4 WHEN nodemon restarts the server THEN the startup sequence repeats, creating a continuous restart loop

1.5 WHEN the restart loop occurs THEN the backend server never reaches a stable running state

### Expected Behavior (Correct)

2.1 WHEN the backend server starts THEN Mongoose SHALL NOT emit duplicate index warnings for User and Problem models

2.2 WHEN the backend server starts THEN Redis SHALL be configured with "noeviction" policy to prevent BullMQ job data loss

2.3 WHEN the backend server starts successfully THEN nodemon SHALL NOT detect any changes that trigger restarts

2.4 WHEN the backend server reaches running state THEN it SHALL remain stable without automatic restarts

2.5 WHEN the backend server is running THEN container logs SHALL show a clean startup sequence without repeated initialization

### Unchanged Behavior (Regression Prevention)

3.1 WHEN querying users by username or email THEN the system SHALL CONTINUE TO use indexes for O(log n) lookup performance

3.2 WHEN querying problems by slug THEN the system SHALL CONTINUE TO use indexes for O(log n) lookup performance

3.3 WHEN BullMQ enqueues submission jobs THEN the system SHALL CONTINUE TO store jobs reliably in Redis

3.4 WHEN code files are modified during development THEN nodemon SHALL CONTINUE TO detect changes and restart appropriately

3.5 WHEN the backend server starts THEN all existing functionality (authentication, problem management, submissions) SHALL CONTINUE TO work correctly
