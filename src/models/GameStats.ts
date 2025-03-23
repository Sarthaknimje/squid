import mongoose, { Schema, Document } from 'mongoose';

export interface IGameStats extends Document {
  gameId: string;
  gameType: string;
  player: string;
  agentId: string;
  result: 'win' | 'loss' | 'draw';
  score: number;
  duration: number; // in seconds
  createdAt: Date;
}

const GameStatsSchema: Schema = new Schema({
  gameId: { 
    type: String, 
    required: true,
    index: true
  },
  gameType: { 
    type: String, 
    required: true,
    index: true
  },
  player: { 
    type: String, 
    required: true,
    index: true
  },
  agentId: { 
    type: String, 
    required: true,
    index: true
  },
  result: { 
    type: String, 
    enum: ['win', 'loss', 'draw'],
    required: true
  },
  score: { 
    type: Number, 
    default: 0 
  },
  duration: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Add compound index for player+gameType for quick stat lookups
GameStatsSchema.index({ player: 1, gameType: 1 });

// Prevent model compilation errors in development (hot-reload)
const GameStats = mongoose.models.GameStats || mongoose.model<IGameStats>('GameStats', GameStatsSchema);

export default GameStats; 