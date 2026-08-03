# Adding Multiple Questions and Hidden Test Cases

This guide explains how to add many problems/questions to CodeCourt and how hidden test case ZIP files are matched to the correct question.

## Key Idea

Each question/problem is a separate MongoDB document.

Each problem stores its own hidden test ZIP location in this field:

```text
hiddenTestCasesS3Key
```

When you upload hidden tests for a problem, the backend stores the ZIP in S3 at:

```text
test-cases/{problemId}/hidden.zip
```

Example:

```text
test-cases/66af1234567890abcdef0001/hidden.zip
test-cases/66af1234567890abcdef0002/hidden.zip
test-cases/66af1234567890abcdef0003/hidden.zip
```

So even if every ZIP contains the same internal folders named `input/` and `output/`, the questions do not conflict. They are separated by the outer S3 path, which contains the unique MongoDB problem ID.

## Current Flow

For every question, do this:

1. Create the problem metadata in MongoDB using `POST /api/problems`.
2. Save the returned problem `_id`.
3. Create a hidden test ZIP for that specific problem.
4. Upload that ZIP using `POST /api/problems/:id/upload-tests`.
5. Approve the problem using `POST /api/problems/:id/approve`.

Repeat the same steps for every new question.

## Required Roles

You must be logged in as one of these roles:

```text
admin
problem_setter
```

Approving a problem requires:

```text
admin
```

## Step 1: Login

Endpoint:

```http
POST /api/auth/login
```

Example:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

Save the returned `accessToken`.

Use it in later requests:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Step 2: Create Question 1

Endpoint:

```http
POST /api/problems
```

Example:

```bash
curl -X POST http://localhost:5000/api/problems \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Two Sum",
    "slug": "two-sum",
    "description": "Given n integers and a target, print two indices whose values sum to target.",
    "constraints": "2 <= n <= 100000",
    "timeLimit": 2000,
    "memoryLimit": 256,
    "difficulty": "easy",
    "sampleTestCases": [
      {
        "input": "4\n2 7 11 15\n9\n",
        "output": "0 1\n"
      }
    ]
  }'
```

Save the returned `_id`.

Example:

```text
66af1234567890abcdef0001
```

## Step 3: Prepare Hidden Tests for Question 1

Create this folder structure locally:

```text
two-sum-tests/
  input/
    1.txt
    2.txt
    3.txt
  output/
    1.txt
    2.txt
    3.txt
```

The judge pairs files by filename.

These two files form test case 1:

```text
input/1.txt
output/1.txt
```

These two files form test case 2:

```text
input/2.txt
output/2.txt
```

And so on.

Example:

`input/1.txt`

```text
4
2 7 11 15
9
```

`output/1.txt`

```text
0 1
```

Zip only the contents so the ZIP contains `input/` and `output/`.

Correct ZIP structure:

```text
hidden.zip
  input/
    1.txt
    2.txt
  output/
    1.txt
    2.txt
```

Also acceptable:

```text
hidden.zip
  two-sum-tests/
    input/
      1.txt
    output/
      1.txt
```

The worker currently detects paths containing `/input/` and `/output/`, so both structures work.

## Step 4: Upload Hidden Tests for Question 1

Endpoint:

```http
POST /api/problems/:id/upload-tests
```

Important:

- Replace `:id` with the problem `_id`.
- Form field name must be exactly `testCases`.
- File must be a `.zip`.

Example:

```bash
curl -X POST http://localhost:5000/api/problems/66af1234567890abcdef0001/upload-tests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "testCases=@hidden.zip"
```

The backend uploads the ZIP to:

```text
s3://YOUR_BUCKET/test-cases/66af1234567890abcdef0001/hidden.zip
```

Then it saves this on the problem:

```json
{
  "hiddenTestCasesS3Key": "test-cases/66af1234567890abcdef0001/hidden.zip"
}
```

## Step 5: Approve Question 1

Endpoint:

```http
POST /api/problems/:id/approve
```

Example:

```bash
curl -X POST http://localhost:5000/api/problems/66af1234567890abcdef0001/approve \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

After approval, users can see and submit to the problem.

## Step 6: Add Question 2

Repeat the same process with a different `slug`.

Example:

```bash
curl -X POST http://localhost:5000/api/problems \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Reverse Array",
    "slug": "reverse-array",
    "description": "Given n integers, print them in reverse order.",
    "constraints": "1 <= n <= 100000",
    "timeLimit": 1000,
    "memoryLimit": 128,
    "difficulty": "easy",
    "sampleTestCases": [
      {
        "input": "5\n1 2 3 4 5\n",
        "output": "5 4 3 2 1\n"
      }
    ]
  }'
