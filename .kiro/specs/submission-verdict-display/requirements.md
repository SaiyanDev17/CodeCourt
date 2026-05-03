# Requirements Document: Submission Verdict Display

## Introduction

This document specifies the requirements for implementing real-time submission verdict display in the CodeCourt platform. The system enables users to submit code solutions, receive real-time feedback on their submissions, and view their submission history. The feature bridges the gap between backend submission processing (which currently works) and frontend display (which needs implementation).

## Glossary

- **System**: The CodeCourt web application (frontend + backend)
- **Frontend**: The Next.js React application running in the user's browser
- **Backend**: The Express.js API server
- **User**: An authenticated person using the CodeCourt platform
- **Submission**: A code solution submitted by a user for a specific problem
- **Verdict**: The judgment result of a submission (AC, WA, TLE, MLE, RE, CE, or PENDING)
- **Socket_Server**: The Socket.io server component for real-time communication
- **Worker**: The BullMQ worker that executes and judges code submissions
- **Problem_Page**: The page displaying a problem statement and code editor
- **Submissions_Page**: The page displaying all user submissions across all problems
- **Submission_History**: The list of previous submissions for a specific problem
- **Verdict_Event**: A Socket.io event containing submission judgment results
- **AC**: Accepted (correct solution)
- **WA**: Wrong Answer
- **TLE**: Time Limit Exceeded
- **MLE**: Memory Limit Exceeded
- **RE**: Runtime Error
- **CE**: Compilation Error
- **PENDING**: Submission is being judged

## Requirements

### Requirement 1: Real-Time Verdict Display

**User Story:** As a user, I want to see my submission verdict in real-time, so that I know immediately whether my solution is correct without refreshing the page.

#### Acceptance Criteria

1. WHEN a user submits code THEN THE System SHALL create a submission with PENDING status and return a submission ID within 500ms
2. WHEN a submission is created THEN THE Frontend SHALL display a loading indicator showing "Your code is being judged..."
3. WHEN the Worker completes judging THEN THE Socket_Server SHALL emit a verdict event to the user's room within 500ms
4. WHEN a verdict event is received THEN THE Frontend SHALL update the UI to display the verdict result
5. WHEN displaying a verdict THEN THE System SHALL show the verdict type, execution time, and memory usage
6. WHEN a compilation error occurs THEN THE System SHALL display the compiler error message to the user
7. WHEN the Socket.io connection fails THEN THE Frontend SHALL fall back to polling the submission status every 2 seconds

### Requirement 2: Submission Ownership and Security

**User Story:** As a user, I want my submissions to be private, so that other users cannot view my code or submission results.

#### Acceptance Criteria

1. WHEN a user requests a submission THEN THE Backend SHALL verify the submission belongs to the requesting user
2. IF a user requests another user's submission THEN THE Backend SHALL return a 403 Forbidden error
3. WHEN fetching submission history THEN THE Backend SHALL filter results to only include the authenticated user's submissions
4. WHEN emitting verdict events THEN THE Socket_Server SHALL send events only to the submission owner's Socket.io room
5. WHEN returning submission history THEN THE Backend SHALL exclude the code field from the response

### Requirement 3: Problem Page Tabbed Interface

**User Story:** As a user, I want to switch between viewing the problem statement and my submission history, so that I can review my previous attempts while working on a problem.

#### Acceptance Criteria

1. WHEN a user visits a problem page THEN THE Frontend SHALL display two tabs: "Problem" and "Submissions"
2. WHEN the "Problem" tab is active THEN THE Frontend SHALL display the problem statement, constraints, and sample test cases
3. WHEN the "Submissions" tab is active THEN THE Frontend SHALL display the user's submission history for that specific problem
4. WHEN switching tabs THEN THE Frontend SHALL preserve the code editor state and scroll position
5. WHEN the viewport width is less than 768px THEN THE Frontend SHALL display tabs as a dropdown menu
6. WHEN displaying submission history THEN THE Frontend SHALL show verdict badges, execution metrics, and submission timestamps

### Requirement 4: Submission History Display

**User Story:** As a user, I want to view my previous submissions for a problem, so that I can track my progress and learn from past attempts.

#### Acceptance Criteria

1. WHEN a user opens the Submissions tab THEN THE System SHALL fetch and display all submissions for the current problem
2. WHEN displaying each submission THEN THE System SHALL show the verdict, language, execution time, memory usage, and timestamp
3. WHEN a user clicks a submission THEN THE System SHALL navigate to a detail view showing the full submission including code
4. WHEN no submissions exist THEN THE Frontend SHALL display a message: "No submissions yet"
5. WHEN submissions are loading THEN THE Frontend SHALL display a loading spinner

### Requirement 5: All Submissions Page

**User Story:** As a user, I want to view all my submissions across all problems, so that I can review my overall progress and performance.

#### Acceptance Criteria

1. WHEN a user navigates to /submissions THEN THE System SHALL display all user submissions across all problems
2. WHEN displaying each submission THEN THE System SHALL show the problem title, verdict, language, execution metrics, and timestamp
3. WHEN a user clicks a submission THEN THE System SHALL navigate to the problem page or show submission details
4. WHEN a user selects a verdict filter THEN THE System SHALL display only submissions matching that verdict
5. WHEN more than 50 submissions exist THEN THE System SHALL provide pagination with a "Load More" button
6. WHEN no submissions match the filter THEN THE Frontend SHALL display "No submissions found"

### Requirement 6: Backend API Endpoints

