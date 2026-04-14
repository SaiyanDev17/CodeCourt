# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Malformed API Data Crashes
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: Scope the property to concrete failing cases (non-array contests, undefined/null difficulty)
  - Test implementation details from Bug Condition in design:
    - Contest page: Mock API to return non-array values (null, object, string) for contests
    - Problem page: Mock API to return problem with undefined/null difficulty
    - Assert that components render without crashing (will FAIL on unfixed code)
  - The test assertions should match the Expected Behavior Properties from design:
    - For non-array contests: should display empty state messages without crashing
    - For undefined/null difficulty: should display "Unknown" badge without crashing
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with TypeErrors (this is correct - it proves the bugs exist)
  - Document counterexamples found:
    - "TypeError: contests.filter is not a function" when contests is null/object
    - "TypeError: Cannot read properties of undefined (reading 'charAt')" when difficulty is undefined/null
  - Mark task complete when test is written, run, and failures are documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid Data Rendering Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for valid inputs:
    - Contest page: Valid contest arrays are categorized correctly by status (active, upcoming, past)
    - Problem page: Valid difficulty values ("easy", "medium", "hard") display with correct styling
    - All metadata (start time, duration, participants, problems count, time limit, memory limit) displays correctly
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Generate random valid contest arrays and verify categorization logic
    - Generate random valid difficulty strings and verify badge styling
    - Verify all contest and problem metadata rendering
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for frontend runtime errors

  - [x] 3.1 Add type guard for contests array in contests page
    - Open `frontend/app/contests/page.tsx`
    - Locate the `categorizeContests` function (around line 44)
    - Add type guard at the start of the function:
      ```typescript
      if (!Array.isArray(contests)) {
        return { upcoming: [], active: [], past: [] }
      }
      ```
    - Add validation in the `fetchContests` function before setState:
      ```typescript
      setContests(Array.isArray(response.data) ? response.data : [])
      ```
    - This ensures `.filter()` is only called on actual arrays
    - _Bug_Condition: isBugCondition(input) where NOT Array.isArray(input.contests)_
    - _Expected_Behavior: Return empty arrays for all categories when contests is not an array_
    - _Preservation: Valid contest arrays must continue to be categorized correctly by status_
    - _Requirements: 1.1, 2.1, 3.1, 3.3_

  - [x] 3.2 Add null/undefined check for difficulty in problem page
    - Open `frontend/app/problems/[slug]/page.tsx`
    - Locate the difficulty badge rendering (around line 291)
    - Replace the difficulty text rendering with safe access:
      ```typescript
      {problem.difficulty?.charAt(0).toUpperCase() + problem.difficulty?.slice(1) || 'Unknown'}
      ```
    - Add default styling for missing difficulty in the className logic:
      ```typescript
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        !problem.difficulty
          ? 'bg-gray-100 text-gray-800'
          : problem.difficulty === 'easy'
          ? 'bg-green-100 text-green-800'
          : problem.difficulty === 'medium'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'
      }`}
      ```
    - This prevents accessing `.charAt()` on undefined/null values
    - _Bug_Condition: isBugCondition(input) where input.problem.difficulty IS undefined OR null_
    - _Expected_Behavior: Display "Unknown" with gray styling when difficulty is missing_
    - _Preservation: Valid difficulty values must continue to display with correct formatting and styling_
    - _Requirements: 1.2, 2.2, 3.2, 3.4_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Malformed API Data Handled Gracefully
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bugs are fixed)
    - Verify no TypeErrors are thrown for non-array contests or undefined/null difficulty
    - Verify fallback values display correctly (empty arrays, "Unknown" badge)
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Data Rendering Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix:
      - Valid contest arrays are still categorized correctly
      - Valid difficulty values still display with correct styling
      - All metadata rendering is unchanged
    - Confirm no regressions in loading states, error states, or retry functionality

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all tests (bug condition + preservation)
  - Verify no TypeErrors occur in browser console when testing manually
  - Test with various malformed API responses (null, undefined, objects, strings)
  - Test with valid API responses to ensure no regressions
  - Ask the user if questions arise or if additional edge cases need testing
