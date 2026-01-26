// src/models/Message.ts
import mongoose, { Schema } from 'mongoose';

const MessageSchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

MessageSchema.index({ project: 1, createdAt: -1 });

export default mongoose.model('Message', MessageSchema);