**User Story:** As a frontend developer, I want well-defined API endpoints for submissions, so that I can fetch and display submission data reliably.

#### Acceptance Criteria

1. THE Backend SHALL provide POST /api/submissions to create new submissions
2. THE Backend SHALL provide GET /api/submissions/:id to fetch a specific submission with code
3. THE Backend SHALL provide GET /api/submissions/problem/:problemId to fetch submission history for a problem
4. THE Backend SHALL provide GET /api/submissions to fetch all user submissions with problem details
5. WHEN POST /api/submissions succeeds THEN THE Backend SHALL return 202 Accepted with the submission ID
6. WHEN GET /api/submissions/:id is called with an invalid ID THEN THE Backend SHALL return 404 Not Found
7. WHEN GET /api/submissions/problem/:problemId is called THEN THE Backend SHALL return submissions ordered by creation date descending

### Requirement 7: Socket.io Real-Time Communication

**User Story:** As a user, I want instant feedback when my code is judged, so that I don't have to wait or refresh the page.

#### Acceptance Criteria

1. WHEN a user connects to the application THEN THE Frontend SHALL establish a Socket.io connection with JWT authentication
2. WHEN a Socket.io connection is established THEN THE Socket_Server SHALL join the user to their user-specific room
3. WHEN the Worker completes judging THEN THE Worker SHALL publish a verdict event to the Redis pub/sub channel
4. WHEN a verdict event is published to Redis THEN THE Socket_Server SHALL emit the event to the user's Socket.io room
5. WHEN a verdict event is emitted THEN THE Frontend SHALL receive the event and update the UI state
6. WHEN a verdict event is received for a different submission THEN THE Frontend SHALL ignore the event
7. WHEN the Socket.io connection is lost THEN THE Frontend SHALL attempt to reconnect automatically

### Requirement 8: Polling Fallback Mechanism

**User Story:** As a user, I want to receive my verdict even if real-time updates fail, so that I always get feedback on my submissions.

#### Acceptance Criteria

1. WHEN the Socket.io connection fails THEN THE Frontend SHALL initiate polling for the submission verdict
2. WHEN polling is active THEN THE Frontend SHALL request GET /api/submissions/:id every 2 seconds
3. WHEN a non-PENDING verdict is received via polling THEN THE Frontend SHALL stop polling and display the verdict
4. WHEN polling exceeds 30 attempts THEN THE Frontend SHALL display a timeout error message
5. WHEN the Socket.io connection is restored THEN THE Frontend SHALL stop polling and resume real-time updates

### Requirement 9: Verdict Display Component

**User Story:** As a user, I want clear visual feedback on my submission verdict, so that I can quickly understand the result.

#### Acceptance Criteria

1. WHEN displaying an AC verdict THEN THE System SHALL show a green checkmark with "Accepted"
2. WHEN displaying a WA verdict THEN THE System SHALL show a red X with "Wrong Answer"
3. WHEN displaying a TLE verdict THEN THE System SHALL show a yellow clock icon with "Time Limit Exceeded"
4. WHEN displaying an MLE verdict THEN THE System SHALL show a yellow memory icon with "Memory Limit Exceeded"
5. WHEN displaying an RE verdict THEN THE System SHALL show an orange warning icon with "Runtime Error"
6. WHEN displaying a CE verdict THEN THE System SHALL show a red error icon with "Compilation Error" and the compiler message
7. WHEN execution metrics are available THEN THE System SHALL display execution time in milliseconds and memory usage in megabytes

### Requirement 10: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and can take appropriate action.

#### Acceptance Criteria

1. WHEN submission creation fails THEN THE Frontend SHALL display the error message from the API response
2. WHEN a submission API returns a 4xx error THEN THE Frontend SHALL clear the loading state and allow retry
3. WHEN a submission API returns a 5xx error THEN THE Frontend SHALL display "Server error, please try again later"
4. WHEN fetching submission history fails THEN THE Frontend SHALL display "Failed to load submissions"
5. WHEN polling times out THEN THE Frontend SHALL display "Verdict not received, please refresh page" with a "Check Status" button
6. WHEN the Socket.io connection fails THEN THE Frontend SHALL display "Real-time updates unavailable, polling for results"

### Requirement 11: Performance Requirements

**User Story:** As a user, I want fast response times, so that the application feels responsive and efficient.

#### Acceptance Criteria

1. WHEN a user submits code THEN THE Backend SHALL respond within 500ms
2. WHEN the Worker completes judging THEN THE verdict event SHALL reach the Frontend within 500ms
3. WHEN fetching submission history THEN THE Backend SHALL respond within 200ms for up to 100 submissions
4. WHEN querying submissions THEN THE Backend SHALL use database indexes on userId, problemId, and createdAt fields
5. THE System SHALL support at least 1000 concurrent Socket.io connections per server instance

### Requirement 12: UI Responsiveness

**User Story:** As a mobile user, I want the submission interface to work well on my device, so that I can code and submit solutions on the go.

#### Acceptance Criteria

1. WHEN the viewport width is less than 1024px THEN THE Frontend SHALL stack the problem panel and code editor vertically
2. WHEN the viewport width is less than 768px THEN THE Frontend SHALL convert tabs to a dropdown menu
3. WHEN displaying submission history on mobile THEN THE Frontend SHALL use a compact card layout
4. WHEN displaying verdicts on mobile THEN THE Frontend SHALL use responsive font sizes and icon sizes
5. WHEN the keyboard is visible on mobile THEN THE Frontend SHALL adjust the layout to keep the submit button accessible

