"use client";

import { useState, useEffect } from "react";
import { useAIAgent } from "@/contexts/AIAgentContext";
import { useAptosWallet } from "@/contexts/AptosWalletContext";
import { FaBrain, FaRunning, FaShieldAlt, FaChessKnight, FaTrophy, FaWallet, FaInfoCircle, FaPlus, FaTags, FaShoppingCart } from "react-icons/fa";
import { toast } from 'react-hot-toast';
import Link from "next/link";

// Mock marketplace NFT data - leaving this here for reference but it's not used
// since we get the data from the AIAgentContext
const MARKETPLACE_NFTS = [
  {
    id: "marketplace-1",
    name: "Elite Sentinel",
    owner: "0xf7e5b1a32141a1e1b20ee1a7",
    price: "0.1",
    rarity: "Legendary",
    level: 5,
  attributes: {
      Intelligence: 85,
      Speed: 78,
      Defense: 92,
      Strategy: 86
    }
  },
  // other entries...
];

export default function MarketplacePage() {
  const aiAgentContext = useAIAgent();
  const { 
    selectedAgent, 
    agents, 
    setSelectedAgent, 
    marketplaceAgents, 
    fetchMarketplaceAgents,
    listAgentForSale,
    cancelListing,
    buyAgent
  } = aiAgentContext;
  const { wallet } = useAptosWallet();
  
  const [listedAgents, setListedAgents] = useState<any[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [listingPrice, setListingPrice] = useState("");
  const [agentToList, setAgentToList] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refresh marketplace data
  useEffect(() => {
    console.log("Refreshing marketplace data...");
    fetchMarketplaceAgents();
  }, [fetchMarketplaceAgents]);
  
  // Initialize marketplace data
  useEffect(() => {
    // Filter out agents that the user has already listed
    const userListedAgents = agents.filter(agent => 
      agent.isNFT && 
      agent.owner === wallet.address && 
      agent.isListed
    );
    
    setListedAgents(userListedAgents);
  }, [agents, wallet.address]);
  
  // Get the rarity color
  const getRarityColor = (rarity: string) => {
    // Normalize the rarity to lowercase for comparison
    const normalizedRarity = rarity?.toLowerCase() || '';
    
    switch (normalizedRarity) {
      case "common": return "bg-gray-500";
      case "uncommon": return "bg-green-500";
      case "rare": return "bg-blue-500";
      case "epic": return "bg-purple-500";
      case "legendary": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };
  
  // Get the rarity icon
  const getRarityIcon = (rarity: string) => {
    // Normalize the rarity to lowercase for comparison
    const normalizedRarity = rarity?.toLowerCase() || '';
    
    switch (normalizedRarity) {
      case "common": return "👤";
      case "uncommon": return "👥";
      case "rare": return "🥉";
      case "epic": return "🥈";
      case "legendary": return "🥇";
      default: return "👤";
    }
  };
  
  // Handle listing an agent for sale
  const handleListAgent = (agent: any) => {
    if (!wallet.isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    setAgentToList(agent);
    setListingPrice("");
    setShowListModal(true);
  };
  
  // Confirm listing an agent
  const confirmListAgent = async () => {
    if (!listingPrice || parseFloat(listingPrice) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Use the context function to list the agent
      const success = await listAgentForSale(agentToList.id, listingPrice);
      
      if (success) {
        toast.success(`Agent ${agentToList.name} listed for ${listingPrice} APT`);
        
        // Refresh marketplace data
        fetchMarketplaceAgents();
        
        setShowListModal(false);
      } else {
        throw new Error("Failed to list agent");
      }
    } catch (error) {
      console.error("Error listing agent:", error);
      toast.error("Failed to list agent. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Cancel listing
  const handleCancelListing = async (agentId: string) => {
    setIsProcessing(true);
    
    try {
      // Use the context function to cancel the listing
      const success = await cancelListing(agentId);
      
      if (success) {
        toast.success("Listing canceled");
        
        // Update local state
        setListedAgents(prev => prev.filter(agent => agent.id !== agentId));
        
        // Refresh marketplace data
        fetchMarketplaceAgents();
      } else {
        throw new Error("Failed to cancel listing");
      }
    } catch (error) {
      console.error("Error canceling listing:", error);
      toast.error("Failed to cancel listing. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Buy an agent
  const handleBuyAgent = async (agent: any) => {
    if (!wallet.isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    // Check if buyAgent function exists in the context
    if (!buyAgent) {
      console.error("buyAgent function not available in context");
      toast.error("Marketplace functionality is not available");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      toast.loading("Processing transaction...", { id: "buy-transaction" });
      
      // Check if agent exists
      if (!agent || !agent.id || !agent.owner || !agent.price) {
        throw new Error("Invalid agent data");
      }
      
      console.log(`Initiating purchase of agent ${agent.name} from ${agent.owner} for ${agent.price} APT`);
      
      // Use the AIAgentContext's buyAgent function to handle the purchase
      const success = await buyAgent(agent.id, agent.owner, agent.price);
      
      if (success) {
        toast.dismiss("buy-transaction");
        toast.success(`Successfully purchased ${agent.name} for ${agent.price} APT!`);
        
        // Refresh marketplace data
        if (fetchMarketplaceAgents) {
          await fetchMarketplaceAgents();
        }
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("Error buying agent:", error);
      toast.dismiss("buy-transaction");
      toast.error(error instanceof Error ? error.message : "Failed to buy agent. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Render the listing modal
  const renderListingModal = () => {
    if (!showListModal) return null;

  return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">List Agent for Sale</h3>
          
          <div className="flex items-center mb-4">
            <div className={`h-12 w-12 rounded-full ${getRarityColor(agentToList.rarity)} flex items-center justify-center text-xl mr-3`}>
              {getRarityIcon(agentToList.rarity)}
            </div>
            <div>
              <h4 className="font-bold">{agentToList.name}</h4>
              <p className="text-sm text-gray-400">Level {agentToList.level} · {agentToList.rarity}</p>
            </div>
        </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Price (APT)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="Enter price in APT"
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                APT
              </div>
            </div>
              </div>
              
          <div className="flex space-x-2">
            <button
              onClick={() => setShowListModal(false)}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={confirmListAgent}
              disabled={isProcessing || !listingPrice}
              className={`flex-1 py-2 px-4 rounded-md text-white ${
                isProcessing || !listingPrice
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isProcessing ? "Processing..." : "List for Sale"}
            </button>
          </div>
        </div>
              </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-2">NFT Marketplace</h1>
        <p className="text-gray-400 mb-8">Buy, sell, and collect unique AI agent NFTs</p>
        
        {/* Wallet Info */}
        {wallet.isConnected ? (
          <div className="bg-gray-800 rounded-lg p-4 mb-8 flex flex-wrap items-center justify-between">
            <div className="flex items-center mb-2 sm:mb-0">
              <FaWallet className="text-blue-400 mr-2" />
              <div>
                <p className="text-sm">Connected: {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}</p>
                <p className="text-sm text-green-400">{wallet.balance} APT</p>
              </div>
            </div>
            <Link 
              href="/train"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium flex items-center"
            >
              <FaPlus className="mr-1" /> Create Agent
            </Link>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 mb-8 text-center">
            <p className="mb-2">Connect your wallet to buy and sell NFT agents</p>
            <Link 
              href="/train"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium inline-block"
            >
              Connect Wallet
            </Link>
          </div>
        )}
        
        {/* Marketplace Listings */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <FaShoppingCart className="mr-2 text-green-500" />
            Available Agents
          </h2>
          
          {marketplaceAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketplaceAgents.map(agent => (
                <div key={agent.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <div className={`h-12 w-12 rounded-full ${getRarityColor(agent.rarity)} flex items-center justify-center text-xl mr-3`}>
                        {getRarityIcon(agent.rarity)}
                      </div>
                      <div>
                        <h3 className="font-bold">{agent.name}</h3>
                        <p className="text-sm text-gray-400">Level {agent.level} · {agent.rarity}</p>
                      </div>
                      <div className="ml-auto bg-blue-500 px-2 py-1 rounded text-sm font-bold">
                        {agent.price} APT
                </div>
              </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Intelligence</span>
                          <span>{agent.attributes.Intelligence}</span>
                </div>
                        <div className="h-1.5 bg-gray-700 rounded-full">
                          <div 
                            className="h-1.5 bg-blue-500 rounded-full" 
                            style={{ width: `${agent.attributes.Intelligence}%` }}
                          ></div>
                </div>
                  </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Speed</span>
                          <span>{agent.attributes.Speed}</span>
                  </div>
                        <div className="h-1.5 bg-gray-700 rounded-full">
                          <div 
                            className="h-1.5 bg-green-500 rounded-full" 
                            style={{ width: `${agent.attributes.Speed}%` }}
                          ></div>
                  </div>
                  </div>
                </div>
                
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Defense</span>
                          <span>{agent.attributes.Defense}</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full">
                          <div 
                            className="h-1.5 bg-red-500 rounded-full" 
                            style={{ width: `${agent.attributes.Defense}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Strategy</span>
                          <span>{agent.attributes.Strategy}</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full">
                          <div 
                            className="h-1.5 bg-yellow-500 rounded-full" 
                            style={{ width: `${agent.attributes.Strategy}%` }}
                          ></div>
                        </div>
                </div>
                  </div>
                  
                    <button 
                      onClick={() => handleBuyAgent(agent)}
                      disabled={isProcessing}
                      className={`w-full py-2 rounded-md text-sm font-medium ${
                        isProcessing 
                          ? "bg-gray-600 cursor-not-allowed" 
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {isProcessing ? "Processing..." : `Buy for ${agent.price} APT`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-400">No agents available in the marketplace right now</p>
            </div>
          )}
              </div>
        
        {/* Your NFT Agents (for listing) */}
        {wallet.isConnected && agents.some(agent => agent.isNFT && agent.owner === wallet.address && !agent.isListed) && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaTrophy className="mr-2 text-purple-500" />
              Your NFT Agents
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents
                .filter(agent => agent.isNFT && agent.owner === wallet.address && !agent.isListed)
                .map(agent => (
                  <div key={agent.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <div className="p-4">
                      <div className="flex items-center mb-3">
                        <div className={`h-12 w-12 rounded-full ${getRarityColor(agent.rarity)} flex items-center justify-center text-xl mr-3`}>
                          {getRarityIcon(agent.rarity)}
                        </div>
                        <div>
                          <h3 className="font-bold">{agent.name}</h3>
                          <p className="text-sm text-gray-400">Level {agent.level} · {agent.rarity}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Intelligence</span>
                            <span>{agent.attributes.Intelligence}</span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full">
                            <div 
                              className="h-1.5 bg-blue-500 rounded-full" 
                              style={{ width: `${agent.attributes.Intelligence}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Speed</span>
                            <span>{agent.attributes.Speed}</span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full">
                            <div 
                              className="h-1.5 bg-green-500 rounded-full" 
                              style={{ width: `${agent.attributes.Speed}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleListAgent(agent)}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium"
                      >
                        List for Sale
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Your Listed Agents */}
        {wallet.isConnected && listedAgents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaTags className="mr-2 text-yellow-500" />
              Your Listed Agents
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listedAgents.map(agent => (
                <div key={agent.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <div className={`h-12 w-12 rounded-full ${getRarityColor(agent.rarity)} flex items-center justify-center text-xl mr-3`}>
                        {getRarityIcon(agent.rarity)}
                      </div>
                      <div>
                        <h3 className="font-bold">{agent.name}</h3>
                        <p className="text-sm text-gray-400">Level {agent.level} · {agent.rarity}</p>
                      </div>
                      <div className="ml-auto bg-blue-500 px-2 py-1 rounded text-sm font-bold">
                        {agent.listPrice} APT
                      </div>
                    </div>
                    
              <button
                      onClick={() => handleCancelListing(agent.id)}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium"
                    >
                      Cancel Listing
            </button>
          </div>
        </div>
              ))}
            </div>
          </div>
        )}
        
        {renderListingModal()}
      </div>
    </div>
  );
} 