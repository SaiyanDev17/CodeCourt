/**
 * Auto-create admin user
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/modules/auth/model');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check if admin exists
    const existing = await User.findOne({ email: 'admin@codecourt.com' });
    if (existing) {
      console.log('✅ Admin already exists');
      console.log(`   Email: ${existing.email}`);
      console.log(`   Username: ${existing.username}\n`);
      await mongoose.connection.close();
      return;
    }
    
    // Create admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      username: 'admin',
      email: 'admin@codecourt.com',
      passwordHash: hashedPassword,
      role: 'admin'
    });
    
    console.log('✅ Admin user created!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: admin123\n`);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
