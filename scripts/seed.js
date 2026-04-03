// MongoDB seed data script
// Seeds sample users, problems, and contests for development

const mongoose = require('mongoose');
require('dotenv').config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Seed logic will be implemented in Phase 6
    console.log('Seeding database...');
    console.log('Seed complete!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
