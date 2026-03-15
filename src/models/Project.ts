// backend/src/models/Project.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  title: string;
  description: string;
  location: string;
  budget: number;
  timeline: string;
  styles: string[];
  status: 'open' | 'payment_pending' | 'in_progress' | 'completed' | 'cancelled';
  
  // Current photos (replaces beforePhotos conceptually)
  currentPhotos: string[];
  
  // For backwards compatibility during transition
  beforePhotos?: string[];
  
  // Inspiration photos (how client wants it to look)
  inspirationPhotos: string[];
  inspirationNotes?: string;
  
  // After photos (when project is completed)
  afterPhotos?: string[];
  
  // Combined photos array (deprecated, use specific arrays)
  photos: string[];
  
  client: {
    clerkId: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  
  designer?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    timeline: {
      type: String,
      required: true,
    },
    styles: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['open', 'payment_pending', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
    },
    
    // Current space photos (primary field going forward)
    currentPhotos: {
      type: [String],
      default: [],
    },
    
    // DEPRECATED: Keep for backwards compatibility
    beforePhotos: {
      type: [String],
      default: [],
    },
    
    // Inspiration photos
    inspirationPhotos: {
      type: [String],
      default: [],
    },
    inspirationNotes: {
      type: String,
      default: '',
    },
    
    // After photos (added when project completes)
    afterPhotos: {
      type: [String],
      default: [],
    },
    
    // Combined photos (deprecated - use specific arrays)
    photos: {
      type: [String],
      default: [],
    },
    
    client: {
      clerkId: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      avatar: String,
    },
    
    designer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: If currentPhotos is empty but beforePhotos has data, copy it
projectSchema.pre('save', function() {
  if ((!this.currentPhotos || this.currentPhotos.length === 0) && 
      this.beforePhotos && this.beforePhotos.length > 0) {
    this.currentPhotos = this.beforePhotos;
  }
});

export default mongoose.model<IProject>('Project', projectSchema);