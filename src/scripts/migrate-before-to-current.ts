// backend/src/scripts/migrate-before-to-current.ts
// Run this ONCE to migrate all existing projects

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// ✅ FIX: Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ✅ FIX: Check if MongoDB URI exists
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('\n❌ ERROR: MongoDB connection string not found!');
  console.error('Please set MONGODB_URI or MONGO_URI in your .env file\n');
  console.log('Expected .env location:', path.resolve(__dirname, '../../.env'));
  console.log('Current env variables:', Object.keys(process.env).filter(k => k.includes('MONGO')));
  process.exit(1);
}

console.log('✅ Found MongoDB URI:', MONGODB_URI.substring(0, 20) + '...\n');

// Simple Project model for migration
const projectSchema = new mongoose.Schema({
  beforePhotos: [String],
  currentPhotos: [String],
  inspirationPhotos: [String],
  afterPhotos: [String],
  photos: [String],
}, { strict: false });

const Project = mongoose.model('Project', projectSchema);

async function migrateBeforePhotos() {
  try {
    console.log('🚀 Starting migration: beforePhotos → currentPhotos\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all projects with beforePhotos
    const projectsWithBefore = await Project.find({
      beforePhotos: { $exists: true, $ne: [] }
    });
    
    console.log(`📊 Found ${projectsWithBefore.length} projects with beforePhotos\n`);
    
    if (projectsWithBefore.length === 0) {
      console.log('✅ No projects to migrate. All done!');
      return;
    }
    
    // Migrate each project
    let migrated = 0;
    let skipped = 0;
    
    for (const project of projectsWithBefore) {
      // Skip if currentPhotos already exists and has data
      if (project.currentPhotos && project.currentPhotos.length > 0) {
        console.log(`⏭️  Skipping ${project._id} (already has currentPhotos)`);
        skipped++;
        continue;
      }
      
      // Copy beforePhotos to currentPhotos
      project.currentPhotos = project.beforePhotos;
      await project.save();
      
      console.log(`✅ Migrated ${project._id}`);
      console.log(`   beforePhotos: ${project.beforePhotos.length} photos`);
      console.log(`   currentPhotos: ${project.currentPhotos.length} photos\n`);
      
      migrated++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Migrated: ${migrated} projects`);
    console.log(`⏭️  Skipped: ${skipped} projects (already migrated)`);
    console.log(`📦 Total: ${projectsWithBefore.length} projects`);
    
    // Verify migration
    console.log('\n' + '='.repeat(50));
    console.log('🔍 VERIFICATION');
    console.log('='.repeat(50));
    
    const withCurrent = await Project.countDocuments({ 
      currentPhotos: { $exists: true, $ne: [] } 
    });
    const withBefore = await Project.countDocuments({ 
      beforePhotos: { $exists: true, $ne: [] } 
    });
    
    console.log(`Projects with currentPhotos: ${withCurrent}`);
    console.log(`Projects with beforePhotos: ${withBefore}`);
    
    if (withCurrent === withBefore) {
      console.log('\n✅ MIGRATION SUCCESSFUL! All projects migrated.\n');
    } else {
      console.log('\n⚠️  WARNING: Counts don\'t match. Please review.\n');
    }
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
console.log('\n' + '='.repeat(50));
console.log('🔄 DATABASE MIGRATION SCRIPT');
console.log('='.repeat(50) + '\n');

migrateBeforePhotos()
  .then(() => {
    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });