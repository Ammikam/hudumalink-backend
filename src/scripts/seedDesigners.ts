import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Designer } from '../models/Designer';
import { designers } from '../data/MockData';

dotenv.config();

// Force TypeScript to trust that MONGO_URI exists (after check)
const MONGO_URI = process.env.MONGO_URI as string;

if (!process.env.MONGO_URI) {
  console.error(' MONGO_URI is missing from .env file!');
  process.exit(1);
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(' Connected to MongoDB');

    await Designer.deleteMany({});
    console.log('Cleared existing designers');

    const result = await Designer.insertMany(designers);
    console.log(`Successfully seeded ${result.length} designers!`);

    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();