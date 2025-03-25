"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAptosWallet, AptosWalletContextState } from '@/contexts/AptosWalletContext';
import { toast } from 'react-hot-toast';
import { AgentRuntime } from '@/lib/moveAgentKit';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { RealSigner } from '@/lib/realSigner';
import { listAgentForSaleTransaction, cancelAgentListingTransaction, buyAgentFromMarketplaceTransaction } from '@/lib/walletService';

// Define Agent Type
export type AIAgent = {
  id: string;
  name: string;
  level: number;
  attributes: {
    Intelligence: number;
    Speed: number;
    Defense: number;
    Strategy: number;
  };
  wins: number;
  losses: number;
  isNFT?: boolean;
  owner?: string;
  image?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  transactionHash?: string;
  lastTraining?: {
    [key in keyof AIAgent['attributes']]?: number; // Timestamp of last training per attribute
  };
  trainingCosts?: {
    mintCost: number;
    trainCost: number;
  };
  isListed?: boolean;
  listPrice?: string;
  purchasedAt?: string;
};

// Mock marketplace NFT data (represents server data)
const MARKETPLACE_NFTS = [
  {
    id: "marketplace-1",
    name: "Elite Sentinel",
    owner: "0xf7e5b1a32141a1e1b20ee1a700000000000000000000000000000000000000", // Padded to 64 chars
    price: "0.1",
    rarity: "legendary",
    level: 5,
    attributes: {
      Intelligence: 85,
      Speed: 78,
      Defense: 92,
      Strategy: 86
    },
    isNFT: true,
    isListed: true
  },
  {
    id: "marketplace-2",
    name: "Apex Guardian",
    owner: "0xac8d47553e09778a1b5219b300000000000000000000000000000000000000", // Padded to 64 chars
    price: "0.1",
    rarity: "epic",
    level: 4,
    attributes: {
      Intelligence: 75,
      Speed: 82,
      Defense: 70,
      Strategy: 78
    },
    isNFT: true,
    isListed: true
  },
  {
    id: "marketplace-3",
    name: "Swift Striker",
    owner: "0x12f8a90e77c32109bcfa23d900000000000000000000000000000000000000", // Padded to 64 chars
    price: "0.1",
    rarity: "rare",
    level: 3,
    attributes: {
      Intelligence: 65,
      Speed: 90,
      Defense: 55,
      Strategy: 60
    },
    isNFT: true,
    isListed: true
  }
];

// Context Type
export type AIAgentContextType = {
  agents: AIAgent[];
  agent: AIAgent | null;
  selectedAgent: AIAgent | null;
  setAgent: (agent: AIAgent) => void;
  setSelectedAgent: (agent: AIAgent | null) => void;
  generateRandomAgent: () => AIAgent;
  mintNFTAgent: () => Promise<void>;
  trainAgent: (attribute: keyof AIAgent["attributes"], durationHours: number) => Promise<void>;
  mintingAgent: boolean;
  mintingSuccess: boolean;
  mintError: string | null;
  trainingAttribute: keyof AIAgent["attributes"] | null;
  trainingSuccess: { 
    attribute: keyof AIAgent["attributes"];
    improvement: number;
  } | null;
  trainingError: string | null;
  trainingInProgress: boolean;
  
  // Marketplace functions
  listAgentForSale: (agentId: string, price: string) => Promise<boolean>;
  cancelListing: (agentId: string) => Promise<boolean>;
  buyAgent: (agentId: string, owner: string, price: string) => Promise<boolean>;
  marketplaceAgents: AIAgent[];
  fetchMarketplaceAgents: () => Promise<void>;
  
  // Loading state
  isLoading: boolean;
};

// Create context
const AIAgentContext = createContext<AIAgentContextType | undefined>(undefined);

