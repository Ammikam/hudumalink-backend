// backend/src/models/User.ts - COMPLETE UPDATED VERSION
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

interface IUserPreferences {
  styles?: string[];
  budgetRange?: {
    min: number;
    max: number;
  };
  locations?: string[];
}

interface IReview {
  clientName: string;
  clientAvatar?: string;
  rating: number;
  comment: string;
  date: Date;
  projectImage?: string;
}

interface IDesignerProfile {
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason?: string;
  verified: boolean;
  superVerified: boolean;
  idNumber?: string;
  portfolioImages: string[];
  credentials: string[];
  references: IReference[];
  location: string;
  about: string;
  coverImage?: string;
  tagline?: string;
  styles: string[];
  startingPrice: number;
  responseTime?: string;
  calendlyLink?: string;
  videoUrl?: string;
  socialLinks?: ISocialLinks;
  rating: number;
  reviewCount: number;
  projectsCompleted: number;
  reviews?: IReview[];
}

export interface IUser extends Document {
  clerkId: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  
  // ✅ Client profile fields
  location?: string;
  bio?: string;
  
  preferences?: IUserPreferences;
  roles: ('client' | 'designer' | 'admin')[];
  designerProfile?: IDesignerProfile;
  banned: boolean;
  banReason?: string;
  bannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  isActiveDesigner(): boolean;
  updateRating(newRating: number, reviewCount: number): Promise<void>;
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

const ReviewSchema = new Schema<IReview>({
  clientName: { type: String, required: true },
  clientAvatar: { type: String, default: '' },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5 
  },
  comment: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  projectImage: { type: String, default: '' },
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
  tagline: String,
  styles: { type: [String], default: [] },
  startingPrice: { type: Number, default: 0 },
  responseTime: String,
  calendlyLink: String,
  videoUrl: String,
  socialLinks: SocialLinksSchema,
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    set: (val: number) => Math.round(val * 10) / 10,
  },
  reviewCount: { type: Number, default: 0, min: 0 },
  projectsCompleted: { type: Number, default: 0, min: 0 },
  reviews: { type: [ReviewSchema], default: [] },
});

const UserPreferencesSchema = new Schema<IUserPreferences>({
  styles: { type: [String], default: [] },
  budgetRange: {
    min: { type: Number, default: 50000 },
    max: { type: Number, default: 5000000 },
  },
  locations: { type: [String], default: [] },
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: String,
    avatar: String,
    
    // ✅ Client profile fields
    location: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },

    roles: {
      type: [String],
      enum: ['client', 'designer', 'admin'],
      default: ['client'],
    },
    banned: { type: Boolean, default: false },
    banReason: String,
    bannedAt: Date,
    designerProfile: DesignerProfileSchema,
    preferences: UserPreferencesSchema,
  },
  { timestamps: true }
);

UserSchema.index({ clerkId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ roles: 1 });
UserSchema.index({ banned: 1 });
UserSchema.index({ 'designerProfile.status': 1 });
UserSchema.index({ 'designerProfile.rating': -1 });
UserSchema.index({ 'designerProfile.reviewCount': -1 });
UserSchema.index({ 'designerProfile.projectsCompleted': -1 });
UserSchema.index({ 'preferences.styles': 1 });

UserSchema.virtual('displayName').get(function () {
  if (this.designerProfile?.superVerified) return `${this.name} ⭐`;
  if (this.designerProfile?.verified) return `${this.name} ✓`;
  return this.name;
});

UserSchema.methods.isActiveDesigner = function (): boolean {
  return (
    this.roles.includes('designer') &&
    this.designerProfile?.status === 'approved' &&
    !this.banned
  );
};

UserSchema.methods.updateRating = async function (
  newRating: number,
  reviewCount: number
): Promise<void> {
  if (!this.designerProfile) return;
  this.designerProfile.rating = newRating;
  this.designerProfile.reviewCount = reviewCount;
  await this.save();
};

export default mongoose.model<IUser>('User', UserSchema);