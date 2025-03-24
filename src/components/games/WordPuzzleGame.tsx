import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

type Props = {
  gameMode: number | string;
  player1?: string;
  player2?: string;
  roomId?: string;
  socket: Socket | null;
  onGameOver: (result: 'won' | 'lost', score: number) => void;
  isMuted: boolean;
};

const WordPuzzleGame = ({ 
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
  
  // Game states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [message, setMessage] = useState("Click to start");
  const [timeLeft, setTimeLeft] = useState(60);
  const [isWinner, setIsWinner] = useState(false);
  const [score, setScore] = useState(0);
  
  // Word puzzle specific states
  const [targetWord, setTargetWord] = useState("");
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [incorrectGuesses, setIncorrectGuesses] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentGuess, setCurrentGuess] = useState("");
  const [pastGuesses, setPastGuesses] = useState<string[]>([]);
  const [letterStatus, setLetterStatus] = useState<Record<string, 'correct' | 'present' | 'absent' | 'unused'>>({});
  
  // Dictionary of words
  const wordList = [
    "APPLE", "BEACH", "CRANE", "DRINK", "EARTH", 
    "FLAME", "GHOST", "HEART", "INPUT", "JOKER",
    "KNIFE", "LEMON", "MUSIC", "NIGHT", "OCEAN",
    "PLANT", "QUEEN", "RADAR", "SPACE", "TABLE"
  ];
  
  // Maximum allowed guesses
  const MAX_GUESSES = 6;
  
  // Audio elements
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const failSoundRef = useRef<HTMLAudioElement | null>(null);
  const typingSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize the game
  useEffect(() => {
    // Setup audio
    try {
      successSoundRef.current = new Audio('/sounds/success.mp3');
      failSoundRef.current = new Audio('/sounds/alert.mp3');
      typingSoundRef.current = new Audio('/sounds/click.mp3');
      
      // Preload audio
      successSoundRef.current.preload = 'auto';
      failSoundRef.current.preload = 'auto';
      typingSoundRef.current.preload = 'auto';
    } catch (error) {
      console.error("Error setting up audio:", error);
    }
    
    // Add keyboard listener
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
    };
  }, []);
  
  // Handle online game events
  useEffect(() => {
    if (!socket || gameModeNum !== 3) return;
    
    const handleOpponentGuess = (data: { guess: string, player: string }) => {
      if (data.player !== player1) {
        // Handle opponent's guess
        console.log(`Opponent guessed: ${data.guess}`);
      }
    };
    
    const handleGameOver = (data: { winner: string, word: string }) => {
      if (data.winner === player1) {
        endGame('win', `You won! The word was ${data.word}`);
      } else {
        endGame('lose', `You lost! The word was ${data.word}`);
      }
    };
    
    socket.on('opponentGuess', handleOpponentGuess);
    socket.on('gameOver', handleGameOver);
    
    return () => {
      socket.off('opponentGuess', handleOpponentGuess);
      socket.off('gameOver', handleGameOver);
    };
  }, [socket, gameModeNum, player1]);
  
  // Update letter status when guesses change
  useEffect(() => {
    if (!targetWord) return;
    
    const newLetterStatus: Record<string, 'correct' | 'present' | 'absent' | 'unused'> = {};
    
    // Initialize all letters as unused
    for (let i = 65; i <= 90; i++) {
      newLetterStatus[String.fromCharCode(i)] = 'unused';
    }
    
    // Update based on past guesses
    pastGuesses.forEach(guess => {
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        if (targetWord[i] === letter) {
          newLetterStatus[letter] = 'correct';
        } else if (targetWord.includes(letter) && newLetterStatus[letter] !== 'correct') {
          newLetterStatus[letter] = 'present';
        } else if (newLetterStatus[letter] === 'unused') {
          newLetterStatus[letter] = 'absent';
        }
      }
    });
    
    setLetterStatus(newLetterStatus);
  }, [pastGuesses, targetWord]);
  
  // Handle keyboard input
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isPlaying || isGameOver) return;
    
    if (e.key === 'Enter') {
      submitGuess();
    } else if (e.key === 'Backspace') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < 5) {
      setCurrentGuess(prev => (prev + e.key).toUpperCase());
      
      // Play typing sound
      if (!isMuted && typingSoundRef.current) {
        typingSoundRef.current.currentTime = 0;
        typingSoundRef.current.play().catch(err => console.error("Error playing audio:", err));
      }
    }
  }, [isPlaying, isGameOver, currentGuess, isMuted]);
  
  // Submit a guess
  const submitGuess = () => {
    if (currentGuess.length !== 5) return;
    
    const newPastGuesses = [...pastGuesses, currentGuess];
    setPastGuesses(newPastGuesses);
    
    // Check if the guess is correct
    if (currentGuess === targetWord) {
      // Correct guess
      if (!isMuted && successSoundRef.current) {
        successSoundRef.current.play().catch(err => console.error("Error playing audio:", err));
      }
      
      const timeBonus = timeLeft * 10;
      const guessBonus = (MAX_GUESSES - newPastGuesses.length) * 100;
      const newScore = 1000 + timeBonus + guessBonus;
      
      setScore(newScore);
      endGame('win', `You guessed the word! It was ${targetWord}`);
      
      // Send game result to server in online mode
      if (socket && gameModeNum === 3) {
        socket.emit('gameResult', {
          room: roomId,
          winner: player1,
          word: targetWord
        });
      }
    } else {
      // Incorrect guess
      if (newPastGuesses.length >= MAX_GUESSES) {
        // Used all guesses
        if (!isMuted && failSoundRef.current) {
          failSoundRef.current.play().catch(err => console.error("Error playing audio:", err));
        }
        
        endGame('lose', `Out of guesses! The word was ${targetWord}`);
      } else {
        // Still have guesses left
        setCurrentRow(currentRow + 1);
        setCurrentGuess("");
        
        // Send guess to server in online mode
        if (socket && gameModeNum === 3) {
          socket.emit('playerGuess', {
            room: roomId,
            player: player1,
            guess: currentGuess
          });
        }
      }
    }
  };
  
  // Start the game
  const startGame = () => {
    // Select a random word
    const randomIndex = Math.floor(Math.random() * wordList.length);
    const selectedWord = wordList[randomIndex];
    setTargetWord(selectedWord);
    
    // Initialize/reset game state
    setIsPlaying(true);
    setIsGameOver(false);
    setMessage("Guess the 5-letter word");
    setTimeLeft(60);
    setCurrentRow(0);
    setCurrentGuess("");
    setPastGuesses([]);
    
    // Start game timer
    gameTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          endGame('lose', `Time's up! The word was ${selectedWord}`);
          return 0;
        }
        return newTime;
      });
    }, 1000);
    
    console.log("Game started with target word:", selectedWord);
  };
  
  // End the game
  const endGame = (result: 'win' | 'lose', endMessage: string) => {
    setIsPlaying(false);
    setIsGameOver(true);
    setMessage(endMessage);
    setIsWinner(result === 'win');
    
    // Clear timer
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    // Report game result to parent component
    onGameOver(result === 'win' ? 'won' : 'lost', score);
  };
  
  // Reset game
  const resetGame = () => {
    setIsPlaying(false);
    setIsGameOver(false);
    setMessage("Click to start");
    setTimeLeft(60);
    setScore(0);
    setTargetWord("");
    setCurrentRow(0);
    setCurrentGuess("");
    setPastGuesses([]);
  };
  
  // Handle game container click
  const handleClick = () => {
    if (!isPlaying && !isGameOver) {
      startGame();
    } else if (isGameOver) {
      resetGame();
    }
  };
  
  // Get the color for a letter in a guessed word
  const getLetterColor = (letter: string, index: number, guess: string) => {
    if (!targetWord) return "bg-gray-300";
    
    if (targetWord[index] === letter) {
      return "bg-green-500 text-white";
    } else if (targetWord.includes(letter)) {
      return "bg-yellow-500 text-white";
    } else {
      return "bg-gray-700 text-white";
    }
  };
  
  // Render the game board
  return (
    <div 
      className="w-full h-full flex flex-col bg-gray-100 p-4 select-none"
      onClick={handleClick}
    >
      {/* Game Header */}
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow">
        <div className="font-bold text-lg">Word Puzzle</div>
        <div className="text-gray-600">Time: {timeLeft}s</div>
      </div>
      
      {/* Game Message */}
      <div className="text-center font-semibold text-xl mb-4">{message}</div>
      
      {/* Word Grid */}
      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        <div className="grid grid-rows-6 gap-2 mb-4">
          {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-2">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const isPastGuess = rowIndex < pastGuesses.length;
                const isCurrentRow = rowIndex === currentRow;
                const letter = isPastGuess 
                  ? pastGuesses[rowIndex][colIndex] 
                  : isCurrentRow && colIndex < currentGuess.length 
                    ? currentGuess[colIndex] 
                    : "";
                
                const cellClass = isPastGuess
                  ? getLetterColor(letter, colIndex, pastGuesses[rowIndex])
                  : "bg-white border-2 border-gray-300";
                
                return (
                  <div 
                    key={colIndex}
                    className={`w-12 h-12 flex items-center justify-center font-bold text-xl rounded ${cellClass}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Keyboard */}
      {isPlaying && !isGameOver && (
        <div className="flex flex-col gap-2 items-center">
          {[
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
          ].map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map(key => {
                const isSpecialKey = key === 'ENTER' || key === '⌫';
                const keyStatus = !isSpecialKey ? letterStatus[key] : 'unused';
                
                let keyClassName = "flex-1 h-14 rounded flex items-center justify-center font-semibold";
                
                if (isSpecialKey) {
                  keyClassName += " bg-gray-300 text-gray-800 px-2 min-w-[70px]";
                } else {
                  switch (keyStatus) {
                    case 'correct':
                      keyClassName += " bg-green-500 text-white";
                      break;
                    case 'present':
                      keyClassName += " bg-yellow-500 text-white";
                      break;
                    case 'absent':
                      keyClassName += " bg-gray-700 text-white";
                      break;
                    default:
                      keyClassName += " bg-gray-300 text-gray-800";
                  }
                }
                
                return (
                  <button
                    key={key}
                    className={keyClassName}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (key === 'ENTER') {
                        submitGuess();
                      } else if (key === '⌫') {
                        setCurrentGuess(prev => prev.slice(0, -1));
                      } else if (currentGuess.length < 5) {
                        setCurrentGuess(prev => prev + key);
                        // Play typing sound
                        if (!isMuted && typingSoundRef.current) {
                          typingSoundRef.current.currentTime = 0;
                          typingSoundRef.current.play().catch(err => console.error("Error playing audio:", err));
                        }
                      }
                    }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      
      {/* Start or Game Over Screen */}
      {(!isPlaying || isGameOver) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4">
              {isGameOver ? (isWinner ? "You Won!" : "Game Over") : "Word Puzzle"}
            </h2>
            
            {isGameOver && (
              <div className="mb-4">
                <p className="text-xl">{message}</p>
                <p className="text-lg mt-2">Score: {score}</p>
              </div>
            )}
            
            {!isPlaying && !isGameOver && (
              <div className="mb-4">
                <p>Guess the 5-letter word in 6 tries or less.</p>
                <ul className="text-left mt-2">
                  <li>Green = correct letter in correct position</li>
                  <li>Yellow = correct letter in wrong position</li>
                  <li>Gray = letter not in the word</li>
                </ul>
              </div>
            )}
            
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              {isGameOver ? "Play Again" : "Start Game"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordPuzzleGame; 