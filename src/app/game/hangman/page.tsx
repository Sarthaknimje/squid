"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaUserFriends, FaRobot, FaShareAlt, FaHome, FaTrophy, FaCoins, FaSpinner } from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import { useAptosWallet } from "@/contexts/AptosWalletContext";
import { usePlayerProgress } from "@/contexts/PlayerProgressContext";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { payTournamentEntryFee, payTournamentWinnings } from '@/lib/petraWalletService';

// Game modes
enum GameMode {
  NOT_SELECTED,
  COMPUTER,
  LOCAL_MULTIPLAYER,
  ONLINE_MULTIPLAYER,
  ROOM
}

// Game difficulty levels
enum Difficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard"
}

// Game status states
enum GameStatus {
  NOT_STARTED,
  PLAYING,
  WON,
  LOST,
  TIE
}

// Word categories
const CATEGORIES = {
  animals: ["elephant", "giraffe", "penguin", "dolphin", "kangaroo", "leopard", "squirrel", "octopus", "crocodile"],
  countries: ["australia", "brazil", "canada", "denmark", "ethiopia", "france", "germany", "hungary", "italy"],
  fruits: ["apple", "banana", "cherry", "dragonfruit", "elderberry", "fig", "grapefruit", "honeydew", "kiwi"],
  technology: ["algorithm", "blockchain", "computer", "database", "encryption", "firewall", "javascript", "network"],
  sports: ["baseball", "basketball", "cricket", "football", "golf", "hockey", "rugby", "soccer", "tennis"],
};

