/**
 * Check admin user credentials
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/modules/auth/model');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const admins = await User.find({ role: 'admin' });
    
    if (admins.length === 0) {
      console.log('❌ No admin users found');
    } else {
      console.log(`📋 Found ${admins.length} admin user(s):\n`);
      admins.forEach((admin, i) => {
        console.log(`${i + 1}. Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   ID: ${admin._id}`);
        console.log('');
      });
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAdmin();
