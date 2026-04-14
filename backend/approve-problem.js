/**
 * Quick Script: Approve Problem
 * 
 * This script approves a problem by changing its status from 'draft' to 'published'
 * 
 * Usage:
 *   node approve-problem.js
 * 
 * The script will:
 * 1. Connect to MongoDB
 * 2. Show all problems with their current status
 * 3. Ask which problem to approve
 * 4. Update the status to 'published'
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function approveProblem() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/codecourt';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get Problem model
    const Problem = mongoose.model('Problem', new mongoose.Schema({}, { strict: false }));

    // List all problems
    const problems = await Problem.find({}).select('_id title slug status').lean();
    
    if (problems.length === 0) {
      console.log('❌ No problems found in database');
      process.exit(0);
    }

    console.log('📋 Problems in database:\n');
    problems.forEach((p, index) => {
      const statusEmoji = p.status === 'published' ? '✅' : p.status === 'draft' ? '📝' : '❌';
      console.log(`${index + 1}. ${statusEmoji} ${p.title}`);
      console.log(`   Slug: ${p.slug}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   ID: ${p._id}\n`);
    });

    // Ask which problem to approve
    const answer = await question('Enter the number of the problem to approve (or "all" for all draft problems): ');
    
    if (answer.toLowerCase() === 'all') {
      // Approve all draft problems
      const result = await Problem.updateMany(
        { status: 'draft' },
        { $set: { status: 'published', rejectionReason: null } }
      );
      console.log(`\n✅ Approved ${result.modifiedCount} problem(s)!`);
    } else {
      const index = parseInt(answer) - 1;
      
      if (index < 0 || index >= problems.length) {
        console.log('❌ Invalid selection');
        process.exit(1);
      }

      const selectedProblem = problems[index];
      
      if (selectedProblem.status === 'published') {
        console.log(`\n⚠️  Problem "${selectedProblem.title}" is already published`);
      } else {
        // Approve the problem
        await Problem.findByIdAndUpdate(
          selectedProblem._id,
          { $set: { status: 'published', rejectionReason: null } }
        );
        console.log(`\n✅ Problem "${selectedProblem.title}" has been approved!`);
      }
    }

    console.log('\n🎉 Done! The problem should now appear in:');
    console.log('   - GET /api/problems (problem list)');
    console.log('   - Frontend problem list');
    console.log('\n💡 Refresh your frontend (Ctrl+F5) to see the changes');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

approveProblem();
