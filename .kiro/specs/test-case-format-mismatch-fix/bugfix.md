# Bugfix Requirements Document

## Introduction

When users submit correct code to problems, they receive incorrect verdicts (CE for C++, RE for Python) because the test case ZIP format created by `generate-test-cases.js` doesn't match what the worker's `downloadTestCases()` function expects. The generator creates ZIPs with `input/` and `output/` subdirectories, but the worker expects files at the ZIP root. This causes the worker to fail extracting test cases and fall back to a dummy test case `{ input: '1 2\n', output: '3\n' }`, resulting in wrong verdicts for correct submissions.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN test case ZIP contains files in subdirectories (e.g., `input/1.txt`, `output/1.txt`) THEN the worker's regex pattern `^(.*)\.(in|out|txt|ans)$` fails to match because `entry.entryName` includes the directory path

1.2 WHEN the regex fails to match any files in the ZIP THEN the worker logs "No valid input/output pairs found in ZIP. Using fallback." and returns a dummy test case `[{ input: '1 2\n', output: '3\n' }]`

1.3 WHEN correct user code is judged against the dummy test case instead of actual problem test cases THEN the system produces incorrect verdicts (CE, RE, or WA) for code that should receive AC

### Expected Behavior (Correct)

2.1 WHEN test case ZIP contains files in subdirectories (e.g., `input/1.txt`, `output/1.txt`) THEN the worker SHALL successfully extract and parse all input/output pairs from the subdirectories

2.2 WHEN the worker extracts test cases from the ZIP THEN the system SHALL use the actual problem test cases (not fallback dummy data) for judging submissions

2.3 WHEN correct user code is judged against actual problem test cases THEN the system SHALL produce correct verdicts (AC for correct solutions, WA/TLE/MLE/RE for incorrect solutions)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN test case ZIP contains files at root level with extensions `.in`/`.out` (e.g., `1.in`, `1.out`) THEN the system SHALL CONTINUE TO extract and use those test cases correctly

3.2 WHEN test case ZIP contains files at root level with extensions `.txt`/`.ans` (e.g., `1.txt`, `1.ans`) THEN the system SHALL CONTINUE TO extract and use those test cases correctly

3.3 WHEN S3 download fails or ZIP is corrupted THEN the system SHALL CONTINUE TO throw an error (not silently use fallback data)

3.4 WHEN ZIP contains incomplete pairs (input without output or vice versa) THEN the system SHALL CONTINUE TO skip those incomplete pairs and only use complete input/output pairs
