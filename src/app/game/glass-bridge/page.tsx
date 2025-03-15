"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSkull, FaTrophy, FaRobot, FaClock } from 'react-icons/fa';
import { useAIAgent } from '@/contexts/AIAgentContext';
import AgentStats from '@/components/game/AgentStats';

type GlassPanel = {
  id: number;
  position: number;
  isSafe: boolean;
  isRevealed: boolean;
  playerStanding: boolean;
  aiStanding: boolean;
};

export default function GlassBridgePage() {
  const { agent } = useAIAgent();
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds time limit
  const [currentPosition, setCurrentPosition] = useState(0);
  const [aiPosition, setAiPosition] = useState(0);
  const [glassPanels, setGlassPanels] = useState<GlassPanel[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);
  const [message, setMessage] = useState('');
  const [shakeBridge, setShakeBridge] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const BRIDGE_LENGTH = 18; // Total number of steps to cross
  
  // Initialize game
  const startGame = () => {
    // Create the glass bridge with random safe panels
    const newGlassPanels: GlassPanel[] = [];
    
    for (let i = 0; i < BRIDGE_LENGTH; i++) {
      const leftPanel: GlassPanel = {
        id: i * 2,
        position: i,
        isSafe: Math.random() >= 0.5,
        isRevealed: false,
        playerStanding: false,
        aiStanding: false
      };
      
      const rightPanel: GlassPanel = {
        id: i * 2 + 1,
        position: i,
        isSafe: !leftPanel.isSafe, // If left is safe, right is not and vice versa
        isRevealed: false,
        playerStanding: false,
        aiStanding: false
      };
      
      newGlassPanels.push(leftPanel, rightPanel);
    }
    
    setGlassPanels(newGlassPanels);
    setCurrentPosition(0);
    setAiPosition(0);
    setTimeLeft(60);
    setGameState('playing');
    setCountdown(3);
    setIsPlayerTurn(true);
    setMessage(`Choose which glass panel to step on...`);
    
    // Start countdown
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          startTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Start the game timer
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          setGameState('lost');
          setMessage(`Time's up! You've been eliminated.`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Handle player's panel selection
  const selectPanel = (panel: GlassPanel) => {
    // Ignore if not player's turn or panel is not at current position
    if (!isPlayerTurn || panel.position !== currentPosition || gameState !== 'playing' || countdown > 0) {
      return;
    }
    
    const updatedPanels = glassPanels.map(p => ({
      ...p,
      playerStanding: p.id === panel.id,
      isRevealed: p.id === panel.id || p.isRevealed
    }));
    
    setGlassPanels(updatedPanels);
    
    if (panel.isSafe) {
      // Safe panel - move forward
      setMessage('Good choice! The glass holds.');
      setCurrentPosition(prev => prev + 1);
      
      // Check if player reached the end
      if (currentPosition + 1 >= BRIDGE_LENGTH) {
        clearInterval(timerRef.current as NodeJS.Timeout);
        setGameState('won');
        setMessage(`Congratulations! You've crossed the bridge!`);
        return;
      }
      
      // Switch to AI turn
      setIsPlayerTurn(false);
      aiTurn(currentPosition + 1, updatedPanels);
    } else {
      // Unsafe panel - game over
      setShakeBridge(true);
      setMessage('The glass breaks! You fall to your elimination.');
      
      setTimeout(() => {
        setGameState('lost');
        clearInterval(timerRef.current as NodeJS.Timeout);
      }, 1500);
    }
  };
  
  // AI turn logic
  const aiTurn = (position: number, currentPanels: GlassPanel[]) => {
    setAiThinking(true);
    
    aiTimerRef.current = setTimeout(() => {
      setAiThinking(false);
      
      // Get panels at current position
      const leftPanel = currentPanels.find(p => p.position === position && p.id % 2 === 0);
      const rightPanel = currentPanels.find(p => p.position === position && p.id % 2 === 1);
      
      if (!leftPanel || !rightPanel) return;
      
      // AI decision making based on intelligence
      let selectedPanel;
      const intelligence = agent?.attributes.Intelligence || 50;
      const hasKnowledge = Math.random() * 100 < intelligence;
      
      // Higher intelligence gives better chance of choosing correctly
      if (hasKnowledge) {
        // AI knows which panel is safe
        selectedPanel = leftPanel.isSafe ? leftPanel : rightPanel;
      } else {
        // Random guess
        selectedPanel = Math.random() > 0.5 ? leftPanel : rightPanel;
      }
      
      const updatedPanels = currentPanels.map(p => ({
        ...p,
        aiStanding: p.id === selectedPanel.id,
        isRevealed: p.id === selectedPanel.id || p.isRevealed
      }));
      
      setGlassPanels(updatedPanels);
      
      if (selectedPanel.isSafe) {
        // AI chose correctly
        setMessage(`The opponent is moving forward...`);
        setAiPosition(position + 1);
        
        // Check if AI reached the end
        if (position + 1 >= BRIDGE_LENGTH) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          setGameState('lost');
          setMessage('Your opponent reached the end first!');
          return;
        }
        
        // Switch back to player turn
        setIsPlayerTurn(true);
      } else {
        // AI chose incorrectly
        setShakeBridge(true);
        setMessage(`The opponent chose poorly! They've been eliminated.`);
        
        setTimeout(() => {
          setGameState('won');
          clearInterval(timerRef.current as NodeJS.Timeout);
        }, 1500);
      }
    }, 2000); // AI thinks for 2 seconds
  };
  
  // Clean up on unmount or when game ends
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);
  
  // Effect to stop the bridge shaking
  useEffect(() => {
    if (shakeBridge) {
      const timer = setTimeout(() => {
        setShakeBridge(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shakeBridge]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft <= 0) {
      setGameState('lost');
      setMessage(`Time's up! You've been eliminated.`);
    }
  }, [timeLeft, gameState]);

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-squid-pink mb-8 text-center">Glass Bridge</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-squid-dark mb-4">Game Rules</h2>
            <p className="text-gray-700 mb-4">
              Cross the glass bridge by choosing the correct panels. One panel is made of tempered glass that will hold your weight, while the other is regular glass that will break.
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Choose either the left or right glass panel to step on</li>
              <li>If you choose the tempered glass, you move forward</li>
              <li>If you choose the regular glass, it breaks and you're eliminated</li>
              <li>You are racing against time and an opponent</li>
              <li>Be the first to reach the end to win</li>
            </ul>
            
            {gameState === 'ready' && (
              <button
                className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                onClick={startGame}
              >
                Start Game
              </button>
            )}
            
            {gameState === 'won' && (
              <div className="text-center">
                <FaTrophy className="text-yellow-500 text-5xl mx-auto mb-2" />
                <p className="text-xl font-bold text-green-600 mb-2">You Won!</p>
                <button
                  className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                  onClick={startGame}
                >
                  Play Again
                </button>
              </div>
            )}
            
            {gameState === 'lost' && (
              <div className="text-center">
                <FaSkull className="text-red-500 text-5xl mx-auto mb-2" />
                <p className="text-xl font-bold text-red-600 mb-2">Eliminated!</p>
                <button
                  className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                  onClick={startGame}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
          
          <AgentStats />
        </div>
        
        {/* Game Area */}
        <div className="lg:col-span-2">
          {gameState === 'playing' && countdown > 0 ? (
            <div className="bg-squid-dark rounded-lg shadow-lg p-20 flex items-center justify-center">
              <div className="text-7xl font-bold text-squid-pink">{countdown}</div>
            </div>
          ) : (
            <div className="bg-squid-dark rounded-lg shadow-lg p-6">
              {/* Game Status */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center bg-gray-800 px-3 py-1 rounded-full">
                  <FaClock className="text-white mr-2" />
                  <span className="text-white font-bold">{formatTime(timeLeft)}</span>
                </div>
                
                <div className="flex items-center bg-gray-800 px-3 py-1 rounded-full">
                  <span className="text-white font-bold mr-2">Turn:</span>
                  {isPlayerTurn ? (
                    <span className="text-squid-pink font-bold">Your Turn</span>
                  ) : (
                    <span className="text-blue-400 font-bold">Opponent's Turn</span>
                  )}
                </div>
              </div>
              
              {/* Game Message */}
              <div className="bg-gray-800 p-3 mb-6 rounded-md text-white text-center font-bold">
                {message}
                
                {aiThinking && (
                  <div className="flex justify-center items-center mt-2">
                    <div className="animate-pulse flex items-center">
                      <div className="bg-blue-500 rounded-full h-2 w-2 mr-1"></div>
                      <div className="bg-blue-500 rounded-full h-2 w-2 mr-1 animate-pulse delay-75"></div>
                      <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse delay-150"></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Bridge */}
              <div className="flex flex-col items-center mb-6">
                {/* Starting platform */}
                <div className="w-full max-w-sm h-20 bg-gray-700 rounded-md mb-4 flex justify-center items-center">
                  <span className="text-white font-bold">Start</span>
                </div>
                
                {/* Glass Bridge */}
                <motion.div 
                  className="relative w-full max-w-sm"
                  animate={{ x: shakeBridge ? [-5, 5, -4, 4, -2, 2, 0] : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex flex-col">
                    {Array.from({ length: BRIDGE_LENGTH }).map((_, position) => {
                      const leftPanel = glassPanels.find(p => p.position === position && p.id % 2 === 0);
                      const rightPanel = glassPanels.find(p => p.position === position && p.id % 2 === 1);
                      
                      if (!leftPanel || !rightPanel) return null;
                      
                      return (
                        <div key={position} className="flex justify-between mb-1">
                          {/* Left Panel */}
                          <motion.div
                            className={`w-24 h-16 rounded-md cursor-pointer transition-all duration-300 flex items-center justify-center ${
                              position === currentPosition && isPlayerTurn
                                ? 'border-2 border-squid-pink'
                                : ''
                            } ${
                              leftPanel.isRevealed
                                ? leftPanel.isSafe
                                  ? 'bg-green-500 bg-opacity-50'
                                  : 'bg-red-500 bg-opacity-50'
                                : 'bg-blue-300 bg-opacity-30'
                            }`}
                            onClick={() => selectPanel(leftPanel)}
                            whileHover={position === currentPosition && isPlayerTurn ? { scale: 1.05 } : {}}
                          >
                            {leftPanel.playerStanding && (
                              <div className="w-8 h-8 bg-squid-pink rounded-full flex items-center justify-center">
                                <FaRobot className="text-white" />
                              </div>
                            )}
                            {leftPanel.aiStanding && (
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <FaRobot className="text-white" />
                              </div>
                            )}
                          </motion.div>
                          
                          {/* Right Panel */}
                          <motion.div
                            className={`w-24 h-16 rounded-md cursor-pointer transition-all duration-300 flex items-center justify-center ${
                              position === currentPosition && isPlayerTurn
                                ? 'border-2 border-squid-pink'
                                : ''
                            } ${
                              rightPanel.isRevealed
                                ? rightPanel.isSafe
                                  ? 'bg-green-500 bg-opacity-50'
                                  : 'bg-red-500 bg-opacity-50'
                                : 'bg-blue-300 bg-opacity-30'
                            }`}
                            onClick={() => selectPanel(rightPanel)}
                            whileHover={position === currentPosition && isPlayerTurn ? { scale: 1.05 } : {}}
                          >
                            {rightPanel.playerStanding && (
                              <div className="w-8 h-8 bg-squid-pink rounded-full flex items-center justify-center">
                                <FaRobot className="text-white" />
                              </div>
                            )}
                            {rightPanel.aiStanding && (
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <FaRobot className="text-white" />
                              </div>
                            )}
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
                
                {/* Ending platform */}
                <div className="w-full max-w-sm h-20 bg-gray-700 rounded-md mt-4 flex justify-center items-center">
                  <span className="text-white font-bold">Finish</span>
                </div>
              </div>
              
              {/* Game Progress */}
              <div className="bg-gray-800 p-4 rounded-md mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold">Your Progress:</span>
                  <span className="text-squid-pink font-bold">{Math.floor((currentPosition / BRIDGE_LENGTH) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-squid-pink h-2.5 rounded-full" 
                    style={{ width: `${Math.floor((currentPosition / BRIDGE_LENGTH) * 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold">Opponent Progress:</span>
                  <span className="text-blue-400 font-bold">{Math.floor((aiPosition / BRIDGE_LENGTH) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-400 h-2.5 rounded-full" 
                    style={{ width: `${Math.floor((aiPosition / BRIDGE_LENGTH) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 