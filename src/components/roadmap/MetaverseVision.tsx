import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  FaVrCardboard,
  FaUsers,
  FaTrophy,
  FaCoins,
  FaGlobe,
  FaArrowDown,
  FaArrowRight
} from 'react-icons/fa';

export function MetaverseVision() {
  const features = [
    {
      id: 'immersive-arenas',
      title: 'Immersive Game Arenas',
      description: 'Experience the iconic Squid Game arenas in stunning 3D environments',
      icon: <FaVrCardboard />,
      color: 'bg-purple-600'
    },
    {
      id: 'avatar-system',
      title: 'Customizable Avatars',
      description: 'Create and customize your unique character with collectible NFT items',
      icon: <FaUsers />,
      color: 'bg-blue-600'
    },
    {
      id: 'tournaments',
      title: 'Live Tournaments',
      description: 'Participate in or spectate high-stakes tournaments with real-time audience',
      icon: <FaTrophy />,
      color: 'bg-yellow-500'
    },
    {
      id: 'economy',
      title: 'Virtual Economy',
      description: 'Trade, earn, and spend within a fully realized blockchain economy',
      icon: <FaCoins />,
      color: 'bg-green-500'
    },
    {
      id: 'global-events',
      title: 'Global Events',
      description: 'Join scheduled global events with thousands of simultaneous players',
      icon: <FaGlobe />,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="w-full py-16 bg-gradient-to-b from-gray-900 to-squid-dark rounded-xl overflow-hidden">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-squid-pink mb-3">Metaverse Vision</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experience Squid Game Tournament in a fully immersive 3D virtual world
          </p>
        </motion.div>

        {/* Central 3D visualization */}
        <div className="relative mb-16">
          <div className="aspect-[16/9] relative mx-auto rounded-xl overflow-hidden shadow-2xl border-4 border-squid-pink">
            <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center">
              <div className="text-center">
                <FaVrCardboard className="text-6xl text-squid-pink mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white">Coming in Phase 4</h3>
                <p className="text-gray-300 mt-2">Q1-Q2 2024</p>
              </div>
            </div>
            <div className="w-full h-full bg-gradient-to-r from-purple-900 to-squid-dark">
              {/* Fallback gradient background instead of requiring an image */}
            </div>
          </div>

          {/* Connection lines */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="absolute left-1/2 bottom-0 w-0.5 h-16 bg-squid-pink -translate-x-1/2 translate-y-full"
          >
            <FaArrowDown className="absolute -bottom-6 -translate-x-1/2 text-2xl text-squid-pink" />
          </motion.div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * index }}
              className="bg-gray-800 rounded-lg overflow-hidden"
            >
              <div className={`${feature.color} h-2 w-full`}></div>
              <div className="p-6">
                <div className={`${feature.color} w-12 h-12 rounded-full flex items-center justify-center text-white text-xl mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Player journey */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20"
        >
          <h3 className="text-2xl font-bold text-white text-center mb-8">Player Journey in the Metaverse</h3>
          
          <div className="relative">
            <div className="absolute top-12 left-0 w-full h-1 bg-gray-700"></div>
            
            <div className="flex justify-between relative">
              {[
                { label: 'Create Avatar', icon: <FaUsers /> },
                { label: 'Train & Customize', icon: <FaVrCardboard /> },
                { label: 'Enter Arena', icon: <FaGlobe /> },
                { label: 'Compete', icon: <FaTrophy /> },
                { label: 'Earn Rewards', icon: <FaCoins /> }
              ].map((step, index) => (
                <div key={index} className="relative">
                  <div className="absolute top-12 -translate-x-1/2 left-1/2">
                    {index < 4 && (
                      <FaArrowRight className="text-squid-pink text-xl absolute top-0 left-8" />
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-squid-pink flex items-center justify-center text-white relative z-10">
                    {step.icon}
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-gray-300 text-sm">{step.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 