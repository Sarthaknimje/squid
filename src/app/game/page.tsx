"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaRobot, FaTrophy, FaCoins, FaInfoCircle, FaAccessibleIcon } from 'react-icons/fa';
import { useAIAgent } from '@/contexts/AIAgentContext';
import AgentStats from '@/components/game/AgentStats';

type Game = {
  id: string;
  title: string;
  description: string;
  rules: string[];
  icon: string;
  path: string;
  color: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  requiresAgent: boolean;
  reward: number;
  accessibilityInfo?: string;
};

export default function GameSelectionPage() {
  const { agent } = useAIAgent();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showAgentWarning, setShowAgentWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate loading state for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const games: Game[] = [
    {
      id: 'red-light-green-light',
      title: 'Red Light, Green Light',
      description: `Cross the finish line without being caught moving during "red light".`,
      rules: [
        "Move forward during 'green light'",
        "Freeze completely during 'red light'",
        "If detected moving during 'red light', you're eliminated",
        "Reach the finish line within the time limit to win"
      ],
      icon: '/images/games/red-light-green-light.svg',
      path: '/game/red-light-green-light',
      color: 'from-red-500 to-green-500',
      difficulty: 'Easy',
      requiresAgent: true,
      reward: 5000,
      accessibilityInfo: "This game requires quick reflexes. Motion sensitivity settings available."
    },
    {
      id: 'tug-of-war',
      title: 'Tug of War',
      description: `Lead your team to victory by pulling the rope and dragging your opponents over the line.`,
      rules: [
        "Click rapidly to pull the rope to your side",
        "Time your pulls with the power meter for maximum effect",
        "Use your team's combined strength against the opponents",
        "Pull your opponents over the center line to win"
      ],
      icon: '/images/games/tug-of-war.svg',
      path: '/game/tug-of-war',
      color: 'from-blue-500 to-purple-500',
      difficulty: 'Medium',
      requiresAgent: true,
      reward: 10000,
      accessibilityInfo: "This game can be played with keyboard alternatives to rapid clicking."
    },
    {
      id: 'marbles',
      title: 'Marbles',
      description: `Compete in a battle of wits with the marble game, where guessing is the key to survival.`,
      rules: [
        "Hide marbles in your hand and make your opponent guess",
        "Guess if your opponent's marbles are odd or even",
        "Guess the exact count to win their marbles",
        "Win all your opponent's marbles to advance"
      ],
      icon: '/images/games/marbles.svg',
      path: '/game/marbles',
      color: 'from-yellow-500 to-orange-500',
      difficulty: 'Medium',
      requiresAgent: true,
      reward: 10000,
      accessibilityInfo: "This game is suitable for players with limited mobility. Screen reader compatible."
    },
    {
      id: 'glass-bridge',
      title: 'Glass Bridge',
      description: `Cross a treacherous bridge by choosing between tempered and regular glass panels.`,
      rules: [
        "Choose between left and right glass panels to step on",
        "Tempered glass holds your weight, regular glass breaks",
        "Fall through the glass and you're eliminated",
        "Reach the end of the bridge within the time limit"
      ],
      icon: '/images/games/glass-bridge.svg',
      path: '/game/glass-bridge',
      color: 'from-cyan-500 to-teal-500',
      difficulty: 'Hard',
      requiresAgent: true,
      reward: 15000,
      accessibilityInfo: "This game includes visual and audio feedback for glass panels."
    },
    {
      id: 'squid-game',
      title: 'The Squid Game',
      description: `The final challenge - defeat your opponent in combat to claim the ultimate prize.`,
      rules: [
        "Move around the arena using WASD or arrow keys",
        "Press SPACE to attack when close to your opponent",
        "Hold SHIFT to defend and reduce incoming damage",
        "Defeat your opponent before time runs out"
      ],
      icon: '/images/games/squid-game.svg',
      path: '/game/squid-game',
      color: 'from-pink-500 to-rose-500',
      difficulty: 'Extreme',
      requiresAgent: true,
      reward: 25000,
      accessibilityInfo: "This game includes alternative control schemes and variable difficulty settings."
    },
  ];
  
  // Handle game selection
  const handleGameSelect = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    
    if (game?.requiresAgent && !agent) {
      setShowAgentWarning(true);
      return;
    }
    
    setSelectedGame(gameId);
  };
  
  // Close warning modal
  const closeWarning = () => {
    setShowAgentWarning(false);
  };

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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-squid-pink border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Loading games...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <motion.div 
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-squid-pink mb-2 text-stroke">Squid Game Tournament</h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Choose your game and test your skills. Complete all five challenges to win the ultimate prize.
        </p>
      </motion.div>
      
      {/* Agent Stats */}
      <motion.div 
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {agent ? (
          <div className="bg-white rounded-lg shadow-lg p-6 squid-card">
            <h2 className="text-2xl font-bold text-squid-dark mb-4">Your Agent</h2>
            <AgentStats showDetails={true} />
          </div>
        ) : (
          <div className="bg-red-900 border border-red-800 rounded-lg p-6 text-center squid-card">
            <FaInfoCircle className="text-red-500 text-4xl mx-auto mb-2" />
            <h2 className="text-xl font-bold text-white mb-2">No Agent Created</h2>
            <p className="text-red-300 mb-4">
              You need to create and train an AI agent to participate in the games.
            </p>
            <Link 
              href="/train"
              className="squid-btn"
            >
              <FaRobot className="mr-2" /> Create Your Agent
            </Link>
          </div>
        )}
      </motion.div>
      
      {/* Accessibility Options */}
      <div className="mb-8">
        <button 
          className="flex items-center bg-squid-light px-4 py-2 rounded-md text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          onClick={() => {
            // Toggle accessibility panel (would implement in a real app)
            alert("Accessibility options would open here in a real implementation");
          }}
        >
          <FaAccessibleIcon className="mr-2" /> Accessibility Options
        </button>
      </div>
      
      {/* Games Selection */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {games.map((game) => (
          <motion.div
            key={game.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition-all duration-300 ${
              selectedGame === game.id ? 'ring-4 ring-squid-pink scale-105' : ''
            } ${game.requiresAgent && !agent ? 'opacity-60' : 'cursor-pointer'} squid-card hover-scale`}
            variants={itemVariants}
            onClick={() => handleGameSelect(game.id)}
            role="button"
            tabIndex={0}
            aria-label={`Select ${game.title} game`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleGameSelect(game.id);
              }
            }}
          >
            {/* Game Header */}
            <div className={`bg-gradient-to-r ${game.color} p-6 text-white`}>
              <div className="flex justify-between items-center mb-2">
                <div className="relative w-16 h-16 bg-white rounded-full p-2">
                  <Image
                    src={game.icon}
                    alt={game.title}
                    fill
                    sizes="64px"
                    className="p-1"
                  />
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    game.difficulty === 'Easy' ? 'bg-green-600' :
                    game.difficulty === 'Medium' ? 'bg-yellow-600' :
                    game.difficulty === 'Hard' ? 'bg-orange-600' :
                    'bg-red-600'
                  }`}>
                    {game.difficulty}
                  </span>
                  <span className="mt-2 text-sm flex items-center">
                    <FaCoins className="mr-1" /> {game.reward.toLocaleString()} points
                  </span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">{game.title}</h3>
              <p className="text-sm">{game.description}</p>
            </div>
            
            {/* Game Rules */}
            <div className="p-6">
              <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <FaInfoCircle className="mr-2" /> Game Rules
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                {game.rules.map((rule, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-squid-pink mr-2">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              
              {/* Accessibility Info */}
              {game.accessibilityInfo && (
                <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 flex items-start">
                  <FaAccessibleIcon className="mr-1 flex-shrink-0 mt-0.5" />
                  <span>{game.accessibilityInfo}</span>
                </div>
              )}
              
              {/* Play Button */}
              <Link 
                href={game.path}
                className={`w-full inline-block text-center py-3 rounded-md font-bold ${
                  game.requiresAgent && !agent 
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'squid-btn'
                }`}
                onClick={(e) => {
                  if (game.requiresAgent && !agent) {
                    e.preventDefault();
                    setShowAgentWarning(true);
                  }
                }}
                aria-disabled={game.requiresAgent && !agent}
                tabIndex={game.requiresAgent && !agent ? -1 : 0}
              >
                {selectedGame === game.id ? 'Selected' : 'Play Game'}
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Warning Modal */}
      {showAgentWarning && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          role="dialog"
          aria-labelledby="warning-title"
          aria-modal="true"
        >
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md mx-4 squid-card"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 id="warning-title" className="text-2xl font-bold text-red-600 mb-4">Agent Required!</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              You need to create and train an AI agent before participating in the Squid Game Tournament. 
              Your agent's attributes will affect your performance in the games.
            </p>
            <div className="flex justify-end gap-4">
              <button 
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={closeWarning}
              >
                Close
              </button>
              <Link 
                href="/train"
                className="squid-btn"
              >
                Create Agent
              </Link>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Selected Game Action */}
      {selectedGame && (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 bg-squid-dark bg-opacity-95 backdrop-blur-md p-4 flex justify-between items-center"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          aria-live="polite"
        >
          <div className="text-white">
            <p className="font-bold text-lg">Selected: {games.find(g => g.id === selectedGame)?.title}</p>
            <p className="text-sm text-gray-300">Ready to test your skills?</p>
          </div>
          <Link 
            href={games.find(g => g.id === selectedGame)?.path || '#'}
            className="squid-btn"
          >
            <FaTrophy className="mr-2" /> Start Game
          </Link>
        </motion.div>
      )}
    </div>
  );
} 