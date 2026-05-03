# Test Case Format Mismatch Fix - Bugfix Design

## Overview

The bug occurs when the worker's `downloadTestCases()` function fails to extract test cases from ZIP files containing subdirectories (`input/1.txt`, `output/1.txt`). The current regex pattern `^(.*)\.(in|out|txt|ans)$` only matches files at the ZIP root level, causing the worker to fall back to dummy test data and produce incorrect verdicts for correct submissions.

The fix will modify the regex pattern to strip directory prefixes before matching, enabling support for both subdirectory format (current generator output) and root-level format (legacy compatibility).

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when ZIP entries contain directory paths that prevent regex matching
- **Property (P)**: The desired behavior - successfully extract test cases from both subdirectory and root-level formats
- **Preservation**: Existing root-level file extraction and error handling that must remain unchanged
- **downloadTestCases**: The function in `backend/src/jobs/submission.worker.js` that downloads and extracts test cases from S3 ZIP files
- **entry.entryName**: The full path of a file within the ZIP archive (e.g., `input/1.txt` or `1.in`)
- **fileMap**: The object that groups input/output pairs by base name for test case construction

## Bug Details

### Bug Condition

The bug manifests when a ZIP file contains test case files in subdirectories. The `downloadTestCases` function is either not stripping the directory prefix before regex matching, not handling the subdirectory path correctly, or using a regex pattern that requires files at the root level.

**Formal Specification:**
```
FUNCTION isBugCondition(zipEntry)
  INPUT: zipEntry of type ZipEntry with property entryName (string)
  OUTPUT: boolean
  
  RETURN zipEntry.entryName MATCHES '^[^/]+/[^/]+\.(in|out|txt|ans)$'
         AND zipEntry.entryName DOES_NOT_MATCH '^(.*)\.(in|out|txt|ans)$'
         AND testCaseExtractionFails(zipEntry)
END FUNCTION
```

### Examples

- **Subdirectory input file**: `input/1.txt` - Current regex fails to match because `entry.entryName` is `"input/1.txt"`, not `"1.txt"`
- **Subdirectory output file**: `output/1.txt` - Current regex fails to match because `entry.entryName` is `"output/1.txt"`, not `"1.txt"`
- **Root-level input file**: `1.in` - Current regex matches correctly (expected to continue working)
- **Root-level output file**: `1.out` - Current regex matches correctly (expected to continue working)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Root-level file extraction with `.in`/`.out` extensions must continue to work exactly as before
- Root-level file extraction with `.txt`/`.ans` extensions must continue to work exactly as before
- S3 download error handling must remain unchanged (throw errors, not silent fallback)
- Incomplete pair handling must remain unchanged (skip pairs missing input or output)

**Scope:**
All inputs that do NOT involve subdirectory paths should be completely unaffected by this fix. This includes:
- ZIP files with root-level test case files (`1.in`, `1.out`, `1.txt`, `1.ans`)
- S3 download failures (should still throw errors)
- Corrupted ZIP files (should still throw errors)
- ZIP files with incomplete pairs (should still skip incomplete pairs)

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Regex Pattern Limitation**: The pattern `^(.*)\.(in|out|txt|ans)$` matches the entire `entry.entryName`, which includes directory prefixes like `input/` or `output/`, causing the base name extraction to fail
   - For `input/1.txt`, the regex captures `input/1` as the base name instead of `1`
   - This causes input and output files to have different base names (`input/1` vs `output/1`)
   - The pairing logic fails because base names don't match

2. **Missing Path Normalization**: The function does not strip directory prefixes before applying the regex pattern

3. **Base Name Extraction Logic**: The captured group `match[1]` includes the directory path, preventing proper pairing of input/output files

## Correctness Properties

Property 1: Bug Condition - Subdirectory Test Case Extraction

_For any_ ZIP entry where the file path contains a subdirectory prefix (e.g., `input/1.txt`, `output/1.txt`) and has a valid test case extension (`.in`, `.out`, `.txt`, `.ans`), the fixed downloadTestCases function SHALL successfully extract the base name, match input/output pairs, and return valid test case objects.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Root-Level Test Case Extraction

_For any_ ZIP entry where the file path does NOT contain a subdirectory prefix (e.g., `1.in`, `1.out`, `1.txt`, `1.ans`), the fixed downloadTestCases function SHALL produce exactly the same extraction behavior as the original function, preserving all existing root-level file handling.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `backend/src/jobs/submission.worker.js`

**Function**: `downloadTestCases`

