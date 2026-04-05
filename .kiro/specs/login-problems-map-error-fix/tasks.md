# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Frontend Extracts Problems Array
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when API returns `{ count: N, problems: [...] }`, the unfixed code crashes with "problems.map is not a function"
  - Mock API response with `{ count: 3, problems: [{id: '1', title: 'Test 1'}, {id: '2', title: 'Test 2'}, {id: '3', title: 'Test 3'}] }`
  - Verify that calling `.map()` on `response.data` throws TypeError
  - The test assertions should match: `Array.isArray(problems)` AND `problems.map()` succeeds AND ProblemCard components render correctly
  - Run test on UNFIXED code (frontend/app/problems/page.tsx with `setProblems(response.data)`)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: "TypeError: problems.map is not a function when response.data is { count, problems } object"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - UI Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (loading, error, empty states)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test cases to observe and capture:
    - Loading state: spinner displays while fetching
    - Error state: error message and retry button display on API failure
    - Empty state: "No problems available yet" message displays when problems array is empty (if observable)
    - Grid layout: ProblemCard components render in grid (if observable)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for frontend crash on problems page

  - [x] 3.1 Implement the fix in frontend/app/problems/page.tsx
    - Change line 26 from `setProblems(response.data)` to `setProblems(response.data.problems)`
    - This extracts the problems array from the response object `{ count, problems }`
    - Ensures state contains an array that supports `.map()` method
    - _Bug_Condition: isBugCondition(input) where input.data is object with properties 'count' and 'problems', and input.data.problems is an array_
    - _Expected_Behavior: Array.isArray(problems) AND problems.map() succeeds AND ProblemCard components render correctly_
    - _Preservation: Loading state, error state, empty state, grid layout, and all UI interactions remain unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Frontend Extracts Problems Array
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - UI Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
