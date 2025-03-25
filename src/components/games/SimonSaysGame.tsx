import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { FaInfoCircle } from 'react-icons/fa';

type Props = {
  gameMode: number | string;
  player1?: string;
  player2?: string;
  roomId?: string;
  socket: Socket | null;
  onGameOver: (result: 'won' | 'lost' | 'tie', score: number) => void;
  isMuted: boolean;
  betAmount?: string;
};

// Define the colors for Simon Says
const COLORS = ['green', 'red', 'yellow', 'blue'];
const COLOR_MAP = {
  green: '#1b5e20',
  red: '#b71c1c',
  yellow: '#f9a825',
  blue: '#0d47a1'
};

const SimonSaysGame = ({
  gameMode,
  player1 = "Player 1",
  player2 = "Player 2",
  roomId = "",
  socket,
  onGameOver,
  isMuted,
  betAmount = "0"
}: Props) => {
  // Convert gameMode to numeric format for consistency
  const gameModeNum = typeof gameMode === 'string'
    ? gameMode === 'solo' ? 1 : gameMode === 'local' ? 2 : gameMode === 'online' ? 3 : 4
    : gameMode;

  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Click to start");
  const [isWinner, setIsWinner] = useState(false);
  const [showEscrowInfo, setShowEscrowInfo] = useState(false);
  
  // Simon sequence
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerSequence, setPlayerSequence] = useState<string[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [canPlayerClick, setCanPlayerClick] = useState(false);
  
  // Audio references
  const audioRefs = useRef<{[key: string]: HTMLAudioElement | null}>({});

  // Escrow contract address
  const escrowAddress = roomId ? `0xESCROW${roomId.padStart(58, '0')}` : '';
  
  // Start game automatically on mount for online and tournament modes
  useEffect(() => {
    if (gameModeNum === 3 || gameModeNum === 4) {
      console.log("Auto-starting game for online/tournament mode");
      setTimeout(() => {
        startGame();
      }, 1000);
    }
    
    // Clean up on unmount
    return () => {
      // Stop any audio playing
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
  }, [gameModeNum]);
  
  // Initialize audio elements
  useEffect(() => {
    // Create audio elements for each color
    COLORS.forEach(color => {
      try {
        const audio = new Audio(`/game/simon-says/${color}.mp3`);
        audioRefs.current[color] = audio;
      } catch (error) {
        console.error(`Error creating audio for ${color}:`, error);
      }
    });
    
    // Create success and error sounds
    try {
      audioRefs.current.success = new Audio('/game/simon-says/success.mp3');
      audioRefs.current.error = new Audio('/game/simon-says/error.mp3');
    } catch (error) {
      console.error('Error creating audio for success/error:', error);
    }
    
    return () => {
      // Clean up audio elements
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
  }, []);
  
  // Play a sound
  const playSound = (color: string) => {
    if (isMuted) return;
    
    try {
      const audio = audioRefs.current[color];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn(`Error playing ${color} sound:`, e));
      }
    } catch (error) {
      console.warn(`Error playing ${color} sound:`, error);
    }
  };
  
  // Flash a color
  const flashColor = (color: string) => {
    setActiveColor(color);
    playSound(color);
    
    setTimeout(() => {
      setActiveColor(null);
    }, 300);
  };
  
  // Start the game
  const startGame = () => {
    if (isPlaying) return;
    
    console.log("Starting Simon Says game");
    setSequence([]);
    setPlayerSequence([]);
    setLevel(1);
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    setMessage("Watch carefully");
    
    // Generate first color after a delay
    setTimeout(() => {
      generateNextSequence();
    }, 1500);
  };
  
  // Generate the next color in the sequence
  const generateNextSequence = () => {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newSequence = [...sequence, randomColor];
    setSequence(newSequence);
    
    // Start displaying sequence after a short delay
    setTimeout(() => {
      playSequence(newSequence);
    }, 1000);
  };
  
  // Play the current sequence
  const playSequence = (sequenceToPlay: string[]) => {
    setCanPlayerClick(false);
    setMessage("Watch the sequence");
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < sequenceToPlay.length) {
        flashColor(sequenceToPlay[i]);
        i++;
      } else {
        clearInterval(interval);
        setCanPlayerClick(true);
        setMessage("Your turn! Repeat the sequence");
      }
    }, 800);
  };
  
  // Handle player clicking a color
  const handleColorClick = (color: string) => {
    if (!canPlayerClick || isGameOver) return;
    
    flashColor(color);
    const newPlayerSequence = [...playerSequence, color];
    setPlayerSequence(newPlayerSequence);
    
    // Check if the player's choice matches the sequence so far
    if (color !== sequence[playerSequence.length]) {
      // Wrong color - game over
      playSound('error');
      setCanPlayerClick(false);
      setIsGameOver(true);
      setMessage(`Game over! Your score: ${score}`);
      onGameOver('lost', score);
      return;
    }
    
    // Check if player completed the sequence
    if (newPlayerSequence.length === sequence.length) {
      // Success!
      playSound('success');
      setPlayerSequence([]);
      setCanPlayerClick(false);
      
      // Increase score and level
      const newScore = score + sequence.length;
      setScore(newScore);
      setLevel(level + 1);
      setMessage(`Level ${level + 1}!`);
      
      // Generate next sequence after a delay
      setTimeout(() => {
        generateNextSequence();
      }, 1500);
    }
  };
  
  // When the game ends
  const endGame = (won: boolean) => {
    setIsPlaying(false);
    setIsGameOver(true);
    setCanPlayerClick(false);
    setIsWinner(won);
    
    if (won) {
      setMessage(`You won! Level ${level} completed`);
      
      // Play success sound
      if (!isMuted && audioRefs.current.success) {
        audioRefs.current.success.play().catch(console.error);
      }

      // For multiplayer, notify server about win
      if (socket && (gameModeNum === 3 || gameModeNum === 4)) {
        socket.emit('game_result', {
          roomId,
          player: player1,
          result: 'won',
          score: level
        });
      }
      
      // Call the onGameOver callback
      if (onGameOver) {
        onGameOver('won', level);
      }
    } else {
      setMessage("Game over!");
      
      // Play error sound
      if (!isMuted && audioRefs.current.error) {
        audioRefs.current.error.play().catch(console.error);
      }
      
      // For multiplayer, notify server about loss
      if (socket && (gameModeNum === 3 || gameModeNum === 4)) {
        socket.emit('game_result', {
          roomId,
          player: player1,
          result: 'lost',
          score: level - 1
        });
      }
      
      // Call the onGameOver callback
      if (onGameOver) {
        onGameOver('lost', level - 1);
      }
    }
  };
  
  // Render the escrow information overlay
  const renderEscrowInfo = () => {
    if (!showEscrowInfo || !betAmount || parseFloat(betAmount) <= 0) return null;
    
    return (
      <div className="absolute top-4 right-4 bg-gray-800 p-3 rounded-lg shadow-lg z-10 max-w-xs">
        <h4 className="text-sm font-bold mb-2 text-white">Escrow Contract</h4>
        <p className="text-xs text-yellow-300 font-mono break-all mb-2">{escrowAddress}</p>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Bet Amount:</span>
          <span className="text-green-400">{betAmount} SQUID</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Winner Gets:</span>
          <span className="text-green-400">{parseFloat(betAmount) * 2} SQUID</span>
        </div>
        <button 
          className="mt-2 w-full text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 rounded"
          onClick={() => setShowEscrowInfo(false)}
        >
          Close
        </button>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 relative">
      {/* Game header */}
      <div className="w-full flex justify-between items-center p-4">
        <div>
          <h2 className="text-xl font-bold">Simon Says</h2>
          <p className="text-gray-400 text-sm">Level: {level}</p>
        </div>
        
        <div className="text-right">
          <p className="text-xl font-bold">Score: {score}</p>
          {betAmount && parseFloat(betAmount) > 0 && (
            <button 
              onClick={() => setShowEscrowInfo(!showEscrowInfo)}
              className="text-xs flex items-center text-blue-400 hover:text-blue-300"
            >
              <FaInfoCircle className="mr-1" /> Escrow Contract
            </button>
          )}
        </div>
      </div>

      {/* Players */}
      {(gameModeNum === 2 || gameModeNum === 3 || gameModeNum === 4) && (
        <div className="w-full flex justify-center items-center gap-8 mb-4">
          <div className="text-center">
            <span className="text-sm font-bold">{player1}</span>
            <span className="text-xs block text-blue-400">You</span>
          </div>
          
          {player2 && (
            <div className="text-center">
              <span className="text-sm font-bold">{player2}</span>
              <span className="text-xs block text-red-400">Opponent</span>
            </div>
          )}
        </div>
      )}
      
      {/* Game message */}
      <div className="mb-6">
        <p className="text-lg font-bold text-white">{message}</p>
      </div>
      
      {/* Simon board */}
      <div className="grid grid-cols-2 gap-4 w-64 h-64">
        {COLORS.map((color) => (
          <button
            key={color}
            className="rounded-lg shadow-lg transform hover:scale-105 transition-all"
            style={{
              backgroundColor: activeColor === color 
                ? 'white' 
                : COLOR_MAP[color as keyof typeof COLOR_MAP],
              opacity: !isPlaying || !canPlayerClick ? 0.7 : 1,
              cursor: !isPlaying || !canPlayerClick ? 'default' : 'pointer'
            }}
            onClick={() => canPlayerClick && handleColorClick(color)}
            disabled={!canPlayerClick}
          />
        ))}
      </div>
      
      {/* Game controls */}
      {!isPlaying && !isGameOver && (
        <button
          className="mt-8 bg-squid-pink hover:bg-opacity-90 text-white px-6 py-2 rounded-md"
          onClick={startGame}
        >
          Start Game
        </button>
      )}
      
      {isGameOver && (
        <div className="mt-8 flex flex-col items-center">
          <p className={`text-xl font-bold ${isWinner ? 'text-green-500' : 'text-red-500'} mb-4`}>
            {isWinner ? 'You Won!' : 'Game Over!'}
          </p>
          <p className="text-gray-400 mb-4">
            {isWinner 
              ? `Congratulations! You reached level ${level}` 
              : `You reached level ${level - 1}`}
          </p>
          <button
            className="bg-squid-pink hover:bg-opacity-90 text-white px-6 py-2 rounded-md"
            onClick={startGame}
          >
            Play Again
          </button>
        </div>
      )}
      
      {/* Escrow info overlay */}
      {renderEscrowInfo()}
    </div>
  );
};

export default SimonSaysGame; 