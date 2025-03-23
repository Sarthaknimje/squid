import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  transactionHash: string;
  from: string;
  to: string;
  amount: string;
  type: string;
  agentId: string;
  status: string;
  createdAt: Date;
  completedAt?: Date;
}

const TransactionSchema = new Schema(
  {
    transactionHash: { type: String, required: true, unique: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    amount: { type: String, required: true },
    type: { 
      type: String, 
      required: true,
      enum: ['mint', 'train', 'list', 'cancel', 'update', 'buy']
    },
    agentId: { type: String, required: true },
    status: { 
      type: String, 
      required: true,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

// Check if model already exists (to prevent OverwriteModelError)
const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction; 