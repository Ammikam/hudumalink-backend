//src/models/Project.ts - UPDATED WITH PHOTO SEPARATION
import mongoose, { Schema, Document } from 'mongoose';

interface IClient {
  clerkId: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string; 
}

// Type for populated designer
interface IDesignerPopulated {
  _id: mongoose.Types.ObjectId;
  name: string;
  avatar?: string;
}

// Base project interface
interface IProject extends Document {
  title: string;
  description: string;
  location: string;
  budget: number;
  timeline: string;
  styles: string[];
  photos: string[];
  
  // ✅ NEW: Separate photo arrays for before/after workflow
  beforePhotos?: string[];           // Current space photos
  inspirationPhotos?: string[];      // Vision/reference photos
  inspirationNotes?: string;         // Client's vision description
  
  client: IClient; 
  designer?: mongoose.Types.ObjectId | null;
  status: 'open' | 'in_progress' | 'completed';
  proposals: any[];
  createdAt: Date;
}

// Project with populated designer (for queries with .populate())
export interface IProjectPopulated extends Omit<IProject, 'designer'> {
  designer?: IDesignerPopulated | null;
}

const ClientSchema = new Schema({
  clerkId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  avatar: { type: String }, 
});

const ProjectSchema = new Schema<IProject>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  budget: { type: Number, required: true },
  timeline: { type: String, required: true },
  styles: [{ type: String }],
  photos: [{ type: String }],
  
  // ✅ NEW: Separate photo arrays
  beforePhotos: [{ type: String }],        // Photos of current space
  inspirationPhotos: [{ type: String }],   // Reference/vision photos
  inspirationNotes: { type: String },      // Text description of vision
  
  client: { type: ClientSchema, required: true },
  designer: { type: Schema.Types.ObjectId, ref: 'User', default: null }, 
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'completed'],
    default: 'open'
  },
  proposals: [{ type: Schema.Types.Mixed }],
  createdAt: { type: Date, default: Date.now },
});

// Index for faster queries by user
ProjectSchema.index({ 'client.clerkId': 1 });
ProjectSchema.index({ status: 1, createdAt: -1 }); // ✅ Added for open projects query

export default mongoose.model<IProject>('Project', ProjectSchema);