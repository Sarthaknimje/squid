"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaPlay, FaStop, FaTrophy, FaSkull, FaMedal, FaFlag, FaStopwatch, FaExclamationTriangle, FaInfoCircle, FaHome, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import AgentStats from "@/components/game/AgentStats";
import { usePlayerProgress } from "@/contexts/PlayerProgressContext";
import { useAudio } from "@/contexts/AudioContext";
import Link from "next/link";
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// Audio file paths
const THEME_AUDIO = '/squid_game.mp3';
const GAMEPLAY_AUDIO = '/squid_games_remix.mp3';

export default function RedLightGreenLightPage() {
  const router = useRouter();
  const { agent } = useAIAgent();
  const { updateGameResult, getHighestScore, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();
  const { isMuted, toggleMute, changeTrack, pauseAudio, currentTrack } = useAudio();
  const [gameState, setGameState] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [lightColor, setLightColor] = useState<"red" | "green">("red");
  const [position, setPosition] = useState(0);
  const [targetPosition, setTargetPosition] = useState(100);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [highScore, setHighScore] = useState(0);
  
  const [trainingAttribute, setTrainingAttribute] = useState("Speed" as string);
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
  
  // Get high score on mount and set initial audio
  useEffect(() => {
    setHighScore(getHighestScore('red-light-green-light'));
    trackGamePlayed('red-light-green-light');
    
    // Switch to theme audio when the component mounts
    changeTrack(THEME_AUDIO);
    
    // Cleanup when page unmounts
    return () => {
      // Switch back to theme audio when leaving
      changeTrack(THEME_AUDIO);
    };
  }, [getHighestScore, trackGamePlayed, changeTrack]);
  
  // Update audio based on game state
  useEffect(() => {
    if (gameState === "playing" && countdown === 0) {
      // Switch to gameplay audio when playing
      changeTrack(GAMEPLAY_AUDIO);
    } else if (gameState !== "playing") {
      // Switch to theme audio when not playing
      changeTrack(THEME_AUDIO);
    }
  }, [gameState, countdown, changeTrack]);
  
  // Start the game
  const startGame = () => {
    if (!agent) {
      router.push('/train');
      return;
    }
    
    // Reset game state
    setGameState("playing");
    setPosition(0);
    setLightColor("green");
    setCountdown(3);
    setTimeLeft(60);
    setScore(0);
    setShowResults(false);
    
    // Reset AI agents
    setAiAgents(prevAgents => 
      prevAgents.map(agent => ({
        ...agent,
        position: 0,
        eliminated: false
      }))
    );
    
    // Start countdown
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count <= 0) {
        clearInterval(countdownInterval);
        startGameLogic();
      }
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
        if (lightIntervalRef.current) {
          clearInterval(lightIntervalRef.current);
          setTimeout(() => {
            if (gameState === "playing") {
              changeLights();
            }
          }, duration);
        }
        
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
    <div className="min-h-screen squid-dark-bg squid-pattern-bg flex flex-col">
      <div className="flex-grow flex flex-col md:flex-row p-4 gap-4">
        {/* Left panel - agent stats */}
        <div className="w-full md:w-1/4 flex-shrink-0">
          <AgentStats 
            agent={agent} 
            highlightAttribute={trainingAttribute}
            gameProgress={position / targetPosition} 
          />
          
          {/* Back to home link */}
          <Link 
            href="/" 
            className="flex items-center justify-center w-full bg-gray-700 text-white py-2 rounded mb-4 hover:bg-gray-600"
          >
            <FaHome className="mr-2" /> Back to Home
          </Link>
        </div>
        
        {/* Game area - right side */}
        <div className="w-full md:w-3/4 bg-squid-dark rounded-xl shadow-2xl overflow-hidden relative">
          {/* Mute button */}
          <div className="absolute top-4 right-4 z-10">
            <button className="bg-squid-dark p-2 rounded-full hover:bg-opacity-80 transition-all" onClick={toggleMute}>
              {isMuted ? 
                <FaVolumeMute className="text-white text-xl" /> : 
                <FaVolumeUp className="text-white text-xl" />
              }
            </button>
          </div>
          
          {/* Timer */}
          <div className="absolute top-4 left-4 z-10 bg-squid-dark bg-opacity-80 px-3 py-2 rounded-lg flex items-center">
            <FaStopwatch className="text-squid-pink mr-2" />
            <span className="text-white font-mono text-xl">{timeLeft}s</span>
          </div>
          
          {/* Game graphics */}
          <div className="game-board relative h-96 md:h-[500px] overflow-hidden">
            {/* Traffic light */}
            <div className="absolute right-8 top-8 z-10 px-2 py-3 rounded-lg bg-gray-800 flex flex-col items-center border-2 border-gray-600 shadow-xl">
              <div className={`w-8 h-8 rounded-full mb-2 ${lightColor === "red" ? 'bg-red-500 animate-pulse shadow-glow-red' : 'bg-red-900'}`}></div>
              <div className={`w-8 h-8 rounded-full ${lightColor === "green" ? 'bg-green-500 animate-pulse shadow-glow-green' : 'bg-green-900'}`}></div>
            </div>
            
            {/* Finish line */}
            <div className="absolute top-0 right-0 h-full w-4 bg-squid-pink"></div>
            
            {/* Player character */}
            <motion.div 
              className="absolute bottom-16 h-16 w-12 z-20"
              animate={{ 
                left: `${position}%`,
                scale: lightColor === "red" && gameState === "playing" ? [1, 1.05, 1] : 1
              }}
              transition={{ 
                left: { type: "spring", stiffness: 100, damping: 20 },
                scale: { repeat: Infinity, duration: 0.5 }
              }}
            >
              <div className="relative h-full w-full">
                <div className="absolute inset-0 bg-squid-pink rounded-full opacity-20 animate-pulse"></div>
                <FaRobot className="text-4xl text-squid-pink absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </motion.div>
            
            {/* AI Players */}
            {aiAgents.map((aiAgent, index) => (
              <motion.div 
                key={aiAgent.id}
                className="absolute bottom-20 h-8 w-6 z-10"
                style={{ bottom: `${60 + index * 14}px` }}
                animate={{ 
                  left: `${aiAgent.position}%`,
                  opacity: aiAgent.eliminated ? 0.4 : 1,
                  rotate: aiAgent.eliminated ? 90 : 0
                }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <div className="relative h-full w-full">
                  <FaRobot className={`text-2xl ${aiAgent.eliminated ? 'text-red-500' : 'text-blue-400'} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`} />
                </div>
              </motion.div>
            ))}
            
            {/* Game track */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gray-800 border-t-2 border-gray-700"></div>
          </div>
          
          {/* Game controls */}
          {gameState === "playing" && countdown === 0 && (
            <div className="flex justify-center mt-4 mb-6">
              <motion.button
                className="bg-squid-pink text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-opacity-90 transition-all"
                onClick={movePlayer}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                MOVE!
              </motion.button>
            </div>
          )}
          
          {/* Game results */}
          {(gameState === "won" || gameState === "lost") && (
            <div className="flex flex-col items-center justify-center mt-4">
              {gameState === "won" ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <FaTrophy className="text-yellow-500 text-5xl mx-auto mb-4" />
                  <p className="text-xl font-bold text-green-500 mb-4 text-center">You Won!</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <FaSkull className="text-red-500 text-5xl mx-auto mb-4" />
                  <p className="text-xl font-bold text-red-500 mb-4 text-center">Eliminated!</p>
                </motion.div>
              )}
              
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-squid-pink text-white py-2 px-6 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                  onClick={startGame}
                >
                  Play Again
                </motion.button>
                
                <Link href="/">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gray-700 text-white py-2 px-6 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                  >
                    Home
                  </motion.button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 