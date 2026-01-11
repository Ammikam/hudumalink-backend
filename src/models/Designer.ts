import { Schema } from 'mongoose';

export const DesignerProfileSchema = new Schema(
  {
    // ---------- Application lifecycle ----------
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
    },

    // ---------- Trust ----------
    verified: {
      type: Boolean,
      default: false,
    },
    superVerified: {
      type: Boolean,
      default: false,
    },

    // ---------- Discipline ----------
    banned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
    },

    // ---------- Public profile ----------
    location: String,
    avatar: String,
    coverImage: String,
    about: String,
    styles: [String],
    startingPrice: Number,
    responseTime: String,
    calendlyLink: String,
    videoUrl: String,

    // ---------- Metrics ----------
    rating: {
      type: Number,
      default: 0,
    },
    projectsCompleted: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        clientId: String,
        rating: Number,
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false }
);
