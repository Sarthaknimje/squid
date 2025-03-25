import React from 'react';
import { motion } from 'framer-motion';
import {
  FaCoins,
  FaExchangeAlt,
  FaLock,
  FaUnlock,
  FaUserShield,
  FaAward,
  FaCode,
  FaGamepad
} from 'react-icons/fa';

export function BlockchainIntegration() {
  const blockchainFeatures = [
    {
      title: 'Smart Contracts',
      description: 'Secure Move-based smart contracts on Aptos blockchain power all game transactions',
      icon: <FaCode />,
      color: 'from-blue-600 to-blue-800'
    },
    {
      title: 'Virtual Escrow',
      description: 'Player funds are securely locked in escrow contracts during gameplay',
      icon: <FaLock />,
      color: 'from-purple-600 to-purple-800'
    },
    {
      title: 'Instant Settlements',
      description: 'Game results are verified on-chain and rewards distributed automatically',
      icon: <FaExchangeAlt />,
      color: 'from-green-600 to-green-800'
    },
    {
      title: 'Fair Gameplay',
      description: 'Critical game outcomes are validated through blockchain verification',
      icon: <FaUserShield />,
      color: 'from-yellow-500 to-yellow-700'
    }
  ];

  const processList = [
    { 
      step: 1, 
      title: 'Player Deposits', 
      description: 'Players deposit APT tokens into game escrow contract',
      icon: <FaCoins />,
      color: 'bg-yellow-500'
    },
    { 
      step: 2, 
      title: 'Funds Locked', 
      description: 'Smart contract locks funds for the duration of the game',
      icon: <FaLock />,
      color: 'bg-red-500'
    },
    { 
      step: 3, 
      title: 'Game Played', 
      description: 'Players compete in the game with verified outcomes',
      icon: <FaGamepad className="text-2xl" />,
      color: 'bg-purple-500'
    },
    { 
      step: 4, 
      title: 'Winner Determined', 
      description: 'Game result is validated and recorded on blockchain',
      icon: <FaAward />,
      color: 'bg-green-500'
    },
    { 
      step: 5, 
      title: 'Rewards Distributed', 
      description: 'Smart contract automatically pays out the winner',
      icon: <FaUnlock />,
      color: 'bg-blue-500'
    }
  ];

  return (
    <div className="w-full py-16 bg-gray-900 rounded-xl overflow-hidden">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-squid-pink mb-3">Blockchain Integration</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            How the Squid Game Tournament leverages Aptos blockchain technology
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {blockchainFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 * index }}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg"
            >
              <div className={`h-2 w-full bg-gradient-to-r ${feature.color}`}></div>
              <div className="p-6 flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-gradient-to-r ${feature.color} flex-shrink-0`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Process Flow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-white text-center mb-10">Smart Contract Flow</h3>
          
          <div className="relative py-12">
            {/* Connecting line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -translate-y-1/2"></div>
            
            <div className="flex justify-between relative">
              {processList.map((process, index) => (
                <div key={index} className="relative">
                  {/* Step number */}
                  <div className={`w-16 h-16 rounded-full ${process.color} flex items-center justify-center text-white font-bold text-xl relative z-10`}>
                    {process.icon}
                  </div>
                  
                  {/* Step description */}
                  <div className={`absolute w-40 text-center ${index % 2 === 0 ? '-top-28' : 'top-20'} left-1/2 -translate-x-1/2`}>
                    <div className={`h-4 w-0.5 ${process.color} mx-auto ${index % 2 === 0 ? 'mb-2' : 'mt-2'}`}></div>
                    <h4 className="font-bold text-white mb-1">{process.title}</h4>
                    <p className="text-gray-400 text-xs">{process.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Code example */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gray-800 rounded-lg p-6 shadow-xl"
        >
          <h3 className="text-lg font-bold text-white mb-4">Sample Escrow Smart Contract (Move Language)</h3>
          <pre className="bg-gray-900 p-4 rounded-md overflow-x-auto text-green-400 text-sm">
{`module squid_game::escrow {
    use std::signer;
    use aptos_framework::coin;
    use aptos_std::event;
    
    struct GameEscrow<phantom CoinType> has key {
        game_id: u64,
        player1: address,
        player2: address,
        stake_amount: u64,
        winner: Option<address>,
        status: u8, // 0: pending, 1: in_progress, 2: completed
    }
    
    // Event emitted when a game concludes
    struct GameCompleted has drop, store {
        game_id: u64,
        winner: address,
        reward_amount: u64,
    }
    
    // Create a new escrow for a game between two players
    public fun create_game<CoinType>(
        creator: &signer,
        player2: address,
        stake_amount: u64,
        game_id: u64,
    ) {
        // Implementation details...
    }
    
    // Resolve the game and distribute rewards to winner
    public fun resolve_game<CoinType>(
        game_admin: &signer,
        game_id: u64,
        winner: address,
    ) acquires GameEscrow {
        // Implementation details...
    }
}`}
          </pre>
        </motion.div>
      </div>
    </div>
  );
} 