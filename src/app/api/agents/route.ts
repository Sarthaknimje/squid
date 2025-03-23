import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Agent from '@/models/Agent';

// GET /api/agents - Get all agents or filtered set
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Check if the URL contains an agent ID in the path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const agentId = pathParts[pathParts.length - 1];
    
    // If the path contains an ID that's not "agents" (which would be the collection endpoint)
    if (agentId && agentId !== "agents") {
      // Get a single agent by ID
      const agent = await Agent.findOne({ agentId });
      
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      return NextResponse.json({ agent });
    }
    
    // Get query parameters
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '0');
    const owner = req.nextUrl.searchParams.get('owner');
    const isListed = req.nextUrl.searchParams.get('isListed');
    const rarity = req.nextUrl.searchParams.get('rarity');
    const minLevel = parseInt(req.nextUrl.searchParams.get('minLevel') || '0');
    
    // Build filter
    const filter: any = {};
    if (owner) filter.owner = owner;
    if (isListed === 'true') filter.isListed = true;
    if (isListed === 'false') filter.isListed = false;
    if (rarity) filter.rarity = rarity;
    if (minLevel > 0) filter.level = { $gte: minLevel };
    
    // Get agents with pagination
    const agents = await Agent.find(filter)
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit);
    
    const total = await Agent.countDocuments(filter);
    
    return NextResponse.json({ 
      agents, 
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) 
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/agents - Create a new agent
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { 
      agentId, name, owner, level, attributes, 
      isNFT, rarity, transactionHash 
    } = body;
    
    // Validate required fields
    if (!agentId || !name || !owner) {
      return NextResponse.json({ 
        error: 'Agent ID, name, and owner are required' 
      }, { status: 400 });
    }
    
    // Check if agent with this ID already exists
    const existingAgent = await Agent.findOne({ agentId });
    
    if (existingAgent) {
      return NextResponse.json({ 
        error: 'Agent with this ID already exists' 
      }, { status: 409 });
    }
    
    // Create new agent
    const newAgent = new Agent({
      agentId,
      name,
      owner,
      level: level || 1,
      attributes: {
        intelligence: attributes?.intelligence || 50,
        speed: attributes?.speed || 50,
        defense: attributes?.defense || 50,
        strategy: attributes?.strategy || 50
      },
      isNFT: isNFT || false,
      rarity: rarity || 'Common',
      transactionHash
    });
    
    await newAgent.save();
    
    return NextResponse.json({ 
      agent: newAgent, 
      message: 'Agent created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 