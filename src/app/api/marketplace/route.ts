import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Agent from '@/models/Agent';
import Transaction from '@/models/Transaction';

// GET /api/marketplace - Get all listed agents
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get query parameters
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '0');
    const rarity = req.nextUrl.searchParams.get('rarity');
    const minLevel = parseInt(req.nextUrl.searchParams.get('minLevel') || '0');
    const minPrice = req.nextUrl.searchParams.get('minPrice');
    const maxPrice = req.nextUrl.searchParams.get('maxPrice');
    
    // Build filter - always include isListed:true for marketplace
    const filter: any = { isListed: true };
    
    if (rarity) filter.rarity = rarity;
    if (minLevel > 0) filter.level = { $gte: minLevel };
    
    // Price filters (convert string to number for comparison)
    if (minPrice) {
      filter.listPrice = { $gte: minPrice };
    }
    
    if (maxPrice) {
      if (filter.listPrice) {
        filter.listPrice.$lte = maxPrice;
      } else {
        filter.listPrice = { $lte: maxPrice };
      }
    }
    
    // Get listed agents with pagination
    const listings = await Agent.find(filter)
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit);
    
    const total = await Agent.countDocuments(filter);
    
    return NextResponse.json({ 
      listings, 
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) 
    });
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/marketplace - List an agent for sale
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { agentId, price } = body;
    
    // Validate required fields
    if (!agentId || !price) {
      return NextResponse.json({ 
        error: 'Agent ID and price are required' 
      }, { status: 400 });
    }
    
    // Find the agent
    const agent = await Agent.findOne({ agentId });
    
    if (!agent) {
      return NextResponse.json({ 
        error: 'Agent not found' 
      }, { status: 404 });
    }
    
    // Check if the agent is already listed
    if (agent.isListed) {
      return NextResponse.json({ 
        error: 'Agent is already listed for sale' 
      }, { status: 400 });
    }
    
    // Update agent to listed status
    agent.isListed = true;
    agent.listPrice = price;
    await agent.save();
    
    return NextResponse.json({ 
      message: 'Agent listed successfully',
      agent
    });
  } catch (error) {
    console.error('Error listing agent for sale:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 