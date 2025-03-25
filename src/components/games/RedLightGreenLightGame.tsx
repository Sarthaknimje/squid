import React, { useEffect, useRef, useState } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { Socket } from 'socket.io-client';

// Game states
const GAME_STATES = {
  WAITING: 'waiting',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  WIN: 'win',
};

// Light states
const LIGHT_STATES = {
  GREEN: 'green',
  RED: 'red',
};

interface RedLightGreenLightGameProps {
  onGameOver: (result: 'won' | 'lost', score: number) => void;
  gameMode?: string;
  socket?: Socket | null;
  roomId?: string;
  playerId?: string;
  isMuted?: boolean;
}

const RedLightGreenLightGame: React.FC<RedLightGreenLightGameProps> = ({
  onGameOver,
  gameMode = 'solo',
  socket = null,
  roomId = '',
  playerId = '',
  isMuted = false,
}) => {
  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.WAITING);
  const [lightState, setLightState] = useState(LIGHT_STATES.GREEN);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [finishPosition] = useState(100);
  const [isMoving, setIsMoving] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [dollRotation, setDollRotation] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(1); // Default speed multiplier
  
  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const greenLightRef = useRef<HTMLAudioElement | null>(null);
  const redLightRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Timers
  const moveTimerRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const lightChangeTimerRef = useRef<number | null>(null);
  const aiTimerRef = useRef<number | null>(null);
  
  // AI opponent
  const [aiPosition, setAiPosition] = useState(0);
  const [aiMoving, setAiMoving] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState(0.7); // 0-1 scale, higher is more difficult
  
  // Reference to game container for key events
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize audio
  useEffect(() => {
    try {
      // Background music
      bgMusicRef.current = new Audio('/public/game/red-light-green-light/music/bg.mp3');
      bgMusicRef.current.loop = true;
      
      // Sound effects
      greenLightRef.current = new Audio('/public/sounds/success.mp3');
      redLightRef.current = new Audio('/public/sounds/alert.mp3');
      winSoundRef.current = new Audio('/public/game/red-light-green-light/music/win.mp3');
      loseSoundRef.current = new Audio('/public/game/red-light-green-light/music/lose.mp3');
      
      // Play background music if not muted
      if (!isMuted && bgMusicRef.current) {
        bgMusicRef.current.play().catch(error => {
          console.log("Audio playback prevented: ", error);
        });
      }
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
    
    // Focus the game container for keyboard events
    if (gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
    
    return () => {
      stopTimers();
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, [isMuted]);
  
  // Set up key event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process key events when game is in progress
      if (gameState === GAME_STATES.PLAYING) {
        // Check for key code
        console.log("Key pressed:", e.key);
        
        if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'd' || e.key === 'ArrowRight') {
          handleMovement(true);
        } else if (e.key === ' ' || e.key === 'Spacebar') {
          // Toggle movement with spacebar
          setIsMoving(prev => !prev);
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState === GAME_STATES.PLAYING) {
        if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'd' || e.key === 'ArrowRight') {
          handleMovement(false);
        }
      }
    };
    
    // Add event listeners for key presses
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);
  
  // Handle movement logic
  const handleMovement = (moving: boolean) => {
    setIsMoving(moving);
    
    // If we're moving and the light is red, check if caught
    if (moving && lightState === LIGHT_STATES.RED) {
      checkIfCaught();
    }
    
    // Start move timer if moving and not already running
    if (moving && !moveTimerRef.current) {
      movePlayer();
    } else if (!moving && moveTimerRef.current) {
      // Stop moving if key released
      if (moveTimerRef.current) {
        window.cancelAnimationFrame(moveTimerRef.current);
        moveTimerRef.current = null;
      }
    }
  };
  
  // Animation frame based movement for smooth motion
  const movePlayer = () => {
    if (gameState === GAME_STATES.PLAYING && isMoving) {
      // Calculate how far to move based on speed (adjust for balanced gameplay)
      const moveAmount = 1.0 * gameSpeed;
      
      // Update player position
      setPlayerPosition(prev => {
        const newPosition = prev + moveAmount;
        
        // Check if reached finish
        if (newPosition >= finishPosition) {
          handleWin();
          return finishPosition;
        }
        
        // Increase score based on progress
        setScore(Math.floor(newPosition * 10));
        
        return newPosition;
      });
      
      // Continue animation loop
      moveTimerRef.current = window.requestAnimationFrame(movePlayer);
    }
  };
  
  // AI movement logic
  const moveAI = () => {
    if (gameState === GAME_STATES.PLAYING && gameMode === 'computer') {
      // AI decision making
      if (lightState === LIGHT_STATES.GREEN) {
        // Always move on green light
        setAiMoving(true);
      } else {
        // On red light, sometimes the AI makes mistakes based on difficulty
        const makesMistake = Math.random() > aiDifficulty;
        if (makesMistake) {
          // AI keeps moving and gets caught
          setAiMoving(true);
          // Small delay before AI reacts to red light
          setTimeout(() => {
            if (gameState === GAME_STATES.PLAYING) {
              caughtAIMoving();
            }
          }, 300 + Math.random() * 500); // Variable reaction time
        } else {
          // AI stops correctly
          setAiMoving(false);
        }
      }
      
      // Move AI if it's moving
      if (aiMoving && lightState === LIGHT_STATES.GREEN) {
        // Adjust AI speed based on difficulty and game progress
        const aiMoveSpeed = 0.4 * gameSpeed * (0.8 + aiDifficulty * 0.4);
        
        setAiPosition(prev => {
          const newPosition = prev + aiMoveSpeed;
          
          // If AI wins
          if (newPosition >= finishPosition) {
            handleAIWin();
            return finishPosition;
          }
          
          return newPosition;
        });
      }
      
      // Schedule next AI update
      aiTimerRef.current = window.setTimeout(moveAI, 100);
    }
  };
  
  // Start the game countdown
  const startGame = () => {
    setGameState(GAME_STATES.READY);
    setCountdown(3);
    
    // Start countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          beginGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Once countdown finishes, actually start the game
  const beginGame = () => {
    setGameState(GAME_STATES.PLAYING);
    setLightState(LIGHT_STATES.GREEN);
    setTimeRemaining(60);
    setPlayerPosition(0);
    setAiPosition(0);
    setScore(0);
    
    // Start game timer
    startGameTimers();
    
    // Start AI if in computer mode
    if (gameMode === 'computer') {
      moveAI();
    }
    
    // Play background music
    if (!isMuted && bgMusicRef.current) {
      bgMusicRef.current.play().catch(console.error);
    }
  };
  
  // Set game timers
  const startGameTimers = () => {
    // Game countdown timer
    gameTimerRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up
          handleLoss("Time's up!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Schedule first light change
    scheduleLightChange();
  };
  
  // Schedule when lights will change
  const scheduleLightChange = () => {
    // Clear any existing timer
    if (lightChangeTimerRef.current) {
      clearTimeout(lightChangeTimerRef.current);
    }
    
    // Random time for this light state (2-5 seconds)
    const minTime = lightState === LIGHT_STATES.GREEN ? 2000 : 1500;
    const maxTime = lightState === LIGHT_STATES.GREEN ? 5000 : 4000;
    const changeTime = minTime + Math.random() * (maxTime - minTime);
    
    // Set timeout for light change
    lightChangeTimerRef.current = window.setTimeout(() => {
      toggleLight();
    }, changeTime);
  };
  
  // Toggle between red and green lights
  const toggleLight = () => {
    setLightState(prev => {
      const newLightState = prev === LIGHT_STATES.GREEN ? LIGHT_STATES.RED : LIGHT_STATES.GREEN;
      
      // Play appropriate sound
      if (!isMuted) {
        if (newLightState === LIGHT_STATES.GREEN) {
          greenLightRef.current?.play().catch(console.error);
        } else {
          redLightRef.current?.play().catch(console.error);
          
          // When switching to red, check if player is moving
          if (isMoving) {
            // Give the player a small grace period (300ms) to react
            setTimeout(() => {
              if (isMoving && lightState === LIGHT_STATES.RED && gameState === GAME_STATES.PLAYING) {
                checkIfCaught();
              }
            }, 300);
          }
        }
      }
      
      // Update doll rotation (180 degrees for red, 0 for green)
      setDollRotation(newLightState === LIGHT_STATES.RED ? 180 : 0);
      
      // Schedule next light change
      scheduleLightChange();
      
      return newLightState;
    });
  };
  
  // Check if player is caught moving on red light
  const checkIfCaught = () => {
    if (isMoving && lightState === LIGHT_STATES.RED) {
      caughtMoving();
    }
  };
  
  // Handle player being caught
  const caughtMoving = () => {
    handleLoss("You moved on red light!");
  };
  
  // Handle AI being caught
  const caughtAIMoving = () => {
    // AI loses
    setGameState(GAME_STATES.WIN);
    if (onGameOver) {
      onGameOver('won', Math.floor(playerPosition * 10));
    }
    playWinSound();
    stopTimers();
  };
  
  // Handle win condition
  const handleWin = () => {
    setGameState(GAME_STATES.WIN);
    if (onGameOver) {
      onGameOver('won', Math.floor(playerPosition * 10));
    }
    playWinSound();
    stopTimers();
  };
  
  // Handle AI winning
  const handleAIWin = () => {
    setGameState(GAME_STATES.GAME_OVER);
    if (onGameOver) {
      onGameOver('lost', Math.floor(playerPosition * 10));
    }
    playLoseSound();
    stopTimers();
  };
  
  // Handle loss condition
  const handleLoss = (reason: string) => {
    setGameState(GAME_STATES.GAME_OVER);
    if (onGameOver) {
      onGameOver('lost', Math.floor(playerPosition * 10));
    }
    playLoseSound();
    stopTimers();
  };
  
  // Play win sound
  const playWinSound = () => {
    if (!isMuted && winSoundRef.current) {
      // Stop background music
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
      }
      winSoundRef.current.play().catch(console.error);
    }
  };
  
  // Play lose sound
  const playLoseSound = () => {
    if (!isMuted && loseSoundRef.current) {
      // Stop background music
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
      }
      loseSoundRef.current.play().catch(console.error);
    }
  };
  
  // Stop all timers
  const stopTimers = () => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    if (lightChangeTimerRef.current) {
      clearTimeout(lightChangeTimerRef.current);
      lightChangeTimerRef.current = null;
    }
    
    if (moveTimerRef.current) {
      window.cancelAnimationFrame(moveTimerRef.current);
      moveTimerRef.current = null;
    }
    
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  };
  
  // Handle click events for mobile controls
  const handleMoveButtonDown = () => {
    handleMovement(true);
  };
  
  const handleMoveButtonUp = () => {
    handleMovement(false);
  };
  
  return (
    <div 
      ref={gameContainerRef}
      className="flex flex-col items-center justify-start w-full h-full bg-gray-900 relative p-4 rounded-lg outline-none" 
      tabIndex={0} // Make div focusable for key events
    >
      {/* Game HUD */}
      <div className="w-full flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">Time: {timeRemaining}s</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">Score: {score}</span>
        </div>
      </div>
      
      {/* Game board */}
      <div className="relative flex-1 w-full bg-gray-800 rounded-lg overflow-hidden">
        {/* Finish line */}
        <div 
          className="absolute top-0 h-full w-1 bg-yellow-400 z-10"
          style={{ left: `${finishPosition}%` }}
        >
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-yellow-300 animate-pulse" />
        </div>
        
        {/* Game track */}
        <div className="h-full w-full flex flex-col">
          {/* Doll at the finish line */}
          <div 
            className="absolute top-4 left-[calc(100%-60px)] w-12 h-24 transition-transform duration-1000"
            style={{ transform: `rotate(${dollRotation}deg)` }}
          >
            <div className={`w-full h-full transition-colors duration-300 ${lightState === LIGHT_STATES.GREEN ? 'text-green-500' : 'text-red-500'}`}>
              🎎
            </div>
          </div>
          
          {/* AI character if in computer mode */}
          {gameMode === 'computer' && (
            <div 
              className={`absolute bottom-16 h-12 w-8 transition-transform duration-100 z-20 ${aiMoving ? 'animate-bounce' : ''}`}
              style={{ left: `${aiPosition}%` }}
            >
              <div className="w-full h-full bg-red-500 rounded-full flex items-center justify-center">
                🤖
              </div>
            </div>
          )}
          
          {/* Player character */}
          <div 
            className={`absolute bottom-4 h-12 w-8 transition-transform duration-100 z-20 ${isMoving ? 'animate-bounce' : ''}`}
            style={{ left: `${playerPosition}%` }}
          >
            <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center">
              😀
            </div>
          </div>
          
          {/* Light indicator */}
          <div className={`absolute top-4 left-4 w-12 h-12 rounded-full ${lightState === LIGHT_STATES.GREEN ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center text-white font-bold`}>
            {lightState === LIGHT_STATES.GREEN ? 'GO' : 'STOP'}
          </div>
        </div>
      </div>
      
      {/* Mobile controls */}
      <div className="w-full flex justify-center mt-4 gap-4">
        <button
          className="px-10 py-6 bg-blue-600 rounded-full text-white font-bold text-2xl shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          onTouchStart={handleMoveButtonDown}
          onTouchEnd={handleMoveButtonUp}
          onMouseDown={handleMoveButtonDown}
          onMouseUp={handleMoveButtonUp}
          onMouseLeave={handleMoveButtonUp}
        >
          MOVE FORWARD
        </button>
      </div>
      
      {/* Game state overlays */}
      {gameState === GAME_STATES.WAITING && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-30">
          <h2 className="text-4xl font-bold text-white mb-8">Red Light, Green Light</h2>
          <p className="text-xl text-gray-300 mb-6 text-center max-w-md">
            Move when the light is green, freeze when it's red. 
            Get caught moving on red light and you're eliminated!
          </p>
          <button
            className="px-8 py-3 bg-squid-pink text-white rounded-lg text-xl font-bold"
            onClick={startGame}
          >
            Start Game
          </button>
        </div>
      )}
      
      {gameState === GAME_STATES.READY && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-30">
          <div className="text-7xl font-bold text-white animate-pulse">
            {countdown}
          </div>
        </div>
      )}
      
      {(gameState === GAME_STATES.WIN || gameState === GAME_STATES.GAME_OVER) && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-30">
          <h2 className={`text-4xl font-bold ${gameState === GAME_STATES.WIN ? 'text-green-500' : 'text-red-500'} mb-6`}>
            {gameState === GAME_STATES.WIN ? 'You Won!' : 'Game Over'}
          </h2>
          <p className="text-2xl text-white mb-4">Score: {score}</p>
          <button
            className="px-8 py-3 bg-squid-pink text-white rounded-lg text-xl font-bold mt-6"
            onClick={startGame}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default RedLightGreenLightGame;