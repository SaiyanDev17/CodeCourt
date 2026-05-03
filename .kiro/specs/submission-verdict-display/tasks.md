# Implementation Plan: Submission Verdict Display

## Overview

This implementation plan converts the submission verdict display design into actionable coding tasks. The feature enables real-time submission verdict display with tabbed UI on problem pages and a separate submissions history page. Implementation follows an incremental approach: backend API → Socket.io fixes → frontend components → tabbed UI → all submissions page → testing.

## Tasks

- [x] 1. Backend: Create GET /api/submissions endpoint for all user submissions
  - Add new route in `backend/src/modules/submissions/routes.js` after existing routes
  - Implement `getAllSubmissions` controller method in `backend/src/modules/submissions/controller.js`
  - Implement `getAllSubmissionsWithProblemDetails` service method in `backend/src/modules/submissions/service.js`
  - Use MongoDB aggregation to join submissions with problems collection
  - Filter by authenticated user's ID (req.user.id)
  - Exclude code field from response (security)
  - Include problem title and slug in response
  - Sort by createdAt descending (newest first)
  - Return format: `{ count: number, submissions: SubmissionWithProblem[] }`
  - _Requirements: 5.1, 6.4, 6.7_

- [x] 1.1 Write unit tests for GET /api/submissions endpoint
  - Test authenticated user receives only their submissions
  - Test submissions include problem details (title, slug)
  - Test code field is excluded from response
  - Test submissions are sorted by createdAt descending
  - Test empty array when user has no submissions
  - _Requirements: 5.1, 6.4_

- [x] 2. Frontend: Fix Socket.io connection and verdict event handling
  - [x] 2.1 Update useSubmission hook to properly handle verdict events
    - Fix event listener in `frontend/hooks/useSubmission.ts`
    - Ensure submissionId matching logic works correctly
    - Add proper cleanup on unmount
    - Handle verdict event only if submissionId matches current submission
    - Update state: verdict, executionTime, memoryUsed, compilerError, isJudging
    - Add console logging for debugging verdict events
    - _Requirements: 1.3, 1.4, 7.5, 7.6_
  
  - [x] 2.2 Write property test for verdict event filtering
    - **Property 15: Verdict Event Filtering**
    - **Validates: Requirements 7.6**
    - Test that events with mismatched submissionId are ignored
    - Test that state remains unchanged for wrong submission events
  
  - [x] 2.3 Verify Socket.io room joining on connection
    - Check `backend/src/socket/index.js` for user room assignment
    - Ensure JWT authentication extracts userId correctly
    - Verify room name format: `user:{userId}`
    - Add logging to confirm room joining
    - _Requirements: 7.1, 7.2, 7.4_
  
  - [x] 2.4 Write unit test for Socket.io room isolation
    - **Property 5: Socket.io Room Isolation**
    - **Validates: Requirements 2.4**
    - Test verdict events only reach submission owner's room
    - Test other users don't receive verdict events

- [x] 3. Frontend: Implement polling fallback mechanism
  - Add polling logic to useSubmission hook
  - Trigger polling when Socket.io connection fails
  - Poll GET /api/submissions/:id every 2 seconds
  - Stop polling when non-PENDING verdict received
  - Timeout after 30 attempts (60 seconds)
  - Display timeout error message with "Check Status" button
  - Switch back to Socket.io when connection restored
  - _Requirements: 1.7, 8.1, 8.2, 8.3, 8.4, 8.5, 10.5_

