// backend/src/scripts/check-reviews.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ✅ Import ALL models so Mongoose registers their schemas
import User from '../models/User';
import Review from '../models/Review';
import '../models/Project'; // just needs to be imported to register the schema

async function checkReviews() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.log('❌ MONGO_URI not found in .env!'); process.exit(1); }

    const masked = uri.replace(/:([^@]+)@/, ':****@');
    console.log('🔌 Connecting to:', masked);

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const designerId = '696e554922a16c04a4b76a2c';
    
    const designer = await User.findById(designerId);
    if (!designer || !designer.designerProfile) {
      console.log('❌ Designer or profile not found!');
      process.exit(1);
    }

    console.log('📊 Designer Info:');
    console.log('  Name:', designer.name);
    console.log('  Rating:', designer.designerProfile.rating);
    console.log('  Review Count:', designer.designerProfile.reviewCount);
    console.log('  Reviews in profile array:', designer.designerProfile.reviews?.length || 0);

    // Fetch reviews WITHOUT populate to avoid schema errors
    const reviewDocs = await Review.find({ designer: designerId });
    
    console.log('\n🗄️  Reviews in Review collection:', reviewDocs.length);
    
    if (reviewDocs.length > 0) {
      reviewDocs.forEach((review: any, i: number) => {
        console.log(`\n  Review ${i + 1}:`);
        console.log('  - ID:', review._id);
        console.log('  - Rating:', review.rating);
        console.log('  - Comment:', review.review?.substring(0, 60) || 'N/A');
        console.log('  - Client ID:', review.client);
        console.log('  - Created:', review.createdAt);
      });
    }

    console.log('\n💡 Summary:');
    console.log('  Reviews in Collection:', reviewDocs.length);
    console.log('  Reviews in Profile Array:', designer.designerProfile.reviews?.length || 0);
    
    if (reviewDocs.length > 0 && (!designer.designerProfile.reviews || designer.designerProfile.reviews.length === 0)) {
      console.log('\n⚠️  ISSUE CONFIRMED: Run migration next!');
      console.log('👉 npx ts-node src/scripts/migrate-reviews.ts');
    } else if (reviewDocs.length === 0) {
      console.log('\n⚠️  No reviews in database at all.');
    } else {
      console.log('\n✅ Reviews are synced!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkReviews();