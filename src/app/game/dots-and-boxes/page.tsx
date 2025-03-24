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

enum GameMode {
  NOT_SELECTED,
  COMPUTER,
  LOCAL_MULTIPLAYER,
  ONLINE_MULTIPLAYER,
  ROOM
}

enum GameStatus {
  NOT_STARTED,
  PLAYING,
  WON,
  LOST,
  TIE
}

type Player = {
  id: number;
  name: string;
  color: string;
  score: number;
  isComputer?: boolean;
  address?: string;
};

// Represents a line (horizontal or vertical) between dots
type Line = {
  id: number;
  playerId: number | null; // ID of player who drew the line, null if not drawn
};

// Represents a box in the grid
type Box = {
  id: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  ownerId: number | null; // Player who completed the box
};

export default function DotsAndBoxesPage() {
  const router = useRouter();
  const { agent } = useAIAgent();
  const { wallet } = useAptosWallet();
  const { updateGameResult, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();

  // Grid configuration
  const [gridSize, setGridSize] = useState(4); // 4x4 grid = 5x5 dots
  const [lines, setLines] = useState<Line[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  
  // Game state
  const [currentPlayer, setCurrentPlayer] = useState<number>(1); // player 1 or 2
  const [status, setStatus] = useState<GameStatus>(GameStatus.NOT_STARTED);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.NOT_SELECTED);
  const [roomId, setRoomId] = useState<string>("");
  const [player1, setPlayer1] = useState<Player>({ id: 1, name: "", color: "#EF4444", score: 0 });
  const [player2, setPlayer2] = useState<Player>({ id: 2, name: "", color: "#3B82F6", score: 0 });
  
  // UI states
  const [showEntryForm, setShowEntryForm] = useState<boolean>(false);
  const [showRoomCreation, setShowRoomCreation] = useState<boolean>(false);
  const [showRoomJoin, setShowRoomJoin] = useState<boolean>(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState<boolean>(false);
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [betAmount, setBetAmount] = useState<string>("0.2");
  const [tournamentMode, setTournamentMode] = useState<boolean>(false);
  const [showTournamentForm, setShowTournamentForm] = useState<boolean>(false);
  const [transactionPending, setTransactionPending] = useState<boolean>(false);
  const [showGameBoard, setShowGameBoard] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  
  const socketRef = useRef<Socket | null>(null);

  // Initialize game board
  useEffect(() => {
    initializeGame();
    trackGamePlayed('dots-and-boxes');
    
    // Cleanup socket connection when unmounting
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [gridSize, trackGamePlayed]);

  // Handle computer moves
  useEffect(() => {
    if (gameMode === GameMode.COMPUTER && status === GameStatus.PLAYING && currentPlayer === 2) {
      // Add a delay to simulate "thinking"
      const timeout = setTimeout(() => {
        makeComputerMove();
      }, 800);
      
      return () => clearTimeout(timeout);
    }
  }, [currentPlayer, gameMode, status]);

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
        setStatus(GameStatus.PLAYING);
        setCurrentMessage(`${data.playerName} has joined the game!`);
      });
      
      socketRef.current.on("move_made", (data: {lineIndex: number, playerId: number, gameState?: any}) => {
        handleLineClick(data.lineIndex, data.playerId, false);
        
        // Update game state if provided
        if (data.gameState) {
          // Update from remote state if needed
        }
        
        setIsPlayerTurn(true);
      });
      
      socketRef.current.on("game_reset", () => {
        resetGame();
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

  // Initialize game grid
  const initializeGame = () => {
    // Total number of lines = horizontal + vertical
    // For an n×n grid of dots, there are n(n-1) horizontal lines and (n-1)n vertical lines
    const totalLines = 2 * gridSize * (gridSize + 1);
    const newLines: Line[] = [];
    
    // Create lines
    for (let i = 0; i < totalLines; i++) {
      newLines.push({ id: i, playerId: null });
    }
    
    setLines(newLines);
    
    // Create boxes
    const newBoxes: Box[] = [];
    const boxCount = gridSize * gridSize;
    
    for (let i = 0; i < boxCount; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      // Calculate indices for the lines surrounding this box
      const top = row * (2 * gridSize + 1) + col;
      const right = top + gridSize;
      const bottom = top + 2 * gridSize + 1;
      const left = top + gridSize - 1;
      
      newBoxes.push({
        id: i,
        top,
        right,
        bottom,
        left,
        ownerId: null
      });
    }
    
    setBoxes(newBoxes);
  };

  // Handle line click
  const handleLineClick = (lineIndex: number, playerId?: number, emitMove = true) => {
    if (status !== GameStatus.PLAYING) return;
    
    // If line already drawn, do nothing
    if (lines[lineIndex].playerId !== null) return;
    
    // For online mode, check if it's player's turn
    if ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && !isPlayerTurn) {
      return;
    }
    
    // Update the line
    const newLines = [...lines];
    newLines[lineIndex].playerId = playerId ?? currentPlayer;
    setLines(newLines);
    
    // Check if a box was completed
    let boxCompleted = false;
    const newBoxes = [...boxes];
    
    for (let i = 0; i < newBoxes.length; i++) {
      const box = newBoxes[i];
      
      if (box.ownerId === null) { // Skip already completed boxes
        const topLine = newLines[box.top].playerId !== null;
        const rightLine = newLines[box.right].playerId !== null;
        const bottomLine = newLines[box.bottom].playerId !== null;
        const leftLine = newLines[box.left].playerId !== null;
        
        if (topLine && rightLine && bottomLine && leftLine) {
          // Box completed
          box.ownerId = playerId ?? currentPlayer;
          boxCompleted = true;
          
          // Update player score
          if (box.ownerId === 1) {
            setPlayer1(prev => ({ ...prev, score: prev.score + 1 }));
          } else {
            setPlayer2(prev => ({ ...prev, score: prev.score + 1 }));
          }
        }
      }
    }
    
    setBoxes(newBoxes);
    
    // Handle online game move
    if (emitMove && (gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && socketRef.current) {
      socketRef.current.emit("make_move", {
        roomId,
        lineIndex,
        playerId: playerId ?? currentPlayer,
        gameState: { lines: newLines, boxes: newBoxes }
      });
      
      if (!boxCompleted) {
        setIsPlayerTurn(false);
      }
    }
    
    // Change player only if no box was completed
    if (!boxCompleted) {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
    
    // Check if game is over
    const allBoxesCompleted = newBoxes.every(box => box.ownerId !== null);
    
    if (allBoxesCompleted) {
      // Game over
      const player1Score = newBoxes.filter(box => box.ownerId === 1).length;
      const player2Score = newBoxes.filter(box => box.ownerId === 2).length;
      
      if (player1Score > player2Score) {
        setStatus(player1.isComputer ? GameStatus.LOST : GameStatus.WON);
        updateGameResult('dots-and-boxes', player1.isComputer ? 200 : 1000, player1Score > player2Score);
        
        if (tournamentMode && player1Score > player2Score) {
          processTournamentWin();
        }
      } else if (player2Score > player1Score) {
        setStatus(player2.isComputer ? GameStatus.WON : GameStatus.LOST);
        updateGameResult('dots-and-boxes', player2.isComputer ? 200 : 1000, player2Score > player1Score);
        
        if (tournamentMode && player2Score > player1Score) {
          processTournamentWin();
        }
      } else {
        setStatus(GameStatus.TIE);
        updateGameResult('dots-and-boxes', 500, false);
      }
    }
  };

  // AI move logic
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
    
    if (gameMode === GameMode.COMPUTER) {
      player2Name = "AI Opponent";
      setPlayer1({...player1, name: player1Name});
      setPlayer2({...player2, name: player2Name, isComputer: true});
    } else {
      setPlayer1({...player1, name: player1Name});
      setPlayer2({...player2, name: player2Name || "Player 2"});
    }
    
    setShowEntryForm(false);
    setShowGameBoard(true);
    setStatus(GameStatus.PLAYING);
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
      unlockAchievement('tournament_win', 'dots-and-boxes');
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionPending(false);
      setCurrentMessage("Failed to process winnings. Please contact support.");
    }
  };

  // Reset the game
  const resetGame = () => {
    initializeGame();
    setCurrentPlayer(1);
    setStatus(GameStatus.PLAYING);
    setPlayer1(prev => ({ ...prev, score: 0 }));
    setPlayer2(prev => ({ ...prev, score: 0 }));
    setIsPlayerTurn(true);
    
    // Reset in online mode
    if ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && socketRef.current) {
      socketRef.current.emit("reset_game", { roomId });
    }
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
    resetGame();
    
    // Disconnect from socket if connected
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
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
            <h1 className="text-4xl font-bold mb-4 text-squid-pink">Dots and Boxes</h1>
            <p className="text-xl max-w-3xl mx-auto">
              Connect dots to create boxes and capture territory. Most boxes wins!
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
                  <p className="text-sm mt-2 text-green-200">Play with a friend on the same device</p>
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
    // Calculate grid dimension based on grid size
    const dotCount = gridSize + 1; // 4x4 grid has 5x5 dots
    
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 text-center">
              <h1 className="text-3xl font-bold mb-2 text-squid-pink">Dots and Boxes</h1>
              
              <div className="flex justify-center items-center space-x-6 mb-4">
                <div className="flex items-center bg-gray-800 py-1 px-3 rounded-lg">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: player1.color }}></div>
                  <span className="ml-2">{player1.name}: {player1.score}</span>
                </div>
                
                <div className="flex items-center bg-gray-800 py-1 px-3 rounded-lg">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: player2.color }}></div>
                  <span className="ml-2">{player2.name}: {player2.score}</span>
                </div>
              </div>
              
              {status === GameStatus.PLAYING && (
                <div className="bg-gray-800 py-2 px-4 rounded-lg inline-block mb-4">
                  <p className="text-lg">
                    <span className="font-bold" style={{ color: currentPlayer === 1 ? player1.color : player2.color }}>
                      {currentPlayer === 1 ? player1.name : player2.name}
                    </span>'s turn
                  </p>
                </div>
              )}
              
              {status !== GameStatus.PLAYING && (
                <div className={`py-2 px-4 rounded-lg inline-block mb-4 ${
                  status === GameStatus.WON ? 'bg-green-800' : 
                  status === GameStatus.LOST ? 'bg-red-800' : 'bg-yellow-800'
                }`}>
                  <p className="text-lg font-bold">
                    {status === GameStatus.WON ? 'You Won!' : 
                     status === GameStatus.LOST ? 'You Lost!' : 'It\'s a Tie!'}
                  </p>
                </div>
              )}
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-2 rounded-lg mb-4">
                  {currentMessage}
                </div>
              )}
            </div>
            
            {/* Game board */}
            <div className="relative aspect-square bg-gray-800 p-4 rounded-xl shadow-xl mb-6">
              {/* Render dots */}
              <div className="relative w-full h-full">
                {Array.from({ length: dotCount * dotCount }).map((_, index) => {
                  const row = Math.floor(index / dotCount);
                  const col = index % dotCount;
                  
                  return (
                    <div 
                      key={`dot-${index}`}
                      className="absolute w-3 h-3 rounded-full bg-gray-200"
                      style={{
                        top: `${(row / (dotCount - 1)) * 100}%`,
                        left: `${(col / (dotCount - 1)) * 100}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  );
                })}
                
                {/* Render horizontal lines */}
                {Array.from({ length: dotCount * (dotCount - 1) }).map((_, index) => {
                  const row = Math.floor(index / (dotCount - 1));
                  const col = index % (dotCount - 1);
                  const lineIndex = row * (2 * dotCount - 1) + col;
                  const line = lines[lineIndex];
                  
                  return (
                    <motion.div
                      key={`h-line-${index}`}
                      className={`absolute h-1 rounded-full ${
                        line.playerId ? '' : 'hover:bg-gray-400 cursor-pointer'
                      }`}
                      style={{
                        top: `${(row / (dotCount - 1)) * 100}%`,
                        left: `${(col / (dotCount - 1)) * 100 + (1 / (dotCount - 1)) * 50}%`,
                        width: `${(1 / (dotCount - 1)) * 100}%`,
                        backgroundColor: line.playerId === 1 ? player1.color : 
                                          line.playerId === 2 ? player2.color : 
                                          'rgba(75, 85, 99, 0.3)', // Light gray if not drawn
                        transform: 'translateY(-50%)'
                      }}
                      onClick={() => handleLineClick(lineIndex)}
                      whileHover={
                        status === GameStatus.PLAYING && line.playerId === null &&
                        (gameMode === GameMode.LOCAL_MULTIPLAYER || 
                         (gameMode === GameMode.COMPUTER && currentPlayer === 1) ||
                         ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && isPlayerTurn)) ? 
                        { scale: 1.2 } : {}
                      }
                    />
                  );
                })}
                
                {/* Render vertical lines */}
                {Array.from({ length: (dotCount - 1) * dotCount }).map((_, index) => {
                  const row = Math.floor(index / dotCount);
                  const col = index % dotCount;
                  const lineIndex = dotCount * (dotCount - 1) + row * dotCount + col;
                  const line = lines[lineIndex];
                  
                  return (
                    <motion.div
                      key={`v-line-${index}`}
                      className={`absolute w-1 rounded-full ${
                        line.playerId ? '' : 'hover:bg-gray-400 cursor-pointer'
                      }`}
                      style={{
                        top: `${(row / (dotCount - 1)) * 100 + (1 / (dotCount - 1)) * 50}%`,
                        left: `${(col / (dotCount - 1)) * 100}%`,
                        height: `${(1 / (dotCount - 1)) * 100}%`,
                        backgroundColor: line.playerId === 1 ? player1.color : 
                                          line.playerId === 2 ? player2.color : 
                                          'rgba(75, 85, 99, 0.3)', // Light gray if not drawn
                        transform: 'translateX(-50%)'
                      }}
                      onClick={() => handleLineClick(lineIndex)}
                      whileHover={
                        status === GameStatus.PLAYING && line.playerId === null &&
                        (gameMode === GameMode.LOCAL_MULTIPLAYER || 
                         (gameMode === GameMode.COMPUTER && currentPlayer === 1) ||
                         ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && isPlayerTurn)) ? 
                        { scale: 1.2 } : {}
                      }
                    />
                  );
                })}
                
                {/* Render boxes */}
                {boxes.map((box, index) => {
                  const row = Math.floor(index / gridSize);
                  const col = index % gridSize;
                  
                  return box.ownerId ? (
                    <div
                      key={`box-${index}`}
                      className="absolute rounded-sm opacity-40"
                      style={{
                        top: `${(row / (dotCount - 1)) * 100 + (1 / (dotCount - 1)) * 50}%`,
                        left: `${(col / (dotCount - 1)) * 100 + (1 / (dotCount - 1)) * 50}%`,
                        width: `${(1 / (dotCount - 1)) * 100}%`,
                        height: `${(1 / (dotCount - 1)) * 100}%`,
                        backgroundColor: box.ownerId === 1 ? player1.color : player2.color,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  ) : null;
                })}
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={goBack}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center"
              >
                <FaHome className="mr-2" /> Exit Game
              </button>
              
              {status !== GameStatus.PLAYING && (
                <button
                  onClick={resetGame}
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
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Enter Player Names</h2>
              
              <form onSubmit={handlePlayerFormSubmit}>
                <div className="mb-4">
                  <label htmlFor="player1" className="block text-sm font-medium mb-2">Player 1 (Red)</label>
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
                  <div className="mb-6">
                    <label htmlFor="player2" className="block text-sm font-medium mb-2">Player 2 (Blue)</label>
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

                <div className="mb-6">
                  <label htmlFor="gridSize" className="block text-sm font-medium mb-2">Grid Size</label>
                  <select
                    id="gridSize"
                    value={gridSize}
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-squid-pink"
                  >
                    <option value="3">3x3 (Easy)</option>
                    <option value="4">4x4 (Medium)</option>
                    <option value="5">5x5 (Hard)</option>
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