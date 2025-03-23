"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIAgent } from "@/contexts/AIAgentContext";
import { useAptosWallet } from "@/contexts/AptosWalletContext";
import { FaBrain, FaRunning, FaShieldAlt, FaChessKnight, FaTrophy, FaBolt, FaCheck, FaRobot, FaSpinner, FaWallet, FaClock, FaArrowUp, FaInfoCircle } from "react-icons/fa";
import WalletConnector from '@/components/ui/WalletConnector';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { GiRank1, GiRank2, GiRank3 } from 'react-icons/gi';
import { PiSealCheck } from 'react-icons/pi';
import { Toaster, toast } from 'react-hot-toast';
import Header from "@/components/ui/Header";

// Training exercise type
type TrainingExercise = {
  id: string;
  name: string;
  attribute: keyof typeof AttributeIcon;
  description: string;
  duration: number; // in seconds
  improvement: number; // attribute points gained
  energy: number; // energy cost
  icon: React.ReactNode;
};

// Attribute icons mapping
const AttributeIcon = {
  Intelligence: <FaBrain className="text-blue-400" />,
  Speed: <FaRunning className="text-yellow-400" />,
  Defense: <FaShieldAlt className="text-red-400" />,
  Strategy: <FaChessKnight className="text-green-400" />,
};

export default function TrainPage() {
  const { 
    selectedAgent, 
    setSelectedAgent,
    agents,
    trainAgent, 
    mintNFTAgent,
    mintingAgent,
    mintingSuccess,
    mintError,
    trainingInProgress,
    trainingAttribute,
    trainingSuccess,
    trainingError,
    generateRandomAgent
  } = useAIAgent();
  
  const { wallet } = useAptosWallet();
  
  const [trainingDuration, setTrainingDuration] = useState(1); // in hours
  const [showCreatePrompt, setShowCreatePrompt] = useState(!selectedAgent);
  
  // Initialize by showing create prompt if no agent exists
  useEffect(() => {
    if (!selectedAgent) {
      setShowCreatePrompt(true);
    } else {
      setShowCreatePrompt(false);
    }
  }, [selectedAgent]);
  
  // Notify when wallet is connected
  useEffect(() => {
    if (wallet.isConnected) {
      const shortenedAddress = `${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}`;
      toast.success(`Connected to wallet: ${shortenedAddress}`);
      
      if (wallet.balance && parseFloat(wallet.balance) > 0) {
        toast.success(`Wallet balance: ${wallet.balance} APT`);
      } else if (wallet.isPetraInstalled) {
        toast(`Fetching your APT balance...`, {
          icon: '⏳'
        });
      }
    }
  }, [wallet.isConnected, wallet.address, wallet.balance]);
  
  // Toast notifications for training and minting results
  useEffect(() => {
    if (trainingSuccess) {
      toast.success(`Training complete! ${trainingSuccess.attribute} improved by ${trainingSuccess.improvement} points.`);
    }
    
    if (trainingError) {
      toast.error(trainingError);
    }
    
    if (mintingSuccess) {
      toast.success('Agent successfully minted as an NFT!');
    }
    
    if (mintError) {
      toast.error(mintError);
    }
  }, [trainingSuccess, trainingError, mintingSuccess, mintError]);
  
  const handleTrainAttribute = async (attribute) => {
    if (!wallet.isConnected && selectedAgent?.isNFT) {
      toast.error('Connect your wallet to train an NFT agent.');
      return;
    }
    
    try {
      if (selectedAgent?.isNFT) {
        toast.loading('Opening wallet for training transaction...', { id: 'training-operation' });
      } else {
        toast.loading('Training in progress...', { id: 'training-operation' });
      }
      
      await trainAgent(attribute, trainingDuration);
      toast.dismiss('training-operation');
    } catch (error) {
      toast.dismiss('training-operation');
      toast.error('Training failed or transaction was rejected.');
      console.error(error);
    }
  };
  
  const handleMintNFT = async () => {
    if (!wallet.isConnected) {
      toast.error('Connect your wallet to mint an NFT agent.');
      return;
    }
    
    if (!wallet.mintAgentTransaction) {
      toast.error('Wallet minting function is not available. Please refresh the page.');
      return;
    }
    
    try {
      toast.loading('Opening wallet for transaction...', { id: 'wallet-operation' });
      await mintNFTAgent();
      toast.dismiss('wallet-operation');
    } catch (error) {
      toast.dismiss('wallet-operation');
      toast.error('Transaction failed or was rejected.');
      console.error(error);
    }
  };
  
  const handleCreateAgent = () => {
    generateRandomAgent();
    setShowCreatePrompt(false);
    toast.success('New agent created! You can now mint it as an NFT.');
  };
  
  // Check if an attribute is on cooldown
  const isAttributeOnCooldown = (attribute) => {
    if (!selectedAgent?.lastTraining?.[attribute]) return false;
    
    const lastTrainingTime = selectedAgent.lastTraining[attribute];
    if (!lastTrainingTime) return false;
    
    // 24-hour cooldown period
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const currentTime = Date.now();
    
    return currentTime - lastTrainingTime < cooldownPeriod;
  };
  
  // Calculate remaining cooldown time
  const getRemainingCooldownTime = (attribute) => {
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
  
  // Format cooldown time into human-readable format
  const formatCooldownTime = (hours) => {
    if (hours <= 0) return 'Ready';
    return `${hours}h cooldown`;
  };
  
  const renderAttributeBar = (attribute, value) => {
    const isCurrentlyTraining = trainingInProgress && trainingAttribute === attribute;
    const onCooldown = isAttributeOnCooldown(attribute);
    const cooldownHours = onCooldown ? getRemainingCooldownTime(attribute) : 0;

  return (
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">{attribute}</span>
          <span className="text-sm">{value}/100</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${getColorForAttribute(attribute)} ${
              isCurrentlyTraining ? 'animate-pulse' : ''
            }`}
            style={{ width: `${value}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-1">
          <button
            onClick={() => handleTrainAttribute(attribute)}
            disabled={trainingInProgress || onCooldown}
            className={`px-3 py-1 text-xs rounded-md flex items-center justify-center space-x-1 ${
              trainingInProgress || onCooldown
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isCurrentlyTraining ? (
              <>
                <AiOutlineLoading3Quarters className="animate-spin mr-1" />
                <span>Training...</span>
              </>
            ) : onCooldown ? (
              <>
                <FaClock className="mr-1" />
                <span>{formatCooldownTime(cooldownHours)}</span>
              </>
            ) : (
              <>
                <FaClock className="mr-1" />
                <span>Train ({trainingDuration}h)</span>
              </>
            )}
          </button>
          <span className="text-xs text-gray-400 flex items-center">
            {selectedAgent?.isNFT && <FaWallet className="mr-1" />}
            {selectedAgent?.isNFT ? '0.1 APT' : 'Free'}
          </span>
        </div>
      </div>
    );
  };
  
  const renderRarityBadge = (rarity) => {
    switch (rarity) {
      case 'common':
        return (
          <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-md">
            Common
          </span>
        );
      case 'uncommon':
        return (
          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-md">
            Uncommon
          </span>
        );
      case 'rare':
        return (
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md">
            Rare
          </span>
        );
      case 'epic':
        return (
          <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-md">
            Epic
          </span>
        );
      case 'legendary':
        return (
          <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-md">
            Legendary
          </span>
        );
      default:
        return null;
    }
  };
  
  const getTotalAttributePoints = () => {
    if (!selectedAgent) return 0;
    return Object.values(selectedAgent.attributes).reduce((sum, val) => sum + val, 0);
  };
  
  const getRarityFromPoints = (points) => {
    if (points > 350) return 'legendary';
    if (points > 300) return 'epic';
    if (points > 250) return 'rare';
    if (points > 200) return 'uncommon';
    return 'common';
  };
  
  const getColorForAttribute = (attribute) => {
    switch (attribute) {
      case 'Intelligence':
        return 'bg-blue-500';
      case 'Speed':
        return 'bg-green-500';
      case 'Defense':
        return 'bg-yellow-500';
      case 'Strategy':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  if (showCreatePrompt) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto p-6 flex flex-col items-center justify-center h-[calc(100vh-80px)]">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Create Your AI Agent</h2>
            <p className="mb-6">Create a new AI agent to compete in Squid Game challenges and tournaments.</p>
            <button
              onClick={handleCreateAgent}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md font-medium transition-colors duration-200"
            >
              Create Random Agent
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!selectedAgent) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto p-6 flex flex-col items-center justify-center h-[calc(100vh-80px)]">
          <AiOutlineLoading3Quarters className="animate-spin text-5xl mb-4" />
          <p>Loading agent data...</p>
        </div>
      </div>
    );
  }
  
  const totalPoints = getTotalAttributePoints();
  const currentRarity = selectedAgent.rarity || getRarityFromPoints(totalPoints);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Your Agent</h2>
            <div className="flex items-center mb-4">
              <div className="w-24 h-24 mr-4 bg-gray-700 rounded-lg flex items-center justify-center text-4xl">
                {getAgentIcon(currentRarity)}
              </div>
              <div>
                <h3 className="text-xl font-bold">{selectedAgent.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm text-gray-400">Level {selectedAgent.level}</span>
                  {renderRarityBadge(currentRarity)}
                  {selectedAgent.isNFT && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md flex items-center">
                      <PiSealCheck className="mr-1" /> NFT
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-400">
                    Total Stats: {totalPoints}/400
                  </p>
                    </div>
                  </div>
                </div>
                
            {selectedAgent.isNFT && selectedAgent.transactionHash && (
              <div className="mb-4 p-2 bg-gray-700 rounded-md">
                <p className="text-xs text-gray-300">
                  Transaction: {selectedAgent.transactionHash.substring(0, 16)}...
                </p>
                <p className="text-xs text-gray-300">
                  Owner: {selectedAgent.owner.substring(0, 10)}...
                </p>
                  </div>
            )}
            
            <div className="mt-4">
              <h4 className="text-lg font-medium mb-2">Training Duration</h4>
              <div className="flex items-center space-x-4">
                {[1, 2, 4, 8].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => setTrainingDuration(hours)}
                    className={`px-3 py-1 rounded-md ${
                      trainingDuration === hours
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Longer training yields better results
              </p>
                </div>
            
            <div className="mt-6">
              {!selectedAgent.isNFT && (
                <button
                  onClick={handleMintNFT}
                  disabled={!wallet.isConnected || mintingAgent}
                  className={`w-full py-3 rounded-md text-white mb-4 flex items-center justify-center ${
                    !wallet.isConnected || mintingAgent
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {mintingAgent ? (
                    <>
                      <AiOutlineLoading3Quarters className="animate-spin mr-2" />
                      Minting NFT...
                    </>
                  ) : (
                    <>
                      <FaWallet className="mr-2" /> Mint as NFT (0.1 APT)
                    </>
                  )}
                </button>
              )}
              
              {!wallet.isConnected && (
                <div className="mt-4">
                  <p className="text-sm text-yellow-400 mb-2">
                    {wallet.isPetraInstalled 
                      ? "Connect your Petra wallet to mint or train NFT agents" 
                      : "Install Petra wallet to mint or train NFT agents"}
                  </p>
                  <WalletConnector />
                    </div>
              )}
              
              {wallet.isConnected && (
                <div className="mt-2 p-2 bg-blue-900 bg-opacity-30 rounded-lg">
                  <p className="text-xs text-blue-300 flex items-center">
                    <FaInfoCircle className="mr-1" />
                    Connected to {wallet.network || "Aptos Network"}
                  </p>
                  {wallet.balance && (
                    <p className="text-xs text-green-400 flex items-center mt-1">
                      <FaWallet className="mr-1" />
                      Balance: {wallet.balance} APT
                    </p>
                  )}
                    </div>
              )}
                    </div>
                  </div>
                  
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Train Your Agent</h2>
            <p className="text-sm text-gray-400 mb-4">
              Training improves your agent's attributes, making them more competitive in games.
              {selectedAgent.isNFT && ' NFT agents store training progress on-chain.'}
            </p>
            
            <div className="mt-6">
              {renderAttributeBar('Intelligence', selectedAgent.attributes.Intelligence)}
              {renderAttributeBar('Speed', selectedAgent.attributes.Speed)}
              {renderAttributeBar('Defense', selectedAgent.attributes.Defense)}
              {renderAttributeBar('Strategy', selectedAgent.attributes.Strategy)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function getAgentIcon(rarity) {
  switch (rarity) {
    case 'legendary':
      return <GiRank1 className="text-orange-500" />;
    case 'epic':
      return <GiRank2 className="text-purple-500" />;
    case 'rare':
      return <GiRank3 className="text-blue-500" />;
    default:
      return '001';
  }
} 