// Sample agent names
const AGENT_NAMES = [
  "ByteCrusher", "QuantumMind", "SiliconSentinel", "NeuralNinja", 
  "CyberStalker", "LogicLord", "DataDemon", "PixelPredator",
  "BinaryBeast", "SyntaxSpecter", "AlgorithmAvenger", "CodeCrusader",
  "VirtualVigilante", "MachineMarauder", "TechTitan", "RoboRipper"
];

// Random name generator
const getRandomName = () => AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];

// Provider component
export const AIAgentProvider = ({ children }: { children: ReactNode }) => {
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintingAgent, setMintingAgent] = useState(false);
  const [mintingSuccess, setMintingSuccess] = useState(false);
  const [trainingInProgress, setTrainingInProgress] = useState(false);
  const [trainingAttribute, setTrainingAttribute] = useState<keyof AIAgent['attributes'] | null>(null);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [trainingSuccess, setTrainingSuccess] = useState<{ attribute: keyof AIAgent['attributes']; improvement: number; newValue: number } | null>(null);
  const [trainingCooldowns, setTrainingCooldowns] = useState<Record<string, number>>({});
  
  const { wallet } = useAptosWallet();

  // New state for marketplace
  const [agentListings, setAgentListings] = useState<Record<string, { price: string, owner: string }>>({});
  
  // New state for marketplace agents
  const [marketplaceAgents, setMarketplaceAgents] = useState<AIAgent[]>([]);
  
  // Generate a new random agent
  const generateRandomAgent = () => {
    // Generate random attributes between 40-90
    const randomAttr = () => Math.floor(Math.random() * 50) + 40;
    
    // Create a new agent (non-NFT)
    const newAgent: AIAgent = {
      id: `agent-${Date.now()}`,
      name: getRandomName(),
      level: 1, // Always start at level 1
      attributes: {
        Intelligence: randomAttr(),
        Speed: randomAttr(),
        Defense: randomAttr(),
        Strategy: randomAttr()
      },
      wins: 0,
      losses: 0,
      isNFT: false,
      lastTraining: {},
      trainingCosts: {
        mintCost: 0.1, // 0.1 APT to mint
        trainCost: 0.1, // 0.1 APT to train
      }
    };
    
    setAgent(newAgent);
    setSelectedAgent(newAgent);
    setAgents(prev => [...prev, newAgent]);
    localStorage.setItem('aiAgent', JSON.stringify(newAgent));
    return newAgent;
  };

  // Check if an attribute is on cooldown
  const isAttributeOnCooldown = (agentId: string, attribute: keyof AIAgent['attributes']) => {
    if (!selectedAgent?.lastTraining?.[attribute]) return false;
    
    const lastTrainingTime = selectedAgent.lastTraining[attribute];
    if (!lastTrainingTime) return false;
    
    // 24-hour cooldown period
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const currentTime = Date.now();
    
    return currentTime - lastTrainingTime < cooldownPeriod;
  };
  
  // Get remaining cooldown time in hours
  const getRemainingCooldownTime = (agentId: string, attribute: keyof AIAgent['attributes']) => {
    if (!selectedAgent?.lastTraining?.[attribute]) return 0;
    
    const lastTrainingTime = selectedAgent.lastTraining[attribute];
    if (!lastTrainingTime) return 0;
    
    // 24-hour cooldown period
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastTrainingTime;
    
    if (elapsedTime >= cooldownPeriod) return 0;
    
    // Return remaining hours
    return Math.ceil((cooldownPeriod - elapsedTime) / (60 * 60 * 1000));
  };

  // Mint NFT agent using real contract implementation
  const mintNFTAgent = async () => {
    setMintingAgent(true);
    setMintError(null);
    setMintingSuccess(false);
    
    try {
      if (!wallet.isConnected) {
        setMintError("Wallet not connected. Please connect your wallet first.");
        setMintingAgent(false);
        return;
      }

      if (!wallet.isPetraInstalled) {
        setMintError("Petra wallet not installed. Please install Petra wallet first.");
        setMintingAgent(false);
        return;
      }
      
      if (!selectedAgent) {
        setMintError("No agent selected. Please select or create an agent first.");
        setMintingAgent(false);
        return;
      }
      
      console.log("Attempting to mint NFT with wallet:", wallet);
      
      // Initialize Aptos client and agent runtime
      const aptosConfig = new AptosConfig({ network: Network.TESTNET });
      const aptos = new Aptos(aptosConfig);
      
      try {
        // Create a real signer that uses the connected wallet
        const signer = new RealSigner();
        const agentRuntime = new AgentRuntime(signer, aptos);
        
        // Create token for the agent
        const tokenName = `Agent-${selectedAgent.name}`;
        const tokenSymbol = "AGT";
        const iconUrl = "https://squidgame.io/agent-icon.png"; 
        const projectUrl = "https://squidgame.io";
        
        // Mint the token
        const tokenMint = await agentRuntime.createToken(
          tokenName,
          tokenSymbol,
          iconUrl,
          projectUrl
        );
        
        // Now mint it to the user's wallet
        const mintResult = await agentRuntime.mintToken(
          signer.address(),
          tokenMint,
          1 // Mint 1 NFT
        );
        
        if (!mintResult.success) {
          throw new Error("Failed to mint NFT");
        }
        
        // Get the rarity based on attributes
        const rarity = getRarityFromAttributes(selectedAgent.attributes);
        
        // Update the agent with NFT properties
        const updatedAgent = {
          ...selectedAgent,
          isNFT: true,
          owner: wallet.address,
          rarity,
          transactionHash: tokenMint, // Use token ID as transaction hash
          level: 1 // Reset to level 1 when minted as NFT
        };
        
        setSelectedAgent(updatedAgent);
        setAgent(updatedAgent);
        
        // Save to local storage
        saveAgentToLocalStorage(updatedAgent);
        
        // Add to the list of agents
        setAgents(prev => prev.map(agent => 
          agent.id === updatedAgent.id ? updatedAgent : agent
        ));
        
        setMintingSuccess(true);
        toast.success("Successfully minted AI agent NFT!");
      } catch (error) {
        console.error("Error during contract interaction:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error minting NFT agent:", error);
      setMintError(error instanceof Error ? error.message : "Failed to mint NFT agent. Please try again.");
      toast.error(error instanceof Error ? error.message : "Failed to mint NFT agent.");
    } finally {
      setMintingAgent(false);
    }
  };
  
  // Train an agent using real contract implementation
  const trainAgent = async (attribute: keyof AIAgent["attributes"], durationHours: number) => {
    if (!selectedAgent) return;
    
    setTrainingInProgress(true);
    setTrainingAttribute(attribute);
    setTrainingError(null);
    setTrainingSuccess(null);
    
    try {
      // Check if attribute is on cooldown
      if (isAttributeOnCooldown(selectedAgent.id, attribute)) {
        const remainingHours = getRemainingCooldownTime(selectedAgent.id, attribute);
        throw new Error(`This attribute is on cooldown. You can train again in ${remainingHours} hours.`);
      }
      
      let improvement = 0;
      
      if (selectedAgent.isNFT) {
        if (!wallet.isConnected) {
          throw new Error("Wallet not connected. Please connect your wallet first.");
        }

        if (!wallet.isPetraInstalled) {
          throw new Error("Petra wallet not installed. Please install Petra wallet first.");
        }
        
        console.log("Attempting to train NFT with wallet:", wallet);
        
        // Initialize Aptos client and agent runtime
        const aptosConfig = new AptosConfig({ network: Network.TESTNET });
        const aptos = new Aptos(aptosConfig);
        
        try {
          // Create a real signer that uses the connected wallet
          const signer = new RealSigner();
          const agentRuntime = new AgentRuntime(signer, aptos);
          
          // In a real implementation, this would be a call to update agent stats
          // For now, simulate a transfer of tokens for training fee
          const trainingFee = selectedAgent.trainingCosts?.trainCost || 0.1;
          
          // Call the contract to update the agent stats
          // This is a placeholder for the actual contract call
          const result = await agentRuntime.transferTokens(
            signer.address(), // Transfer to self (just to generate a transaction)
            trainingFee * 100000000, // Convert to Octas
            "0x1::aptos_coin::AptosCoin" // Use Aptos coins
          );
          
          if (!result.success) {
            throw new Error("Training transaction failed");
          }
          
          // Calculate improvement based on duration and level
          // Higher levels get diminishing returns
          const baseFactor = 10 - Math.min(9, selectedAgent.level);
          improvement = Math.floor((Math.random() * baseFactor) + 1) * durationHours / 4;
          
          // Ensure improvement is at least 1 point
          improvement = Math.max(1, improvement);
        } catch (error) {
          console.error("Error during contract interaction:", error);
          throw error;
        }
      } else {
        // For non-NFT agents, simply simulate improvement
        const baseFactor = 10 - Math.min(9, selectedAgent.level);
        improvement = Math.floor((Math.random() * baseFactor) + 1) * durationHours / 4;
        improvement = Math.max(1, improvement);
      }
      
      // Apply the improvement
      const currentValue = selectedAgent.attributes[attribute];
      const newValue = Math.min(100, currentValue + improvement); // Cap at 100
      
      // Update the agent with new attributes and last training time
      const updatedAgent = {
        ...selectedAgent,
        attributes: {
          ...selectedAgent.attributes,
          [attribute]: newValue
        },
        lastTraining: {
          ...selectedAgent.lastTraining,
          [attribute]: Date.now() // Update training timestamp
        }
      };
      
      setSelectedAgent(updatedAgent);
      setAgent(updatedAgent);
      
      // Save to local storage
      saveAgentToLocalStorage(updatedAgent);
      
      // Update agents list
      setAgents(prev => prev.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      ));
      
      // Set training success
      setTrainingSuccess({
        attribute,
        improvement,
        newValue
      });
      
      toast.success(`Successfully trained ${attribute}! +${improvement} points.`);
    } catch (error) {
      console.error("Error training agent:", error);
      setTrainingError(error instanceof Error ? error.message : "Failed to train agent. Please try again.");
      toast.error(error instanceof Error ? error.message : "Failed to train agent.");
    } finally {
      setTrainingInProgress(false);
    }
  };

  // Determine rarity based on attribute total
  const getRarityFromAttributes = (attributes: AIAgent['attributes']) => {
    const total = Object.values(attributes).reduce((sum, val) => sum + val, 0);
    
    if (total > 350) return 'legendary';
    if (total > 300) return 'epic';
    if (total > 250) return 'rare';
    if (total > 200) return 'uncommon';
    return 'common';
  };

  // Update a specific attribute
  const updateAgentAttribute = (attribute: keyof AIAgent['attributes'], value: number) => {
    if (!agent) return;
    
    const updatedAgent = {
      ...agent,
      attributes: {
        ...agent.attributes,
        [attribute]: Math.max(0, Math.min(100, value))
      }
    };
    
    setAgent(updatedAgent);
    saveAgentToLocalStorage();
  };

  // Save to local storage
  const saveAgentToLocalStorage = (agentToSave?: AIAgent) => {
    const agentData = agentToSave || agent;
    if (agentData) {
      localStorage.setItem('aiAgent', JSON.stringify(agentData));
      
      // Also update the agents list in local storage
      const updatedAgents = agents.some(a => a.id === agentData.id)
        ? agents.map(a => a.id === agentData.id ? agentData : a)
        : [...agents, agentData];
      
      setAgents(updatedAgents);
      localStorage.setItem('agents', JSON.stringify(updatedAgents));
    }
  };

  // Load from local storage on mount
  useEffect(() => {
    setIsLoading(true);
    try {
      // First check for agents in storage
      const storedAgents = localStorage.getItem('agents');
      if (storedAgents) {
        const parsedAgents = JSON.parse(storedAgents);
        setAgents(parsedAgents);
      }
      
      // Then check for current agent
      const storedAgent = localStorage.getItem('aiAgent');
      if (storedAgent) {
        const parsedAgent = JSON.parse(storedAgent);
        setAgent(parsedAgent);
        setSelectedAgent(parsedAgent);
      } else if (agents.length > 0) {
        // If we have agents but no current one, use the first agent
        setAgent(agents[0]);
        setSelectedAgent(agents[0]);
      } else {
        // Generate an agent only if we have none
        generateRandomAgent();
      }
    } catch (err) {
      console.error('Error loading agent:', err);
      setError('Failed to load AI agent data');
      // Ensure we have an agent even if there's an error
      generateRandomAgent();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // List an agent for sale
  const listAgentForSale = async (agentId: string, price: string): Promise<boolean> => {
    if (!wallet.isConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }
    
    try {
      setIsLoading(true);
      const agent = agents.find(a => a.id === agentId);
      
      if (!agent) {
        toast.error('Agent not found');
        return false;
      }
      
      if (!agent.isNFT || agent.owner !== wallet.address) {
        toast.error('You can only list NFT agents that you own');
        return false;
      }
      
      // Call the Petra wallet service to initiate the transaction
      const result = await listAgentForSaleTransaction(agentId, price);
      
      if (!result) {
        toast.error('Failed to list agent for sale');
        return false;
      }
      
      // Update the agent status in the backend
      const response = await fetch('/api/marketplace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          owner: wallet.address,
          price,
          transactionHash: result.hash,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to update agent listing status');
        return false;
      }
      
      // Update local state
      const updatedAgent = { ...agent, isListed: true, listPrice: price };
      
      // Update the listings record
      setAgentListings(prev => ({
        ...prev,
        [agentId]: { price, owner: wallet.address }
      }));
      
      // Update the agent in our state
      setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a));
      
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent(updatedAgent);
      }
      
      if (agent && agent.id === agentId) {
        setAgent(updatedAgent);
      }
      
      toast.success('Agent listed for sale successfully!');
      return true;
    } catch (error) {
      console.error("Error listing agent for sale:", error);
      toast.error('An error occurred while listing your agent');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cancel a listing
  const cancelListing = async (agentId: string): Promise<boolean> => {
    if (!wallet.isConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    try {
      setIsLoading(true);
      const agent = agents.find(a => a.id === agentId);
      
      if (!agent) {
        toast.error('Agent not found');
        return false;
      }
      
      if (!agent.isListed || agent.owner !== wallet.address) {
        toast.error('You can only cancel listings for agents that you own');
        return false;
      }
      
      // Call the Petra wallet service to initiate the transaction
      const result = await cancelAgentListingTransaction(agentId);
      
      if (!result) {
        toast.error('Failed to cancel agent listing');
        return false;
      }
      
      // Update the agent status in the backend
      const response = await fetch(`/api/marketplace/${agentId}?owner=${wallet.address}&transactionHash=${result.hash}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to update agent listing status');
        return false;
      }
      
      // Update local state
      const updatedAgent = { ...agent, isListed: false, listPrice: '0' };
      
      // Remove from listings
      const newListings = { ...agentListings };
      delete newListings[agentId];
      setAgentListings(newListings);
      
      // Update agent in state
      setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a));
      
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent(updatedAgent);
      }
      
      if (agent && agent.id === agentId) {
        setAgent(updatedAgent);
      }
      
      toast.success('Agent listing cancelled successfully!');
      return true;
    } catch (error) {
      console.error('Error cancelling agent listing:', error);
      toast.error('An error occurred while cancelling your listing');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Buy an agent
  const buyAgent = async (agentId: string, owner: string, price: string): Promise<boolean> => {
    if (!wallet.isConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Call the Petra wallet service to initiate the transaction
      const result = await buyAgentFromMarketplaceTransaction(agentId, owner, price);
      
      if (!result) {
        toast.error('Failed to buy agent');
        return false;
      }
      
      // Update the agent ownership in the backend
      const response = await fetch(`/api/marketplace/${agentId}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyer: wallet.address,
          transactionHash: result.hash,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to update agent ownership');
        return false;
      }
      
      // Get the updated agent from the response
      const data = await response.json();
      const updatedAgent = data.agent;
      
      // Remove from listings
      const newListings = { ...agentListings };
      delete newListings[agentId];
      setAgentListings(newListings);
      
      // Update agents with the new ownership
      setAgents(prev => [
        ...prev.filter(a => a.id !== agentId),
        { 
          ...updatedAgent, 
          owner: wallet.address,
          isListed: false,
          listPrice: '0'
        }
      ]);
      
      // Fetch marketplace agents to refresh the list
      fetchMarketplaceAgents();
      
      toast.success('Agent purchased successfully!');
      return true;
    } catch (error) {
      console.error('Error buying agent:', error);
      toast.error('An error occurred while purchasing the agent');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch marketplace agents (in a real app, this would be from an API or blockchain)
  const fetchMarketplaceAgents = async (): Promise<void> => {
    try {
      // Simulate API call
      console.log("Fetching marketplace agents...");
      
      // Skip fetching if we're already processing a transaction
      if (isMinting || isTraining || mintingAgent || trainingInProgress) {
        console.log("Skipping marketplace fetch during active transaction");
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would be from a database or blockchain query
      // Ensure we don't cause infinite loops by setting the same data
      const currentMarketplaceIds = marketplaceAgents.map(a => a.id).sort().join(',');
      const newMarketplaceIds = MARKETPLACE_NFTS.map(a => a.id).sort().join(',');
      
      if (currentMarketplaceIds !== newMarketplaceIds) {
        console.log("Updating marketplace agents");
        setMarketplaceAgents(MARKETPLACE_NFTS);
      } else {
        console.log("Marketplace agents unchanged, skipping update");
      }
    } catch (error) {
      console.error("Error fetching marketplace agents:", error);
    }
  };
  
  // Load marketplace agents on mount - only run this once
  useEffect(() => {
    console.log("Initial marketplace fetch");
    fetchMarketplaceAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  return (
    <AIAgentContext.Provider value={{ 
      agents,
      agent,
      selectedAgent,
      setAgent,
      setSelectedAgent,
      generateRandomAgent,
      mintNFTAgent,
      trainAgent,
      mintingAgent,
      mintingSuccess,
      mintError,
      trainingAttribute,
      trainingSuccess,
      trainingError,
      trainingInProgress,
      listAgentForSale,
      cancelListing,
      buyAgent,
      marketplaceAgents,
      fetchMarketplaceAgents,
      isLoading,
    }}>
      {children}
    </AIAgentContext.Provider>
  );
};

// Custom hook to use the context
export const useAIAgent = () => {
  try {
    const context = useContext(AIAgentContext);
    if (context === undefined) {
      throw new Error('useAIAgent must be used within an AIAgentProvider');
    }
    return context;
  } catch (error) {
    console.error("Error using AIAgentContext:", error);
    // Return a default context that won't crash the app
    // This is a fallback for error handling only
    return {
      agents: [],
      agent: null,
      selectedAgent: null,
      setAgent: () => {},
      setSelectedAgent: () => {},
      generateRandomAgent: () => ({
        id: 'fallback',
        name: 'Fallback Agent',
        level: 1,
        attributes: { Intelligence: 50, Speed: 50, Defense: 50, Strategy: 50 },
        wins: 0,
        losses: 0,
      }),
      mintNFTAgent: async () => {},
      trainAgent: async () => {},
      mintingAgent: false,
      mintingSuccess: false,
      mintError: null,
      trainingAttribute: null,
      trainingSuccess: null,
      trainingError: null,
      trainingInProgress: false,
      listAgentForSale: async () => false,
      cancelListing: async () => false,
      buyAgent: async () => false,
      marketplaceAgents: [],
      fetchMarketplaceAgents: async () => {},
      isLoading: true,
    } as AIAgentContextType;
  }
}; 