```

Assume this returns:

```text
66af1234567890abcdef0002
```

Prepare a separate ZIP:

```text
reverse-array-hidden.zip
  input/
    1.txt
    2.txt
  output/
    1.txt
    2.txt
```

Upload it to the second problem:

```bash
curl -X POST http://localhost:5000/api/problems/66af1234567890abcdef0002/upload-tests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "testCases=@reverse-array-hidden.zip"
```

This second ZIP goes to a different S3 key:

```text
test-cases/66af1234567890abcdef0002/hidden.zip
```

So it cannot overwrite or mix with Question 1.

## Starter Pack: 4 Questions and 4 Hidden Test ZIPs

Use this section as a working starter set. Create each problem first, save its returned `_id`, then create and upload the matching ZIP for that one problem.

The four starter questions are:

```text
1. Two Sum
2. Reverse Array
3. Sum of Array
4. Count Even Numbers
```

Each question has its own ZIP:

```text
two-sum-hidden.zip
reverse-array-hidden.zip
sum-of-array-hidden.zip
count-even-numbers-hidden.zip
```

Do not upload all four ZIPs to one problem. Upload each ZIP to the matching problem ID.

### Question 1: Two Sum

Create problem:

```bash
curl -X POST http://localhost:5000/api/problems \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Two Sum",
    "slug": "two-sum",
    "description": "Given n integers and a target, print two distinct zero-based indices whose values add up to the target. If multiple answers exist, print any valid pair.",
    "constraints": "2 <= n <= 100000\n-1000000000 <= a[i] <= 1000000000\n-1000000000 <= target <= 1000000000\nAt least one valid pair exists.",
    "timeLimit": 2000,
    "memoryLimit": 256,
    "difficulty": "easy",
    "sampleTestCases": [
      {
        "input": "4\n2 7 11 15\n9\n",
        "output": "0 1\n"
      },
      {
        "input": "3\n3 2 4\n6\n",
        "output": "1 2\n"
      }
    ]
  }'
```

Create ZIP contents:

```text
two-sum-hidden/
  input/
    1.txt
    2.txt
    3.txt
    4.txt
  output/
    1.txt
    2.txt
    3.txt
    4.txt
```

`input/1.txt`

```text
4
2 7 11 15
9
```

`output/1.txt`

```text
0 1
```

`input/2.txt`

```text
3
3 2 4
6
```

`output/2.txt`

```text
1 2
```

`input/3.txt`

```text
6
-5 10 8 2 7 11
5
```

`output/3.txt`

```text
0 1
```

`input/4.txt`

```text
5
100 20 30 40 50
90
```

`output/4.txt`

```text
3 4
```

Upload:

```bash
curl -X POST http://localhost:5000/api/problems/TWO_SUM_PROBLEM_ID/upload-tests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "testCases=@two-sum-hidden.zip"
```

Note: the current backend has special checker logic for slug `two-sum`, so the exact order of the two valid indices does not matter as long as they are valid.

### Question 2: Reverse Array

Create problem:

```bash
curl -X POST http://localhost:5000/api/problems \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Reverse Array",
    "slug": "reverse-array",
    "description": "Given n integers, print them in reverse order on one line.",
    "constraints": "1 <= n <= 100000\n-1000000000 <= a[i] <= 1000000000",
    "timeLimit": 1000,
    "memoryLimit": 128,
    "difficulty": "easy",
    "sampleTestCases": [
      {
        "input": "5\n1 2 3 4 5\n",
        "output": "5 4 3 2 1\n"
      }
    ]
  }'
```

Create ZIP contents:

```text
reverse-array-hidden/
  input/
    1.txt
    2.txt
    3.txt
    4.txt
  output/
    1.txt
    2.txt
    3.txt
    4.txt
```

`input/1.txt`

```text
5
1 2 3 4 5
```

`output/1.txt`

```text
5 4 3 2 1
```

`input/2.txt`

```text
1
42
```

`output/2.txt`

```text
42
```

`input/3.txt`

```text
6
-1 0 8 8 10 -5
```

`output/3.txt`

```text
-5 10 8 8 0 -1
```

`input/4.txt`

```text
4
1000000000 -1000000000 7 7
```

`output/4.txt`

```text
7 7 -1000000000 1000000000
```

Upload:

```bash
curl -X POST http://localhost:5000/api/problems/REVERSE_ARRAY_PROBLEM_ID/upload-tests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "testCases=@reverse-array-hidden.zip"
```

### Question 3: Sum of Array

Create problem:

```bash
curl -X POST http://localhost:5000/api/problems \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sum of Array",
    "slug": "sum-of-array",
    "description": "Given n integers, print their sum. Use 64-bit integer type.",
    "constraints": "1 <= n <= 100000\n-1000000000 <= a[i] <= 1000000000",
    "timeLimit": 1000,
    "memoryLimit": 128,
    "difficulty": "easy",
    "sampleTestCases": [
      {
        "input": "5\n1 2 3 4 5\n",
        "output": "15\n"
      }
    ]
  }'
