"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FaSearch, FaFilter, FaSort, FaShoppingCart, FaStar, FaEthereum, FaGem } from "react-icons/fa";
import BotIcon from "@/components/ui/BotIcon";
import Link from "next/link";

// Define agent type
type Agent = {
  id: string;
  name: string;
  level: number;
  botType: 'default' | 'strategic' | 'speedy' | 'defensive' | 'balanced';
  attributes: {
    Intelligence: number;
    Speed: number;
    Defense: number;
    Strategy: number;
  };
  price: number;
  owner: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  sold: boolean;
};

// Helper function to generate random agents
const generateAgents = (count: number): Agent[] => {
  const botTypes = ['default', 'strategic', 'speedy', 'defensive', 'balanced'] as const;
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
  const rarityWeights = [0.5, 0.25, 0.15, 0.08, 0.02]; // Probability for each rarity
  
  const getRarity = (): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' => {
    const rand = Math.random();
    let cumulativeProb = 0;
    
    for (let i = 0; i < rarities.length; i++) {
      cumulativeProb += rarityWeights[i];
      if (rand < cumulativeProb) {
        return rarities[i];
      }
    }
    
    return 'common';
  };

  // Generate price based on rarity
  const getPriceByRarity = (rarity: string): number => {
    switch(rarity) {
      case 'common': return 0.01 + Math.random() * 0.04;
      case 'uncommon': return 0.05 + Math.random() * 0.05;
      case 'rare': return 0.1 + Math.random() * 0.1;
      case 'epic': return 0.2 + Math.random() * 0.3;
      case 'legendary': return 0.5 + Math.random() * 0.5;
      default: return 0.01;
    }
  };
  
  const agents: Agent[] = [];
  
  for (let i = 0; i < count; i++) {
    const rarity = getRarity();
    const botType = botTypes[Math.floor(Math.random() * botTypes.length)];
    
    // Base stats by rarity
    let baseStat = 0;
    switch(rarity) {
      case 'common': baseStat = 40; break;
      case 'uncommon': baseStat = 50; break;
      case 'rare': baseStat = 60; break;
      case 'epic': baseStat = 70; break;
      case 'legendary': baseStat = 80; break;
    }
    
    // Generate agent
    agents.push({
      id: `agent-${i+1}`,
      name: `AI-${Math.floor(1000 + Math.random() * 9000)}`,
      level: Math.floor(Math.random() * 20) + 1,
      botType,
      attributes: {
        Intelligence: baseStat + Math.floor(Math.random() * 20),
        Speed: baseStat + Math.floor(Math.random() * 20),
        Defense: baseStat + Math.floor(Math.random() * 20),
        Strategy: baseStat + Math.floor(Math.random() * 20),
      },
      price: getPriceByRarity(rarity),
      owner: `0x${Math.random().toString(16).slice(2, 10)}...`,
      rarity,
      sold: Math.random() < 0.2, // 20% chance to be sold
    });
  }
  
  return agents;
};

// Helper function to get color by rarity
const getRarityColor = (rarity: string): string => {
  switch(rarity) {
    case 'common': return 'text-gray-300';
    case 'uncommon': return 'text-green-400';
    case 'rare': return 'text-blue-400';
    case 'epic': return 'text-purple-400';
    case 'legendary': return 'text-yellow-400';
    default: return 'text-gray-300';
  }
};

// Helper function to get glow by rarity
const getRarityGlow = (rarity: string): string => {
  switch(rarity) {
    case 'common': return '';
    case 'uncommon': return 'shadow-glow-green';
    case 'rare': return 'shadow-glow';
    case 'epic': return 'shadow-glow-purple';
    case 'legendary': return 'shadow-glow-yellow';
    default: return '';
  }
};

