"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaRobot, FaTrophy, FaCoins, FaInfoCircle, FaAccessibleIcon, FaBrain, FaRunning, FaShieldAlt, FaChessKnight, FaSpinner, FaCheckCircle, FaTimesCircle, FaGamepad, FaUserCircle } from 'react-icons/fa';
import { useAIAgent } from '@/contexts/AIAgentContext';
import { useAptosWallet } from '@/contexts/AptosWalletContext';
import Header from "@/components/ui/Header";

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
  const { agent, agents, selectedAgent, setSelectedAgent } = useAIAgent();
  const { wallet } = useAptosWallet();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showAgentWarning, setShowAgentWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Move useState hooks from conditional to top level
  const [agentSurvived, setAgentSurvived] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0.75);
  const [fieldLength, setFieldLength] = useState<number>(100);
  const [timeTaken, setTimeTaken] = useState<number>(15);
  
  // Add resetGame function at top level
  const resetGame = () => {
    setSelectedGame(null);
  };
  
  // Simulate loading state for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Add error boundary and logging
  useEffect(() => {
    // Log important state values for debugging
    console.log("DEBUG: Current state values in game page:", {
      agent: agent ? "Agent exists" : "No agent",
      selectedAgent: selectedAgent ? "Selected agent exists" : "No selected agent",
      selectedGame,
      wallet: wallet.connected ? "Wallet connected" : "Wallet not connected",
      isLoading
    });
    
    // Add global error handler to catch unhandled errors
    const errorHandler = (event: ErrorEvent) => {
      console.error("Unhandled error in game page:", event.error);
      // You could add analytics or error tracking here
      event.preventDefault();
    };
    
    window.addEventListener('error', errorHandler);
    
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, [agent, selectedAgent, selectedGame, wallet.connected, isLoading]);
  
  const games: Game[] = [
    {
      id: 'tic-tac-toe',
      title: 'Tic Tac Toe',
      description: `Classic game of X's and O's. Be the first to get three in a row to win!`,
      rules: [
        "Take turns placing X or O on the grid",
        "First player to get 3 in a row (horizontal, vertical, or diagonal) wins",
        "If the grid fills without a winner, it's a tie",
        "Play against AI, locally, or online"
      ],
      icon: '/images/games/tic-tac-toe.svg',
      path: '/game/tic-tac-toe',
      color: 'from-blue-500 to-green-500',
      difficulty: 'Easy',
      requiresAgent: false,
      reward: 5000,
      accessibilityInfo: "This game is suitable for all players. Screen reader compatible."
    },
    {
      id: 'red-light-green-light',
      title: 'Red Light, Green Light',
      description: `Stop when the doll turns! If she catches you moving, you're eliminated.`,
      rules: [
        "Move forward when the light is green",
        "Freeze immediately when the light turns red",
        "If caught moving during a red light, you're eliminated",
        "First to reach the finish line wins"
      ],
      icon: '/images/games/red-light-green-light.svg',
      path: '/game/red-light-green-light',
      color: 'from-pink-500 to-red-500',
      difficulty: 'Medium',
      requiresAgent: false,
      reward: 15000,
      accessibilityInfo: "This game includes visual and audio cues. Keyboard controls available."
    },
    {
      id: 'whack-a-mole',
      title: 'Whack-A-Mole',
      description: `Test your reflexes by whacking moles as they pop up. How many can you hit?`,
      rules: [
        "Click on moles as they appear from their holes",
        "Score points for each successful hit",
        "Try to beat your opponent in multiplayer mode",
        "Watch out - they move fast and unpredictably!"
      ],
      icon: '/images/games/whack-a-mole.svg',
      path: '/game/whack-a-mole',
      color: 'from-green-500 to-yellow-500',
      difficulty: 'Easy',
      requiresAgent: false,
      reward: 10000,
      accessibilityInfo: "This game requires quick reflexes. Accessible with mouse or touch controls."
    },
    {
      id: 'rock-paper-scissors',
      title: 'Rock Paper Scissors',
      description: `Choose rock, paper, or scissors to outsmart your opponent in this classic game of chance and strategy.`,
      rules: [
        "Rock beats scissors, scissors beat paper, paper beats rock",
        "Play in multiplayer mode with secure escrow betting",
        "Best of 5 rounds determines the winner",
        "Compete with players worldwide in tournament mode"
      ],
      icon: '/images/games/rock-paper-scissors.svg',
      path: '/game/rock-paper-scissors',
      color: 'from-purple-500 to-pink-500',
      difficulty: 'Easy',
      requiresAgent: false,
      reward: 8000,
      accessibilityInfo: "This game is suitable for all players. Simple controls and clear visual feedback."
    },
    {
      id: 'simon-says',
      title: 'Simon Says',
      description: `Remember and repeat the sequence of colors. Each successful pattern adds to your score!`,
      rules: [
        "Watch the pattern of colors as they light up",
        "Repeat the exact pattern by clicking on the colors in order",
        "Each round adds one more step to the pattern",
        "One wrong move and it's game over"
      ],
      icon: '/images/games/simon-says.svg',
      path: '/game/simon-says',
      color: 'from-blue-500 to-purple-500',
      difficulty: 'Medium',
      requiresAgent: false,
      reward: 12000,
      accessibilityInfo: "This game uses both colors and distinctive sounds for each button."
    },
    {
      id: 'snake',
      title: 'Snake',
      description: `Classic snake game: eat food to grow longer, but don't hit the walls or yourself!`,
      rules: [
        "Control the snake to eat food and grow longer",
        "Avoid hitting the walls or your own tail",
        "The game gets more challenging as your snake grows",
        "Compete for the highest score"
      ],
      icon: '/images/games/snake.svg',
      path: '/game/snake',
      color: 'from-green-500 to-teal-500',
      difficulty: 'Easy',
      requiresAgent: false,
      reward: 7500,
      accessibilityInfo: "This game features keyboard controls and color-based visual cues."
    },
    {
      id: 'dots-and-boxes',
      title: 'Dots & Boxes',
      description: `Connect dots to create boxes and claim territory on the grid.`,
      rules: [
        "Take turns drawing lines between adjacent dots",
        "When you complete a box, claim it and take another turn",
        "Player with the most boxes at the end wins",
        "Play strategically to force your opponent into completing boxes for you"
      ],
      icon: '/images/games/dots-and-boxes.svg',
      path: '/game/dots-and-boxes',
      color: 'from-indigo-500 to-purple-500',
      difficulty: 'Medium',
      requiresAgent: false,
      reward: 10000,
      accessibilityInfo: "This game includes color and symbol indicators. Adjustable game board size."
    },
    {
      id: 'hangman',
      title: 'Hangman',
      description: `Guess letters to solve the hidden word before the hangman is complete.`,
      rules: [
        "Guess one letter at a time to reveal the hidden word",
        "Each incorrect guess adds a part to the hangman",
        "Complete the word before the hangman is fully drawn to win",
        "Choose difficulty levels for different word categories"
      ],
      icon: '/images/games/hangman.svg',
      path: '/game/hangman',
      color: 'from-yellow-500 to-orange-500',
      difficulty: 'Medium',
      requiresAgent: false,
      reward: 8000,
      accessibilityInfo: "This game supports keyboard navigation. Alternative visual modes available."
    },
    {
      id: 'connect-four',
      title: 'Connect Four',
      description: `Drop colored discs into a vertical grid to connect four of your discs in a row.`,
      rules: [
        "Take turns dropping your colored discs into columns",
        "First player to connect four discs in a row wins",
        "Connections can be horizontal, vertical, or diagonal",
        "Play against AI or challenge other players online"
      ],
      icon: '/images/games/connect-four.svg',
      path: '/game/connect-four',
      color: 'from-red-500 to-pink-500',
      difficulty: 'Medium',
      requiresAgent: false,
      reward: 12000,
      accessibilityInfo: "This game includes color and position indicators. Screen reader support."
    },
  ];
  
  // Get all player-owned NFT agents
  const playerAgents = agents.filter(agent => 
    agent.isNFT && agent.owner === wallet.address
  );
  
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
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="animate-spin text-5xl mb-4">
          <FaSpinner />
        </div>
        <h2 className="text-2xl font-bold">Loading Game...</h2>
      </div>
    );
  }

  if (selectedGame) {
    // Instead of declaring new state variables here, use the ones defined at the top
    const selectedGameData = games.find(g => g.id === selectedGame);
    
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto bg-gray-800 rounded-lg p-8">
            <h1 className="text-3xl font-bold mb-8 text-center">{selectedGameData?.title || "Game Details"}</h1>
            
            {/* Game Results */}
            <div className="flex flex-col items-center mb-8">
              {agentSurvived ? (
                <div className="text-green-500 text-8xl mb-4">
                  <FaCheckCircle />
                </div>
              ) : (
                <div className="text-red-500 text-8xl mb-4">
                  <FaTimesCircle />
                </div>
              )}
              
              <h2 className="text-2xl font-bold mb-2">
                {agentSurvived ? "You Survived!" : "You were Eliminated!"}
              </h2>
              <p className="text-xl text-gray-300 mb-4">
                {agentSurvived
                  ? "Your agent successfully crossed the finish line."
                  : "Your agent moved during a red light."}
              </p>
              
              <div className="mt-4 bg-gray-700 rounded-lg p-4 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-2">Game Stats</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">Distance Covered:</div>
                  <div className="text-right">{Math.round(progress * fieldLength)}m</div>
                  <div className="text-gray-400">Time Taken:</div>
                  <div className="text-right">{timeTaken}s</div>
                  <div className="text-gray-400">Result:</div>
                  <div className="text-right">{agentSurvived ? "Success" : "Failure"}</div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium"
              >
                Play Again
              </button>
              <Link
                href="/tournament"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-medium"
              >
                Tournament Mode
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
    <div className="container mx-auto py-12 px-4">
      <motion.div 
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
          <h1 className="text-4xl md:text-5xl font-bold text-squid-pink mb-2">Squid Game Tournament</h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Choose your game and test your skills. Complete all five challenges to win the ultimate prize.
        </p>
      </motion.div>
      
        {/* Agent Display */}
      <motion.div 
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {agent ? (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Your Agent</h2>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center text-4xl mb-2">
                    {agent.level}
                  </div>
                  <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                  <div className="flex items-center mt-2 space-x-3">
                    <div className="flex items-center bg-gray-700 px-3 py-1 rounded-full">
                      <FaTrophy className="text-green-400 mr-2" />
                      <span className="text-green-400 font-bold">{agent.wins} Wins</span>
                    </div>
                    <div className="flex items-center bg-gray-700 px-3 py-1 rounded-full">
                      <span className="text-red-400 font-bold">{agent.losses} Losses</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <FaBrain className="text-blue-500 mr-2" />
                        <span className="text-gray-300">Intelligence</span>
                      </div>
                      <span className="font-bold text-white">{agent.attributes.Intelligence}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full"
                        style={{ width: `${agent.attributes.Intelligence}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <FaRunning className="text-green-500 mr-2" />
                        <span className="text-gray-300">Speed</span>
                      </div>
                      <span className="font-bold text-white">{agent.attributes.Speed}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-green-500 h-2.5 rounded-full"
                        style={{ width: `${agent.attributes.Speed}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <FaShieldAlt className="text-yellow-500 mr-2" />
                        <span className="text-gray-300">Defense</span>
                      </div>
                      <span className="font-bold text-white">{agent.attributes.Defense}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-yellow-500 h-2.5 rounded-full"
                        style={{ width: `${agent.attributes.Defense}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <FaChessKnight className="text-purple-500 mr-2" />
                        <span className="text-gray-300">Strategy</span>
                      </div>
                      <span className="font-bold text-white">{agent.attributes.Strategy}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-purple-500 h-2.5 rounded-full"
                        style={{ width: `${agent.attributes.Strategy}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {agent.isNFT && (
                <div className="mt-4 p-2 bg-gray-700 rounded-md">
                  <p className="text-sm text-gray-300">
                    NFT Agent - Owner: {agent.owner?.substring(0, 10)}...
                  </p>
                </div>
              )}
          </div>
        ) : (
            <div className="bg-gray-800 border border-red-800 rounded-lg p-6 text-center">
            <FaInfoCircle className="text-red-500 text-4xl mx-auto mb-2" />
            <h2 className="text-xl font-bold text-white mb-2">No Agent Created</h2>
              <p className="text-gray-300 mb-4">
              You need to create and train an AI agent to participate in the games.
            </p>
            <Link 
              href="/train"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center w-48 mx-auto"
            >
              <FaRobot className="mr-2" /> Create Your Agent
            </Link>
          </div>
        )}
      </motion.div>
      
      {/* Accessibility Options */}
      <div className="mb-8">
        <button 
            className="flex items-center bg-gray-800 px-4 py-2 rounded-md text-white hover:bg-gray-700 transition-colors"
          onClick={() => {
            // Toggle accessibility panel (would implement in a real app)
            alert("Accessibility options would open here in a real implementation");
          }}
        >
          <FaAccessibleIcon className="mr-2" /> Accessibility Options
        </button>
      </div>
        
        {/* Display user's NFT agents for selection */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <FaRobot className="mr-2 text-blue-500" />
            Select Your Agent
          </h2>
          
          {wallet.isConnected ? (
            playerAgents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {playerAgents.map(agent => (
                  <div 
                    key={agent.id}
                    className={`bg-gray-800 rounded-lg p-4 cursor-pointer border-2 ${
                      selectedAgent?.id === agent.id 
                        ? 'border-blue-500' 
                        : 'border-transparent hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 ${
                        agent.rarity === 'legendary' ? 'bg-yellow-500' :
                        agent.rarity === 'epic' ? 'bg-purple-500' :
                        agent.rarity === 'rare' ? 'bg-blue-500' :
                        agent.rarity === 'uncommon' ? 'bg-green-500' :
                        'bg-gray-500'
                      }`}>
                        <span className="text-xl">
                          {agent.rarity === 'legendary' ? '🥇' :
                           agent.rarity === 'epic' ? '🥈' :
                           agent.rarity === 'rare' ? '🥉' :
                           agent.rarity === 'uncommon' ? '👥' : '👤'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold">{agent.name}</h3>
                        <p className="text-sm text-gray-400">Level {agent.level}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <p className="text-gray-400 mb-4">You don't have any NFT agents yet.</p>
                <Link 
                  href="/train"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
                >
                  Create an NFT Agent
                </Link>
              </div>
            )
          ) : (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-400 mb-4">Connect your wallet to use your NFT agents.</p>
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
                onClick={() => {}}
              >
                Connect Wallet
              </button>
            </div>
          )}
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
              className={`bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition-all duration-300 ${
                selectedGame === game.id ? 'ring-4 ring-blue-500 scale-105' : ''
              } ${game.requiresAgent && !agent ? 'opacity-60' : 'cursor-pointer hover:scale-105'}`}
            variants={itemVariants}
            onClick={() => handleGameSelect(game.id)}
            role="button"
            tabIndex={0}
            aria-label={`Select ${game.title} game`}
            >
              <div className={`h-2 bg-gradient-to-r ${game.color}`}></div>
              <div className="p-6">
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-16 h-16 relative">
                  <Image
                    src={game.icon}
                    alt={game.title}
                    fill
                        className="object-contain"
                  />
                </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{game.title}</h3>
                    <div className="flex items-center mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                    game.difficulty === 'Easy' ? 'bg-green-600' :
                    game.difficulty === 'Medium' ? 'bg-yellow-600' :
                    game.difficulty === 'Hard' ? 'bg-orange-600' :
                    'bg-red-600'
                  }`}>
                    {game.difficulty}
                  </span>
                      <span className="ml-2 text-sm text-gray-400 flex items-center">
                        <FaCoins className="text-yellow-500 mr-1" /> {game.reward.toLocaleString()}
                  </span>
                </div>
              </div>
                </div>
                <p className="text-gray-300 mb-4">{game.description}</p>
              <Link 
                  href={agent || !game.requiresAgent ? game.path : '#'}
                  className={`block w-full py-2 px-4 text-center rounded-md ${
                    agent || !game.requiresAgent
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                onClick={(e) => {
                    if (!agent && game.requiresAgent) {
                    e.preventDefault();
                    setShowAgentWarning(true);
                  }
                }}
              >
                  {agent || !game.requiresAgent ? 'Play Now' : 'Agent Required'}
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
        {/* Agent Warning Modal */}
      {showAgentWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <motion.div 
              className="bg-gray-800 rounded-lg p-6 max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h3 className="text-xl font-bold text-white mb-2">Agent Required</h3>
              <p className="text-gray-300 mb-4">
                You need to create and train an AI agent to play this game. Your agent will participate in the games on your behalf.
              </p>
              <div className="flex justify-end space-x-3">
              <button 
                onClick={closeWarning}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                  Cancel
              </button>
              <Link 
                href="/train"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Agent
              </Link>
            </div>
          </motion.div>
        </div>
      )}
          </div>
    </div>
  );
} 