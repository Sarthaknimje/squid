import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  address: string;
  publicKey?: string;
  balance: string;
  network: string;
  createdAt: Date;
  lastLogin: Date;
}

const UserSchema: Schema = new Schema({
  address: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  publicKey: { 
    type: String 
  },
  balance: { 
    type: String,
    default: '0'
  },
  network: { 
    type: String,
    default: 'Testnet'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date, 
    default: Date.now 
  }
});

// Prevent model compilation errors in development (hot-reload)
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 