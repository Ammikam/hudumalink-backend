// backend/src/scripts/migrate-reviews.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ✅ Import ALL models so Mongoose registers their schemas
import User from '../models/User';
import Review from '../models/Review';
import '../models/Project'; // register schema without using it directly

async function migrateReviews() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.log('❌ MONGO_URI not found in .env!'); process.exit(1); }

    const masked = uri.replace(/:([^@]+)@/, ':****@');
    console.log('🔌 Connecting to:', masked);

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    // Fetch reviews and populate only client (not project) to avoid schema issues
    const allReviews = await Review.find().populate('client', 'name avatar');

    console.log(`📊 Found ${allReviews.length} reviews in collection\n`);

    if (allReviews.length === 0) {
      console.log('⚠️  No reviews to migrate!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Group by designer
    const reviewsByDesigner: Record<string, { reviews: any[] }> = {};
    
    allReviews.forEach((review: any) => {
      const designerId = review.designer.toString();
      if (!reviewsByDesigner[designerId]) {
        reviewsByDesigner[designerId] = { reviews: [] };
      }
      reviewsByDesigner[designerId].reviews.push({
        clientName: (review.client as any)?.name || 'Anonymous',
        clientAvatar: (review.client as any)?.avatar || '',
        rating: review.rating,
        comment: review.review || '',
        date: review.createdAt,
      });
    });

    console.log(`👥 Designers to update: ${Object.keys(reviewsByDesigner).length}\n`);

    for (const [designerId, data] of Object.entries(reviewsByDesigner)) {
      const designer = await User.findById(designerId);
      
      if (!designer?.designerProfile) {
        console.log(`❌ Designer ${designerId} not found, skipping...`);
        continue;
      }

      console.log(`🔄 Updating: ${designer.name} (${data.reviews.length} reviews)`);

      // Reset and repopulate
      designer.designerProfile.reviews = [];
      
      data.reviews.forEach((r, i) => {
        designer.designerProfile!.reviews!.push({
          clientName: r.clientName,
          clientAvatar: r.clientAvatar,
          rating: r.rating,
          comment: r.comment,
          date: r.date,
        });
        console.log(`  ✅ Review ${i + 1}: ${r.rating}★ from "${r.clientName}" — "${r.comment.substring(0, 40)}"`);
      });

      // Recalculate rating
      const avg = data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length;
      designer.designerProfile.rating = Number(avg.toFixed(1));
      designer.designerProfile.reviewCount = data.reviews.length;

      // markModified is critical for nested object changes in Mongoose
      designer.markModified('designerProfile');
      await designer.save();

      console.log(`  💾 Saved! Rating: ${avg.toFixed(1)}, Reviews: ${data.reviews.length}\n`);
    }

    console.log('✅ Migration Complete!');
    console.log(`   Reviews migrated: ${allReviews.length}`);
    console.log(`   Designers updated: ${Object.keys(reviewsByDesigner).length}`);
    console.log('\n👉 Restart backend then refresh designer profile!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateReviews();