# All Submissions Page

This page displays all submissions by the authenticated user across all problems.

## Features

- **Loading State**: Displays a spinner while fetching submissions from the API
- **Empty State**: Shows a friendly message when the user has no submissions
- **Submission List**: Renders all submissions with:
  - Problem title (clickable link to problem page)
  - Verdict badge (color-coded with icon)
  - Programming language (uppercase)
  - Execution time with clock icon (if available)
  - Memory usage with memory icon (if available)
  - Formatted timestamp
- **Card Layout**: Each submission is displayed in a card with hover shadow effect
- **Responsive Design**: Works on all screen sizes using Tailwind CSS

## Route

`/submissions`

## API Endpoint

`GET /api/submissions`

Returns:
```json
{
  "count": 2,
  "submissions": [
    {
      "_id": "sub1",
      "verdict": "AC",
      "executionTime": 123,
      "memoryUsed": 2.5,
      "language": "cpp",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "problemId": "prob1",
      "problemTitle": "Two Sum",
      "problemSlug": "two-sum"
    }
  ]
}
```

## Components Used

- `VerdictBadge`: Color-coded badge component for displaying verdicts
- `ClockIcon`: SVG icon for execution time
- `MemoryIcon`: SVG icon for memory usage

## Requirements Validated

- **5.1**: Displays all user submissions across all problems
- **5.2**: Shows problem title, verdict, language, execution metrics, and timestamp
- **5.3**: Problem title links to problem page
- **5.6**: Shows "No submissions found" when empty

## Testing

Run tests with:
```bash
npm test app/submissions/page.test.tsx
```

All 9 tests pass:
- Loading state display
- Empty state display
- Submission list rendering
- Execution metrics display
- Error handling
- API integration
- Timestamp formatting

## Manual Testing

1. Navigate to `/submissions` while logged in
2. Verify loading spinner appears briefly
3. Verify submissions are displayed with all required fields
4. Click on a problem title to navigate to the problem page
5. Verify responsive layout on mobile devices
