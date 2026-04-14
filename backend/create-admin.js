/**
 * Create Admin User Script
 * 
 * This script creates an admin user in your database
 * Run: node create-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const readline = require('readline');

const User = require('./src/modules/auth/model');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log('\n👤 Create Admin User\n');
    console.log('═'.repeat(50));
    
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codecourt');
    console.log('✅ Connected to MongoDB\n');
    
    // Check if any admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('   Username:', existingAdmin.username);
      console.log('   Email:', existingAdmin.email);
      console.log('   Created:', existingAdmin.createdAt);
      console.log('');
      
      const createAnother = await question('Do you want to create another admin? (yes/no): ');
      if (createAnother.toLowerCase() !== 'yes' && createAnother.toLowerCase() !== 'y') {
        console.log('\n✅ Using existing admin user\n');
        rl.close();
        await mongoose.connection.close();
        return;
      }
      console.log('');
    }
    
    // Get user input
    console.log('📝 Enter admin details:\n');
    
    const username = await question('Username: ');
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    
    const email = await question('Email: ');
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    const password = await question('Password (min 6 characters): ');
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    console.log('');
    
    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error(`Username "${username}" is already taken`);
      }
      if (existingUser.email === email) {
        throw new Error(`Email "${email}" is already registered`);
      }
    }
    
    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const admin = await User.create({
      username,
      email,
      passwordHash,
      role: 'admin'
    });
    
    console.log('✅ Admin user created successfully!\n');
    console.log('═'.repeat(50));
    console.log('\n📊 Admin Details:');
    console.log('   ID:', admin._id);
    console.log('   Username:', admin.username);
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   Created:', admin.createdAt);
    console.log('');
    
    console.log('🎯 Next Steps:');
    console.log('   1. Login via API:');
    console.log('      POST http://localhost:5000/api/auth/login');
    console.log('      Body: { "email": "' + email + '", "password": "your_password" }');
    console.log('');
    console.log('   2. Use the access token for authenticated requests');
    console.log('');
    console.log('   3. Add your first problem:');
    console.log('      node add-sample-problem.js');
    console.log('');
    console.log('📖 See QUICK_START_ADD_PROBLEM.md for more details\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 11000) {
      console.log('\n💡 Duplicate key error - username or email already exists');
    } else if (error.name === 'ValidationError') {
      console.log('\n💡 Validation error:', error.message);
    }
    console.log('');
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed\n');
  }
}

// Run the script
createAdmin();
