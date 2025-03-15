"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaRobot, FaUserCircle, FaTrophy, FaGamepad, FaMedal, FaAward } from 'react-icons/fa';
import { useAIAgent } from '@/contexts/AIAgentContext';
import { usePlayerProgress } from '@/contexts/PlayerProgressContext';
import AgentStats from '@/components/game/AgentStats';

type Game = {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  playerCount: string;
};

export default function HomePage() {
  const { agent } = useAIAgent();
  const { progress } = usePlayerProgress();
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);
  
  // Helper function to get difficulty color
  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-white';
      case 'Hard':
        return 'bg-orange-500 text-white';
      case 'Extreme':
        return 'bg-red-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  // Game data
  const games: Game[] = [
    {
      id: 'red-light-green-light',
      title: 'Red Light, Green Light',
      description: `Move when the light is green, freeze when it's red. Get caught moving and you're eliminated.`,
      difficulty: 'Easy',
      icon: '/images/games/red-light-green-light.svg',
      path: '/game/red-light-green-light',
      playerCount: '456'
    },
    {
      id: 'tug-of-war',
      title: 'Tug of War',
      description: `Use strategy and strength to pull your opponents over the edge before they do the same to you.`,
      difficulty: 'Medium',
      icon: '/images/games/tug-of-war.svg',
      path: '/game/tug-of-war',
      playerCount: '216'
    },
    {
      id: 'marbles',
      title: 'Marbles',
      description: `A game of skill and deception. Predict odd or even and don't lose all your marbles.`,
      difficulty: 'Medium',
      icon: '/images/games/marbles.svg',
      path: '/game/marbles',
      playerCount: '108'
    },
    {
      id: 'glass-bridge',
      title: 'Glass Bridge',
      description: `Cross a bridge of glass panels, some will hold, others will shatter. Choose wisely.`,
      difficulty: 'Hard',
      icon: '/images/games/glass-bridge.svg',
      path: '/game/glass-bridge',
      playerCount: '54'
    },
    {
      id: 'squid-game',
      title: 'Squid Game',
      description: `The final challenge. Only the strongest and most strategic will survive this ultimate test.`,
      difficulty: 'Extreme',
      icon: '/images/games/squid-game.svg',
      path: '/game/squid-game',
      playerCount: '16'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      {/* Hero Section */}
      <div className="bg-squid-dark rounded-xl shadow-2xl overflow-hidden mb-16 squid-card">
        <div className="relative">
          <div className="absolute inset-0 squid-gradient opacity-70"></div>
          <div className="relative px-8 py-16 md:px-16 md:py-24 text-white">
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-4 text-stroke"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              AI Deathmatch: The Squid Game Tournament
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl mb-8 max-w-3xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Train your AI agent to survive a series of deadly games. Compete in classic Squid Game challenges and emerge as the ultimate champion!
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {agent ? (
                <Link 
                  href="/train" 
                  className="squid-btn"
                >
                  <FaRobot className="mr-2" /> Train Your Agent
                </Link>
              ) : (
                <Link 
                  href="/train" 
                  className="squid-btn"
                >
                  <FaRobot className="mr-2" /> Create Your Agent
                </Link>
              )}
              <Link 
                href="/tournament" 
                className="squid-btn-outline border-white text-white hover:bg-white hover:text-squid-pink"
              >
                <FaTrophy className="mr-2" /> Tournament Center
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Stats Overview */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="bg-gray-800 rounded-lg shadow-lg p-6 squid-card">
          <div className="flex items-center mb-4">
            <FaTrophy className="text-squid-pink text-3xl mr-3" />
            <h3 className="text-xl font-bold text-white">Total Score</h3>
          </div>
          <p className="text-4xl font-bold text-white">{progress?.totalScore?.toLocaleString() || "0"}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-gray-800 rounded-lg shadow-lg p-6 squid-card">
          <div className="flex items-center mb-4">
            <FaGamepad className="text-squid-pink text-3xl mr-3" />
            <h3 className="text-xl font-bold text-white">Games Completed</h3>
          </div>
          <p className="text-4xl font-bold text-white">{progress?.gamesCompleted || 0} / 5</p>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-gray-800 rounded-lg shadow-lg p-6 squid-card">
          <div className="flex items-center mb-4">
            <FaAward className="text-squid-pink text-3xl mr-3" />
            <h3 className="text-xl font-bold text-white">Achievements</h3>
          </div>
          <p className="text-4xl font-bold text-white">{progress?.achievements?.length || 0}</p>
        </motion.div>
      </motion.div>
      
      {/* Agent Stats */}
      <section className="mt-16 mb-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-8">Your Agent</h2>
          <div className="bg-gray-900 rounded-lg shadow-xl p-6 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Your AI Agent</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <AgentStats />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-gray-300 mb-6">Your AI agent is your champion in the deadly games. Train it to improve its abilities and increase your chances of survival.</p>
                <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                  <Link href="/train" className="bg-squid-pink hover:bg-opacity-80 text-white font-bold py-3 px-6 rounded-md transition duration-200 text-center">
                    Train Your Agent
                  </Link>
                  <Link href="/profile" className="bg-transparent border-2 border-squid-pink text-squid-pink font-bold py-3 px-6 rounded-md hover:bg-squid-pink hover:bg-opacity-10 transition duration-200 text-center">
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Games Section */}
      <section id="games" className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">The Games</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                className="game-card bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700 hover:border-squid-pink transition-all duration-300"
                whileHover={{ 
                  y: -10,
                  boxShadow: '0 20px 25px -5px rgba(255, 95, 162, 0.3), 0 10px 10px -5px rgba(255, 95, 162, 0.2)',
                }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="h-48 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-transparent opacity-60 z-10"></div>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <Image 
                      src={game.icon}
                      alt={game.title}
                      width={80}
                      height={80}
                      className="text-white"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent h-24 z-10"></div>
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 opacity-50"
                    style={{ 
                      backgroundSize: '200% 200%',
                      animation: 'gradientShift 3s ease infinite alternate'
                    }}
                  ></div>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold text-white">{game.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getDifficultyColor(game.difficulty)}`}>
                      {game.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">{game.description}</p>
                  <div className="flex justify-between items-center">
                    <Link 
                      href={game.path} 
                      className="bg-squid-pink hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded-md text-sm transition duration-200"
                    >
                      Play Now
                    </Link>
                    <span className="text-gray-400 text-sm">
                      {game.playerCount} players
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-16 bg-gray-800">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Enter the Arena?</h2>
            <p className="text-gray-300 max-w-3xl mx-auto mb-8 text-lg">
              Join thousands of AI agents competing for glory and ultimate prize. Will your agent survive all the deadly challenges?
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="/tournament" 
                className="bg-squid-pink hover:bg-opacity-80 text-white font-bold py-3 px-8 rounded-md transition duration-200 text-center shadow-glow"
              >
                Join Tournament
              </Link>
              <Link 
                href="/guide" 
                className="bg-transparent border-2 border-squid-pink text-squid-pink font-bold py-3 px-8 rounded-md hover:bg-squid-pink hover:bg-opacity-10 transition duration-200 text-center"
              >
                Read Guide
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
