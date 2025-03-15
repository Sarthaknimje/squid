"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaRobot, FaTrophy, FaSkull, FaUserFriends } from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import AgentStats from "@/components/game/AgentStats";

export default function TugOfWarPage() {
  const { agent } = useAIAgent();
  const [gameState, setGameState] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [ropePosition, setRopePosition] = useState(50); // Center position (50%)
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds game
  const [playerTeam, setPlayerTeam] = useState<Array<{
    id: string;
    name: string;
    strength: number;
  }>>([
    { id: "player", name: agent?.name || "Player", strength: agent?.attributes.Defense || 50 },
    { id: "ally1", name: "Ally-001", strength: Math.floor(Math.random() * 20) + 40 },
    { id: "ally2", name: "Ally-002", strength: Math.floor(Math.random() * 20) + 40 },
    { id: "ally3", name: "Ally-003", strength: Math.floor(Math.random() * 20) + 40 },
    { id: "ally4", name: "Ally-004", strength: Math.floor(Math.random() * 20) + 40 },
  ]);
  
  const [enemyTeam, setEnemyTeam] = useState<Array<{
    id: string;
    name: string;
    strength: number;
  }>>([
    { id: "enemy1", name: "Enemy-001", strength: Math.floor(Math.random() * 20) + 40 },
    { id: "enemy2", name: "Enemy-002", strength: Math.floor(Math.random() * 20) + 40 },
    { id: "enemy3", name: "Enemy-003", strength: Math.floor(Math.random() * 20) + 50 },
    { id: "enemy4", name: "Enemy-004", strength: Math.floor(Math.random() * 20) + 40 },
    { id: "enemy5", name: "Enemy-005", strength: Math.floor(Math.random() * 20) + 40 },
  ]);
  
  const [pulling, setPulling] = useState(false);
  const [powerMeter, setPowerMeter] = useState(0);
  const [powerBarVisible, setPowerBarVisible] = useState(false);
  const [powerDirection, setPowerDirection] = useState(1);
  const [consecutiveClicks, setConsecutiveClicks] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const powerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ropeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Start the game
  const startGame = () => {
    setGameState("playing");
    setCountdown(3);
    setRopePosition(50);
    setTimeLeft(30);
    setPulling(false);
    setPowerMeter(0);
    setConsecutiveClicks(0);
    
    // Randomize team strengths
    setPlayerTeam(playerTeam.map(member => 
      member.id === "player" 
        ? { ...member, strength: agent?.attributes.Defense || 50 } 
        : { ...member, strength: Math.floor(Math.random() * 20) + 40 }
    ));
    
    setEnemyTeam(enemyTeam.map(member => 
      ({ ...member, strength: Math.floor(Math.random() * 20) + 40 })
    ));
    
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
          
          // Determine winner based on rope position
          if (ropePosition < 20) {
            setGameState("lost");
          } else if (ropePosition > 80) {
            setGameState("won");
          } else {
            // If time runs out with no clear winner, stronger team wins
            const playerTotalStrength = playerTeam.reduce((sum, member) => sum + member.strength, 0);
            const enemyTotalStrength = enemyTeam.reduce((sum, member) => sum + member.strength, 0);
            
            setGameState(playerTotalStrength > enemyTotalStrength ? "won" : "lost");
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Set up the power bar oscillation
    setPowerBarVisible(true);
    powerIntervalRef.current = setInterval(() => {
      setPowerMeter(prev => {
        const newValue = prev + (2 * powerDirection);
        
        // Reverse direction when reaching limits
        if (newValue >= 100 || newValue <= 0) {
          setPowerDirection(prev => prev * -1);
        }
        
        return Math.max(0, Math.min(100, newValue));
      });
    }, 30);
    
    // Start the AI team pulling simulation
    ropeIntervalRef.current = setInterval(() => {
      simulateAIPull();
    }, 1000);
  };
  
  // Simulate AI teams pulling
  const simulateAIPull = () => {
    if (gameState !== "playing") return;
    
    setRopePosition(prev => {
      // Calculate total strength for each team
      const playerTotalStrength = playerTeam.reduce((sum, member) => sum + member.strength, 0);
      const enemyTotalStrength = enemyTeam.reduce((sum, member) => sum + member.strength, 0);
      
      // Calculate pull force (random factor + strength advantage)
      const randomFactor = Math.random() * 2 - 1; // Between -1 and 1
      const strengthDiff = (playerTotalStrength - enemyTotalStrength) / 100;
      
      // Apply pull
      const pullForce = randomFactor + strengthDiff;
      const newPosition = prev + pullForce;
      
      // Check win/lose condition
      if (newPosition <= 10) {
        clearAllIntervals();
        setGameState("lost");
        return 10;
      } else if (newPosition >= 90) {
        clearAllIntervals();
        setGameState("won");
        return 90;
      }
      
      return Math.max(10, Math.min(90, newPosition));
    });
  };
  
  // Handle player pull
  const handlePull = () => {
    if (gameState !== "playing") return;
    
    // Increase consecutive clicks
    setConsecutiveClicks(prev => Math.min(prev + 1, 10));
    
    // Calculate pull strength based on power meter position and consecutive clicks
    const powerFactor = powerMeter / 50; // 0-2 factor based on where in the power meter
    const clickBonus = consecutiveClicks * 0.1; // Bonus for consecutive clicks
    
    // Apply pull
    setRopePosition(prev => {
      const newPosition = prev + (powerFactor + clickBonus);
      
      // Check win condition
      if (newPosition >= 90) {
        clearAllIntervals();
        setGameState("won");
        return 90;
      }
      
      return Math.min(90, newPosition);
    });
    
    // Simulate fatigue - consecutive clicks become less effective over time
    setTimeout(() => {
      setConsecutiveClicks(prev => Math.max(0, prev - 1));
    }, 500);
  };
  
  // Clear all intervals
  const clearAllIntervals = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
    if (ropeIntervalRef.current) clearInterval(ropeIntervalRef.current);
    setPowerBarVisible(false);
  };
  
  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, []);
  
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-squid-pink mb-8 text-center">Tug of War</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-squid-dark mb-4">Game Rules</h2>
            <p className="text-gray-700 mb-4">
              Work with your team to pull the rope and drag your opponents over the center line. The team that pulls the rope to their side wins.
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Rapidly click the "Pull" button to apply force</li>
              <li>Time your pulls with the power meter for maximum effect</li>
              <li>Consecutive pulls build up momentum</li>
              <li>Win by pulling the rope to your side before time runs out</li>
            </ul>
            
            {gameState === "ready" && (
              <button
                className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                onClick={startGame}
              >
                Start Game
              </button>
            )}
            
            {gameState === "won" && (
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
            
            {gameState === "lost" && (
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
          {gameState === "playing" && countdown > 0 ? (
            <div className="bg-squid-dark rounded-lg shadow-lg p-20 flex items-center justify-center">
              <div className="text-7xl font-bold text-squid-pink">{countdown}</div>
            </div>
          ) : (
            <div className="bg-squid-dark rounded-lg shadow-lg p-6 relative">
              {/* Game Status */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <FaUserFriends className="text-squid-pink text-xl mr-2" />
                  <span className="text-white font-bold">Team Battle</span>
                </div>
                <div className="text-white font-bold">Time: {timeLeft}s</div>
              </div>
              
              {/* Game Field */}
              <div className="h-80 bg-gray-800 rounded-lg relative mb-6 overflow-hidden">
                {/* Center Line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-400 transform -translate-x-1/2"></div>
                
                {/* Danger Zones */}
                <div className="absolute top-0 bottom-0 left-0 w-1/10 bg-red-500 bg-opacity-30"></div>
                <div className="absolute top-0 bottom-0 right-0 w-1/10 bg-red-500 bg-opacity-30"></div>
                
                {/* Rope */}
                <div className="absolute top-1/2 left-0 right-0 h-2 bg-yellow-700 transform -translate-y-1/2" style={{ 
                  left: `${ropePosition - 25}%`, 
                  width: '50%' 
                }}></div>
                
                {/* Rope Center Marker */}
                <div className="absolute top-1/2 w-6 h-6 bg-red-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 border-2 border-white" style={{ 
                  left: `${ropePosition}%` 
                }}></div>
                
                {/* Player Team */}
                <div className="absolute top-4 left-4 bottom-4 w-1/4 flex flex-col justify-around">
                  {playerTeam.map((member, index) => (
                    <div key={member.id} className="flex items-center">
                      <div className="w-10 h-10 bg-squid-pink rounded-full flex items-center justify-center mr-2">
                        <FaRobot className="text-white" />
                      </div>
                      <div>
                        <div className="text-white text-xs font-bold">{member.name}</div>
                        <div className="w-20 bg-gray-700 rounded-full h-1.5">
                          <div className="bg-squid-pink h-1.5 rounded-full" style={{ width: `${member.strength}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Enemy Team */}
                <div className="absolute top-4 right-4 bottom-4 w-1/4 flex flex-col justify-around">
                  {enemyTeam.map((member, index) => (
                    <div key={member.id} className="flex items-center justify-end">
                      <div>
                        <div className="text-white text-xs font-bold text-right">{member.name}</div>
                        <div className="w-20 bg-gray-700 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${member.strength}%` }}></div>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center ml-2">
                        <FaRobot className="text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Power Meter */}
              {powerBarVisible && (
                <div className="mb-6">
                  <div className="w-full bg-gray-700 rounded-full h-4 relative">
                    <div className="bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 h-4 rounded-full w-full">
                      <div className="absolute top-0 bottom-0 w-2 bg-white rounded-sm" style={{ left: `${powerMeter}%` }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-white mt-1">
                    <span>Weak</span>
                    <span>Power Meter</span>
                    <span>Strong</span>
                  </div>
                </div>
              )}
              
              {/* Controls */}
              {gameState === "playing" && countdown === 0 && (
                <div className="flex justify-center">
                  <button
                    className={`bg-squid-pink text-white px-8 py-5 rounded-full font-bold text-lg hover:bg-opacity-90 transition-all transform hover:scale-105 ${pulling ? 'animate-pulse' : ''}`}
                    onClick={handlePull}
                    onMouseDown={() => setPulling(true)}
                    onMouseUp={() => setPulling(false)}
                    onMouseLeave={() => setPulling(false)}
                  >
                    PULL!
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 