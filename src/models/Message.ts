// src/models/Message.ts
import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IMessage extends Document {
  project: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  message: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MessageSchema = new Schema<IMessage>({
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
}, { 
  timestamps: true 
});

MessageSchema.index({ project: 1, createdAt: -1 });

// Use a NEW model name so Mongoose cannot use the old cached version
const ChatMessage: Model<IMessage> = models.ChatMessage || mongoose.model<IMessage>('ChatMessage', MessageSchema);

export default ChatMessage;