- [x] 3.1 Write unit tests for polling fallback
  - Test polling starts when Socket.io fails
  - Test polling stops on non-PENDING verdict
  - Test timeout after 30 attempts
  - Test switch back to Socket.io on reconnection
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 4. Checkpoint - Verify real-time verdict delivery works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Frontend: Create VerdictBadge component
  - Create `frontend/components/Submission/VerdictBadge.tsx`
  - Accept props: `verdict`, `size` (optional: 'small' | 'medium' | 'large')
  - Render color-coded badge with icon for each verdict type:
    - AC: Green checkmark with "Accepted"
    - WA: Red X with "Wrong Answer"
    - TLE: Yellow clock icon with "Time Limit Exceeded"
    - MLE: Yellow memory icon with "Memory Limit Exceeded"
    - RE: Orange warning icon with "Runtime Error"
    - CE: Red error icon with "Compilation Error"
    - PENDING: Gray spinner with "Judging..."
  - Use Tailwind CSS for styling
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 5.1 Write unit tests for VerdictBadge component
  - Test each verdict type renders correct color and icon
  - Test size prop affects badge dimensions
  - Test PENDING shows spinner animation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 6. Frontend: Enhance SubmissionResult component
  - Update `frontend/components/Problem/SubmissionResult.tsx`
  - Use VerdictBadge component for verdict display
  - Display execution time in milliseconds (if available)
  - Display memory usage in megabytes (if available)
  - Show compiler error message for CE verdicts in monospace font
  - Add proper spacing and layout with Tailwind CSS
  - _Requirements: 1.5, 1.6, 9.7_

- [x] 6.1 Write unit tests for SubmissionResult component
  - Test verdict badge is displayed
  - Test execution metrics shown when available
  - Test compiler error displayed for CE verdict
  - Test null metrics don't break rendering
  - _Requirements: 1.5, 1.6, 9.7_

- [x] 7. Frontend: Create SubmissionHistory component for problem page
  - Create `frontend/components/Submission/SubmissionHistory.tsx`
  - Accept props: `problemId` (string)
  - Fetch submissions via GET /api/submissions/problem/:problemId on mount
  - Display loading spinner while fetching
  - Show "No submissions yet" message when empty
  - Render list of submissions with:
    - VerdictBadge component
    - Language (uppercase)
    - Execution time (if available)
    - Memory usage (if available)
    - Timestamp (formatted with toLocaleString)
  - Make each submission clickable (navigate to detail view - future task)
  - Use Tailwind CSS for card layout with hover effects
  - _Requirements: 3.3, 3.6, 4.1, 4.2, 4.4, 4.5_

- [x] 7.1 Write unit tests for SubmissionHistory component
  - Test loading state displays spinner
  - Test empty state displays message
  - Test submissions list renders correctly
  - Test each submission shows all required fields
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 8. Frontend: Add tabbed interface to problem page
  - Update `frontend/app/problems/[slug]/page.tsx`
  - Add state: `activeTab` ('problem' | 'submissions')
  - Create tab headers with "Problem" and "Submissions" buttons
  - Style active tab with blue border-bottom and text color
  - Render ProblemStatement when activeTab === 'problem'
  - Render SubmissionHistory when activeTab === 'submissions'
  - Preserve code editor state when switching tabs
  - Preserve scroll position when switching tabs
  - Make tabs sticky at top of left panel (z-10)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8.1 Write unit tests for tabbed interface
  - Test tab switching updates activeTab state
  - Test correct component renders for each tab
  - Test code editor state preserved on tab switch
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 9. Frontend: Make tabs responsive for mobile
  - Update tab headers in `frontend/app/problems/[slug]/page.tsx`
  - Add responsive classes: hide tabs on mobile (<768px), show dropdown
  - Implement dropdown menu for tab selection on mobile
  - Use Tailwind breakpoints: `hidden md:flex` for tabs, `md:hidden` for dropdown
  - Ensure dropdown works with touch events
  - _Requirements: 3.5, 12.2_

