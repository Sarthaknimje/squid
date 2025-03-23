import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Agent from '@/models/Agent';

// POST /api/marketplace/[agentId]/buy - Buy a listed agent
export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await connectToDatabase();
    
    const { agentId } = params;
    const body = await req.json();
    const { buyer, transactionHash } = body;
    
    // Validate request
    if (!buyer) {
      return NextResponse.json({ 
        error: 'Buyer address is required' 
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
    
    // Check that buyer isn't the owner
    if (agent.owner === buyer) {
      return NextResponse.json({ 
        error: 'You cannot buy your own agent' 
      }, { status: 400 });
    }
    
    // Save the previous owner for the response
    const previousOwner = agent.owner;
    const purchasePrice = agent.listPrice;
    
    // Update agent ownership and listing status
    agent.owner = buyer;
    agent.isListed = false;
    agent.listPrice = undefined;
    agent.purchasedAt = new Date();
    
    await agent.save();
    
    return NextResponse.json({ 
      message: 'Agent purchased successfully',
      agent,
      previousOwner,
      purchasePrice,
      transactionHash
    });
  } catch (error) {
    console.error('Error purchasing agent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 