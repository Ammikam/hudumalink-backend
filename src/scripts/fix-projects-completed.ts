// backend/src/scripts/fix-projects-completed.ts
// Fixes projectsCompleted count for all designers based on actual completed projects
// Run: npx ts-node src/scripts/fix-projects-completed.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/User';
import Project from '../models/Project';

async function fixProjectsCompleted() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.log('❌ MONGO_URI not found!'); process.exit(1); }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    // Find all approved designers
    const designers = await User.find({
      roles: 'designer',
      'designerProfile.status': 'approved',
    });

    console.log(`👥 Found ${designers.length} designers to check\n`);

    for (const designer of designers) {
      // Count completed projects where this designer was hired
      const completedCount = await Project.countDocuments({
        designer: designer._id,
        status: 'completed',
      });

      const current = designer.designerProfile?.projectsCompleted || 0;

      if (current !== completedCount) {
        await User.findByIdAndUpdate(designer._id, {
          $set: { 'designerProfile.projectsCompleted': completedCount },
        });
        console.log(`✅ Fixed ${designer.name}: ${current} → ${completedCount} projects completed`);
      } else {
        console.log(`✓  ${designer.name}: ${completedCount} projects completed (already correct)`);
      }
    }

    console.log('\n✅ All projectsCompleted counts fixed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixProjectsCompleted();