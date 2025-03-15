"use client";

import { useAIAgent } from "@/contexts/AIAgentContext";
import { FaBrain, FaRunning, FaShieldAlt, FaChessKnight, FaTrophy, FaSkull } from "react-icons/fa";
import { motion } from "framer-motion";
import BotIcon from "@/components/ui/BotIcon";

export default function AgentStats() {
  const { agent } = useAIAgent();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Determine bot type based on agent attributes
  const determineBotType = () => {
    if (!agent) return 'default';
    
    const { Intelligence, Speed, Defense, Strategy } = agent.attributes;
    
    if (Strategy > 80) return 'strategic';
    if (Speed > 80) return 'speedy';
    if (Defense > 80) return 'defensive';
    if (Intelligence > 70 && Strategy > 70) return 'balanced';
    
    return 'default';
  };

  if (!agent) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="bg-gray-800 rounded-lg shadow-lg p-6"
      >
        <p className="text-center text-gray-300">No AI agent found</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-gray-700"
    >
      <motion.h2 variants={itemVariants} className="text-xl font-bold text-white mb-4 flex items-center">
        <span className="text-squid-pink mr-2">AI</span> Agent Status
      </motion.h2>
      
      <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
        <div className="mb-4">
          <BotIcon type={determineBotType()} size="xl" level={agent.level} />
        </div>
        <h3 className="text-xl font-bold text-white text-glow mb-1">{agent.name}</h3>
        <div className="flex items-center text-sm mt-1 space-x-3">
          <div className="flex items-center bg-gray-700 px-3 py-1 rounded-full">
            <FaTrophy className="text-green-400 mr-2" />
            <span className="text-green-400 font-bold">{agent.wins} Wins</span>
          </div>
          <div className="flex items-center bg-gray-700 px-3 py-1 rounded-full">
            <FaSkull className="text-red-400 mr-2" />
            <span className="text-red-400 font-bold">{agent.losses} Losses</span>
          </div>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <FaBrain className="text-squid-pink mr-2" />
            <span className="text-gray-300">Intelligence</span>
          </div>
          <span className="font-bold text-white">{agent.attributes.Intelligence}/100</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <motion.div 
            className="bg-squid-pink h-2.5"
            style={{ width: `${agent.attributes.Intelligence}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${agent.attributes.Intelligence}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="w-full h-full relative">
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse-strong"></div>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <FaRunning className="text-squid-pink mr-2" />
            <span className="text-gray-300">Speed</span>
          </div>
          <span className="font-bold text-white">{agent.attributes.Speed}/100</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <motion.div 
            className="bg-squid-pink h-2.5"
            style={{ width: `${agent.attributes.Speed}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${agent.attributes.Speed}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
          >
            <div className="w-full h-full relative">
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse-strong"></div>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <FaShieldAlt className="text-squid-pink mr-2" />
            <span className="text-gray-300">Defense</span>
          </div>
          <span className="font-bold text-white">{agent.attributes.Defense}/100</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <motion.div 
            className="bg-squid-pink h-2.5"
            style={{ width: `${agent.attributes.Defense}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${agent.attributes.Defense}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          >
            <div className="w-full h-full relative">
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse-strong"></div>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <FaChessKnight className="text-squid-pink mr-2" />
            <span className="text-gray-300">Strategy</span>
          </div>
          <span className="font-bold text-white">{agent.attributes.Strategy}/100</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <motion.div 
            className="bg-squid-pink h-2.5"
            style={{ width: `${agent.attributes.Strategy}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${agent.attributes.Strategy}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          >
            <div className="w-full h-full relative">
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse-strong"></div>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      {agent.isNFT && (
        <motion.div 
          variants={itemVariants} 
          className="mt-5 p-3 bg-gray-700 rounded-md border border-gray-600 border-glow"
        >
          <p className="font-medium text-white flex items-center">
            <motion.span 
              className="inline-block text-yellow-400 mr-2"
              animate={{ rotate: [0, 5, 0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ⭐
            </motion.span>
            NFT Agent
          </p>
          <p className="text-gray-300 truncate mt-1">{agent.owner}</p>
        </motion.div>
      )}
    </motion.div>
  );
} 