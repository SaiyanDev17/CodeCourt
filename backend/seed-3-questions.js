/**
 * Seed 3 Additional Competitive Programming Questions & Hidden Test Cases
 * Reference: ADD_MULTIPLE_QUESTIONS_AND_TEST_CASES.md
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AdmZip = require('adm-zip');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const Problem = require('./src/modules/problems/model');
const User = require('./src/modules/auth/model');
const s3Client = require('./src/config/s3');
const { getBucketName } = require('./src/config/s3');
const redis = require('./src/config/redis');

const S3_BUCKET_NAME = getBucketName();

const newQuestions = [
  {
    title: "Reverse Array",
    slug: "reverse-array",
    description: "Given n integers, print them in reverse order on one line.",
    constraints: "1 <= n <= 100000\n-1000000000 <= a[i] <= 1000000000",
    timeLimit: 1000,
    memoryLimit: 128,
    difficulty: "easy",
    sampleTestCases: [
      {
        input: "5\n1 2 3 4 5\n",
        output: "5 4 3 2 1\n"
      }
    ],
    hiddenTests: [
      { input: "5\n1 2 3 4 5\n", output: "5 4 3 2 1\n" },
      { input: "1\n42\n", output: "42\n" },
      { input: "6\n-1 0 8 8 10 -5\n", output: "-5 10 8 8 0 -1\n" },
      { input: "4\n1000000000 -1000000000 7 7\n", output: "7 7 -1000000000 1000000000\n" }
    ]
  },
  {
    title: "Sum of Array",
    slug: "sum-of-array",
    description: "Given n integers, print their sum. Use 64-bit integer type.",
    constraints: "1 <= n <= 100000\n-1000000000 <= a[i] <= 1000000000",
    timeLimit: 1000,
    memoryLimit: 128,
    difficulty: "easy",
    sampleTestCases: [
      {
        input: "5\n1 2 3 4 5\n",
        output: "15\n"
      }
    ],
    hiddenTests: [
      { input: "5\n1 2 3 4 5\n", output: "15\n" },
      { input: "4\n-10 20 -30 40\n", output: "20\n" },
      { input: "1\n1000000000\n", output: "1000000000\n" },
      { input: "6\n1000000000 1000000000 1000000000 -1 -2 -3\n", output: "2999999994\n" }
    ]
  },
  {
    title: "Count Even Numbers",
    slug: "count-even-numbers",
    description: "Given n integers, print how many of them are even.",
    constraints: "1 <= n <= 100000\n-1000000000 <= a[i] <= 1000000000",
    timeLimit: 1000,
    memoryLimit: 128,
    difficulty: "easy",
    sampleTestCases: [
      {
        input: "6\n1 2 3 4 5 6\n",
        output: "3\n"
      }
    ],
    hiddenTests: [
      { input: "6\n1 2 3 4 5 6\n", output: "3\n" },
      { input: "5\n1 3 5 7 9\n", output: "0\n" },
      { input: "5\n-2 -4 -5 0 11\n", output: "3\n" },
      { input: "4\n1000000000 -1000000000 999999999 -999999999\n", output: "2\n" }
    ]
  }
];

async function main() {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find author
    let admin = await User.findOne({ role: { $in: ['admin', 'problem_setter'] } });
    let authorId = admin ? admin._id : null;

    if (!authorId) {
      const existingProblem = await Problem.findOne();
      if (existingProblem) authorId = existingProblem.authorId;
    }

    if (!authorId) {
      console.error('❌ No valid authorId found!');
      process.exit(1);
    }

    console.log(`👤 Using authorId: ${authorId}`);

    for (const q of newQuestions) {
      console.log(`\n📌 Processing question: "${q.title}" (${q.slug})`);

      let problem = await Problem.findOne({ slug: q.slug });
      if (!problem) {
        problem = await Problem.create({
          title: q.title,
          slug: q.slug,
          description: q.description,
          constraints: q.constraints,
          timeLimit: q.timeLimit,
          memoryLimit: q.memoryLimit,
          difficulty: q.difficulty,
          sampleTestCases: q.sampleTestCases,
          status: 'published',
          authorId
        });
        console.log(`   ✨ Created problem document with ID: ${problem._id}`);
      } else {
        console.log(`   ℹ️  Problem document already exists with ID: ${problem._id}`);
      }

      // Create ZIP buffer using AdmZip
      const zip = new AdmZip();
      q.hiddenTests.forEach((tc, idx) => {
        const testNum = idx + 1;
        zip.addFile(`input/${testNum}.txt`, Buffer.from(tc.input, 'utf8'));
        zip.addFile(`output/${testNum}.txt`, Buffer.from(tc.output, 'utf8'));
      });
      const zipBuffer = zip.toBuffer();

      // S3 upload key
      const s3Key = `test-cases/${problem._id}/hidden.zip`;
      console.log(`   📦 Uploading hidden test ZIP to S3 key: ${s3Key}`);

      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: zipBuffer,
        ContentType: 'application/zip'
      }));

      // Update problem document with S3 key and set status to published
      problem.hiddenTestCasesS3Key = s3Key;
      problem.status = 'published';
      problem.rejectionReason = null;
      await problem.save();

      console.log(`   ✅ S3 key saved and status updated to 'published'`);
    }

    // Invalidate redis cache if available
    try {
      await redis.del('problems:list');
      console.log('\n🧹 Redis cache cleared');
    } catch (e) {
      // Redis warning ignored
    }

    // Display summary of all problems in database
    console.log('\n================ ALL PROBLEMS IN DATABASE ================');
    const allProblems = await Problem.find({}, 'title slug status hiddenTestCasesS3Key difficulty');
    console.log(JSON.stringify(allProblems, null, 2));

    console.log('\n🎉 Successfully added and published all 3 new questions!\n');
  } catch (error) {
    console.error('\n❌ Script Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    try { redis.disconnect(); } catch (_) {}
  }
}

main();
