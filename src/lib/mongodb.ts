import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer: MongoMemoryServer | null;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached: Cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, memoryServer: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    try {
      console.log('Connecting to MongoDB...');
      
      if (process.env.NODE_ENV === 'development') {
        try {
          await mongoose.connect(MONGODB_URI, opts);
          console.log('Connected to MongoDB successfully!');
        } catch (error) {
          console.error('Failed to connect to MongoDB:', error);
          console.log('Starting MongoDB Memory Server as fallback...');
          
          // Start in-memory MongoDB server
          const memoryServer = await MongoMemoryServer.create();
          const uri = memoryServer.getUri();
          cached.memoryServer = memoryServer;
          
          cached.promise = mongoose.connect(uri, opts);
          cached.conn = await cached.promise;
          console.log('Connected to MongoDB Memory Server successfully!');
          
          return cached.conn;
        }
      } else {
        // Production - only try real MongoDB
        cached.promise = mongoose.connect(MONGODB_URI, opts);
      }
      
      cached.conn = await cached.promise;
    } catch (error) {
      console.error('Failed to connect to any MongoDB instance:', error);
      throw error;
    }
  }

  return cached.conn;
}

export async function disconnectFromDatabase() {
  if (cached.conn) {
    await mongoose.disconnect();
    if (cached.memoryServer) {
      await cached.memoryServer.stop();
      cached.memoryServer = null;
    }
    cached.conn = null;
    cached.promise = null;
  }
} 