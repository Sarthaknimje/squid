import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/users - Get all users (limited)
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get query parameters
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '0');
    
    // Get users with pagination (limited fields for privacy/security)
    const users = await User.find({}, { 
      address: 1, 
      balance: 1,
      network: 1,
      createdAt: 1 
    })
    .sort({ createdAt: -1 })
    .skip(page * limit)
    .limit(limit);
    
    const total = await User.countDocuments();
    
    return NextResponse.json({ 
      users, 
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) 
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/users - Create or update a user
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { address, publicKey, balance, network } = body;
    
    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    // Find user by address
    const existingUser = await User.findOne({ address });
    
    if (existingUser) {
      // Update existing user
      existingUser.publicKey = publicKey || existingUser.publicKey;
      existingUser.balance = balance || existingUser.balance;
      existingUser.network = network || existingUser.network;
      existingUser.lastLogin = new Date();
      
      await existingUser.save();
      
      return NextResponse.json({ user: existingUser, message: 'User updated successfully' });
    } else {
      // Create new user
      const newUser = new User({
        address,
        publicKey,
        balance: balance || '0',
        network: network || 'Testnet',
      });
      
      await newUser.save();
      
      return NextResponse.json({ user: newUser, message: 'User created successfully' }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 