// import mongoose from 'mongoose';

// const projectSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//   },
//   description: {
//     type: String,
//     required: true,
//   },
//   budget: {
//     type: Number,
//     required: true,
//   },
//   photos: [String], // array of image URLs (Cloudinary later)
//   client: {
//   clerkId: {
//     type: String,
//     required: true,
//   },
//   name: String,
//   email: String,
// },
//   invitedDesigner: {
//     type: mongoose.Schema.Types.String,
//     // ref: 'Designer',
//   },
//   status: {
//     type: String,
//     enum: ['open', 'invited', 'in_progress', 'completed'],
//     default: 'open',
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// export const Project = mongoose.model('Project', projectSchema);

import mongoose, { Schema, Document } from 'mongoose';

interface IClient {
  clerkId: string;  // Clerk user ID
  name: string;
  email: string;
  phone: string;
}

interface IProject extends Document {
  title: string;
  description: string;
  location: string;
  budget: number;
  timeline: string;
  styles: string[];
  photos: string[];
  client: IClient;  // Client information with Clerk ID
  status: 'open' | 'in_progress' | 'completed';
  proposals: any[];
  createdAt: Date;
}

const ClientSchema = new Schema({
  clerkId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
});

const ProjectSchema = new Schema<IProject>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  budget: { type: Number, required: true },
  timeline: { type: String, required: true },
  styles: [{ type: String }],
  photos: [{ type: String }],
  client: { type: ClientSchema, required: true },  // Embedded client info
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

export default mongoose.model<IProject>('Project', ProjectSchema);