**Specific Changes**:
1. **Extract Base File Name**: Before applying the regex, strip any directory prefix from `entry.entryName` using `path.basename()` or a manual string operation
   - Change: `const fileName = entry.entryName;` 
   - To: `const fileName = entry.entryName.split('/').pop();` or `const fileName = path.basename(entry.entryName);`

2. **Apply Regex to Base Name**: Keep the existing regex pattern but apply it to the stripped file name
   - The regex `^(.*)\.(in|out|txt|ans)$` will now match `1.txt` instead of `input/1.txt`
   - This ensures base name extraction works correctly for both formats

3. **Preserve Existing Logic**: Keep all other logic unchanged (file pairing, content reading, validation)
   - The `fileMap` grouping logic remains the same
   - The input/output assignment logic remains the same
   - The validation and fallback logic remains the same

**Implementation Approach**:
```javascript
// BEFORE (line ~240):
const fileName = entry.entryName;
const match = fileName.match(/^(.*)\.(in|out|txt|ans)$/i);

// AFTER:
const fileName = entry.entryName.split('/').pop(); // Strip directory prefix
const match = fileName.match(/^(.*)\.(in|out|txt|ans)$/i);
```

This minimal change ensures:
- Subdirectory files like `input/1.txt` become `1.txt` before regex matching
- Root-level files like `1.in` remain `1.in` (no change)
- Base name extraction works correctly for both formats

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Create test ZIP files with subdirectory structure (`input/1.txt`, `output/1.txt`) and call `downloadTestCases()` on the UNFIXED code. Assert that the function returns the fallback dummy test case instead of the actual test cases. Inspect logs to confirm "No valid input/output pairs found in ZIP" warning.

**Test Cases**:
1. **Subdirectory Format Test**: Create ZIP with `input/1.txt` and `output/1.txt`, call downloadTestCases() (will fail on unfixed code - returns dummy data)
2. **Multiple Test Cases**: Create ZIP with `input/1.txt`, `input/2.txt`, `output/1.txt`, `output/2.txt` (will fail on unfixed code - returns dummy data)
3. **Mixed Extensions**: Create ZIP with `input/1.txt`, `output/1.ans` (will fail on unfixed code - returns dummy data)
4. **Deep Nesting**: Create ZIP with `test/input/1.txt` (may fail on unfixed code - tests edge case)

**Expected Counterexamples**:
- Function returns `[{ input: '1 2\n', output: '3\n' }]` instead of actual test cases
- Possible causes: regex fails to match subdirectory paths, base name extraction includes directory prefix, pairing logic fails due to mismatched base names

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL zipEntry WHERE isBugCondition(zipEntry) DO
  testCases := downloadTestCases_fixed(zipWithEntry)
  ASSERT testCases.length > 0
  ASSERT testCases[0].input !== '1 2\n' // Not fallback data
  ASSERT testCases[0].output !== '3\n'  // Not fallback data
  ASSERT testCases contain actual file contents from ZIP
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL zipEntry WHERE NOT isBugCondition(zipEntry) DO
  ASSERT downloadTestCases_original(zip) = downloadTestCases_fixed(zip)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for root-level ZIP files, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Root-Level .in/.out Preservation**: Create ZIP with `1.in`, `1.out`, verify extraction works on unfixed code, then verify same behavior on fixed code
2. **Root-Level .txt/.ans Preservation**: Create ZIP with `1.txt`, `1.ans`, verify extraction works on unfixed code, then verify same behavior on fixed code
3. **Error Handling Preservation**: Test S3 download failure, verify error is thrown (not silent fallback) on both unfixed and fixed code
4. **Incomplete Pair Preservation**: Create ZIP with `1.in` but no `1.out`, verify pair is skipped on both unfixed and fixed code

### Unit Tests

- Test subdirectory format extraction (`input/1.txt`, `output/1.txt`)
- Test root-level format extraction (`1.in`, `1.out`)
- Test mixed format extraction (some subdirectory, some root-level)
- Test edge cases (deep nesting, special characters in file names)
- Test incomplete pairs (input without output, output without input)
- Test empty ZIP files
- Test ZIP files with only directories

### Property-Based Tests

- Generate random ZIP structures with varying directory depths and verify extraction works correctly
- Generate random file name patterns and verify regex matching works for valid extensions
- Generate random combinations of subdirectory and root-level files and verify all are extracted
- Test that all valid input/output pairs are extracted regardless of ZIP structure

### Integration Tests

- Test full submission flow with subdirectory format ZIP (upload, judge, verify correct verdict)
- Test full submission flow with root-level format ZIP (upload, judge, verify correct verdict)
- Test that correct code receives AC verdict with subdirectory format test cases
- Test that incorrect code receives WA verdict with subdirectory format test cases
