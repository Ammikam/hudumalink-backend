// src/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

interface IReference {
  name: string;
  email: string;
  relation: string;
}

interface ISocialLinks {
  instagram?: string;
  pinterest?: string;
  website?: string;
}

interface IDesignerProfile {
  // Lifecycle
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason?: string;

  // Trust & Verification
  verified: boolean;
  superVerified: boolean;

  // Application Data (filled during designer signup)
  idNumber?: string;                    // National ID for verification
  portfolioImages: string[];            // URLs from Cloudinary
  credentials: string[];                // URLs of certificates/licenses
  references: IReference[];

  // Profile Info
  location: string;
  about: string;
  coverImage?: string;
  styles: string[];
  startingPrice: number;
  responseTime?: string;
  calendlyLink?: string;
  videoUrl?: string;
  socialLinks?: ISocialLinks;

  // Metrics
  rating: number;
  reviewCount: number;
  projectsCompleted: number;
}

interface IUser extends Document {
  clerkId: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;

  // Role system
  roles: ('client' | 'designer' | 'admin')[];

  // Designer-specific profile (created on application)
  designerProfile?: IDesignerProfile;

  // Account-level discipline
  banned: boolean;
  banReason?: string;
  bannedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ReferenceSchema = new Schema<IReference>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  relation: { type: String, required: true },
});

const SocialLinksSchema = new Schema<ISocialLinks>({
  instagram: String,
  pinterest: String,
  website: String,
});

const DesignerProfileSchema = new Schema<IDesignerProfile>({
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  rejectionReason: String,

  verified: { type: Boolean, default: false },
  superVerified: { type: Boolean, default: false },

  idNumber: String,
  portfolioImages: { type: [String], default: [] },
  credentials: { type: [String], default: [] },
  references: { type: [ReferenceSchema], default: [] },

  location: { type: String, default: '' },
  about: { type: String, default: '' },
  coverImage: String,
  styles: { type: [String], default: [] },
  startingPrice: { type: Number, default: 0 },
  responseTime: String,
  calendlyLink: String,
  videoUrl: String,
  socialLinks: SocialLinksSchema,

  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  projectsCompleted: { type: Number, default: 0 },
});

const UserSchema = new Schema<IUser>({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: String,
  avatar: String,

  roles: {
    type: [String],
    enum: ['client', 'designer', 'admin'],
    default: ['client'],
  },

  banned: { type: Boolean, default: false },
  banReason: String,
  bannedAt: Date,

  designerProfile: DesignerProfileSchema,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for performance and queries
UserSchema.index({ clerkId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ roles: 1 });
UserSchema.index({ banned: 1 });
UserSchema.index({ 'designerProfile.status': 1 });
UserSchema.index({ 'designerProfile.portfolioImages': 1 });

export default mongoose.model<IUser>('User', UserSchema);