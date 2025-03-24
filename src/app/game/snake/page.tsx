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
import SnakeGame from "@/components/games/SnakeGame";

// Game modes
enum GameMode {
  NOT_SELECTED,
  SOLO,
  ONLINE_MULTIPLAYER,
  ROOM
}

// Game status states
enum GameStatus {
  NOT_STARTED,
  PLAYING,
  WON,
  LOST,
  GAME_OVER
}

export default function SnakePage() {
  const router = useRouter();
  const { agent } = useAIAgent();
  const { wallet } = useAptosWallet();
  const { updateGameResult, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();

  // Game state
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>(GameStatus.NOT_STARTED);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.NOT_SELECTED);
  
  // UI States
  const [showGameModeSelection, setShowGameModeSelection] = useState(true);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [showRoomOptions, setShowRoomOptions] = useState(false);
  const [showCreateRoomForm, setShowCreateRoomForm] = useState(false);
  const [showJoinRoomForm, setShowJoinRoomForm] = useState(false);
  const [showTournamentEntry, setShowTournamentEntry] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Multiplayer states
  const [roomId, setRoomId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [opponentName, setOpponentName] = useState<string>("");
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [opponentScore, setOpponentScore] = useState(0);
  
  // Tournament states
  const [tournamentFee, setTournamentFee] = useState<number>(10);
  const [tournamentPrize, setTournamentPrize] = useState<number>(100);
  const [inTournament, setInTournament] = useState(false);

  // Socket connection and cleanup
  useEffect(() => {
    // Load high score from localStorage
    const savedHighScore = localStorage.getItem('snakeHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Connect to socket for multiplayer
  const connectToSocket = () => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    
    socketInstance.on('connect', () => {
      console.log('Connected to server');
    });
    
    socketInstance.on('roomCreated', (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setWaitingForOpponent(true);
      setIsPlayer1(true);
    });
    
    socketInstance.on('playerJoined', (data: { player2: string }) => {
      setOpponentName(data.player2);
      setWaitingForOpponent(false);
      setStatus(GameStatus.PLAYING);
    });
    
    socketInstance.on('gameUpdate', (data: { player: string, score: number }) => {
      if (data.player !== playerName) {
        setOpponentScore(data.score);
      }
    });
    
    socketInstance.on('gameOver', (data: { winner: string }) => {
      const isWinner = data.winner === playerName;
      handleGameOver(isWinner ? score : 0);
    });
    
    socketInstance.on('error', (error: string) => {
      setErrorMessage(error);
      setIsLoading(false);
    });
    
    setSocket(socketInstance);
    return socketInstance;
  };

  // Handle selecting game mode
  const handleGameModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    setShowGameModeSelection(false);
    
    if (mode === GameMode.ONLINE_MULTIPLAYER) {
      setShowPlayerForm(true);
      connectToSocket();
    } else if (mode === GameMode.ROOM) {
      setShowRoomOptions(true);
      connectToSocket();
    } else if (mode === GameMode.SOLO) {
      startSoloGame();
    }
  };

  // Start solo game
  const startSoloGame = () => {
    setStatus(GameStatus.PLAYING);
    trackGamePlayed('snake');
  };

  // Create a multiplayer room
  const createRoom = () => {
    if (!playerName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    if (socket) {
      socket.emit('createRoom', { game: 'snake', player1: playerName });
      setShowCreateRoomForm(false);
    }
  };

  // Join an existing room
  const joinRoom = () => {
    if (!playerName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    
    if (!roomId.trim()) {
      setErrorMessage("Please enter a room ID");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    if (socket) {
      socket.emit('joinRoom', { 
        roomId, 
        player2: playerName 
      });
      
      setShowJoinRoomForm(false);
      setStatus(GameStatus.PLAYING);
    }
  };

  // Join a random multiplayer game
  const joinMultiplayer = () => {
    if (!playerName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    if (socket) {
      socket.emit('findGame', { 
        game: 'snake', 
        player: playerName 
      });
      
      setShowPlayerForm(false);
    }
  };

  // Enter a tournament
  const enterTournament = async () => {
    if (!wallet) {
      setShowWalletPrompt(true);
      return;
    }
    
    try {
      setIsLoading(true);
      // Pay tournament entry fee
      await payTournamentEntryFee(wallet, tournamentFee);
      
      setInTournament(true);
      setStatus(GameStatus.PLAYING);
      setShowTournamentEntry(false);
      
    } catch (error) {
      console.error("Tournament entry error:", error);
      setErrorMessage("Failed to pay tournament fee. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle game over
  const handleGameOver = async (finalScore: number) => {
    setScore(finalScore);
    
    // Update high score if needed
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('snakeHighScore', finalScore.toString());
    }
    
    // Award points and track game
    addPoints(finalScore);
    
    // Check for achievements
    if (finalScore >= 50) {
      unlockAchievement('snake_master');
    }
    
    if (finalScore >= 100) {
      unlockAchievement('snake_legend');
    }
    
    // Handle tournament winnings
    if (inTournament && finalScore > 50) {
      try {
        await payTournamentWinnings(wallet, tournamentPrize);
        setStatus(GameStatus.WON);
        updateGameResult('snake', true, finalScore);
      } catch (error) {
        console.error("Tournament payout error:", error);
      }
    } else if (gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) {
      // Emit game over for multiplayer
      socket?.emit('gameOver', {
        roomId,
        winner: playerName,
        score: finalScore
      });
      
      if (finalScore > opponentScore) {
        setStatus(GameStatus.WON);
        updateGameResult('snake', true, finalScore);
      } else {
        setStatus(GameStatus.LOST);
        updateGameResult('snake', false, finalScore);
      }
    } else {
      // Solo game
      setStatus(GameStatus.GAME_OVER);
      updateGameResult('snake', finalScore > 50, finalScore);
    }
  };

  // Restart game
  const restartGame = () => {
    setStatus(GameStatus.PLAYING);
    setScore(0);
  };

  // Go back to mode selection
  const goBack = () => {
    setGameMode(GameMode.NOT_SELECTED);
    setStatus(GameStatus.NOT_STARTED);
    setShowGameModeSelection(true);
    setShowPlayerForm(false);
    setShowRoomOptions(false);
    setShowCreateRoomForm(false);
    setShowJoinRoomForm(false);
    setWaitingForOpponent(false);
    setInTournament(false);
    setErrorMessage(null);
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // Share game results
  const shareResult = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Snake Game Score',
        text: `I scored ${score} points in Snake Game! Can you beat that?`,
        url: window.location.href,
      });
    } else {
      setShowShareOptions(true);
    }
  };

  // Copy room ID to clipboard
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setErrorMessage("Room ID copied to clipboard!");
    setTimeout(() => setErrorMessage(null), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <Link href="/" className="flex items-center text-gray-300 hover:text-white">
          <FaHome className="mr-2" />
          Home
        </Link>
        
        <h1 className="text-2xl font-bold text-center">Snake Game</h1>
        
        <div className="flex">
          <Link href="/leaderboard" className="flex items-center text-gray-300 hover:text-white mr-4">
            <FaTrophy className="mr-2" />
            Leaderboard
          </Link>
        </div>
      </div>
      
      {/* Game container */}
      <div className="w-full max-w-4xl h-[60vh] rounded-lg overflow-hidden shadow-lg bg-gray-800 relative">
        {status === GameStatus.PLAYING ? (
          <SnakeGame 
            onGameOver={handleGameOver}
            gameStatus={status}
            onRestart={restartGame}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {status === GameStatus.NOT_STARTED && (
              <div className="text-center p-6 bg-gray-800 rounded-lg max-w-md w-full">
                {showGameModeSelection && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="text-xl font-bold mb-4">Select Game Mode</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <button 
                        onClick={() => handleGameModeSelect(GameMode.SOLO)}
                        className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center"
                      >
                        <FaRobot className="mr-2" />
                        Solo Game
                      </button>
                      <button 
                        onClick={() => handleGameModeSelect(GameMode.ONLINE_MULTIPLAYER)}
                        className="p-4 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center"
                      >
                        <FaUserFriends className="mr-2" />
                        Multiplayer
                      </button>
                      <button 
                        onClick={() => handleGameModeSelect(GameMode.ROOM)}
                        className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center"
                      >
                        <FaShareAlt className="mr-2" />
                        Create/Join Room
                      </button>
                      <button 
                        onClick={() => setShowTournamentEntry(true)}
                        className="p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg flex items-center justify-center"
                      >
                        <FaTrophy className="mr-2" />
                        Tournament
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {showPlayerForm && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="text-xl font-bold mb-4">Enter Your Name</h2>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Your name"
                      className="p-2 mb-4 w-full rounded bg-gray-700 text-white"
                    />
                    <div className="flex space-x-4">
                      <button 
                        onClick={joinMultiplayer}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded"
                        disabled={isLoading}
                      >
                        {isLoading ? <FaSpinner className="animate-spin" /> : "Find Opponent"}
                      </button>
                      <button 
                        onClick={goBack}
                        className="p-2 bg-gray-600 hover:bg-gray-700 rounded"
                      >
                        Back
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {showRoomOptions && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="text-xl font-bold mb-4">Room Options</h2>
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <button 
                        onClick={() => {
                          setShowRoomOptions(false);
                          setShowCreateRoomForm(true);
                        }}
                        className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg"
                      >
                        Create Room
                      </button>
                      <button 
                        onClick={() => {
                          setShowRoomOptions(false);
                          setShowJoinRoomForm(true);
                        }}
                        className="p-4 bg-green-600 hover:bg-green-700 rounded-lg"
                      >
                        Join Room
                      </button>
                    </div>
                    <button 
                      onClick={goBack}
                      className="mt-4 p-2 bg-gray-600 hover:bg-gray-700 rounded"
                    >
                      Back
                    </button>
                  </motion.div>
                )}
                
                {showCreateRoomForm && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="text-xl font-bold mb-4">Create Room</h2>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Your name"
                      className="p-2 mb-4 w-full rounded bg-gray-700 text-white"
                    />
                    <div className="flex space-x-4">
                      <button 
                        onClick={createRoom}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
                        disabled={isLoading}
                      >
                        {isLoading ? <FaSpinner className="animate-spin" /> : "Create Room"}
                      </button>
                      <button 
                        onClick={() => {
                          setShowCreateRoomForm(false);
                          setShowRoomOptions(true);
                        }}
                        className="p-2 bg-gray-600 hover:bg-gray-700 rounded"
                      >
                        Back
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {showJoinRoomForm && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="text-xl font-bold mb-4">Join Room</h2>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Your name"
                      className="p-2 mb-4 w-full rounded bg-gray-700 text-white"
                    />
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="Room ID"
                      className="p-2 mb-4 w-full rounded bg-gray-700 text-white"
                    />
                    <div className="flex space-x-4">
                      <button 
                        onClick={joinRoom}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded"
                        disabled={isLoading}
                      >
                        {isLoading ? <FaSpinner className="animate-spin" /> : "Join Room"}
                      </button>
                      <button 
                        onClick={() => {
                          setShowJoinRoomForm(false);
                          setShowRoomOptions(true);
                        }}
                        className="p-2 bg-gray-600 hover:bg-gray-700 rounded"
                      >
                        Back
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {waitingForOpponent && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="text-xl font-bold mb-4">Waiting for Opponent</h2>
                    <p className="mb-4">Share this room ID with your friend:</p>
                    <div className="flex items-center mb-4">
                      <span className="bg-gray-700 p-2 rounded mr-2">{roomId}</span>
                      <button 
                        onClick={copyRoomId}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="animate-pulse text-xl">
                      <FaSpinner className="animate-spin" />
                    </div>
                    <button 
                      onClick={goBack}
                      className="mt-4 p-2 bg-gray-600 hover:bg-gray-700 rounded"
                    >
                      Cancel
                    </button>
                  </motion.div>
                )}
                
                {showTournamentEntry && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="text-xl font-bold mb-4">Tournament Entry</h2>
                    <p className="mb-4">Entry Fee: {tournamentFee} APT</p>
                    <p className="mb-4">Prize Pool: {tournamentPrize} APT</p>
                    <p className="mb-4">Score 50+ points to win!</p>
                    <div className="flex space-x-4">
                      <button 
                        onClick={enterTournament}
                        className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded flex items-center"
                        disabled={isLoading}
                      >
                        {isLoading ? <FaSpinner className="animate-spin mr-2" /> : <FaCoins className="mr-2" />}
                        Enter Tournament
                      </button>
                      <button 
                        onClick={() => setShowTournamentEntry(false)}
                        className="p-2 bg-gray-600 hover:bg-gray-700 rounded"
                      >
                        Back
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {showWalletPrompt && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="text-xl font-bold mb-4">Connect Wallet</h2>
                    <p className="mb-4">You need to connect your wallet to enter tournaments.</p>
                    <div className="flex space-x-4">
                      <button 
                        onClick={() => router.push('/profile')}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        Connect Wallet
                      </button>
                      <button 
                        onClick={() => setShowWalletPrompt(false)}
                        className="p-2 bg-gray-600 hover:bg-gray-700 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            
            {(status === GameStatus.WON || status === GameStatus.LOST || status === GameStatus.GAME_OVER) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-6 bg-gray-800 rounded-lg max-w-md w-full"
              >
                <h2 className="text-2xl font-bold mb-2">
                  {status === GameStatus.WON ? "You Won!" : 
                   status === GameStatus.LOST ? "You Lost!" : "Game Over!"}
                </h2>
                <p className="text-xl mb-4">Your Score: {score}</p>
                {highScore > 0 && <p className="text-lg mb-4">High Score: {highScore}</p>}
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button 
                    onClick={restartGame}
                    className="p-2 bg-green-600 hover:bg-green-700 rounded"
                  >
                    Play Again
                  </button>
                  <button 
                    onClick={goBack}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    New Game
                  </button>
                </div>
                
                <button 
                  onClick={shareResult}
                  className="p-2 bg-purple-600 hover:bg-purple-700 rounded w-full flex items-center justify-center"
                >
                  <FaShareAlt className="mr-2" />
                  Share Score
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
      
      {/* Game info */}
      {status === GameStatus.PLAYING && (
        <div className="w-full max-w-4xl mt-4 p-4 bg-gray-800 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-lg">Score: {score}</p>
            {highScore > 0 && <p className="text-sm text-gray-400">High Score: {highScore}</p>}
          </div>
          
          {(gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && (
            <div>
              <p className="text-lg">{playerName}: {score}</p>
              <p className="text-lg">{opponentName || "Opponent"}: {opponentScore}</p>
            </div>
          )}
          
          <button 
            onClick={goBack}
            className="p-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Quit Game
          </button>
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white p-3 rounded-lg shadow-lg">
          {errorMessage}
        </div>
      )}
      
      {/* Share options */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Share Your Score</h3>
            <p className="mb-4">Copy this text to share:</p>
            <div className="bg-gray-700 p-2 rounded mb-4">
              I scored {score} points in Snake Game! Can you beat that?
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowShareOptions(false)}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}