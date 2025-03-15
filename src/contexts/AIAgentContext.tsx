"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
};

// Context Type
type AIAgentContextType = {
  agent: AIAgent | null;
  setAgent: (agent: AIAgent | null) => void;
  isLoading: boolean;
  error: string | null;
  saveAgentToLocalStorage: () => void;
  updateAgentAttribute: (attribute: keyof AIAgent['attributes'], value: number) => void;
  generateRandomAgent: () => void;
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

  // Generate a new random agent
  const generateRandomAgent = () => {
    // Generate random attributes between 40-90
    const randomAttr = () => Math.floor(Math.random() * 50) + 40;
    
    // 25% chance for NFT agent
    const isNFT = Math.random() < 0.25;
    
    // Create a new agent
    const newAgent: AIAgent = {
      id: `agent-${Date.now()}`,
      name: getRandomName(),
      level: Math.floor(Math.random() * 20) + 1,
      attributes: {
        Intelligence: randomAttr(),
        Speed: randomAttr(),
        Defense: randomAttr(),
        Strategy: randomAttr()
      },
      wins: Math.floor(Math.random() * 10),
      losses: Math.floor(Math.random() * 5),
      isNFT,
      owner: isNFT ? `0x${Math.random().toString(16).slice(2, 12)}...` : undefined,
      rarity: isNFT ? 
        (Math.random() < 0.1 ? 'legendary' : 
        Math.random() < 0.2 ? 'epic' : 
        Math.random() < 0.4 ? 'rare' : 
        Math.random() < 0.6 ? 'uncommon' : 'common') : undefined
    };
    
    setAgent(newAgent);
    localStorage.setItem('aiAgent', JSON.stringify(newAgent));
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
  const saveAgentToLocalStorage = () => {
    if (agent) {
      localStorage.setItem('aiAgent', JSON.stringify(agent));
    }
  };

  // Load from local storage on mount
  useEffect(() => {
    setIsLoading(true);
    try {
      const storedAgent = localStorage.getItem('aiAgent');
      if (storedAgent) {
        setAgent(JSON.parse(storedAgent));
      } else {
        // Auto-generate an agent if none exists
        generateRandomAgent();
      }
    } catch (err) {
      console.error('Error loading agent:', err);
      setError('Failed to load AI agent data');
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
      generateRandomAgent
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