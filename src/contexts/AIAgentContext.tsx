"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAptosWallet, AptosWalletContextState } from '@/contexts/AptosWalletContext';
import { mintAIAgentNFT, trainAIAgent as mockTrainAIAgent } from '@/lib/moveAgentKit';

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
};

// Context Type
type AIAgentContextType = {
  agent: AIAgent | null;
  setAgent: (agent: AIAgent | null) => void;
  isLoading: boolean;
  error: string | null;
  saveAgentToLocalStorage: (agentToSave?: AIAgent) => void;
  updateAgentAttribute: (attribute: keyof AIAgent['attributes'], value: number) => void;
  generateRandomAgent: () => void;
  mintNFTAgent: () => Promise<void>;
  trainAgent: (attribute: keyof AIAgent['attributes'], durationHours: number) => Promise<void>;
  isMinting: boolean;
  isTraining: boolean;
  selectedAgent: AIAgent | null;
  setSelectedAgent: (agent: AIAgent | null) => void;
  agents: AIAgent[];
  setAgents: (agents: AIAgent[]) => void;
  mintError: string | null;
  setMintError: (error: string | null) => void;
  mintingAgent: boolean;
  setMintingAgent: (isMinting: boolean) => void;
  mintingSuccess: boolean;
  setMintingSuccess: (success: boolean) => void;
  trainingInProgress: boolean;
  setTrainingInProgress: (inProgress: boolean) => void;
  trainingAttribute: keyof AIAgent['attributes'] | null;
  setTrainingAttribute: (attribute: keyof AIAgent['attributes'] | null) => void;
  trainingError: string | null;
  setTrainingError: (error: string | null) => void;
  trainingSuccess: { attribute: keyof AIAgent['attributes']; improvement: number; newValue: number } | null;
  setTrainingSuccess: (success: { attribute: keyof AIAgent['attributes']; improvement: number; newValue: number } | null) => void;
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

  // Mint NFT agent using Petra Wallet
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
      
      // Execute transaction using Petra wallet (0.1 APT fee)
      if (!wallet.mintAgentTransaction) {
        throw new Error("Wallet mintAgentTransaction function is not available");
      }
      
      const transaction = await wallet.mintAgentTransaction(selectedAgent.name);
      
      if (!transaction) {
        throw new Error("Transaction failed or was rejected by user");
      }
      
      // Get the rarity based on attributes
      const rarity = getRarityFromAttributes(selectedAgent.attributes);
      
      // Update the agent with NFT properties
      const updatedAgent = {
        ...selectedAgent,
        isNFT: true,
        owner: wallet.address,
        rarity,
        transactionHash: transaction.hash,
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
    } catch (error) {
      console.error("Error minting NFT agent:", error);
      setMintError(error instanceof Error ? error.message : "Failed to mint NFT agent. Please try again.");
    } finally {
      setMintingAgent(false);
    }
  };
  
  // Train an agent
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
        
        // Check if the training function exists
        if (!wallet.trainAgentTransaction) {
          throw new Error("Wallet trainAgentTransaction function is not available");
        }
        
        // Execute transaction using Petra wallet (0.1 APT fee)
        const transaction = await wallet.trainAgentTransaction(selectedAgent.id, attribute);
        
        if (!transaction) {
          throw new Error("Transaction failed or was rejected by user");
        }
        
        // Calculate improvement based on duration and level
        // Higher levels get diminishing returns
        const baseFactor = 10 - Math.min(9, selectedAgent.level);
        improvement = Math.floor((Math.random() * baseFactor) + 1) * durationHours / 4;
        
        // Ensure improvement is at least 1 point
        improvement = Math.max(1, improvement);
      } else {
        // For non-NFT agents, improvement is simpler and doesn't require transaction
        improvement = Math.floor(Math.random() * 3) + 1; // Random improvement between 1-3
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
      }
      
      // Update the agent's attributes
      const updatedAttributes = {
        ...selectedAgent.attributes,
        [attribute]: Math.min(selectedAgent.attributes[attribute] + improvement, 100)
      };
      
      // Calculate level based on total attributes
      const totalAttributes = Object.values(updatedAttributes).reduce((sum, val) => sum + val, 0);
      const newLevel = Math.floor(totalAttributes / 40); // Simple level formula
      
      // Set the training timestamp for cooldown
      const updatedLastTraining = {
        ...selectedAgent.lastTraining,
        [attribute]: Date.now()
      };
      
      const updatedAgent = {
        ...selectedAgent,
        attributes: updatedAttributes,
        level: Math.max(1, newLevel), // Ensure level is at least 1
        lastTraining: updatedLastTraining
      };
      
      setSelectedAgent(updatedAgent);
      setAgent(updatedAgent);
      
      // Save to local storage
      saveAgentToLocalStorage(updatedAgent);
      
      // Update in the agents list
      setAgents(prev => prev.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      ));
      
      setTrainingSuccess({
        attribute,
        improvement,
        newValue: updatedAttributes[attribute]
      });
    } catch (error) {
      console.error("Error training agent:", error);
      setTrainingError(error instanceof Error ? error.message : "Failed to train agent. Please try again.");
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

  return (
    <AIAgentContext.Provider value={{ 
      agent, 
      setAgent, 
      isLoading, 
      error,
      saveAgentToLocalStorage,
      updateAgentAttribute,
      generateRandomAgent,
      mintNFTAgent,
      trainAgent,
      isMinting,
      isTraining,
      selectedAgent,
      setSelectedAgent,
      agents,
      setAgents,
      mintError,
      setMintError,
      mintingAgent,
      setMintingAgent,
      mintingSuccess,
      setMintingSuccess,
      trainingInProgress,
      setTrainingInProgress,
      trainingAttribute,
      setTrainingAttribute,
      trainingError,
      setTrainingError,
      trainingSuccess,
      setTrainingSuccess
    }}>
      {children}
    </AIAgentContext.Provider>
  );
};

// Custom hook to use the context
export const useAIAgent = () => {
  const context = useContext(AIAgentContext);
  if (context === undefined) {
    throw new Error('useAIAgent must be used within an AIAgentProvider');
  }
  return context;
}; 