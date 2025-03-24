"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaUserCircle, FaTrophy, FaGamepad, FaMedal, FaAward, FaArrowRight } from 'react-icons/fa';
import { useAIAgent } from '@/contexts/AIAgentContext';
import { usePlayerProgress } from '@/contexts/PlayerProgressContext';
import { useAudio } from '@/contexts/AudioContext';
import { useAptosWallet } from '@/contexts/AptosWalletContext';
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
  const { forcePlay } = useAudio();
  const { wallet } = useAptosWallet();
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Force audio playback on component mount
  useEffect(() => {
    // Try to play audio immediately
    forcePlay();
    
    // Try again after a short delay
    const playTimer = setTimeout(() => {
      forcePlay();
    }, 300);
    
    return () => clearTimeout(playTimer);
  }, [forcePlay]);
  
  // Handle intro complete
  useEffect(() => {
    if (showIntro) {
      // Force play audio when intro shows - Try multiple times
      forcePlay();
      setTimeout(() => forcePlay(), 300);
      setTimeout(() => forcePlay(), 1000);
      setTimeout(() => forcePlay(), 2000);
      setTimeout(() => forcePlay(), 4000);
      
      // Auto-hide intro after animation completes (8 seconds for more dramatic effect)
      const timer = setTimeout(() => {
        setShowIntro(false);
        // Force play again when main content shows
        forcePlay();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [showIntro, forcePlay]);
  
  useEffect(() => {
    // Simulate loading for smooth transition
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);
  
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
      id: 'simon-says',
      title: 'Simon Says',
      description: 'Remember and repeat the sequence of colors. Each successful pattern adds to your score. One wrong move and it\'s game over!',
      difficulty: 'Medium',
      icon: '/images/games/simon-says.svg',
      path: '/game/simon-says',
      playerCount: '400'
    },
    {
      id: 'rock-paper-scissors',
      title: 'Rock Paper Scissors',
      description: 'Choose rock, paper, or scissors to outsmart your opponent. Compete with escrow betting for secure gameplay.',
      difficulty: 'Easy',
      icon: '/images/games/rock-paper-scissors.svg',
      path: '/game/rock-paper-scissors',
      playerCount: '300'
    },
    {
      id: 'whack-a-mole',
      title: 'Whack-A-Mole',
      description: 'Test your reflexes by whacking moles as they pop up. Score points with each successful hit, but watch out - they move fast!',
      difficulty: 'Easy',
      icon: '/images/games/whack-a-mole.svg',
      path: '/game/whack-a-mole',
      playerCount: '300'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <Image 
              src="/images/logo.png" 
              alt="Squid Game Logo" 
              width={150} 
              height={150}
              className="mx-auto animate-pulse"
            />
          </div>
          <h2 className="text-xl text-squid-pink font-medium">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            className="fixed inset-0 z-50 bg-black overflow-hidden flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0 }}
            onAnimationComplete={() => forcePlay()}
            onClick={() => forcePlay()}
          >
            {/* Background effects */}
            <motion.div
              className="w-full h-full absolute"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 1.5 }}
            >
              <div className="absolute inset-0 bg-squid-pink opacity-10"></div>
              <div className="absolute inset-0 squid-pattern-bg opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-squid-pink/30 to-purple-900/30"></div>
              
              {/* Animated particle background */}
              <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 100 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full bg-squid-pink"
                    style={{
                      width: Math.random() * 12 + 3,
                      height: Math.random() * 12 + 3,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0, 0.7, 0],
                      scale: [0, 1, 0.5],
                      y: [0, Math.random() * 100 - 50],
                      x: [0, Math.random() * 100 - 50],
                    }}
                    transition={{
                      duration: Math.random() * 3 + 2,
                      repeat: Infinity,
                      repeatType: 'loop',
                      ease: 'easeInOut',
                      delay: Math.random() * 2,
                    }}
                  />
                ))}
              </div>
              
              {/* Digital money particles */}
              <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.div
                    key={`coin-${i}`}
                    className="absolute"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ 
                      opacity: [0, 0.9, 0],
                      y: [100, -100, -300],
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      repeatType: 'loop',
                      ease: 'easeInOut',
                      delay: Math.random() * 5,
                    }}
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-yellow-400 font-bold text-xs shadow-glow">
                      APT
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Top game shape */}
            <motion.div 
              className="absolute top-0 left-0 w-full h-16 bg-squid-pink"
              initial={{ height: 0 }}
              animate={{ height: 16 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            />
            
            {/* Bottom game shape */}
            <motion.div 
              className="absolute bottom-0 left-0 w-full h-16 bg-squid-pink"
              initial={{ height: 0 }}
              animate={{ height: 16 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            />
            
            {/* Main content container - Scrollable if needed */}
            <motion.div className="relative z-20 flex flex-col items-center justify-center max-h-screen py-10 overflow-y-auto px-4 w-full max-w-3xl mx-auto">
              {/* Logo with enhanced effects */}
              <motion.div 
                className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 relative mb-4 z-10 glow-pulse"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  duration: 1.2, 
                  type: "spring",
                  stiffness: 200
                }}
              >
                <Image
                  src="/images/logos/squid-game-logo.svg"
                  alt="Squid Game Logo"
                  fill
                  className="object-contain"
                />
              </motion.div>
              
              {/* Welcome text with enhanced effects */}
              <motion.h1 
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-1 text-center text-stroke-pink z-10"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                WELCOME TO
              </motion.h1>
              
              <motion.div
                className="text-center z-10"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-squid-pink mb-1 tracking-wider">
                  AI DEATHMATCH
                </h2>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white">
                  TOURNAMENT ON APTOS
                </h3>
              </motion.div>
              
              {/* Prize pool highlight - NEW */}
              <motion.div
                className="mt-4 mb-3 bg-gradient-to-r from-yellow-600 to-yellow-400 px-4 sm:px-6 py-2 sm:py-3 rounded-md border-2 border-yellow-300 z-10 shadow-xl max-w-md text-center w-full"
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 2.0, duration: 0.8 }}
              >
                <motion.h4 
                  className="text-black font-bold text-lg sm:text-xl md:text-2xl"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  PRIZE POOL: 5,000 APT
                </motion.h4>
                <p className="text-black text-xs sm:text-sm md:text-base font-semibold">
                  (~$30,000 USD)
                </p>
              </motion.div>
              
              {/* Blockchain highlight - NEW */}
              <motion.div
                className="mt-1 mb-3 z-10 text-center flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4, duration: 0.8 }}
              >
                <p className="text-white text-xs sm:text-sm md:text-base">
                  Powered by <span className="text-blue-400 font-bold">Aptos Blockchain</span>
                </p>
                <div className="flex items-center mt-1 space-x-2">
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Secure</span>
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Fast</span>
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Play-to-Earn</span>
                </div>
              </motion.div>
              
              {/* Player count and urgency - NEW */}
              <motion.div
                className="z-10 mb-3 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.8, duration: 0.8 }}
              >
                <motion.p 
                  className="text-red-500 font-bold text-sm sm:text-base md:text-lg"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ONLY 456 SPOTS REMAINING!
                </motion.p>
                <p className="text-gray-400 text-xs sm:text-sm">Join now before all spots are taken</p>
              </motion.div>
              
              {/* Circle loader with enhanced effects */}
              <motion.div 
                className="mt-2 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.2, duration: 0.5 }}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-4 border-squid-pink border-t-transparent rounded-full animate-spin"></div>
              </motion.div>
              
              {/* Final "get ready" text */}
              <motion.div
                className="text-center z-10 mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.8, duration: 0.8 }}
              >
                <p className="text-base sm:text-lg md:text-xl text-white mb-1">
                  Get ready for the ultimate test...
                </p>
                <motion.p
                  className="text-squid-pink text-sm sm:text-base md:text-lg font-bold"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  ARE YOU READY TO PLAY?
                </motion.p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div 
        className={`container mx-auto px-4 py-8 transition-opacity duration-500 ${showIntro ? 'opacity-0' : 'opacity-100'}`}
        onClick={() => forcePlay()}
      >
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
    </>
  );
}
