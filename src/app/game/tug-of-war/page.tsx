"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaTrophy, FaSkull, FaUserFriends, FaVolumeUp, FaVolumeMute, FaHome, FaStopwatch } from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import { usePlayerProgress } from "@/contexts/PlayerProgressContext";
import { useAudio } from "@/contexts/AudioContext";
import AgentStats from "@/components/game/AgentStats";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Audio file paths
const THEME_AUDIO = '/squid_game.mp3';
const GAMEPLAY_AUDIO = '/tug-of-war.mp3';

export default function TugOfWarPage() {
  const router = useRouter();
  const { agent } = useAIAgent();
  const { updateGameResult, getHighestScore, addPoints, trackGamePlayed } = usePlayerProgress();
  const { isMuted, toggleMute, changeTrack, pauseAudio } = useAudio();
  const [gameState, setGameState] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [ropePosition, setRopePosition] = useState(50); // Center position (50%)
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds game
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [highScore, setHighScore] = useState(0);
  
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
  
  // Get high score on mount and set initial audio
  useEffect(() => {
    setHighScore(getHighestScore('tug-of-war'));
    trackGamePlayed('tug-of-war');
    
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
  
  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, []);
  
  // Update clearAllIntervals to just clear the intervals, not handle audio
  const clearAllIntervals = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
    if (ropeIntervalRef.current) clearInterval(ropeIntervalRef.current);
    setPowerBarVisible(false);
  };
  
  return (
    <div className="min-h-screen squid-dark-bg squid-pattern-bg flex flex-col">
      <div className="flex-grow flex flex-col md:flex-row p-4 gap-4">
        {/* Left panel - agent stats */}
        <div className="w-full md:w-1/4 flex-shrink-0">
          <AgentStats 
            agent={agent} 
            highlightAttribute="Defense"
            gameProgress={(ropePosition - 50) / 40} // Convert to -1 to 1 scale
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
          
          {/* Countdown overlay */}
          {gameState === "playing" && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-20">
              <motion.div 
                className="text-7xl font-bold text-squid-pink"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={countdown}
              >
                {countdown}
              </motion.div>
            </div>
          )}
          
          {/* Game board */}
          <div className="game-board relative h-96 md:h-[500px] overflow-hidden p-4">
            {/* Game status title */}
            <h2 className="text-2xl font-bold text-squid-pink text-center mb-4">Tug of War</h2>
            
            {gameState === "ready" ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="max-w-md text-center mb-8">
                  <h3 className="text-xl text-white mb-4">Game Rules</h3>
                  <p className="text-gray-300 mb-4">
                    Work with your team to pull the rope and drag your opponents over the center line.
                  </p>
                  <ul className="text-gray-300 space-y-2 mb-6 text-left">
                    <li>• Click the "PULL" button rapidly</li>
                    <li>• Time your pulls with the power meter</li>
                    <li>• Pull the rope to your side to win</li>
                  </ul>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-squid-pink text-white py-3 px-8 rounded-md font-bold text-lg hover:bg-opacity-90 transition-colors"
                  onClick={startGame}
                >
                  Start Game
                </motion.button>
              </div>
            ) : (
              <>
                {/* Game Field */}
                <div className="h-64 bg-gray-800 rounded-lg relative mb-6 overflow-hidden">
                  {/* Center Line */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-400 transform -translate-x-1/2"></div>
                  
                  {/* Danger Zones */}
                  <div className="absolute top-0 bottom-0 left-0 w-1/10 bg-red-500 bg-opacity-30"></div>
                  <div className="absolute top-0 bottom-0 right-0 w-1/10 bg-red-500 bg-opacity-30"></div>
                  
                  {/* Rope */}
                  <div className="absolute top-1/2 left-0 right-0 h-2 bg-yellow-700 transform -translate-y-1/2" 
                    style={{ 
                      left: `${ropePosition - 25}%`, 
                      width: '50%' 
                    }}
                  ></div>
                  
                  {/* Rope Center Marker */}
                  <motion.div 
                    className="absolute top-1/2 w-6 h-6 bg-red-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 border-2 border-white" 
                    style={{ left: `${ropePosition}%` }}
                    animate={{ 
                      scale: pulling ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  ></motion.div>
                  
                  {/* Player Team */}
                  <div className="absolute top-4 left-4 bottom-4 w-1/4 flex flex-col justify-around">
                    {playerTeam.map((member, index) => (
                      <div key={member.id} className="flex items-center">
                        <div className="w-8 h-8 bg-squid-pink rounded-full flex items-center justify-center mr-2">
                          <FaRobot className="text-white text-xs" />
                        </div>
                        <div>
                          <div className="text-white text-xs font-bold">{member.name.substring(0, 8)}</div>
                          <div className="w-16 bg-gray-700 rounded-full h-1.5">
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
                          <div className="text-white text-xs font-bold text-right">{member.name.substring(0, 8)}</div>
                          <div className="w-16 bg-gray-700 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${member.strength}%` }}></div>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center ml-2">
                          <FaRobot className="text-white text-xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Game controls */}
                {gameState === "playing" && countdown === 0 && (
                  <>
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
                    
                    {/* Pull button */}
                    <div className="flex justify-center">
                      <motion.button
                        className="bg-squid-pink text-white px-8 py-5 rounded-full font-bold text-lg hover:bg-opacity-90 transition-all"
                        onClick={handlePull}
                        onMouseDown={() => setPulling(true)}
                        onMouseUp={() => setPulling(false)}
                        onMouseLeave={() => setPulling(false)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={pulling ? { scale: [1, 0.95, 1] } : {}}
                      >
                        PULL!
                      </motion.button>
                    </div>
                  </>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 