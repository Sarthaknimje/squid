import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

type Props = {
  gameMode: number | string;
  player1?: string;
  player2?: string;
  roomId?: string;
  socket: Socket | null;
  onGameOver: (result: 'won' | 'lost' | 'tie', score: number) => void;
  isMuted: boolean;
};

type Mole = {
  id: number;
  position: number;
  isUp: boolean;
  isHit: boolean;
};

// Game constants
const GRID_SIZE = 9; // 3x3 grid
const GAME_DURATION = 60; // 60 seconds
const MOLE_UP_MIN_TIME = 1000; // Min time mole stays up (ms)
const MOLE_UP_MAX_TIME = 2500; // Max time mole stays up (ms)
const MOLE_SPAWN_INTERVAL_MIN = 500; // Min time between mole spawns (ms)
const MOLE_SPAWN_INTERVAL_MAX = 1500; // Max time between mole spawns (ms)

const WhackAMoleGame = ({
  gameMode,
  player1 = "Player 1",
  player2 = "Player 2",
  roomId = "",
  socket,
  onGameOver,
  isMuted
}: Props) => {
  // Convert gameMode to numeric format for consistency
  const gameModeNum = typeof gameMode === 'string'
    ? gameMode === 'solo' ? 1 : gameMode === 'local' ? 2 : gameMode === 'online' ? 3 : 4
    : gameMode;

  // Game container reference
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game state
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [message, setMessage] = useState("Click to start");
  const [isWinner, setIsWinner] = useState(false);
  
  // Mole state
  const [moles, setMoles] = useState<Mole[]>([]);
  const [activeMoles, setActiveMoles] = useState<number>(0);
  
  // AI opponent state
  const [aiScore, setAiScore] = useState(0);
  const [aiDifficulty, setAiDifficulty] = useState(0.7); // 0.0 to 1.0, higher is harder
  
  // Audio elements
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({
    whack: null,
    miss: null,
    pop: null,
    gameOver: null,
    background: null
  });
  
  // Timers
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moleTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize game
  useEffect(() => {
    // Initialize empty grid
    const initialMoles: Mole[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      initialMoles.push({
        id: i,
        position: i,
        isUp: false,
        isHit: false
      });
    }
    setMoles(initialMoles);
    
    // Initialize audio
    if (typeof window !== 'undefined') {
      audioRefs.current.whack = new Audio('/game/whack-a-mole/whack.mp3');
      audioRefs.current.miss = new Audio('/game/whack-a-mole/miss.mp3');
      audioRefs.current.pop = new Audio('/game/whack-a-mole/pop.mp3');
      audioRefs.current.gameOver = new Audio('/game/whack-a-mole/game-over.mp3');
      audioRefs.current.background = new Audio('/game/whack-a-mole/background.mp3');
      
      if (audioRefs.current.background) {
        audioRefs.current.background.loop = true;
        audioRefs.current.background.volume = 0.3;
      }
      
      // Preload audio
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) audio.load();
      });
    }
    
    return () => {
      // Clean up audio on unmount
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      
      // Clear timers
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
    };
  }, []);
  
  // Play sound effect
  const playSound = (sound: string) => {
    if (isMuted) return;
    
    const audio = audioRefs.current[sound];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.error("Audio play error:", e));
    }
  };
  
  // Start background music
  const startBackgroundMusic = () => {
    if (isMuted) return;
    
    const audio = audioRefs.current.background;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.error("Audio play error:", e));
    }
  };
  
  // Stop background music
  const stopBackgroundMusic = () => {
    const audio = audioRefs.current.background;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };
  
  // Update AI difficulty based on player score
  useEffect(() => {
    // Make AI harder as player scores more
    setAiDifficulty(Math.min(0.95, 0.7 + (score * 0.01)));
  }, [score]);
  
  // Spawn a new mole at a random position
  const spawnMole = useCallback(() => {
    // Don't spawn if game is over
    if (!isPlaying || isGameOver) return;
    
    // Find open positions (no active mole)
    const availablePositions = moles
      .filter(mole => !mole.isUp)
      .map(mole => mole.position);
    
    // No available positions, try again later
    if (availablePositions.length === 0) {
      scheduleMoleSpawn();
      return;
    }
    
    // Pick a random position
    const position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    
    // Update moles state
    setMoles(prevMoles => 
      prevMoles.map(mole => 
        mole.position === position 
          ? { ...mole, isUp: true, isHit: false } 
          : mole
      )
    );
    
    // Increment active moles count
    setActiveMoles(prev => prev + 1);
    
    // Play pop sound
    playSound('pop');
    
    // Schedule mole to go back down
    const moleUpTime = Math.random() * (MOLE_UP_MAX_TIME - MOLE_UP_MIN_TIME) + MOLE_UP_MIN_TIME;
    setTimeout(() => {
      // Only retract if not already hit
      setMoles(prevMoles => 
        prevMoles.map(mole => 
          mole.position === position && mole.isUp && !mole.isHit
            ? { ...mole, isUp: false } 
            : mole
        )
      );
      
      // Decrement active moles count
      setActiveMoles(prev => Math.max(0, prev - 1));
      
      // If in AI mode, give AI a chance to hit this mole
      if (gameModeNum === 2 || gameModeNum === 1) {
        const aiHits = Math.random() < aiDifficulty;
        if (aiHits) {
          setAiScore(prev => prev + 1);
          playSound('whack');
        }
      }
      
    }, moleUpTime);
    
    // Schedule next mole spawn
    scheduleMoleSpawn();
  }, [isPlaying, isGameOver, moles, aiDifficulty, gameModeNum]);
  
  // Schedule next mole spawn
  const scheduleMoleSpawn = useCallback(() => {
    if (!isPlaying || isGameOver) return;
    
    const nextSpawnTime = Math.random() * (MOLE_SPAWN_INTERVAL_MAX - MOLE_SPAWN_INTERVAL_MIN) + MOLE_SPAWN_INTERVAL_MIN;
    
    moleTimerRef.current = setTimeout(() => {
      spawnMole();
    }, nextSpawnTime);
  }, [isPlaying, isGameOver, spawnMole]);
  
  // Handle mole click
  const handleMoleClick = (position: number) => {
    if (!isPlaying || isGameOver) return;
    
    const clickedMole = moles.find(mole => mole.position === position);
    
    if (clickedMole && clickedMole.isUp && !clickedMole.isHit) {
      // Hit successful
      playSound('whack');
      
      // Update mole state
      setMoles(prevMoles => 
        prevMoles.map(mole => 
          mole.position === position 
            ? { ...mole, isHit: true } 
            : mole
        )
      );
      
      // Increment score
      setScore(prev => prev + 1);
      
      // For online mode, send hit to opponent
      if (gameModeNum === 3 && socket) {
        socket.emit('make_move', {
          roomId,
          gameType: 'whack-a-mole',
          action: 'hit',
          score: score + 1
        });
      }
      
      // Remove mole after animation
      setTimeout(() => {
        setMoles(prevMoles => 
          prevMoles.map(mole => 
            mole.position === position 
              ? { ...mole, isUp: false, isHit: false } 
              : mole
          )
        );
        
        // Decrement active moles count
        setActiveMoles(prev => Math.max(0, prev - 1));
      }, 300);
    } else {
      // Miss
      playSound('miss');
    }
  };
  
  // Start the game
  const startGame = () => {
    if (isPlaying) return;
    
    // Reset game state
    setScore(0);
    setAiScore(0);
    setTimeLeft(GAME_DURATION);
    setIsGameOver(false);
    setIsWinner(false);
    setMessage("Whack those moles!");
    setGameStarted(true);
    setIsPlaying(true);
    
    // Reset all moles
    setMoles(prevMoles => 
      prevMoles.map(mole => ({
        ...mole,
        isUp: false,
        isHit: false
      }))
    );
    
    // Start background music
    startBackgroundMusic();
    
    // Start game timer
    gameTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Game over
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Schedule first mole spawn
    setTimeout(() => {
      spawnMole();
    }, 1000);
  };
  
  // Handle game over
  const handleGameOver = () => {
    // Stop timers
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
    
    // Stop background music
    stopBackgroundMusic();
    
    // Play game over sound
    playSound('gameOver');
    
    // Set game over state
    setIsPlaying(false);
    setIsGameOver(true);
    
    // Determine winner
    let result: 'won' | 'lost' | 'tie' = 'tie';
    
    if (gameModeNum === 1) {
      // Solo mode - Always win
      result = 'won';
      setIsWinner(true);
      setMessage(`Game over! Your score: ${score}`);
    } else if (gameModeNum === 2) {
      // 2 player mode - Compare scores
      if (score > aiScore) {
        result = 'won';
        setIsWinner(true);
        setMessage(`You win! ${score} - ${aiScore}`);
      } else if (score < aiScore) {
        result = 'lost';
        setIsWinner(false);
        setMessage(`You lose! ${score} - ${aiScore}`);
      } else {
        result = 'tie';
        setMessage(`It's a tie! ${score} - ${aiScore}`);
      }
    } else if (gameModeNum === 3) {
      // Online mode - Determined by main game component
      if (score > aiScore) {
        result = 'won';
        setIsWinner(true);
        setMessage(`You win! ${score} - ${aiScore}`);
      } else if (score < aiScore) {
        result = 'lost';
        setIsWinner(false);
        setMessage(`You lose! ${score} - ${aiScore}`);
      } else {
        result = 'tie';
        setMessage(`It's a tie! ${score} - ${aiScore}`);
      }
    }
    
    // Call the callback
    onGameOver(result, score);
  };
  
  // Socket event handling for online play
  useEffect(() => {
    if (!socket || gameModeNum !== 3) return;
    
    // Listen for opponent moves
    const moveHandler = (data: any) => {
      if (data.gameType !== 'whack-a-mole') return;
      
      if (data.action === 'hit') {
        // Opponent hit a mole - update their score
        setAiScore(data.score);
      }
    };
    
    socket.on('move_made', moveHandler);
    
    return () => {
      socket.off('move_made', moveHandler);
    };
  }, [socket, gameModeNum]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center w-full h-full relative">
      {/* Game overlay - shows at start and end of game */}
      {(!isPlaying || isGameOver) && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-70 z-10 flex flex-col items-center justify-center text-white"
          onClick={() => !isGameOver && startGame()}
        >
          <h2 className="text-3xl font-bold mb-4">{isGameOver ? (isWinner ? "You Won!" : "Game Over!") : "Whack-A-Mole"}</h2>
          <p className="text-xl mb-6">{message}</p>
          {isGameOver ? (
            <button
              className="px-6 py-3 bg-squid-pink text-white rounded-md shadow-lg hover:bg-opacity-80 transition"
              onClick={() => startGame()}
            >
              Play Again
            </button>
          ) : (
            <p className="text-sm opacity-70">Click anywhere to start</p>
          )}
        </div>
      )}
      
      {/* Game header */}
      <div className="w-full flex justify-between items-center mb-4 px-4">
        <div className="text-lg font-semibold">
          Time: <span className="text-squid-pink">{formatTime(timeLeft)}</span>
        </div>
        <div className="text-lg font-semibold">
          {gameModeNum === 1 ? (
            <span>Score: <span className="text-squid-pink">{score}</span></span>
          ) : (
            <div className="flex gap-4">
              <span>{player1}: <span className="text-squid-pink">{score}</span></span>
              <span>{player2}: <span className="text-blue-500">{aiScore}</span></span>
            </div>
          )}
        </div>
      </div>
      
      {/* Game grid */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-green-900 rounded-lg">
        {moles.map((mole) => (
          <div 
            key={mole.id}
            className="relative w-24 h-24 bg-green-800 rounded-full overflow-hidden cursor-pointer border-2 border-green-700"
            onClick={() => handleMoleClick(mole.position)}
          >
            {/* Mole hole */}
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full"></div>
            
            {/* Mole */}
            {mole.isUp && (
              <div 
                className={`absolute bottom-0 left-0 right-0 h-3/4 rounded-t-full transition-transform duration-100 ${
                  mole.isHit ? 'translate-y-full' : 'translate-y-0'
                }`}
              >
                <div className="absolute bottom-0 w-full h-full bg-brown-600 rounded-t-full">
                  {/* Mole face */}
                  <div className="absolute top-2 left-0 right-0 flex justify-center">
                    {/* Eyes */}
                    <div className="flex space-x-4">
                      <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                      </div>
                      <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Nose */}
                  <div className="absolute top-7 left-0 right-0 flex justify-center">
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                  </div>
                  
                  {/* Mouth */}
                  <div className="absolute top-10 left-0 right-0 flex justify-center">
                    <div className={`w-6 h-2 bg-black rounded-full ${mole.isHit ? 'h-1' : ''}`}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Instructions */}
      {isPlaying && (
        <div className="text-sm text-gray-500 mt-4">
          Click on the moles as they appear!
        </div>
      )}
    </div>
  );
};

export default WhackAMoleGame; 