- [x] 10. Checkpoint - Verify tabbed problem page works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Frontend: Create AllSubmissionsPage component
  - Create `frontend/app/submissions/page.tsx`
  - Fetch all user submissions via GET /api/submissions on mount
  - Display loading spinner while fetching
  - Show "No submissions found" when empty
  - Render list of submissions with:
    - Problem title (clickable link to problem page)
    - VerdictBadge component (size="large")
    - Language (uppercase)
    - Execution time with clock icon (if available)
    - Memory usage with memory icon (if available)
    - Timestamp (formatted)
  - Use card layout with hover shadow effect
  - Add page title: "All Submissions"
  - Use Tailwind CSS for responsive layout
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 11.1 Write unit tests for AllSubmissionsPage
  - Test loading state displays spinner
  - Test empty state displays message
  - Test submissions list renders correctly
  - Test problem title links to correct problem page
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 12. Frontend: Add verdict filter to AllSubmissionsPage
  - Add state: `filter` ('all' | 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE')
  - Create dropdown select for filter options
  - Filter submissions client-side based on selected verdict
  - Update displayed submissions when filter changes
  - Show count of filtered submissions
  - _Requirements: 5.4_

- [x] 12.1 Write property test for verdict filter correctness
  - **Property 11: Verdict Filter Correctness**
  - **Validates: Requirements 5.4**
  - Test all displayed submissions match selected filter
  - Test 'all' filter shows all submissions

- [x] 13. Frontend: Add pagination to AllSubmissionsPage
  - Add state: `page` (number), `hasMore` (boolean)
  - Display first 50 submissions initially
  - Add "Load More" button at bottom
  - Fetch next page when button clicked
  - Hide button when no more submissions
  - Update hasMore based on response count
  - _Requirements: 5.5_

- [x] 14. Frontend: Make AllSubmissionsPage responsive
  - Update layout for mobile (<1024px)
  - Use compact card layout on mobile
  - Stack submission details vertically on small screens
  - Adjust font sizes for mobile readability
  - Test on various viewport sizes
  - _Requirements: 12.1, 12.3, 12.4_

- [~] 15. Backend: Add database indexes for performance
  - Add compound index in `backend/src/modules/submissions/model.js`:
    - `{ userId: 1, problemId: 1, createdAt: -1 }`
  - Add index: `{ userId: 1, createdAt: -1 }` for all submissions query
  - Verify indexes created in MongoDB
  - Test query performance with explain()
  - _Requirements: 11.4_

- [~] 15.1 Write performance tests for submission queries
  - Test GET /submissions/problem/:problemId responds in <200ms
  - Test GET /submissions responds in <200ms
  - Test with 100+ submissions per user
  - _Requirements: 11.3_

- [~] 16. Frontend: Add error handling for submission failures
  - Update useSubmission hook error handling
  - Display API error messages to user
  - Clear loading state on error (isJudging = false)
  - Allow user to retry submission after error
  - Preserve code in editor on error (don't clear)
  - Handle specific error codes:
    - 401: "Please log in to submit code"
    - 404: "Problem not found"
    - 500: "Server error, please try again later"
  - _Requirements: 10.1, 10.2, 10.3_

- [~] 16.1 Write unit tests for error handling
  - Test error message displayed on submission failure
  - Test loading state cleared on error
  - Test code preserved in editor after error
  - Test retry allowed after error
  - _Requirements: 10.1, 10.2, 10.3_

- [~] 17. Frontend: Add error handling for submission history fetch failures
  - Update SubmissionHistory component error handling
  - Display "Failed to load submissions" message on error
  - Add "Retry" button to refetch submissions
  - Log error details for debugging
  - _Requirements: 10.4_

- [~] 18. Frontend: Add error handling for Socket.io connection failures
  - Update useSubmission hook to detect connection failures
  - Display warning: "Real-time updates unavailable, polling for results"
  - Automatically fall back to polling
  - Attempt to reconnect Socket.io in background
  - Clear warning when connection restored
  - _Requirements: 10.6_

- [~] 19. Checkpoint - Verify all error scenarios handled gracefully
  - Ensure all tests pass, ask the user if questions arise.

- [~] 20. Integration: Wire all components together
  - Verify problem page tabs work with real API
  - Verify all submissions page displays correct data
  - Verify verdict filters work correctly
  - Verify pagination loads more submissions
  - Verify real-time verdict updates via Socket.io
  - Verify polling fallback works when Socket.io fails
  - Verify error messages display correctly
  - Test end-to-end submission flow:
    1. User submits code
    2. Loading indicator shows
    3. Verdict arrives via Socket.io
    4. Verdict displayed with metrics
    5. Submission appears in history
  - _Requirements: All_

- [~] 20.1 Write E2E tests for submission flow
  - Test complete submission flow with Playwright
  - Test tab switching preserves editor state
  - Test submission history updates after new submission
  - Test all submissions page shows new submission
  - _Requirements: All_

- [~] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Backend uses JavaScript (Node.js/Express)
- Frontend uses TypeScript (Next.js/React)
- Socket.io is already configured and working in backend
- MongoDB indexes improve query performance
- Real-time updates via Socket.io with polling fallback
- All submissions are private (ownership validation enforced)
