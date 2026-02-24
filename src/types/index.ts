// backend/src/types.ts
import { Request } from 'express';
import mongoose from 'mongoose';

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

export interface UserPayload {
  _id: mongoose.Types.ObjectId;
  clerkId: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  roles: ('client' | 'designer' | 'admin')[];
  designerProfile?: IDesignerProfile;
  banned: boolean;
  banReason?: string;
  bannedAt?: Date;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestWithUser extends Request {
  user?: UserPayload;
}