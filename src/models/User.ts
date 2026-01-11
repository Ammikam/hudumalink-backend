import mongoose, { Schema, Document } from 'mongoose';

interface IUser extends Document {
  clerkId: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  
  // Role system
  roles: ('client' | 'designer' | 'admin')[];
  
  designerProfile?: {
  // lifecycle
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason?: string;

  // trust
  verified: boolean;
  superVerified: boolean;

  // discipline
  banned: boolean;
  banReason?: string;

  // profile
  location: string;
  about: string;
  coverImage: string;
  styles: string[];
  startingPrice: number;
  responseTime: string;
  calendlyLink?: string;
  videoUrl?: string;

  // metrics
  rating: number;
  projectsCompleted: number;
};

  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  phone: String,
  avatar: String,
  
  roles: {
    type: [String],
    enum: ['client', 'designer', 'admin'],
    default: ['client'], // Everyone starts as client
  },
  
  designerProfile: {
    location: String,
    about: String,
    coverImage: String,
    styles: [String],
    startingPrice: Number,
    responseTime: String,
    calendlyLink: String,
    videoUrl: String,
    verified: { type: Boolean, default: false },
    superVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    projectsCompleted: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'pending',
    },
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserSchema.index({ clerkId: 1 });
UserSchema.index({ 'designerProfile.status': 1 });

export default mongoose.model<IUser>('User', UserSchema);