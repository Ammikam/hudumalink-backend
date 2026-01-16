import mongoose, { Schema, Document } from 'mongoose';

interface IUser extends Document {
  clerkId: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;

  // Role system
  roles: ('client' | 'designer' | 'admin')[];

  // Designer-specific profile
  designerProfile?: {
    // Lifecycle status
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    rejectionReason?: string;

    // Trust & verification
    verified: boolean;
    superVerified: boolean;

    // Profile info
    location: string;
    about: string;
    coverImage: string;
    styles: string[];
    startingPrice: number;
    responseTime: string;
    calendlyLink?: string;
    videoUrl?: string;

    // Metrics
    rating: number;
    reviewCount: number;
    projectsCompleted: number;
  };

  // Account-level discipline (applies to all users)
  banned: boolean;
  banReason?: string;
  bannedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true }, // Recommended: unique email
  name: { type: String, required: true },
  phone: String,
  avatar: String,

  roles: {
    type: [String],
    enum: ['client', 'designer', 'admin'],
    default: ['client'],
  },

  // Move banned fields to root level
  banned: { type: Boolean, default: false },
  banReason: String,
  bannedAt: Date,

  designerProfile: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    rejectionReason: String,

    verified: { type: Boolean, default: false },
    superVerified: { type: Boolean, default: false },

    location: String,
    about: String,
    coverImage: String,
    styles: [String],
    startingPrice: Number,
    responseTime: String,
    calendlyLink: String,
    videoUrl: String,

    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    projectsCompleted: { type: Number, default: 0 },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for performance
UserSchema.index({ clerkId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ 'designerProfile.status': 1 });
UserSchema.index({ roles: 1 });
UserSchema.index({ banned: 1 });

export default mongoose.model<IUser>('User', UserSchema);