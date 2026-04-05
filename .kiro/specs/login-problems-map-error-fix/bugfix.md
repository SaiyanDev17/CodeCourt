# Bugfix Requirements Document

## Introduction

After successful user registration, users cannot login and view the problems page. The frontend crashes with the error "problems.map is not a function" at `frontend/app/problems/page.tsx` line 80. 

The root cause is a data structure mismatch: the backend returns `{ count: problems.length, problems }` from GET /api/problems, but the frontend expects a plain array and attempts to call `.map()` directly on `response.data`.

The user has requested to keep the backend response format (which provides flexibility for future enhancements like pagination metadata) and fix the frontend to correctly handle the object structure.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the frontend calls GET /api/problems and receives `{ count: N, problems: [...] }` THEN the system attempts to call `.map()` on the object instead of the array, causing a runtime error "problems.map is not a function"

1.2 WHEN the frontend sets state with `setProblems(response.data)` THEN the system stores the entire response object `{ count, problems }` instead of just the problems array

1.3 WHEN the frontend attempts to render the problems list THEN the system crashes because `problems.map()` is called on an object that doesn't have a `.map()` method

### Expected Behavior (Correct)

2.1 WHEN the frontend calls GET /api/problems and receives `{ count: N, problems: [...] }` THEN the system SHALL extract the `problems` array from `response.data.problems` before setting state

2.2 WHEN the frontend sets state THEN the system SHALL store only the problems array, not the entire response object

2.3 WHEN the frontend attempts to render the problems list THEN the system SHALL successfully call `.map()` on the problems array without errors

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the backend returns the problems response THEN the system SHALL CONTINUE TO return `{ count: problems.length, problems }` format

3.2 WHEN problems are successfully fetched THEN the system SHALL CONTINUE TO display them in a grid layout using ProblemCard components

3.3 WHEN the problems array is empty THEN the system SHALL CONTINUE TO display the "No problems available yet" message

3.4 WHEN there is a network error or API failure THEN the system SHALL CONTINUE TO display the error state with a retry button

3.5 WHEN problems are being fetched THEN the system SHALL CONTINUE TO display the loading spinner
