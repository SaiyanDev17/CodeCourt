# Bugfix Requirements Document

## Introduction

Two runtime errors are occurring in the Next.js frontend application that cause unhandled exceptions and crash the UI:

1. **Contest Page Error**: `TypeError: contests.filter is not a function` at `app/contests/page.tsx:44` - occurs when the API returns a non-array response for contests data
2. **Problem Page Error**: `TypeError: Cannot read properties of undefined (reading 'charAt')` at `app/problems/[slug]/page.tsx:291` - occurs when `problem.difficulty` is undefined or null

These errors prevent users from viewing the contests page and problem details page, resulting in a broken user experience.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the contests API returns a non-array response (e.g., object, null, undefined) THEN the system crashes with "TypeError: contests.filter is not a function" when attempting to categorize contests

1.2 WHEN a problem object has an undefined or null difficulty field THEN the system crashes with "TypeError: Cannot read properties of undefined (reading 'charAt')" when rendering the difficulty badge

### Expected Behavior (Correct)

2.1 WHEN the contests API returns a non-array response THEN the system SHALL treat it as an empty array and display "No contests" messages without crashing

2.2 WHEN a problem object has an undefined or null difficulty field THEN the system SHALL display a default difficulty label (e.g., "Unknown") without crashing

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the contests API returns a valid array of contests THEN the system SHALL CONTINUE TO categorize and display them correctly by status (active, upcoming, past)

3.2 WHEN a problem object has a valid difficulty field ("easy", "medium", or "hard") THEN the system SHALL CONTINUE TO display the correctly formatted and styled difficulty badge

3.3 WHEN the contests page loads successfully THEN the system SHALL CONTINUE TO display all contest metadata (start time, duration, participants, problems count) correctly

3.4 WHEN the problem page loads successfully THEN the system SHALL CONTINUE TO display all problem metadata (title, time limit, memory limit, description, constraints, sample test cases) correctly
