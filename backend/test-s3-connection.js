/**
 * Quick S3 Connection Test
 * 
 * This script tests if your AWS credentials are working correctly.
 * Run: node test-s3-connection.js
 */

require('dotenv').config();
const { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

async function testS3Connection() {
  console.log('\n🧪 Testing S3 Connection...\n');
  
  // Check environment variables
  console.log('📋 Configuration:');
  console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
  console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
  console.log('  AWS_REGION:', process.env.AWS_REGION || '❌ Missing');
  console.log('  S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME || '❌ Missing');
  console.log('  USE_LOCAL_STORAGE:', process.env.USE_LOCAL_STORAGE);
  console.log('');
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not configured in .env file');
    console.log('\nPlease update backend/.env with your AWS credentials:');
    console.log('  AWS_ACCESS_KEY_ID=your_access_key_id');
    console.log('  AWS_SECRET_ACCESS_KEY=your_secret_access_key');
    process.exit(1);
  }
  
  // Create S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  
  try {
    // Test 1: List buckets (verify credentials work)
    console.log('🔍 Test 1: Verifying AWS credentials...');
    const listCommand = new ListBucketsCommand({});
    const { Buckets } = await s3Client.send(listCommand);
    console.log('✅ Credentials valid! Found', Buckets.length, 'bucket(s)');
    
    // Check if our bucket exists
    const ourBucket = Buckets.find(b => b.Name === process.env.S3_BUCKET_NAME);
    if (ourBucket) {
      console.log('✅ Target bucket found:', process.env.S3_BUCKET_NAME);
    } else {
      console.log('⚠️  Target bucket not found:', process.env.S3_BUCKET_NAME);
      console.log('   Available buckets:', Buckets.map(b => b.Name).join(', '));
    }
    console.log('');
    
    // Test 2: Upload a test file
    console.log('🔍 Test 2: Testing file upload...');
    const testKey = 'test-cases/test-connection/hello.txt';
    const testContent = Buffer.from('Hello from CodeCourt! S3 is working! 🎉');
    
    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    });
    
    await s3Client.send(putCommand);
    console.log('✅ File uploaded successfully:', testKey);
    console.log('');
    
    // Test 3: Download the test file
    console.log('🔍 Test 3: Testing file download...');
    const getCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: testKey
    });
    
    const response = await s3Client.send(getCommand);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const downloadedContent = Buffer.concat(chunks).toString();
    console.log('✅ File downloaded successfully');
    console.log('   Content:', downloadedContent);
    console.log('');
    
    // Test 4: Delete the test file
    console.log('🔍 Test 4: Testing file deletion...');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: testKey
    });
    
    await s3Client.send(deleteCommand);
    console.log('✅ File deleted successfully');
    console.log('');
    
    // Success!
    console.log('🎉 All tests passed! S3 is configured correctly!\n');
    console.log('✅ Your CodeCourt backend can now use S3 for test case storage.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart your backend: npm run dev');
    console.log('  2. Look for "📦 Storage mode: S3" in the logs');
    console.log('  3. Create a problem and upload test cases');
    console.log('  4. Check S3 console to verify files are uploaded');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ S3 Test Failed!\n');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.name === 'InvalidAccessKeyId') {
      console.log('💡 Fix: Your AWS_ACCESS_KEY_ID is incorrect');
      console.log('   Check: backend/.env → AWS_ACCESS_KEY_ID');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log('💡 Fix: Your AWS_SECRET_ACCESS_KEY is incorrect');
      console.log('   Check: backend/.env → AWS_SECRET_ACCESS_KEY');
    } else if (error.name === 'NoSuchBucket') {
      console.log('💡 Fix: Bucket name is incorrect or bucket doesn\'t exist');
      console.log('   Check: backend/.env → S3_BUCKET_NAME');
      console.log('   Expected:', process.env.S3_BUCKET_NAME);
    } else if (error.name === 'AccessDenied') {
      console.log('💡 Fix: IAM user doesn\'t have S3 permissions');
      console.log('   Ask your teammate to grant S3 permissions to your IAM user');
    } else {
      console.log('💡 Check:');
      console.log('   - AWS credentials are correct');
      console.log('   - Bucket name matches exactly');
      console.log('   - Region is correct (eu-north-1)');
      console.log('   - IAM user has S3 permissions');
    }
    console.log('');
    process.exit(1);
  }
}

// Run the test
testS3Connection();
