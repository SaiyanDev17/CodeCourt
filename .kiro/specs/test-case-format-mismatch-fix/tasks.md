# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Subdirectory Test Case Extraction Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - ZIP files with subdirectory structure (`input/1.txt`, `output/1.txt`)
  - Create test ZIP file with subdirectory structure: `input/1.txt` containing "5 10\n" and `output/1.txt` containing "15\n"
  - Call downloadTestCases() with the test ZIP
  - Assert that the function returns actual test cases (not fallback dummy data `[{ input: '1 2\n', output: '3\n' }]`)
  - Assert that testCases[0].input === "5 10\n" and testCases[0].output === "15\n"
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: function returns `[{ input: '1 2\n', output: '3\n' }]` instead of actual test cases
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Root-Level Test Case Extraction
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for root-level ZIP files
  - Create test ZIP with root-level files: `1.in` containing "3 7\n" and `1.out` containing "10\n"
  - Call downloadTestCases() with the test ZIP on UNFIXED code
  - Observe that function returns `[{ input: '3 7\n', output: '10\n' }]`
  - Write property-based test: for all root-level ZIP files with valid extensions (.in/.out, .txt/.ans), downloadTestCases() extracts test cases correctly
  - Create test ZIP with root-level files: `1.txt` containing "2 3\n" and `1.ans` containing "5\n"
  - Assert that function returns `[{ input: '2 3\n', output: '5\n' }]`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix for test case format mismatch

  - [ ] 3.1 Implement the fix
    - Modify `downloadTestCases()` function in `backend/src/jobs/submission.worker.js`
    - Before applying regex pattern, strip directory prefix from `entry.entryName`
    - Change: `const fileName = entry.entryName;`
    - To: `const fileName = entry.entryName.split('/').pop();`
    - This ensures subdirectory files like `input/1.txt` become `1.txt` before regex matching
    - Root-level files like `1.in` remain unchanged (no directory prefix to strip)
    - Keep all other logic unchanged (regex pattern, file pairing, content reading, validation)
    - _Bug_Condition: isBugCondition(zipEntry) where zipEntry.entryName contains subdirectory prefix (e.g., `input/1.txt`, `output/1.txt`)_
    - _Expected_Behavior: downloadTestCases() successfully extracts base name, matches input/output pairs, and returns valid test case objects for subdirectory format_
    - _Preservation: Root-level file extraction (.in/.out, .txt/.ans), error handling, incomplete pair handling remain unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Subdirectory Test Case Extraction Success
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Root-Level Test Case Extraction Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
