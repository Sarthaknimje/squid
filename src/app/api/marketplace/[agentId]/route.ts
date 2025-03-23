import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Agent from '@/models/Agent';
import Transaction from '@/models/Transaction';

// GET /api/marketplace/[agentId] - Get a specific listed agent
export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await connectToDatabase();
    
    const { agentId } = params;
    
    // Find the listed agent
    const agent = await Agent.findOne({ agentId, isListed: true });
    
    if (!agent) {
      return NextResponse.json({ 
        error: 'Listed agent not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error fetching listed agent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/marketplace/[agentId] - Update a listing (change price)
export async function PUT(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await connectToDatabase();
    
    const { agentId } = params;
    const body = await req.json();
    const { price, owner } = body;
    
    // Validate request
    if (!price || !owner) {
      return NextResponse.json({ 
        error: 'Price and owner are required' 
      }, { status: 400 });
    }
    
    // Find the agent
    const agent = await Agent.findOne({ agentId });
    
    if (!agent) {
      return NextResponse.json({ 
        error: 'Agent not found' 
      }, { status: 404 });
    }
    
    // Check if the agent is listed
    if (!agent.isListed) {
      return NextResponse.json({ 
        error: 'Agent is not listed for sale' 
      }, { status: 400 });
    }
    
    // Check ownership
    if (agent.owner !== owner) {
      return NextResponse.json({ 
        error: 'Only the owner can update the listing' 
      }, { status: 403 });
    }
    
    // Update listing price
    agent.listPrice = price;
    await agent.save();
    
    return NextResponse.json({ 
      message: 'Listing updated successfully',
      agent
    });
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/marketplace/[agentId] - Cancel a listing
export async function DELETE(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await connectToDatabase();
    
    const { agentId } = params;
    const { owner } = await req.json();
    
    // Validate request
    if (!owner) {
      return NextResponse.json({ 
        error: 'Owner is required' 
      }, { status: 400 });
    }
    
    // Find the agent
    const agent = await Agent.findOne({ agentId });
    
    if (!agent) {
      return NextResponse.json({ 
        error: 'Agent not found' 
      }, { status: 404 });
    }
    
    // Check if the agent is listed
    if (!agent.isListed) {
      return NextResponse.json({ 
        error: 'Agent is not listed for sale' 
      }, { status: 400 });
    }
    
    // Check ownership
    if (agent.owner !== owner) {
      return NextResponse.json({ 
        error: 'Only the owner can cancel the listing' 
      }, { status: 403 });
    }
    
    // Update agent to remove listing
    agent.isListed = false;
    agent.listPrice = undefined;
    await agent.save();
    
    return NextResponse.json({ 
      message: 'Listing cancelled successfully',
      agent
    });
  } catch (error) {
    console.error('Error cancelling listing:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/marketplace/[agentId]/buy - Buy a listed agent
export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await connectToDatabase();
    
    const { agentId } = params;
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    const body = await req.json();
    const { buyer, transactionHash } = body;
    
    // Validate required fields
    if (!buyer || !transactionHash) {
      return NextResponse.json({ 
        error: 'Buyer and transaction hash are required' 
      }, { status: 400 });
    }
    
    // Find the agent
    const agent = await Agent.findOne({ agentId });
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Check listed status
    if (!agent.isListed) {
      return NextResponse.json({ 
        error: 'Agent is not currently listed for sale' 
      }, { status: 400 });
    }
    
    // Prevent buying your own agent
    if (agent.owner === buyer) {
      return NextResponse.json({ 
        error: 'You cannot buy your own agent' 
      }, { status: 400 });
    }
    
    const previousOwner = agent.owner;
    const price = agent.listPrice;
    
    // Update agent ownership
    agent.isListed = false;
    agent.listPrice = '0';
    agent.owner = buyer;
    agent.updatedAt = new Date();
    agent.purchasedAt = new Date();
    
    await agent.save();
    
    // Record the purchase transaction
    const transaction = new Transaction({
      transactionHash,
      from: buyer,
      to: previousOwner,
      amount: price,
      type: 'buy',
      agentId: agentId,
      status: 'completed'
    });
    
    await transaction.save();
    
    return NextResponse.json({ 
      agent, 
      message: 'Agent purchased successfully' 
    });
  } catch (error) {
    console.error('Error purchasing agent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 