export default function MarketplacePage() {
  // Generate random agents for the marketplace
  const [agents] = useState<Agent[]>(generateAgents(12));
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("price-asc");

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Filter and sort agents
  const filteredAgents = agents.filter(agent => {
    // Filter by search
    if (searchQuery && !agent.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by rarity
    if (selectedRarity && agent.rarity !== selectedRarity) {
      return false;
    }
    
    // Filter by bot type
    if (selectedType && agent.botType !== selectedType) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by selected option
    switch(sortBy) {
      case "price-asc": return a.price - b.price;
      case "price-desc": return b.price - a.price;
      case "level-asc": return a.level - b.level;
      case "level-desc": return b.level - a.level;
      case "rarity": 
        const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];
        return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
      default: return 0;
    }
  });

  const handleAddToCart = (agentId: string) => {
    setCartCount(prev => prev + 1);
    // In a real app, you would also add this to a cart state/context
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-900"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">NFT Agent Marketplace</h1>
          <p className="text-gray-300 max-w-3xl">
            Browse and purchase unique AI agents with different attributes, abilities, and rarities. 
            Each agent is a one-of-a-kind NFT on the blockchain.
          </p>
        </div>

        <div className="sticky top-0 z-10 bg-gray-800 shadow-md rounded-lg p-4 mb-8 border border-gray-700">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search agents..."
                className="w-full bg-gray-700 rounded-md p-3 pl-10 text-white border border-gray-600 focus:border-squid-pink focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <select 
                  className="bg-gray-700 text-white px-4 py-3 rounded-md border border-gray-600 appearance-none pr-10 focus:border-squid-pink focus:outline-none"
                  value={selectedRarity || ""}
                  onChange={(e) => setSelectedRarity(e.target.value || null)}
                >
                  <option value="">All Rarities</option>
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
                <FaFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              
              <div className="relative">
                <select 
                  className="bg-gray-700 text-white px-4 py-3 rounded-md border border-gray-600 appearance-none pr-10 focus:border-squid-pink focus:outline-none"
                  value={selectedType || ""}
                  onChange={(e) => setSelectedType(e.target.value || null)}
                >
                  <option value="">All Types</option>
                  <option value="default">Default</option>
                  <option value="strategic">Strategic</option>
                  <option value="speedy">Speedy</option>
                  <option value="defensive">Defensive</option>
                  <option value="balanced">Balanced</option>
                </select>
                <FaFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              
              <div className="relative">
                <select 
                  className="bg-gray-700 text-white px-4 py-3 rounded-md border border-gray-600 appearance-none pr-10 focus:border-squid-pink focus:outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="level-asc">Level: Low to High</option>
                  <option value="level-desc">Level: High to Low</option>
                  <option value="rarity">Rarity</option>
                </select>
                <FaSort className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            
            {/* Cart */}
            <div className="relative">
              <button className="bg-squid-pink text-white px-4 py-3 rounded-md font-bold hover:bg-opacity-80 transition duration-300 flex items-center">
                <FaShoppingCart className="mr-2" />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Agent Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredAgents.map((agent) => (
            <motion.div
              key={agent.id}
              variants={itemVariants}
              className={`bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 relative ${getRarityGlow(agent.rarity)}`}
              whileHover={{ 
                y: -5,
                boxShadow: agent.rarity === 'legendary' ? '0 0 25px 5px rgba(252, 211, 77, 0.5)' : undefined
              }}
            >
              {/* Rarity Badge */}
              <div className="absolute top-3 right-3 z-10">
                <div className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${getRarityColor(agent.rarity)} bg-gray-900 bg-opacity-70 border border-gray-700 flex items-center`}>
                  <FaGem className="mr-1" />
                  {agent.rarity}
                </div>
              </div>

              {/* Main Content */}
              <div className="p-6">
                <div className="flex justify-center mb-4">
                  <BotIcon 
                    type={agent.botType} 
                    level={agent.level} 
                    size="lg"
                  />
                </div>
                
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-white mb-1">{agent.name}</h3>
                  <p className="text-gray-400 text-sm">Level {agent.level}</p>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-400 text-xs mb-1">Intelligence</span>
                    <span className="text-white font-bold">{agent.attributes.Intelligence}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-400 text-xs mb-1">Speed</span>
                    <span className="text-white font-bold">{agent.attributes.Speed}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-400 text-xs mb-1">Defense</span>
                    <span className="text-white font-bold">{agent.attributes.Defense}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-400 text-xs mb-1">Strategy</span>
                    <span className="text-white font-bold">{agent.attributes.Strategy}</span>
                  </div>
                </div>
                
                {/* Owner */}
                <div className="text-center mb-4">
                  <p className="text-xs text-gray-400">
                    Owner: <span className="font-mono">{agent.owner}</span>
                  </p>
                </div>
                
                {/* Price and Buy Button */}
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center">
                    <FaEthereum className="text-purple-300 mr-1" />
                    <span className="text-white font-bold">{agent.price.toFixed(3)} ETH</span>
                  </div>
                  
                  {agent.sold ? (
                    <span className="px-3 py-2 bg-gray-700 text-gray-400 rounded-md font-bold text-sm">Sold</span>
                  ) : (
                    <button 
                      className="bg-squid-pink hover:bg-opacity-80 text-white px-3 py-2 rounded-md font-bold text-sm transition duration-200"
                      onClick={() => handleAddToCart(agent.id)}
                    >
                      Buy Now
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {filteredAgents.length === 0 && (
          <div className="text-center py-16">
            <FaSearch className="text-gray-500 text-5xl mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Agents Found</h3>
            <p className="text-gray-400">Try adjusting your filters or search query</p>
          </div>
        )}
        
        {/* Pagination */}
        <div className="mt-12 flex justify-center">
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((pageNum) => (
              <button
                key={pageNum}
                className={`w-10 h-10 rounded-md flex items-center justify-center ${
                  pageNum === 1 
                    ? 'bg-squid-pink text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button className="w-10 h-10 rounded-md flex items-center justify-center bg-gray-800 text-gray-300 hover:bg-gray-700">
              ...
            </button>
            <button className="w-10 h-10 rounded-md flex items-center justify-center bg-gray-800 text-gray-300 hover:bg-gray-700">
              10
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 