```

Create ZIP contents:

```text
sum-of-array-hidden/
  input/
    1.txt
    2.txt
    3.txt
    4.txt
  output/
    1.txt
    2.txt
    3.txt
    4.txt
```

`input/1.txt`

```text
5
1 2 3 4 5
```

`output/1.txt`

```text
15
```

`input/2.txt`

```text
4
-10 20 -30 40
```

`output/2.txt`

```text
20
```

`input/3.txt`

```text
1
1000000000
```

`output/3.txt`

```text
1000000000
```

`input/4.txt`

```text
6
1000000000 1000000000 1000000000 -1 -2 -3
```

`output/4.txt`

```text
2999999994
```

Upload:

```bash
curl -X POST http://localhost:5000/api/problems/SUM_OF_ARRAY_PROBLEM_ID/upload-tests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "testCases=@sum-of-array-hidden.zip"
```

### Question 4: Count Even Numbers

Create problem:

```bash
curl -X POST http://localhost:5000/api/problems \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Count Even Numbers",
    "slug": "count-even-numbers",
    "description": "Given n integers, print how many of them are even.",
    "constraints": "1 <= n <= 100000\n-1000000000 <= a[i] <= 1000000000",
    "timeLimit": 1000,
    "memoryLimit": 128,
    "difficulty": "easy",
    "sampleTestCases": [
      {
        "input": "6\n1 2 3 4 5 6\n",
        "output": "3\n"
      }
    ]
  }'
```

Create ZIP contents:

```text
count-even-numbers-hidden/
  input/
    1.txt
    2.txt
    3.txt
    4.txt
  output/
    1.txt
    2.txt
    3.txt
    4.txt
```

`input/1.txt`

```text
6
1 2 3 4 5 6
```

`output/1.txt`

```text
3
```

`input/2.txt`

```text
5
1 3 5 7 9
```

`output/2.txt`

```text
0
```

`input/3.txt`

```text
5
-2 -4 -5 0 11
```

`output/3.txt`

```text
3
```

`input/4.txt`

```text
4
1000000000 -1000000000 999999999 -999999999
```

`output/4.txt`

```text
2
```

Upload:

```bash
curl -X POST http://localhost:5000/api/problems/COUNT_EVEN_NUMBERS_PROBLEM_ID/upload-tests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "testCases=@count-even-numbers-hidden.zip"
```

### Creating the 4 ZIPs on Windows

Create each folder with this shape:

```text
problem-name-hidden/
  input/
  output/
```

Then right-click the `input` and `output` folders together and choose:

```text
Send to -> Compressed (zipped) folder
```

Rename the ZIP to the expected name:

```text
two-sum-hidden.zip
reverse-array-hidden.zip
sum-of-array-hidden.zip
count-even-numbers-hidden.zip
```

Make sure the ZIP opens like this:

```text
input/
output/
```

It should not open like this:

```text
two-sum-hidden/
  input/
  output/
```

The second structure usually still works in the current parser, but the first structure is cleaner.

### Approve All 4 Problems

After uploading each ZIP, approve each problem:

```bash
curl -X POST http://localhost:5000/api/problems/TWO_SUM_PROBLEM_ID/approve \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

curl -X POST http://localhost:5000/api/problems/REVERSE_ARRAY_PROBLEM_ID/approve \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

curl -X POST http://localhost:5000/api/problems/SUM_OF_ARRAY_PROBLEM_ID/approve \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

curl -X POST http://localhost:5000/api/problems/COUNT_EVEN_NUMBERS_PROBLEM_ID/approve \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## How the Judge Selects the Correct Hidden Tests

When a user submits code:

1. The submission contains `problemId`.
2. The worker loads that problem from MongoDB.
3. The worker reads `problem.hiddenTestCasesS3Key`.
4. The worker downloads only that ZIP from S3.
5. The worker parses the ZIP into test cases.
6. The worker runs the submitted code against those test cases.

Example:

Submission for Two Sum:

```text
problemId = 66af1234567890abcdef0001
```

Worker loads:

```text
hiddenTestCasesS3Key = test-cases/66af1234567890abcdef0001/hidden.zip
```

