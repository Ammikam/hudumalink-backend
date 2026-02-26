// backend/src/models/Inspiration.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IInspiration extends Document {
  designer: mongoose.Types.ObjectId; // ref User
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  styles: string[];
  location?: string;
  projectCost?: number; // Optional budget showcase
  likes: number;
  views: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const InspirationSchema = new Schema<IInspiration>(
  {
    designer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    beforeImage: {
      type: String,
      required: true,
    },
    afterImage: {
      type: String,
      required: true,
    },
    styles: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0 && v.length <= 5,
        message: 'Must have 1-5 style tags',
      },
    },
    location: {
      type: String,
      trim: true,
    },
    projectCost: {
      type: Number,
      min: 0,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
InspirationSchema.index({ designer: 1, status: 1 });
InspirationSchema.index({ styles: 1, status: 1 });
InspirationSchema.index({ createdAt: -1 });
InspirationSchema.index({ likes: -1 });
InspirationSchema.index({ views: -1 });

// Compound index for personalized feed
InspirationSchema.index({ styles: 1, createdAt: -1, status: 1 });

export default mongoose.model<IInspiration>('Inspiration', InspirationSchema);