/**
 * Check submission details including compiler error
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Submission = require('./src/modules/submissions/model');

async function checkSubmission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get the most recent submission
    const submission = await Submission.findOne().sort({ createdAt: -1 });
    
    if (!submission) {
      console.log('No submissions found');
      await mongoose.connection.close();
      return;
    }
    
    console.log('\n📋 Most Recent Submission:\n');
    console.log(`ID: ${submission._id}`);
    console.log(`Verdict: ${submission.verdict}`);
    console.log(`Language: ${submission.language}`);
    console.log(`Created: ${submission.createdAt}`);
    console.log(`\nCode:\n${submission.code.substring(0, 200)}...`);
    
    if (submission.compilerError) {
      console.log(`\n❌ Compiler Error:\n${submission.compilerError}`);
    }
    
    console.log('');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSubmission();