Submission for Reverse Array:

```text
problemId = 66af1234567890abcdef0002
```

Worker loads:

```text
hiddenTestCasesS3Key = test-cases/66af1234567890abcdef0002/hidden.zip
```

That is how it differentiates test cases for different questions.

## How Files Inside One ZIP Are Matched

Inside a ZIP, files are grouped by their base filename.

These match:

```text
input/1.txt  -> output/1.txt
input/2.txt  -> output/2.txt
input/10.txt -> output/10.txt
```

These do not match cleanly:

```text
input/a.txt  -> output/1.txt
input/01.txt -> output/1.txt
```

Recommended naming:

```text
1.txt
2.txt
3.txt
...
```

Use the same names in both folders.

## ZIP Rules

Use this structure:

```text
input/
  1.txt
  2.txt
output/
  1.txt
  2.txt
```

Rules:

- Every input file needs a matching output file.
- File base names must match.
- Use plain text files.
- Keep expected output exactly as the solution should print it.
- Avoid extra explanation text in output files.
- Avoid `Hello World` or prompts in submitted solutions.
- Current upload limit is 10 MB.

## Important Warning About Multiple Questions

Do not put hidden tests for multiple questions inside one ZIP.

Wrong:

```text
all-tests.zip
  two-sum/
    input/
    output/
  reverse-array/
    input/
    output/
```

Correct:

```text
two-sum-hidden.zip
  input/
  output/

reverse-array-hidden.zip
  input/
  output/
```

Upload each ZIP to its own problem ID.

## S3 Layout After Adding Multiple Questions

Your S3 bucket should look like this:

```text
codecourt-test-cases-bucket/
  test-cases/
    66af1234567890abcdef0001/
      hidden.zip
    66af1234567890abcdef0002/
      hidden.zip
    66af1234567890abcdef0003/
      hidden.zip
```

The folder names are problem IDs, not question titles.

This is good because:

- Problem IDs are unique.
- Slugs/titles can change without moving S3 files.
- Two problems cannot accidentally share one hidden ZIP unless the database key is manually changed.

## Verify a Problem Is Wired Correctly

Check MongoDB:

```javascript
db.problems.findOne(
  { slug: "two-sum" },
  { title: 1, slug: 1, hiddenTestCasesS3Key: 1, status: 1 }
)
```

Expected:

```json
{
  "title": "Two Sum",
  "slug": "two-sum",
  "status": "published",
  "hiddenTestCasesS3Key": "test-cases/66af1234567890abcdef0001/hidden.zip"
}
```

Then check S3 has the same key:

```text
test-cases/66af1234567890abcdef0001/hidden.zip
```

## Common Mistakes

### Mistake: Same slug for two questions

Each problem needs a unique slug:

```text
two-sum
reverse-array
binary-search
```

### Mistake: Uploading ZIP to the wrong problem ID

If you upload `reverse-array-hidden.zip` to the Two Sum problem ID, the judge will use Reverse Array tests for Two Sum.

Fix: upload again to the correct problem ID.

### Mistake: Mismatched file names

Wrong:

```text
input/1.txt
output/answer1.txt
```

Correct:

```text
input/1.txt
output/1.txt
```

### Mistake: Extra output from submitted code

Wrong solution output:

```text
Hello, CodeCourt!
0 1
```

Expected:

```text
0 1
```

Extra text causes `Wrong Answer`.

### Mistake: Problem is still draft

Created problems start as `draft`.

They are not visible to normal users until admin approval.

## Quick Checklist for Each New Question

- [ ] Choose a unique slug.
- [ ] Create problem with title, description, constraints, limits, difficulty, and sample tests.
- [ ] Save the returned `_id`.
- [ ] Create one ZIP for that problem only.
- [ ] Put inputs in `input/`.
- [ ] Put expected outputs in `output/`.
- [ ] Use matching filenames.
- [ ] Upload ZIP to `/api/problems/:id/upload-tests`.
- [ ] Approve the problem.
- [ ] Submit a known correct solution to verify.
- [ ] Submit a known wrong solution to verify it fails.

## Current Code References

Relevant implementation files:

```text
backend/src/modules/problems/service.js
backend/src/modules/problems/routes.js
backend/src/jobs/submission.worker.js
backend/src/modules/problems/model.js
```

Important behavior:

- Upload endpoint field name is `testCases`.
- Hidden ZIP is saved as `test-cases/{problemId}/hidden.zip`.
- Judge downloads the ZIP from `problem.hiddenTestCasesS3Key`.
- ZIP parser pairs files based on matching names under `input/` and `output/`.
