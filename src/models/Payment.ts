// backend/src/models/Payment.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  // Core info
  project: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  designer: mongoose.Types.ObjectId;
  
  // Payment details
  amount: number;                    // Total amount
  platformFee: number;               // HudumaLink fee (10-15%)
  designerAmount: number;            // Amount designer receives
  
  // Transaction info
  paymentMethod: 'mpesa' | 'card' | 'bank';
  status: 'pending' | 'paid' | 'held' | 'released' | 'refunded' | 'failed';
  
  // M-Pesa specific
  mpesaReceiptNumber?: string;
  mpesaPhoneNumber?: string;
  mpesaCheckoutRequestID?: string;
  
  // Escrow
  heldAt?: Date;                     // When payment was held
  releasedAt?: Date;                 // When released to designer
  refundedAt?: Date;                 // When refunded to client
  
  // Metadata
  description: string;
  metadata?: any;
  
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    designer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Amounts
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    designerAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Payment method & status
    paymentMethod: {
      type: String,
      enum: ['mpesa', 'card', 'bank'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'held', 'released', 'refunded', 'failed'],
      default: 'pending',
      index: true,
    },
    
    // M-Pesa fields
    mpesaReceiptNumber: String,
    mpesaPhoneNumber: String,
    mpesaCheckoutRequestID: String,
    
    // Escrow timestamps
    heldAt: Date,
    releasedAt: Date,
    refundedAt: Date,
    
    // Metadata
    description: {
      type: String,
      required: true,
    },
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ project: 1, status: 1 });

export default mongoose.model<IPayment>('Payment', paymentSchema);