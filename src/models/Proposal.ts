// src/models/Proposal.ts
import mongoose, { Schema, Document } from 'mongoose';

interface IProposal extends Document {
  project: mongoose.Types.ObjectId;
  designer: mongoose.Types.ObjectId;
  message: string;
  price: number;
  timeline: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

const ProposalSchema = new Schema<IProposal>({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  designer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: { type: String, required: true },
  price: { type: Number, required: true },
  timeline: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for performance
ProposalSchema.index({ project: 1 });
ProposalSchema.index({ designer: 1 });
ProposalSchema.index({ status: 1 });

export default mongoose.model<IProposal>('Proposal', ProposalSchema);