export default function HangmanPage() {
  const router = useRouter();
  const { agent } = useAIAgent();
  const { wallet } = useAptosWallet();
  const { updateGameResult, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();

  // Game state
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.NOT_SELECTED);
  const [status, setStatus] = useState<GameStatus>(GameStatus.NOT_STARTED);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [word, setWord] = useState<string>("");
  const [hiddenWord, setHiddenWord] = useState<string[]>([]);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [incorrectGuesses, setIncorrectGuesses] = useState<number>(0);
  const [currentPlayer, setCurrentPlayer] = useState<number>(1);
  const [category, setCategory] = useState<string>("animals");
  
  // UI states
  const [showEntryForm, setShowEntryForm] = useState<boolean>(false);
  const [showRoomCreation, setShowRoomCreation] = useState<boolean>(false);
  const [showRoomJoin, setShowRoomJoin] = useState<boolean>(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>("");
  const [player1, setPlayer1] = useState<{name: string, score: number}>({name: "", score: 0});
  const [player2, setPlayer2] = useState<{name: string, score: number}>({name: "", score: 0});
  const [betAmount, setBetAmount] = useState<string>("0.2");
  const [tournamentMode, setTournamentMode] = useState<boolean>(false);
  const [showTournamentForm, setShowTournamentForm] = useState<boolean>(false);
  const [transactionPending, setTransactionPending] = useState<boolean>(false);
  const [showGameBoard, setShowGameBoard] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  
  const socketRef = useRef<Socket | null>(null);

  // Max incorrect guesses based on difficulty
  const MAX_INCORRECT_GUESSES = {
    [Difficulty.EASY]: 8,
    [Difficulty.MEDIUM]: 6,
    [Difficulty.HARD]: 4
  };

  // Initialize game
  useEffect(() => {
    trackGamePlayed('hangman');
    
    // Cleanup socket connection when unmounting
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [trackGamePlayed]);

  // Initialize socket connection for online play
  const initializeSocket = () => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3001", {
        transports: ["websocket"],
      });
      
      socketRef.current.on("connect", () => {
        console.log("Connected to socket server");
      });
      
      socketRef.current.on("room_created", (data: {roomId: string}) => {
        setRoomId(data.roomId);
        setIsWaitingForOpponent(true);
        setCurrentMessage(`Room created! Share this code with your friend: ${data.roomId}`);
      });
      
      socketRef.current.on("player_joined", (data: {playerName: string}) => {
        setPlayer2({...player2, name: data.playerName});
        setIsWaitingForOpponent(false);
        setShowGameBoard(true);
        startGame();
        setCurrentMessage(`${data.playerName} has joined the game!`);
      });
      
      socketRef.current.on("letter_guessed", (data: {letter: string, playerId: number}) => {
        handleLetterGuess(data.letter, false);
        setCurrentPlayer(1); // Switch back to player 1 (you)
      });
      
      socketRef.current.on("game_reset", (data: {word: string, category: string}) => {
        resetGame(data.word, data.category);
      });
      
      socketRef.current.on("opponent_disconnected", () => {
        setCurrentMessage("Your opponent has disconnected.");
        setStatus(GameStatus.WON);
      });
      
      socketRef.current.on("tournament_match_found", (data: { roomId: string, playerName: string }) => {
        setRoomId(data.roomId);
        setPlayer2(data.playerName);
        setIsWaitingForOpponent(false);
        setShowGameBoard(true);
        setStatus(GameStatus.PLAYING);
        setCurrentMessage(`Tournament match found! Playing against ${data.playerName}`);
      });
    }
  };

  // Start new game
  const startGame = (providedWord?: string, providedCategory?: string) => {
    // Reset state
    setGuessedLetters(new Set());
    setIncorrectGuesses(0);
    setStatus(GameStatus.PLAYING);
    
    // Select word and category
    let selectedCategory = providedCategory || category;
    let selectedWord = providedWord;
    
    if (!selectedWord) {
      const categoryWords = CATEGORIES[selectedCategory as keyof typeof CATEGORIES];
      let wordPool = categoryWords;
      
      // Filter words based on difficulty
      if (difficulty === Difficulty.EASY) {
        wordPool = categoryWords.filter(w => w.length <= 6);
      } else if (difficulty === Difficulty.HARD) {
        wordPool = categoryWords.filter(w => w.length >= 8);
      }
      
      // If no words match difficulty criteria, use all words
      if (wordPool.length === 0) wordPool = categoryWords;
      
      // Select random word
      selectedWord = wordPool[Math.floor(Math.random() * wordPool.length)];
    }
    
    // Set word and hidden representation
    setWord(selectedWord);
    setHiddenWord(Array(selectedWord.length).fill("_"));
  };

  // Handle letter guess
  const handleLetterGuess = (letter: string, emitGuess = true) => {
    if (status !== GameStatus.PLAYING) return;
    
    // If letter already guessed, do nothing
    if (guessedLetters.has(letter)) return;
    
    // Add to guessed letters
    const newGuessedLetters = new Set(guessedLetters);
    newGuessedLetters.add(letter);
    setGuessedLetters(newGuessedLetters);
    
    // Check if letter is in word
    if (word.includes(letter)) {
      // Update hidden word
      const newHiddenWord = [...hiddenWord];
      for (let i = 0; i < word.length; i++) {
        if (word[i] === letter) {
          newHiddenWord[i] = letter;
        }
      }
      setHiddenWord(newHiddenWord);
      
      // Check for win
      if (!newHiddenWord.includes("_")) {
        setStatus(GameStatus.WON);
        
        if (gameMode === GameMode.COMPUTER) {
          updateGameResult('hangman', 1000, true);
          addPoints(1000);
        } else if (tournamentMode) {
          processTournamentWin();
        }
      }
    } else {
      // Increment incorrect guesses
      const newIncorrectGuesses = incorrectGuesses + 1;
      setIncorrectGuesses(newIncorrectGuesses);
      
      // Check for loss
      if (newIncorrectGuesses >= MAX_INCORRECT_GUESSES[difficulty]) {
        setStatus(GameStatus.LOST);
        
        if (gameMode === GameMode.COMPUTER) {
          updateGameResult('hangman', 200, false);
        }
      }
    }
    
    // For multiplayer modes, emit guess to other player
    if (emitGuess && (gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && socketRef.current) {
      socketRef.current.emit("make_move", {
        roomId,
        letter,
        playerId: 1,
        gameType: "hangman"
      });
      
      // Switch turns
      if (gameMode === GameMode.LOCAL_MULTIPLAYER || gameMode === GameMode.ROOM) {
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      }
    }
    
    // For local multiplayer, switch turns
    if (gameMode === GameMode.LOCAL_MULTIPLAYER && status === GameStatus.PLAYING) {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  // Make AI move
  const makeComputerMove = () => {
    console.log("AI is making a move...");
    
    // Get available positions
    const availablePositions = board
      .map((cell, index) => (cell === null ? index : null))
      .filter((position) => position !== null);
    
    if (availablePositions.length === 0) return;
    
    let position;
    
    // Check if AI can win
    for (const pos of availablePositions) {
      const boardCopy = [...board];
      boardCopy[pos] = "O";
      if (checkGameStatus(boardCopy) === "O") {
        position = pos;
        break;
      }
    }
    
    // If no winning move, check if need to block player
    if (position === undefined) {
      for (const pos of availablePositions) {
        const boardCopy = [...board];
        boardCopy[pos] = "X";
        if (checkGameStatus(boardCopy) === "X") {
          position = pos;
          break;
        }
      }
    }
    
    // If no winning or blocking move, take center if available
    if (position === undefined && board[4] === null) {
      position = 4;
    }
    
    // If center not available, take a corner if available
    if (position === undefined) {
      const corners = [0, 2, 6, 8].filter(pos => board[pos] === null);
      if (corners.length > 0) {
        position = corners[Math.floor(Math.random() * corners.length)];
      }
    }
    
    // If no strategic move found, take any available position
    if (position === undefined && availablePositions.length > 0) {
      position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    }
    
    // Make sure we have a valid position
    if (position === undefined || board[position] !== null) {
      console.error("AI tried to make an invalid move!");
      return;
    }
    
    // Make the AI move
    const newBoard = [...board];
    newBoard[position] = "O";
    setBoard(newBoard);
    
    // Check for a win or draw after AI move
    const result = checkGameStatus(newBoard);
    if (result) {
      handleGameOver(result, newBoard);
      return;
    }
    
    // Switch back to player's turn
    setIsXNext(true);
  };

  // Process tournament win
  const processTournamentWin = async () => {
    try {
      setTransactionPending(true);
      setCurrentMessage("Processing your winnings...");
      
      // Calculate winnings: 90% of both players' bets (10% platform fee)
      const betAmountNumber = parseFloat(betAmount);
      const winnings = betAmountNumber * 2 * 0.9; // 90% of the total pot
      
      // TODO: Implement actual transaction using wallet.signAndSubmitTransaction
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setTransactionPending(false);
      setCurrentMessage(`Congratulations! You won ${winnings.toFixed(2)} APTOS!`);
      
      // Update player progress
      addPoints(1000);
      unlockAchievement('tournament_win', 'hangman');
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionPending(false);
      setCurrentMessage("Failed to process winnings. Please contact support.");
    }
  };

  // Reset the game
  const resetGame = (newWord?: string, newCategory?: string) => {
    startGame(newWord, newCategory);
    
    // Reset in online mode
    if ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && socketRef.current) {
      socketRef.current.emit("reset_game", { 
        roomId,
        word: newWord || word,
        category: newCategory || category,
        gameType: "hangman"
      });
    }
  };

  // Handle game mode selection
  const selectGameMode = (mode: GameMode) => {
    setGameMode(mode);
    
    if (mode === GameMode.COMPUTER) {
      setShowEntryForm(true);
    } else if (mode === GameMode.LOCAL_MULTIPLAYER) {
      setShowEntryForm(true);
    } else if (mode === GameMode.ONLINE_MULTIPLAYER) {
      if (!wallet.connected) {
        setCurrentMessage("Please connect your wallet to play online.");
        return;
      }
      setShowTournamentForm(true);
    } else if (mode === GameMode.ROOM) {
      if (!wallet.connected) {
        setCurrentMessage("Please connect your wallet to create or join a room.");
        return;
      }
      setShowRoomCreation(true);
    }
  };

  // Handle player form submit
  const handlePlayerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const player1Name = form.player1?.value || "Player 1";
    let player2Name = form.player2?.value;
    const selectedDifficulty = form.difficulty?.value as Difficulty || Difficulty.MEDIUM;
    const selectedCategory = form.category?.value || "animals";
    
    setDifficulty(selectedDifficulty);
    setCategory(selectedCategory);
    
    if (gameMode === GameMode.COMPUTER) {
      player2Name = "AI Opponent";
      setPlayer1({name: player1Name, score: 0});
      setPlayer2({name: player2Name, score: 0});
    } else {
      setPlayer1({name: player1Name, score: 0});
      setPlayer2({name: player2Name || "Player 2", score: 0});
    }
    
    setShowEntryForm(false);
    setShowGameBoard(true);
    startGame();
  };

  // Go back to mode selection
  const goBack = () => {
    setGameMode(GameMode.NOT_SELECTED);
    setShowEntryForm(false);
    setShowRoomCreation(false);
    setShowRoomJoin(false);
    setShowTournamentForm(false);
    setShowGameBoard(false);
    setStatus(GameStatus.NOT_STARTED);
    setIsWaitingForOpponent(false);
    setTournamentMode(false);
    
    // Disconnect from socket if connected
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // Render hangman figure
  const renderHangman = () => {
    return (
      <div className="w-48 h-48 mx-auto mb-6">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Gallows */}
          <line x1="10" y1="95" x2="90" y2="95" stroke="white" strokeWidth="2" />
          <line x1="30" y1="95" x2="30" y2="5" stroke="white" strokeWidth="2" />
          <line x1="30" y1="5" x2="70" y2="5" stroke="white" strokeWidth="2" />
          <line x1="70" y1="5" x2="70" y2="15" stroke="white" strokeWidth="2" />
          
          {/* Head */}
          {incorrectGuesses >= 1 && (
            <circle cx="70" cy="25" r="10" stroke="white" strokeWidth="2" fill="none" />
          )}
          
          {/* Body */}
          {incorrectGuesses >= 2 && (
            <line x1="70" y1="35" x2="70" y2="65" stroke="white" strokeWidth="2" />
          )}
          
          {/* Left Arm */}
          {incorrectGuesses >= 3 && (
            <line x1="70" y1="45" x2="55" y2="35" stroke="white" strokeWidth="2" />
          )}
          
          {/* Right Arm */}
          {incorrectGuesses >= 4 && (
            <line x1="70" y1="45" x2="85" y2="35" stroke="white" strokeWidth="2" />
          )}
          
          {/* Left Leg */}
          {incorrectGuesses >= 5 && (
            <line x1="70" y1="65" x2="55" y2="85" stroke="white" strokeWidth="2" />
          )}
          
          {/* Right Leg */}
          {incorrectGuesses >= 6 && (
            <line x1="70" y1="65" x2="85" y2="85" stroke="white" strokeWidth="2" />
          )}
          
          {/* Face details (only shown when near loss) */}
          {incorrectGuesses >= MAX_INCORRECT_GUESSES[difficulty] - 1 && (
            <>
              {/* Eyes */}
              <line x1="66" y1="23" x2="69" y2="26" stroke="white" strokeWidth="1" />
              <line x1="69" y1="23" x2="66" y2="26" stroke="white" strokeWidth="1" />
              <line x1="71" y1="23" x2="74" y2="26" stroke="white" strokeWidth="1" />
              <line x1="74" y1="23" x2="71" y2="26" stroke="white" strokeWidth="1" />
              
              {/* Sad mouth */}
              <path d="M 65 30 Q 70 26 75 30" stroke="white" strokeWidth="1" fill="none" />
            </>
          )}
        </svg>
      </div>
    );
  };

  // SECTION: RENDERING UI COMPONENTS
  
  // Game mode selection screen
  if (gameMode === GameMode.NOT_SELECTED) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-4xl font-bold mb-4 text-squid-pink">Hangman</h1>
            <p className="text-xl max-w-3xl mx-auto">
              Guess the hidden word one letter at a time before the hangman is complete!
            </p>
          </motion.div>
          
          <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Select Game Mode</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center"
                  onClick={() => selectGameMode(GameMode.COMPUTER)}
                >
                  <FaRobot className="text-4xl mb-3" />
                  <span className="text-xl font-bold">Play vs Computer</span>
                  <p className="text-sm mt-2 text-blue-200">Challenge our AI opponent</p>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center"
                  onClick={() => selectGameMode(GameMode.LOCAL_MULTIPLAYER)}
                >
                  <FaUserFriends className="text-4xl mb-3" />
                  <span className="text-xl font-bold">Local Multiplayer</span>
                  <p className="text-sm mt-2 text-green-200">Take turns guessing letters</p>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center"
                  onClick={() => selectGameMode(GameMode.ONLINE_MULTIPLAYER)}
                >
                  <FaTrophy className="text-4xl mb-3" />
                  <span className="text-xl font-bold">Tournament Mode</span>
                  <p className="text-sm mt-2 text-purple-200">Compete online with APTOS rewards</p>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-pink-600 hover:bg-pink-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center"
                  onClick={() => selectGameMode(GameMode.ROOM)}
                >
                  <FaShareAlt className="text-4xl mb-3" />
                  <span className="text-xl font-bold">Create/Join Room</span>
                  <p className="text-sm mt-2 text-pink-200">Play with friends online</p>
                </motion.button>
              </div>
              
              <div className="flex justify-center mt-8">
                <Link href="/game" className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg flex items-center">
                  <FaHome className="mr-2" /> Back to Games
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Game board rendering
  if (showGameBoard) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 text-center">
              <h1 className="text-3xl font-bold mb-2 text-squid-pink">Hangman</h1>
              
              <div className="flex justify-center space-x-6 mb-2">
                <p className="font-medium text-lg">Category: <span className="text-squid-pink">{category}</span></p>
                <p className="font-medium text-lg">
                  Guesses Left: <span className="text-squid-pink">{MAX_INCORRECT_GUESSES[difficulty] - incorrectGuesses}</span>
                </p>
              </div>
              
              {status === GameStatus.PLAYING && (
                <p className="text-lg mb-2">
                  <span className="font-bold" style={{ color: currentPlayer === 1 ? "#EF4444" : "#3B82F6" }}>
                    {currentPlayer === 1 ? player1.name : player2.name}
                  </span>'s turn
                </p>
              )}
              
              {status !== GameStatus.PLAYING && (
                <div className={`py-2 px-4 rounded-lg inline-block mb-2 ${
                  status === GameStatus.WON ? 'bg-green-800' : 'bg-red-800'
                }`}>
                  <p className="text-lg font-bold">
                    {status === GameStatus.WON ? 'You Won!' : 'Game Over'}
                  </p>
                </div>
              )}
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-2 rounded-lg mb-4">
                  {currentMessage}
                </div>
              )}
            </div>
            
            {/* Hangman figure */}
            {renderHangman()}
            
            {/* Word display */}
            <div className="flex justify-center mb-6">
              <div className="flex space-x-2">
                {status === GameStatus.LOST ? (
                  // Show the actual word when game is lost
                  word.split("").map((letter, index) => (
                    <motion.div
                      key={`letter-${index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="w-8 h-10 flex items-center justify-center border-b-2 border-white mx-1"
                    >
                      <span className="text-2xl font-bold text-red-500">{letter}</span>
                    </motion.div>
                  ))
                ) : (
                  // Show hidden word with correctly guessed letters
                  hiddenWord.map((letter, index) => (
                    <motion.div
                      key={`letter-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="w-8 h-10 flex items-center justify-center border-b-2 border-white mx-1"
                    >
                      <span className="text-2xl font-bold">{letter}</span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
            
            {/* Keyboard */}
            {status === GameStatus.PLAYING && (
              <div className="bg-gray-800 p-4 rounded-xl shadow-xl mb-6">
                <div className="flex flex-wrap justify-center">
                  {"abcdefghijklmnopqrstuvwxyz".split("").map(letter => (
                    <motion.button
                      key={letter}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`w-9 h-9 m-1 rounded-lg flex items-center justify-center font-bold ${
                        guessedLetters.has(letter)
                          ? word.includes(letter)
                            ? "bg-green-600 text-white opacity-70 cursor-not-allowed"
                            : "bg-red-600 text-white opacity-70 cursor-not-allowed"
                          : "bg-gray-700 text-white hover:bg-squid-pink"
                      }`}
                      onClick={() => {
                        if (!guessedLetters.has(letter) && status === GameStatus.PLAYING &&
                            (gameMode !== GameMode.LOCAL_MULTIPLAYER || currentPlayer === 1)) {
                          handleLetterGuess(letter);
                          
                          // AI moves after player in computer mode
                          if (gameMode === GameMode.COMPUTER && status === GameStatus.PLAYING) {
                            setTimeout(makeComputerMove, 1000);
                          }
                        }
                      }}
                      disabled={guessedLetters.has(letter) || 
                              status !== GameStatus.PLAYING || 
                              (gameMode === GameMode.LOCAL_MULTIPLAYER && currentPlayer !== 1)}
                    >
                      {letter.toUpperCase()}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Game result display */}
            {status !== GameStatus.PLAYING && (
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  {status === GameStatus.WON ? "Congratulations!" : "Game Over"}
                </h2>
                <p className="text-lg">
                  {status === GameStatus.WON 
                    ? "You correctly guessed the word!" 
                    : `The word was: ${word}`}
                </p>
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                onClick={goBack}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center"
              >
                <FaHome className="mr-2" /> Exit Game
              </button>
              
              {status !== GameStatus.PLAYING && (
                <button
                  onClick={() => resetGame()}
                  className="bg-squid-pink hover:bg-opacity-80 text-white py-2 px-6 rounded"
                >
                  Play Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Entry form
  if (showEntryForm) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Game Settings</h2>
              
              <form onSubmit={handlePlayerFormSubmit}>
                <div className="mb-4">
                  <label htmlFor="player1" className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    id="player1"
                    name="player1"
                    className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-squid-pink"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                
                {gameMode === GameMode.LOCAL_MULTIPLAYER && (
                  <div className="mb-4">
                    <label htmlFor="player2" className="block text-sm font-medium mb-2">Player 2 Name</label>
                    <input
                      type="text"
                      id="player2"
                      name="player2"
                      className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-squid-pink"
                      placeholder="Enter opponent name"
                      required
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="difficulty" className="block text-sm font-medium mb-2">Difficulty</label>
                  <select
                    id="difficulty"
                    name="difficulty"
                    className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-squid-pink"
                  >
                    <option value="easy">Easy (8 guesses allowed)</option>
                    <option value="medium" selected>Medium (6 guesses allowed)</option>
                    <option value="hard">Hard (4 guesses allowed)</option>
                  </select>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="category" className="block text-sm font-medium mb-2">Word Category</label>
                  <select
                    id="category"
                    name="category"
                    className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-squid-pink"
                  >
                    <option value="animals">Animals</option>
                    <option value="countries">Countries</option>
                    <option value="fruits">Fruits</option>
                    <option value="technology">Technology</option>
                    <option value="sports">Sports</option>
                  </select>
                </div>
                
                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={goBack}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="bg-squid-pink hover:bg-opacity-80 text-white py-2 px-6 rounded"
                  >
                    Start Game
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading fallback
  return <div>Loading...</div>;
} 