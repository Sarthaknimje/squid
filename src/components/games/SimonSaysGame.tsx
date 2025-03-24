import { useEffect, useState, useRef } from 'react';
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
  isMuted
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
  
  // Simon sequence
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerSequence, setPlayerSequence] = useState<string[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [canPlayerClick, setCanPlayerClick] = useState(false);
  
  // Audio references
  const audioRefs = useRef<{[key: string]: HTMLAudioElement | null}>({});
  
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
  
  // Render the game
  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      {/* Game overlay - shows at start and end of game */}
      {(!isPlaying || isGameOver) && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-70 z-10 flex flex-col items-center justify-center text-white"
          onClick={() => !isGameOver && startGame()}
        >
          <h2 className="text-3xl font-bold mb-4">{isGameOver ? "Game Over!" : "Simon Says"}</h2>
          <p className="text-xl mb-6">{isGameOver ? `Your score: ${score}` : "Click anywhere to start"}</p>
          {isGameOver && (
            <button
              className="px-6 py-3 bg-squid-pink text-white rounded-md shadow-lg hover:bg-opacity-80 transition"
              onClick={() => startGame()}
            >
              Play Again
            </button>
          )}
        </div>
      )}
      
      {/* Game header */}
      <div className="w-full flex justify-between items-center mb-4 px-4">
        <div className="text-lg font-semibold">
          Level: <span className="text-squid-pink">{level}</span>
        </div>
        <div className="text-lg font-semibold">
          Score: <span className="text-squid-pink">{score}</span>
        </div>
      </div>
      
      {/* Game message */}
      {isPlaying && !isGameOver && (
        <div className="mb-6 text-xl font-semibold">{message}</div>
      )}
      
      {/* Simon says game board */}
      <div className="relative w-80 h-80 mb-8">
        {/* Green button (top left) */}
        <button
          className={`absolute top-0 left-0 w-36 h-36 rounded-tl-full ${activeColor === 'green' ? 'brightness-150' : ''}`}
          style={{ backgroundColor: COLOR_MAP.green, border: '2px solid black' }}
          onClick={() => handleColorClick('green')}
          disabled={!canPlayerClick || isGameOver}
        />
        
        {/* Red button (top right) */}
        <button
          className={`absolute top-0 right-0 w-36 h-36 rounded-tr-full ${activeColor === 'red' ? 'brightness-150' : ''}`}
          style={{ backgroundColor: COLOR_MAP.red, border: '2px solid black' }}
          onClick={() => handleColorClick('red')}
          disabled={!canPlayerClick || isGameOver}
        />
        
        {/* Yellow button (bottom left) */}
        <button
          className={`absolute bottom-0 left-0 w-36 h-36 rounded-bl-full ${activeColor === 'yellow' ? 'brightness-150' : ''}`}
          style={{ backgroundColor: COLOR_MAP.yellow, border: '2px solid black' }}
          onClick={() => handleColorClick('yellow')}
          disabled={!canPlayerClick || isGameOver}
        />
        
        {/* Blue button (bottom right) */}
        <button
          className={`absolute bottom-0 right-0 w-36 h-36 rounded-br-full ${activeColor === 'blue' ? 'brightness-150' : ''}`}
          style={{ backgroundColor: COLOR_MAP.blue, border: '2px solid black' }}
          onClick={() => handleColorClick('blue')}
          disabled={!canPlayerClick || isGameOver}
        />
        
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center">
          <span className="text-white text-2xl font-bold">
            {isPlaying && !isGameOver ? (canPlayerClick ? "GO" : "WAIT") : "SIMON"}
          </span>
        </div>
      </div>
      
      {/* Instructions */}
      {isPlaying && canPlayerClick && (
        <div className="text-sm text-gray-500 mt-4">
          Repeat the sequence by clicking the colored buttons
        </div>
      )}
    </div>
  );
};

export default SimonSaysGame; 