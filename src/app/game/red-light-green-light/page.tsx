"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaPlay, FaStop, FaTrophy, FaSkull, FaMedal, FaFlag, FaStopwatch, FaExclamationTriangle, FaInfoCircle, FaHome } from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import AgentStats from "@/components/game/AgentStats";
import { usePlayerProgress } from "@/contexts/PlayerProgressContext";
import Link from "next/link";
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function RedLightGreenLightPage() {
  const router = useRouter();
  const { agent } = useAIAgent();
  const { updateGameResult, getHighestScore, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();
  const [gameState, setGameState] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [lightColor, setLightColor] = useState<"red" | "green">("red");
  const [position, setPosition] = useState(0);
  const [targetPosition, setTargetPosition] = useState(100);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [aiAgents, setAiAgents] = useState<Array<{
    id: string;
    name: string;
    position: number;
    eliminated: boolean;
  }>>([
    { id: "ai1", name: "Bot-001", position: 0, eliminated: false },
    { id: "ai2", name: "Bot-002", position: 0, eliminated: false },
    { id: "ai3", name: "Bot-003", position: 0, eliminated: false },
    { id: "ai4", name: "Bot-004", position: 0, eliminated: false },
  ]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lightIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get high score on mount
  useEffect(() => {
    setHighScore(getHighestScore('red-light-green-light'));
    trackGamePlayed('red-light-green-light');
  }, [getHighestScore, trackGamePlayed]);
  
  // Start the game
  const startGame = () => {
    if (!agent) {
      router.push('/train');
      return;
    }
    
    setShowResults(false);
    setGameState("playing");
    setCountdown(3);
    setPosition(0);
    setTimeLeft(60);
    setScore(0);
    
    // Reset AI agents with randomized starting positions
    setAiAgents(aiAgents.map(agent => ({ 
      ...agent, 
      position: Math.floor(Math.random() * 5), // Start with slightly different positions
      eliminated: false 
    })));
    
    // Start countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startGameLogic();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Start the actual game logic
  const startGameLogic = () => {
    // Start the timer
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(intervalRef.current!);
          setGameState("lost");
          calculateScore(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Start the light changes
    changeLights();
  };
  
  // Change the lights randomly
  const changeLights = () => {
    // Clear any existing interval
    if (lightIntervalRef.current) {
      clearInterval(lightIntervalRef.current);
    }
    
    // Set initial light
    setLightColor("green");
    
    // Schedule light changes
    lightIntervalRef.current = setInterval(() => {
      setLightColor(prev => {
        // Random duration for each light state
        const duration = Math.floor(Math.random() * 3000) + 1000;
        
        // Schedule the next change
        setTimeout(changeLights, duration);
        
        // Move AI agents when light is green
        if (prev === "green") {
          moveAIAgents();
        } else {
          checkAIAgents();
        }
        
        // Toggle the light
        return prev === "green" ? "red" : "green";
      });
    }, 2000); // Initial change after 2 seconds
  };
  
  // Move the player
  const movePlayer = () => {
    if (gameState !== "playing" || countdown > 0) return;
    
    // Calculate player movement speed based on agent stats
    const moveSpeed = agent ? Math.max(3, Math.min(8, Math.round(agent.speed / 14))) : 5;
    
    if (lightColor === "green") {
      // Move forward when light is green
      setPosition(prev => {
        const newPosition = prev + moveSpeed;
        
        // Check if player has reached the target
        if (newPosition >= targetPosition) {
          clearInterval(intervalRef.current!);
          clearInterval(lightIntervalRef.current!);
          setGameState("won");
          unlockAchievement('complete_game', 'red-light-green-light');
          calculateScore(true);
          return targetPosition;
        }
        
        return newPosition;
      });
    } else {
      // Chance of getting caught based on agent stealth
      const stealthFactor = agent ? agent.stealth / 100 : 0.5;
      const detectionChance = 0.8 - (stealthFactor * 0.5); // Between 0.3 and 0.8
      
      if (Math.random() < detectionChance) {
        // Player moved when light is red - eliminated!
        clearInterval(intervalRef.current!);
        clearInterval(lightIntervalRef.current!);
        setGameState("lost");
        calculateScore(false);
      }
    }
  };
  
  // Calculate score
  const calculateScore = (completed: boolean) => {
    let calculatedScore = 0;
    
    if (completed) {
      // Base score for completion
      calculatedScore = 10000;
      
      // Bonus for time left
      calculatedScore += timeLeft * 100;
      
      // Bonus for AI agents eliminated
      const eliminatedAI = aiAgents.filter(a => a.eliminated).length;
      calculatedScore += eliminatedAI * 500;
      
      // Check for speed achievement
      if (timeLeft > 30) {
        unlockAchievement('speed_demon', 'Completed with over 30 seconds remaining');
      }
    } else {
      // Partial score based on progress
      calculatedScore = Math.floor((position / targetPosition) * 2000);
      
      // Small bonus for time left
      calculatedScore += timeLeft * 20;
    }
    
    setScore(calculatedScore);
    updateGameResult('red-light-green-light', calculatedScore, completed);
    addPoints(calculatedScore);
    setShowResults(true);
    
    // Update high score
    if (calculatedScore > highScore) {
      setHighScore(calculatedScore);
      unlockAchievement('new_record', 'Red Light, Green Light');
    }
  };
  
  // Move AI agents
  const moveAIAgents = () => {
    setAiAgents(prev => 
      prev.map(agent => {
        if (agent.eliminated) return agent;
        
        // AI agents move based on their "intelligence"
        const moveChance = Math.random();
        const moveAmount = Math.floor(Math.random() * 8) + 3;
        
        return {
          ...agent,
          position: Math.min(agent.position + moveAmount, targetPosition)
        };
      })
    );
    
    // Check if any AI agent has won
    const winningAgent = aiAgents.find(agent => !agent.eliminated && agent.position >= targetPosition);
    if (winningAgent && gameState === "playing") {
      clearInterval(intervalRef.current!);
      clearInterval(lightIntervalRef.current!);
      setGameState("lost");
      calculateScore(false);
    }
  };
  
  // Check if AI agents moved during red light
  const checkAIAgents = () => {
    setAiAgents(prev => 
      prev.map(agent => {
        if (agent.eliminated) return agent;
        
        // AI agents might move during red light based on random chance
        const moveChance = Math.random();
        
        if (moveChance < 0.2) {
          // AI agent moved during red light - eliminated!
          return { ...agent, eliminated: true };
        }
        
        return agent;
      })
    );
  };
  
  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (lightIntervalRef.current) clearInterval(lightIntervalRef.current);
    };
  }, []);
  
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
  
  // Player variants for movement animation
  const playerVariants = {
    idle: { y: 0 },
    moving: { 
      y: [0, -5, 0],
      transition: { 
        repeat: Infinity,
        duration: 0.5
      }
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold text-squid-pink mb-8 text-center">Red Light, Green Light</h1>
      
      {/* Game container with perspective for 3D effect */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Game info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-squid-dark mb-4">Game Rules</h2>
            <p className="text-gray-700 mb-4">
              Move when the light is green, freeze when it's red. If you're caught moving during a red light, you'll be eliminated!
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Click or tap the screen to move forward when light is green</li>
              <li>Don't move when the light is red</li>
              <li>Reach the finish line before time runs out</li>
              <li>Compete against other AI contestants</li>
            </ul>
            
            {gameState === "ready" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                onClick={startGame}
              >
                Start Game
              </motion.button>
            )}
            
            {gameState === "won" && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <FaTrophy className="text-yellow-500 text-5xl mx-auto mb-2" />
                </motion.div>
                <p className="text-xl font-bold text-green-600 mb-2">You Won!</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                  onClick={startGame}
                >
                  Play Again
                </motion.button>
              </div>
            )}
            
            {gameState === "lost" && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 45, 0, -45, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <FaSkull className="text-red-500 text-5xl mx-auto mb-2" />
                </motion.div>
                <p className="text-xl font-bold text-red-600 mb-2">Eliminated!</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                  onClick={startGame}
                >
                  Try Again
                </motion.button>
              </div>
            )}
          </div>
          
          {agent && <AgentStats />}
        </div>

        {/* Right column - Game area */}
        <div className="lg:col-span-2">
          {gameState === "playing" && countdown > 0 ? (
            <div className="bg-squid-dark rounded-lg shadow-lg p-20 flex items-center justify-center">
              <motion.div 
                className="text-7xl font-bold text-squid-pink"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={countdown}
              >
                {countdown}
              </motion.div>
            </div>
          ) : (
            <div 
              className="bg-squid-dark rounded-lg shadow-lg p-6 relative overflow-hidden"
              style={{ perspective: "1000px" }}
              onClick={movePlayer}
            >
              {/* Timer and Score Display */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-800 px-3 py-1 rounded-full flex items-center">
                    <FaStopwatch className="text-white mr-2" />
                    <span className="text-white font-bold">{timeLeft}s</span>
                  </div>
                  <div className="bg-gray-800 px-3 py-1 rounded-full flex items-center">
                    <FaMedal className="text-yellow-400 mr-2" />
                    <span className="text-white font-bold">{score}</span>
                  </div>
                </div>
                
                {/* Game Light */}
                <motion.div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center 
                             ${lightColor === "red" ? "bg-red-600" : "bg-green-500"}`}
                  animate={{ 
                    boxShadow: lightColor === "red" 
                      ? "0 0 20px 5px rgba(239, 68, 68, 0.7)" 
                      : "0 0 20px 5px rgba(34, 197, 94, 0.7)",
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-white font-bold text-lg">{lightColor === "red" ? "STOP" : "GO"}</span>
                </motion.div>
              </div>
              
              {/* Game Track (3D effect) */}
              <div 
                className="relative bg-gray-700 h-80 rounded-lg mb-4 overflow-hidden"
                style={{ 
                  transform: "rotateX(25deg)",
                  transformStyle: "preserve-3d",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)"
                }}
              >
                {/* Track lines */}
                <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-between">
                  {[...Array(10)].map((_, i) => (
                    <div 
                      key={i} 
                      className="h-px bg-white opacity-50"
                      style={{
                        transform: `translateZ(${i * 5}px)`,
                      }}
                    ></div>
                  ))}
                </div>
                
                {/* Finish line */}
                <div 
                  className="absolute top-0 bottom-0 w-8 bg-white bg-opacity-50 flex items-center justify-center"
                  style={{ 
                    right: "5%",
                    backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 10px, #fff 10px, #fff 20px)"
                  }}
                >
                  <FaFlag className="text-2xl text-yellow-400" />
                </div>
                
                {/* Player character with shadow */}
                <motion.div
                  className="absolute bottom-0 left-0 flex flex-col items-center"
                  style={{ 
                    left: `${(position / targetPosition) * 90}%`, 
                    filter: "drop-shadow(0 10px 8px rgba(0, 0, 0, 0.5))"
                  }}
                  animate={{
                    y: lightColor === "green" ? [0, -5, 0] : 0
                  }}
                  transition={{ 
                    duration: 0.3, 
                    repeat: lightColor === "green" ? Infinity : 0
                  }}
                >
                  <motion.div 
                    className="w-12 h-12 bg-squid-pink rounded-full flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                  >
                    <FaRobot className="text-white text-lg" />
                  </motion.div>
                  <div className="mt-1 bg-black bg-opacity-30 h-1 w-10 rounded-full"></div>
                </motion.div>
                
                {/* AI agents */}
                {aiAgents.map((ai, index) => (
                  <motion.div
                    key={ai.id}
                    className="absolute bottom-0 flex flex-col items-center"
                    style={{ 
                      left: `${(ai.position / targetPosition) * 90}%`,
                      filter: ai.eliminated ? "grayscale(1)" : "none",
                      opacity: ai.eliminated ? 0.5 : 1,
                      zIndex: ai.eliminated ? 0 : 10
                    }}
                    animate={{
                      y: !ai.eliminated && lightColor === "green" ? [0, -5, 0] : 0
                    }}
                    transition={{ 
                      duration: 0.3, 
                      repeat: !ai.eliminated && lightColor === "green" ? Infinity : 0,
                      delay: index * 0.1
                    }}
                  >
                    <div className={`w-10 h-10 ${ai.eliminated ? "bg-gray-500" : "bg-blue-500"} rounded-full flex items-center justify-center`}>
                      <FaRobot className="text-white text-sm" />
                    </div>
                    <div className="mt-1 bg-black bg-opacity-30 h-1 w-8 rounded-full"></div>
                    {!ai.eliminated && (
                      <div className="mt-1 text-xs text-white font-bold">{ai.name}</div>
                    )}
                  </motion.div>
                ))}
                
                {/* Progress indicator */}
                <div className="absolute top-2 left-2 right-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-squid-pink"
                    style={{ width: `${(position / targetPosition) * 100}%` }}
                    animate={{ width: `${(position / targetPosition) * 100}%` }}
                    transition={{ duration: 0.2 }}
                  ></motion.div>
                </div>
              </div>
              
              {/* Instructions */}
              <div className="bg-gray-800 p-4 rounded-md text-white text-center">
                {lightColor === "red" ? (
                  <motion.div 
                    className="flex items-center justify-center text-red-500 font-bold"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <FaExclamationTriangle className="mr-2" /> FREEZE! Don't move!
                  </motion.div>
                ) : (
                  <motion.div 
                    className="flex items-center justify-center text-green-500 font-bold"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <FaPlay className="mr-2" /> GO! Click/tap to move forward!
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Game Results */}
          <AnimatePresence>
            {showResults && (
              <motion.div 
                className="mt-6 bg-gray-800 rounded-lg p-6 text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h3 className="text-xl font-bold mb-4 text-center">Game Results</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-gray-400">Final Score</p>
                    <p className="text-2xl font-bold text-squid-pink">{score.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-gray-400">High Score</p>
                    <p className="text-2xl font-bold text-yellow-400">{highScore.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="text-center mt-4">
                  <div className="flex justify-center space-x-4">
                    <Link href="/" className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600">
                      <FaHome className="inline mr-2" /> Home
                    </Link>
                    <button 
                      onClick={startGame}
                      className="bg-squid-pink text-white py-2 px-4 rounded hover:bg-opacity-80"
                    >
                      <FaPlay className="inline mr-2" /> Play Again
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
} 