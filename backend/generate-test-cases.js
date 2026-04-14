/**
 * Generate Test Cases for Two Sum Problem
 * 
 * This script generates random test cases and creates a ZIP file
 * Run: node generate-test-cases.js
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const NUM_TESTS = 20; // Number of test cases to generate
const OUTPUT_DIR = './test-cases-output';
const ZIP_FILE = './hidden-tests.zip';

// Create directories
function setupDirectories() {
  const inputDir = path.join(OUTPUT_DIR, 'input');
  const outputDir = path.join(OUTPUT_DIR, 'output');
  
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  
  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  
  return { inputDir, outputDir };
}

// Generate random test case for Two Sum problem
function generateTwoSumTest(testNum) {
  // Random array size (2 to 100)
  const n = Math.floor(Math.random() * 99) + 2;
  
  // Generate random array
  const nums = Array.from({ length: n }, () => 
    Math.floor(Math.random() * 2000) - 1000 // Range: -1000 to 999
  );
  
  // Pick two random indices
  const idx1 = Math.floor(Math.random() * n);
  let idx2 = Math.floor(Math.random() * n);
  while (idx2 === idx1) {
    idx2 = Math.floor(Math.random() * n);
  }
  
  // Calculate target
  const target = nums[idx1] + nums[idx2];
  
  // Create input (format: n, array elements, target)
  const input = `${n}\n${nums.join(' ')}\n${target}`;
  
  // Create output (format: index1 index2, smaller index first)
  const output = `${Math.min(idx1, idx2)} ${Math.max(idx1, idx2)}`;
  
  return { input, output };
}

// Generate all test cases
function generateAllTests(inputDir, outputDir) {
  console.log(`\n📝 Generating ${NUM_TESTS} test cases...\n`);
  
  for (let i = 1; i <= NUM_TESTS; i++) {
    const { input, output } = generateTwoSumTest(i);
    
    // Write input file
    const inputFile = path.join(inputDir, `${i}.txt`);
    fs.writeFileSync(inputFile, input);
    
    // Write output file
    const outputFile = path.join(outputDir, `${i}.txt`);
    fs.writeFileSync(outputFile, output);
    
    console.log(`✅ Test ${i}/${NUM_TESTS}: ${input.split('\n')[0]} elements, target = ${input.split('\n')[2]}`);
  }
  
  console.log(`\n✅ Generated ${NUM_TESTS} test cases\n`);
}

// Create ZIP file
function createZipFile() {
  return new Promise((resolve, reject) => {
    console.log('📦 Creating ZIP file...\n');
    
    const output = fs.createWriteStream(ZIP_FILE);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      console.log(`✅ Created ${ZIP_FILE} (${sizeKB} KB)\n`);
      resolve();
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add input and output directories to ZIP
    archive.directory(path.join(OUTPUT_DIR, 'input'), 'input');
    archive.directory(path.join(OUTPUT_DIR, 'output'), 'output');
    
    archive.finalize();
  });
}

// Main function
async function main() {
  try {
    console.log('\n🧪 Two Sum Test Case Generator\n');
    console.log('═'.repeat(50));
    
    // Setup directories
    const { inputDir, outputDir } = setupDirectories();
    
    // Generate test cases
    generateAllTests(inputDir, outputDir);
    
    // Create ZIP file
    await createZipFile();
    
    // Cleanup temporary directory
    console.log('🧹 Cleaning up temporary files...');
    fs.rmSync(OUTPUT_DIR, { recursive: true });
    console.log('✅ Cleanup complete\n');
    
    console.log('═'.repeat(50));
    console.log('\n🎉 Success! Test cases ready for upload\n');
    console.log('📁 File created: hidden-tests.zip');
    console.log(`📊 Contains: ${NUM_TESTS} test cases\n`);
    console.log('🎯 Next Steps:');
    console.log('   1. Upload to S3 via API:');
    console.log('      POST /api/problems/{problemId}/upload-tests');
    console.log('      Body: testCases=@hidden-tests.zip');
    console.log('');
    console.log('   2. Or use curl:');
    console.log('      curl -X POST http://localhost:5000/api/problems/PROBLEM_ID/upload-tests \\');
    console.log('        -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('        -F "testCases=@hidden-tests.zip"');
    console.log('');
    console.log('📖 See HOW_TO_ADD_PROBLEMS.md for detailed instructions\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if archiver is installed
try {
  require.resolve('archiver');
  main();
} catch (e) {
  console.error('\n❌ Missing dependency: archiver\n');
  console.log('💡 Install it with:');
  console.log('   npm install archiver\n');
  process.exit(1);
}
