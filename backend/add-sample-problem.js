/**
 * Quick Script to Add a Sample Problem
 * 
 * This script adds a "Two Sum" problem to your database
 * Run: node add-sample-problem.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('./src/modules/problems/model');

const sampleProblem = {
  title: "Two Sum",
  slug: "two-sum",
  description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [3,3], target = 6
Output: [0,1]
\`\`\``,
  constraints: `- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
  timeLimit: 2000, // 2 seconds
  memoryLimit: 256, // 256 MB
  difficulty: "easy",
  sampleTestCases: [
    {
      input: "4\n2 7 11 15\n9",
      output: "0 1"
    },
    {
      input: "3\n3 2 4\n6",
      output: "1 2"
    },
    {
      input: "2\n3 3\n6",
      output: "0 1"
    }
  ],
  status: "draft", // Will need admin approval
  authorId: null // Will be set to first admin user
};

async function addSampleProblem() {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codecourt');
    console.log('✅ Connected to MongoDB\n');
    
    // Find an admin user to set as author
    const User = require('./src/modules/auth/model');
    const admin = await User.findOne({ role: { $in: ['admin', 'problem_setter'] } });
    
    if (!admin) {
      console.error('❌ No admin or problem_setter user found!');
      console.log('\n💡 Create an admin user first:');
      console.log('   1. Register via API: POST /api/auth/register');
      console.log('   2. Update role in MongoDB: db.users.updateOne({email:"your@email.com"}, {$set:{role:"admin"}})');
      process.exit(1);
    }
    
    sampleProblem.authorId = admin._id;
    console.log('👤 Using author:', admin.username, `(${admin.role})\n`);
    
    // Check if problem already exists
    const existing = await Problem.findOne({ slug: sampleProblem.slug });
    if (existing) {
      console.log('⚠️  Problem "Two Sum" already exists!');
      console.log('   ID:', existing._id);
      console.log('   Status:', existing.status);
      console.log('   Created:', existing.createdAt);
      console.log('\n💡 To add it again:');
      console.log('   1. Delete existing: db.problems.deleteOne({slug:"two-sum"})');
      console.log('   2. Or use a different slug in this script');
      process.exit(0);
    }
    
    // Create problem
    console.log('📝 Creating problem...');
    const problem = await Problem.create(sampleProblem);
    
    console.log('✅ Problem created successfully!\n');
    console.log('📊 Problem Details:');
    console.log('   ID:', problem._id);
    console.log('   Title:', problem.title);
    console.log('   Slug:', problem.slug);
    console.log('   Status:', problem.status);
    console.log('   Difficulty:', problem.difficulty);
    console.log('   Time Limit:', problem.timeLimit, 'ms');
    console.log('   Memory Limit:', problem.memoryLimit, 'MB');
    console.log('   Sample Test Cases:', problem.sampleTestCases.length);
    console.log('');
    
    console.log('🎯 Next Steps:');
    console.log('   1. Upload hidden test cases:');
    console.log(`      POST /api/problems/${problem._id}/upload-tests`);
    console.log('      (Upload a ZIP file with input/ and output/ folders)');
    console.log('');
    console.log('   2. Approve the problem (admin only):');
    console.log(`      POST /api/problems/${problem._id}/approve`);
    console.log('');
    console.log('   3. View the problem:');
    console.log(`      GET /api/problems/${problem.slug}`);
    console.log('');
    console.log('📖 See HOW_TO_ADD_PROBLEMS.md for detailed instructions');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 11000) {
      console.log('\n💡 Duplicate key error - problem with this slug already exists');
    } else if (error.name === 'ValidationError') {
      console.log('\n💡 Validation error:', error.message);
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed\n');
  }
}

// Run the script
addSampleProblem();
