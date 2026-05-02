/**
 * Upload test cases to Two Sum problem
 * Run: node upload-test-cases.js
 */

require('dotenv').config();
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function uploadTestCases() {
  try {
    console.log('\n🔐 Logging in as admin...');
    
    // Login as admin
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@codecourt.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.accessToken || loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Get Two Sum problem
    console.log('\n🔍 Finding Two Sum problem...');
    const problemsResponse = await axios.get(`${API_URL}/api/problems`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const problems = problemsResponse.data.problems || problemsResponse.data;
    const twoSumProblem = problems.find(p => p.slug === 'two-sum');
    if (!twoSumProblem) {
      console.error('❌ Two Sum problem not found');
      process.exit(1);
    }
    
    console.log(`✅ Found problem: ${twoSumProblem.title} (ID: ${twoSumProblem._id})`);
    
    // Upload test cases
    console.log('\n📤 Uploading test cases...');
    const form = new FormData();
    form.append('testCases', fs.createReadStream('./hidden-tests.zip'));
    
    const uploadResponse = await axios.post(
      `${API_URL}/api/problems/${twoSumProblem._id}/upload-tests`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Test cases uploaded successfully!');
    console.log(`📊 S3 Key: ${uploadResponse.data.hiddenTestCasesS3Key}`);
    console.log('\n🎉 Done! You can now submit solutions and get correct verdicts.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

uploadTestCases();
