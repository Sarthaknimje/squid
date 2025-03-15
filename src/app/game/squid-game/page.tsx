"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSkull, FaTrophy, FaRobot, FaClock, FaHeart } from 'react-icons/fa';
import { GiSquid, GiKnifeFork } from 'react-icons/gi';
import { useAIAgent } from '@/contexts/AIAgentContext';
import AgentStats from '@/components/game/AgentStats';

type Player = {
  position: { x: number; y: number };
  health: number;
  isAttacking: boolean;
  isDefending: boolean;
  lastMove: number;
};

type Enemy = {
  position: { x: number; y: number };
  health: number;
  isAttacking: boolean;
  attackCooldown: number;
  status: 'idle' | 'chasing' | 'attacking' | 'stunned';
  lastAttack: number;
};

export default function SquidGamePage() {
  const { agent } = useAIAgent();
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(90); // 90 seconds time limit
  const [player, setPlayer] = useState<Player>({
    position: { x: 50, y: 300 },
    health: 100,
    isAttacking: false,
    isDefending: false,
    lastMove: 0,
  });
  const [enemy, setEnemy] = useState<Enemy>({
    position: { x: 750, y: 300 },
    health: 100,
    isAttacking: false,
    attackCooldown: 0,
    status: 'idle',
    lastAttack: 0,
  });
  const [message, setMessage] = useState('');
  const [keyPresses, setKeyPresses] = useState<Set<string>>(new Set());
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; value: number; x: number; y: number; color: string }[]>([]);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const damageIdRef = useRef(0);
  
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;
  const PLAYER_SPEED = 5;
  const PLAYER_SIZE = 30;
  const ENEMY_SIZE = 30;
  const ATTACK_RANGE = 60;
  const ATTACK_COOLDOWN = 1000; // 1 second cooldown
  
  // Start the game
  const startGame = () => {
    setGameState('playing');
    setCountdown(3);
    setTimeLeft(90);
    setPlayer({
      position: { x: 50, y: 300 },
      health: 100,
      isAttacking: false,
      isDefending: false,
      lastMove: 0,
    });
    setEnemy({
      position: { x: 750, y: 300 },
      health: 100,
      isAttacking: false,
      attackCooldown: 0,
      status: 'idle',
      lastAttack: 0,
    });
    setMessage('Final round: Win the Squid Game!');
    setDamageNumbers([]);
    
    // Start countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startGameLoop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Game loop
  const startGameLoop = () => {
    // Start game timer
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          endGame('lost', `Time's up! You failed to win the Squid Game.`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Start main game loop
    gameLoopRef.current = setInterval(() => {
      updateGameState();
    }, 1000 / 60); // 60 FPS
    
    // Event listeners for keyboard
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      clearInterval(timerInterval);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  };
  
  // Handle key press
  const handleKeyDown = (e: KeyboardEvent) => {
    setKeyPresses(prev => {
      const updated = new Set(prev);
      updated.add(e.key.toLowerCase());
      return updated;
    });
  };
  
  // Handle key release
  const handleKeyUp = (e: KeyboardEvent) => {
    setKeyPresses(prev => {
      const updated = new Set(prev);
      updated.delete(e.key.toLowerCase());
      return updated;
    });
    
    // Handle attack on spacebar release
    if (e.key === ' ' && !player.isDefending) {
      handlePlayerAttack();
    }
  };
  
  // Player attack logic
  const handlePlayerAttack = () => {
    // Check if enough time has passed since last attack
    const now = Date.now();
    if (now - player.lastMove < ATTACK_COOLDOWN) return;
    
    setPlayer(prev => ({
      ...prev,
      isAttacking: true,
      lastMove: now,
    }));
    
    // Calculate distance to enemy
    const distance = Math.sqrt(
      Math.pow(player.position.x - enemy.position.x, 2) +
      Math.pow(player.position.y - enemy.position.y, 2)
    );
    
    // Check if enemy is in range
    if (distance <= ATTACK_RANGE + PLAYER_SIZE + ENEMY_SIZE) {
      // Calculate damage based on attributes
      const strength = agent?.attributes.Strength || 50;
      const baseDamage = 5 + (strength / 10);
      const damageVariation = baseDamage * 0.2;
      const finalDamage = Math.round(baseDamage + ((Math.random() * 2 - 1) * damageVariation));
      
      // Apply damage to enemy
      setEnemy(prev => ({
        ...prev,
        health: Math.max(0, prev.health - finalDamage),
        status: 'stunned',
      }));
      
      // Add damage number animation
      setDamageNumbers(prev => [
        ...prev,
        {
          id: damageIdRef.current++,
          value: finalDamage,
          x: enemy.position.x,
          y: enemy.position.y - 20,
          color: '#ff5555',
        },
      ]);
      
      // Check if enemy defeated
      if (enemy.health - finalDamage <= 0) {
        endGame('won', `You won the Squid Game! Congratulations on your victory!`);
      }
    }
    
    // Reset attack state after animation time
    setTimeout(() => {
      setPlayer(prev => ({
        ...prev,
        isAttacking: false,
      }));
    }, 300);
  };
  
  // Update game state in the game loop
  const updateGameState = () => {
    // Update player position based on key presses
    setPlayer(prev => {
      const newPos = { ...prev.position };
      const speed = PLAYER_SPEED;
      let isMoving = false;
      let isDefending = keyPresses.has('shift');
      
      if (!isDefending) {
        if (keyPresses.has('w') || keyPresses.has('arrowup')) {
          newPos.y = Math.max(0, newPos.y - speed);
          isMoving = true;
        }
        if (keyPresses.has('s') || keyPresses.has('arrowdown')) {
          newPos.y = Math.min(GAME_HEIGHT - PLAYER_SIZE, newPos.y + speed);
          isMoving = true;
        }
        if (keyPresses.has('a') || keyPresses.has('arrowleft')) {
          newPos.x = Math.max(0, newPos.x - speed);
          isMoving = true;
        }
        if (keyPresses.has('d') || keyPresses.has('arrowright')) {
          newPos.x = Math.min(GAME_WIDTH - PLAYER_SIZE, newPos.x + speed);
          isMoving = true;
        }
      }
      
      return {
        ...prev,
        position: newPos,
        isDefending: isDefending,
        lastMove: isMoving ? Date.now() : prev.lastMove,
      };
    });
    
    // Update enemy AI
    setEnemy(prev => {
      // Don't update if enemy is defeated
      if (prev.health <= 0) return prev;
      
      // Calculate distance to player
      const distance = Math.sqrt(
        Math.pow(player.position.x - prev.position.x, 2) +
        Math.pow(player.position.y - prev.position.y, 2)
      );
      
      let newStatus = prev.status;
      let isAttacking = false;
      let newPos = { ...prev.position };
      const now = Date.now();
      
      // Reset stun after cooldown
      if (prev.status === 'stunned' && now - prev.lastAttack > 1000) {
        newStatus = 'idle';
      }
      
      // Enemy behavior based on state
      if (newStatus !== 'stunned') {
        if (distance <= ATTACK_RANGE + PLAYER_SIZE) {
          // Close enough to attack
          if (now - prev.lastAttack > ATTACK_COOLDOWN) {
            newStatus = 'attacking';
            isAttacking = true;
            
            // Calculate enemy damage based on difficulty (using AI's attributes)
            const enemyStrength = 40 + (agent?.level || 1) * 2;
            const baseDamage = 3 + (enemyStrength / 15);
            const damageVariation = baseDamage * 0.3;
            let finalDamage = Math.round(baseDamage + ((Math.random() * 2 - 1) * damageVariation));
            
            // Reduce damage if player is defending
            if (player.isDefending) {
              finalDamage = Math.floor(finalDamage / 3);
            }
            
            // Apply damage to player
            setPlayer(p => ({
              ...p,
              health: Math.max(0, p.health - finalDamage),
            }));
            
            // Add damage number animation
            setDamageNumbers(prevDamage => [
              ...prevDamage,
              {
                id: damageIdRef.current++,
                value: finalDamage,
                x: player.position.x,
                y: player.position.y - 20,
                color: player.isDefending ? '#ffaa00' : '#ff0000',
              },
            ]);
            
            // Check if player defeated
            if (player.health - finalDamage <= 0) {
              endGame('lost', `You were defeated in the Squid Game!`);
            }
          }
        } else {
          // Move toward player
          newStatus = 'chasing';
          const moveSpeed = 2 + (now % 5000 < 2500 ? 1 : 0); // Vary speed to make movement less predictable
          
          // Calculate direction vector
          const dx = player.position.x - prev.position.x;
          const dy = player.position.y - prev.position.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          
          // Normalize and apply speed
          newPos.x += (dx / length) * moveSpeed;
          newPos.y += (dy / length) * moveSpeed;
          
          // Keep in bounds
          newPos.x = Math.max(0, Math.min(GAME_WIDTH - ENEMY_SIZE, newPos.x));
          newPos.y = Math.max(0, Math.min(GAME_HEIGHT - ENEMY_SIZE, newPos.y));
        }
      }
      
      return {
        ...prev,
        position: newPos,
        status: newStatus,
        isAttacking: isAttacking,
        lastAttack: isAttacking ? now : prev.lastAttack,
      };
    });
    
    // Update damage number animations
    setDamageNumbers(prev => 
      prev
        .map(dmg => ({
          ...dmg,
          y: dmg.y - 1, // Move up
        }))
        .filter(dmg => dmg.y > 0) // Remove when off-screen
    );
  };
  
  // End the game with result
  const endGame = (result: 'won' | 'lost', msg: string) => {
    setGameState(result);
    setMessage(msg);
    
    if (result === 'won') {
      unlockAchievement('complete_game', 'squid-game');
      unlockAchievement('master_tactician', `Won the Squid Game with ${player.health} health remaining`);
      if (timeLeft > 120) {
        unlockAchievement('speed_demon', `Completed with over 2 minutes remaining`);
      }
      
      // Update player progress
      updateGameProgress('squid-game', true, timeLeft);
    } else {
      // Update player progress even on loss
      updateGameProgress('squid-game', false, 0);
    }
    
    // Remove event listeners
    clearInterval(gameLoopRef.current as NodeJS.Timeout);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-squid-pink mb-8 text-center">The Squid Game</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-squid-dark mb-4">Game Rules</h2>
            <p className="text-gray-700 mb-4">
              The final challenge: defeat your opponent in the Squid Game arena! Use your skills to outmaneuver and defeat your enemy.
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Move using the W, A, S, D or arrow keys</li>
              <li>Press SPACE to attack when close to your opponent</li>
              <li>Hold SHIFT to defend (reduces damage but can't move)</li>
              <li>Your strength attribute determines your attack damage</li>
              <li>Defeat your opponent before time runs out</li>
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
                
                <div className="flex items-center">
                  {/* Player Health */}
                  <div className="bg-gray-800 px-3 py-1 rounded-full flex items-center mr-4">
                    <FaHeart className="text-squid-pink mr-2" />
                    <span className="text-white font-bold">{player.health}%</span>
                  </div>
                  
                  {/* Enemy Health */}
                  <div className="bg-gray-800 px-3 py-1 rounded-full flex items-center">
                    <FaHeart className="text-blue-400 mr-2" />
                    <span className="text-white font-bold">{enemy.health}%</span>
                  </div>
                </div>
              </div>
              
              {/* Game Message */}
              <div className="bg-gray-800 p-3 mb-6 rounded-md text-white text-center font-bold">
                {message}
              </div>
              
              {/* Game Arena */}
              <div 
                className="relative bg-gray-700 rounded-md mb-4 overflow-hidden"
                style={{ height: `${GAME_HEIGHT}px`, width: '100%', maxWidth: `${GAME_WIDTH}px`, margin: '0 auto' }}
              >
                {/* Player */}
                <motion.div 
                  className={`absolute rounded-full flex items-center justify-center ${
                    player.isDefending 
                      ? 'bg-yellow-500 ring-2 ring-white' 
                      : player.isAttacking 
                        ? 'bg-red-500' 
                        : 'bg-squid-pink'
                  }`}
                  style={{ 
                    left: `${player.position.x}px`, 
                    top: `${player.position.y}px`,
                    width: `${PLAYER_SIZE}px`,
                    height: `${PLAYER_SIZE}px`,
                    zIndex: 10,
                  }}
                  animate={{
                    scale: player.isAttacking ? [1, 1.2, 1] : 1,
                    rotate: player.isAttacking ? [0, 15, -15, 0] : 0,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <GiKnifeFork className="text-white" />
                </motion.div>
                
                {/* Enemy */}
                <motion.div 
                  className={`absolute rounded-full flex items-center justify-center ${
                    enemy.isAttacking
                      ? 'bg-red-600'
                      : enemy.status === 'stunned'
                        ? 'bg-purple-500'
                        : 'bg-blue-500'
                  }`}
                  style={{ 
                    left: `${enemy.position.x}px`, 
                    top: `${enemy.position.y}px`,
                    width: `${ENEMY_SIZE}px`,
                    height: `${ENEMY_SIZE}px`,
                    zIndex: 10,
                  }}
                  animate={{
                    scale: enemy.isAttacking ? [1, 1.2, 1] : enemy.status === 'stunned' ? [1, 0.8, 1] : 1,
                    rotate: enemy.isAttacking ? [0, 15, -15, 0] : 0,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <GiSquid className="text-white" />
                </motion.div>
                
                {/* Damage Numbers */}
                <AnimatePresence>
                  {damageNumbers.map(dmg => (
                    <motion.div
                      key={dmg.id}
                      className="absolute font-bold flex justify-center text-lg pointer-events-none z-20"
                      style={{
                        left: `${dmg.x}px`,
                        top: `${dmg.y}px`,
                        color: dmg.color,
                      }}
                      initial={{ opacity: 0, scale: 0.5, y: 0 }}
                      animate={{ opacity: 1, scale: 1.2, y: -30 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1 }}
                    >
                      {dmg.value}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Arena design elements */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full w-96 h-96 opacity-20"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-squid-pink rounded-full w-64 h-64 opacity-15"></div>
              </div>
              
              {/* Controls Reminder */}
              <div className="bg-gray-800 p-4 rounded-md grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-white font-bold mb-2">Controls:</h3>
                  <ul className="text-gray-300 text-sm">
                    <li>WASD or Arrow Keys: Move</li>
                    <li>SPACE: Attack</li>
                    <li>SHIFT: Defend</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-2">Status:</h3>
                  <p className="text-gray-300 text-sm">
                    Player: {player.isAttacking ? 'Attacking' : player.isDefending ? 'Defending' : 'Moving'}
                  </p>
                  <p className="text-gray-300 text-sm">
                    Enemy: {enemy.status.charAt(0).toUpperCase() + enemy.status.slice(1)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 