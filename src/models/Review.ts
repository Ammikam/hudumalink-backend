// backend/models/Review.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  project: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  designer: mongoose.Types.ObjectId;
  rating: number;
  review: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true, // One review per project
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    designer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      default: '',
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
reviewSchema.index({ designer: 1, createdAt: -1 });
reviewSchema.index({ project: 1 });

const Review = mongoose.model<IReview>('Review', reviewSchema);

export default Review;