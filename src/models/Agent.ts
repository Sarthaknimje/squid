import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  agentId: string;
  name: string;
  owner: string;
  level: number;
  attributes: {
    intelligence: number;
    speed: number;
    defense: number;
    strategy: number;
  };
  isNFT: boolean;
  rarity: string;
  transactionHash?: string;
  createdAt: Date;
  updatedAt: Date;
  isListed: boolean;
  listPrice?: string;
  purchasedAt?: Date;
}

const AgentSchema = new Schema(
  {
    agentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    owner: { type: String, required: true },
    level: { type: Number, default: 1 },
    attributes: {
      intelligence: { type: Number, default: 50 },
      speed: { type: Number, default: 50 },
      defense: { type: Number, default: 50 },
      strategy: { type: Number, default: 50 }
    },
    isNFT: { type: Boolean, default: false },
    rarity: { type: String, default: 'Common', enum: ['Common', 'Rare', 'Epic', 'Legendary'] },
    transactionHash: { type: String },
    isListed: { type: Boolean, default: false },
    listPrice: { type: String },
    purchasedAt: { type: Date }
  },
  { timestamps: true }
);

// Check if model already exists (to prevent OverwriteModelError)
const Agent = mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);

export default Agent; 