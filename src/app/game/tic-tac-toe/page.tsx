"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaUserFriends, FaRobot, FaShareAlt, FaHome, FaTrophy, FaCoins, FaSpinner, FaCopy } from "react-icons/fa";
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

// Game status states
enum GameStatus {
  NOT_STARTED,
  PLAYING,
  WON,
  LOST,
  TIE
}

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export default function TicTacToePage() {
  const router = useRouter();
  const { agent } = useAIAgent();
  const { wallet } = useAptosWallet();
  const { updateGameResult, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();

  // Game state
  const [board, setBoard] = useState<Array<string | null>>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [status, setStatus] = useState<GameStatus>(GameStatus.NOT_STARTED);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.NOT_SELECTED);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  
  // UI States
  const [showEntryForm, setShowEntryForm] = useState<boolean>(false);
  const [showRoomCreation, setShowRoomCreation] = useState<boolean>(false);
  const [showRoomJoin, setShowRoomJoin] = useState<boolean>(false);
  const [showTournamentForm, setShowTournamentForm] = useState<boolean>(false);
  const [showGameBoard, setShowGameBoard] = useState<boolean>(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState<boolean>(false);
  const [transactionPending, setTransactionPending] = useState<boolean>(false);
  const [tournamentMode, setTournamentMode] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  
  // Player info
  const [player1, setPlayer1] = useState<string>("");
  const [player2, setPlayer2] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [betAmount, setBetAmount] = useState<string>("0.2");
  const [winAmount, setWinAmount] = useState<number>(0);
  
  // Socket connection
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Clean up socket connection when component unmounts
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  // Check for shared room links
  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const joinRoomId = urlParams.get('join');
    
    if (joinRoomId) {
      // Auto-join the room
      setRoomId(joinRoomId);
      setGameMode(GameMode.ROOM);
      setShowRoomJoin(true);
      
      // If player name not set, use a default
      if (!player1) {
        setPlayer1("Guest");
      }
    }
  }, []);

  // Initialize socket connection for online play
  const initializeSocket = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log("Socket already connected");
      setSocketConnected(true);
      return socketRef.current;
    }
    
    try {
      console.log("Initializing socket connection");
      setCurrentMessage("Connecting to server...");
      
      // Connect to socket server
      const socket = io("http://localhost:3001", {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      
      socketRef.current = socket;
      
      // Socket connection handlers
      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        setSocketConnected(true);
        setCurrentMessage("Connected to server");
      });
      
      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setSocketConnected(false);
        setCurrentMessage(`Connection error: ${error.message}`);
      });
      
      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setSocketConnected(false);
        setCurrentMessage(`Disconnected: ${reason}`);
      });
      
      // Room events
      socket.on("room_created", (data) => {
        console.log("Room created:", data);
        setRoomId(data.roomId);
        setBetAmount(data.betAmount || "0");
        setIsWaitingForOpponent(true);
        setCurrentMessage(`Room created! Share code: ${data.roomId}`);
        
        // Generate a shareable link
        const shareableLink = `${window.location.origin}/game/tic-tac-toe?join=${data.roomId}`;
        console.log("Shareable link:", shareableLink);
      });
      
      socket.on("player_joined", (data) => {
        console.log("Player joined:", data);
        setPlayer2(data.playerName);
        setIsWaitingForOpponent(false);
        setCurrentMessage(`${data.playerName} joined the room!`);
      });
      
      socket.on("opponent_action", (data) => {
        console.log("Opponent action:", data);
        if (data.gameState) {
          setBoard(data.gameState.board);
          setIsXNext(data.gameState.isXNext);
        }
      });
      
      socket.on("tournament_match_found", (data) => {
        console.log("Tournament match found:", data);
        setRoomId(data.roomId);
        setPlayer2(data.opponentName);
        setIsWaitingForOpponent(false);
        setBetAmount(data.betAmount || "0.2");
        setCurrentMessage(`Match found! Playing against ${data.opponentName}`);
        setShowGameBoard(true);
        setStatus(GameStatus.PLAYING);
      });
      
      socket.on("waiting_for_opponent", (data) => {
        console.log("Waiting for opponent:", data);
        setCurrentMessage(data.message);
      });
      
      socket.on("bet_won", (data) => {
        console.log("Bet won:", data);
        setWinAmount(data.amount);
        setCurrentMessage(`You won ${data.amount} coins! (${data.commission} commission)`);
      });
      
      socket.on("opponent_left", () => {
        console.log("Opponent left the game");
        setCurrentMessage("Opponent left the game");
        
        if (status === GameStatus.PLAYING) {
          handleWin("opponent_left");
        }
      });
      
      socket.on("error", (error) => {
        console.error("Socket error:", error);
        setCurrentMessage(`Error: ${error.message}`);
      });
      
      return socket;
    } catch (error) {
      console.error("Failed to initialize socket:", error);
      setCurrentMessage("Failed to connect to game server");
      return null;
    }
  };

  // Check if the game is won
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      checkGameStatus();
      
      // Computer's turn
      if (gameMode === GameMode.COMPUTER && !isXNext && status === GameStatus.PLAYING) {
        const timeoutId = setTimeout(() => {
          makeComputerMove();
        }, 600);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [board, isXNext, gameMode, status]);

  // Check game status after every move
  const checkGameStatus = (boardToCheck = board) => {
    // Check for winner
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (boardToCheck[a] && boardToCheck[a] === boardToCheck[b] && boardToCheck[a] === boardToCheck[c]) {
        // When setting state, update the winning line for highlighting
        if (boardToCheck === board) {
          setWinningLine(combo);
        }
        return boardToCheck[a]; // Return the winner marker ("X" or "O")
      }
    }
    
    // Check for tie
    if (!boardToCheck.includes(null)) {
      return "TIE";
    }
    
    // No winner yet
    return null;
  };

  // Handle cell click
  const handleCellClick = (position: number) => {
    // If cell is already filled or game is over, do nothing
    if (board[position] !== null || status !== GameStatus.PLAYING) {
      return;
    }
    
    // If it's online mode and not the player's turn, do nothing
    if ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && !isXNext) {
      return;
    }
    
    // Make player's move
    const newBoard = [...board];
    newBoard[position] = "X"; // Player is always X
    setBoard(newBoard);
    
    // Check for a win or draw after player's move
    const result = checkGameStatus(newBoard);
    if (result) {
      handleGameOver(result, newBoard);
      return;
    }
    
    // Switch player
    setIsXNext(false);
    
    // If in online mode, send the move to the opponent
    if ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && socketRef.current) {
      socketRef.current.emit('make_move', {
        roomId,
        position,
        isX: true, // Player is always X
        gameType: "tic-tac-toe"
      });
    }
    
    // Schedule AI move if in computer mode
    if (gameMode === GameMode.COMPUTER && !result) {
      // Delay AI move for better UX
      setTimeout(() => {
        makeComputerMove();
      }, 750);
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

  // Process tournament win
  const processTournamentWin = async () => {
    try {
      setTransactionPending(true);
      setCurrentMessage("Processing your winnings...");
      
      // Get opponent's wallet address from the socket connection
      const opponentAddress = socketRef.current?.id || "0x00a654ef527594d2165fdab60e22ef14e9da2fdf22bd485493e60311638d6801";
      
      // Process winnings payment
      const paymentResult = await payTournamentWinnings(opponentAddress);
      
      if (paymentResult.winnerHash) {
        setTransactionPending(false);
        setCurrentMessage(`Congratulations! You won 0.36 APT! Transaction ID: ${paymentResult.winnerHash.substring(0, 8)}...`);
        
        // Update player progress
        addPoints(1000);
        unlockAchievement('tournament_win', 'tic-tac-toe');
      } else {
        setTransactionPending(false);
        setCurrentMessage("Failed to process winnings. Please contact support.");
      }
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionPending(false);
      setCurrentMessage("Failed to process winnings. Please contact support.");
    }
  };

  // Reset the game
  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setStatus(GameStatus.PLAYING);
    setWinningLine(null);
    
    // Reset in online mode
    if ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && socketRef.current) {
      socketRef.current.emit("reset_game", { 
        roomId,
        gameType: "tic-tac-toe"
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
    
    if (gameMode === GameMode.COMPUTER) {
      player2Name = "AI Opponent";
    }
    
    setPlayer1(player1Name);
    setPlayer2(player2Name || "Player 2");
    setShowEntryForm(false);
    setShowGameBoard(true);
    setStatus(GameStatus.PLAYING);
  };

  // Handle room creation
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const playerName = form.playerName?.value || "Host";
    const betAmountValue = form.betAmount?.value || "0.2";
    
    if (!playerName.trim()) {
      setCurrentMessage("Please enter your name");
      return;
    }
    
    setPlayer1(playerName);
    setBetAmount(betAmountValue);
    setShowRoomCreation(false);
    
    // Check wallet connection if betting
    const betValue = parseFloat(betAmountValue);
    if (betValue > 0 && !wallet.connected) {
      setCurrentMessage("Please connect your wallet to create a room with betting");
      setTimeout(() => setShowRoomCreation(true), 3000);
      return;
    }
    
    setCurrentMessage("Connecting to server...");
    
    // Initialize socket if not already done
    const socket = initializeSocket();
    
    if (!socket) {
      setCurrentMessage("Failed to connect to server. Please try again.");
      return;
    }
    
    // Create room with delay to ensure connection
    setTimeout(() => {
      if (socket.connected) {
        console.log("Emitting create_room event with player:", playerName, "bet:", betAmountValue);
        socket.emit('create_room', {
          playerName,
          gameType: "tic-tac-toe",
          betAmount: betAmountValue
        });
      } else {
        console.log("Socket not connected, waiting...");
        // Try again after a delay
        setTimeout(() => {
          if (socket.connected) {
            console.log("Emitting create_room event after delay");
            socket.emit('create_room', {
              playerName,
              gameType: "tic-tac-toe",
              betAmount: betAmountValue
            });
          } else {
            setCurrentMessage("Connection failed. Please try again.");
          }
        }, 2000);
      }
    }, 1000);
  };

  // Handle room joining
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const playerName = form.playerName?.value || "Guest";
    const roomCode = form.roomCode?.value;
    
    if (!playerName.trim()) {
      setCurrentMessage("Please enter your name");
      return;
    }
    
    if (!roomCode?.trim()) {
      setCurrentMessage("Please enter a room code");
      return;
    }
    
    setPlayer1(playerName);
    setRoomId(roomCode);
    setShowRoomJoin(false);
    setCurrentMessage("Connecting to server...");
    
    // Initialize socket if not already done
    const socket = initializeSocket();
    
    if (!socket) {
      setCurrentMessage("Failed to connect to server. Please try again.");
      return;
    }
    
    // Check if room exists and get bet amount
    socket.emit('check_room', { roomId: roomCode }, (response: any) => {
      if (response.exists) {
        const roomBetAmount = response.betAmount || 0;
        
        // Check wallet connection if betting
        if (roomBetAmount > 0 && !wallet.connected) {
          setCurrentMessage("Please connect your wallet to join a room with betting");
          setTimeout(() => setShowRoomJoin(true), 3000);
          return;
        }
        
        setBetAmount(roomBetAmount.toString());
        
        // Join room
        socket.emit('join_room', {
          roomId: roomCode,
          playerName,
          gameType: "tic-tac-toe"
        });
        
        setShowGameBoard(true);
        setStatus(GameStatus.PLAYING);
      } else {
        setCurrentMessage("Room not found or already full");
        setTimeout(() => setShowRoomJoin(true), 3000);
      }
    });
  };

  // Handle tournament entry
  const handleTournamentEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const playerName = form.playerName?.value || "Player";
    const bet = form.betAmount?.value || "0.2";
    
    if (!playerName.trim()) {
      setCurrentMessage("Please enter your name");
      return;
    }
    
    setBetAmount(bet);
    setPlayer1(playerName);
    setShowTournamentForm(false);
    
    // Check wallet connection
    if (!wallet.connected) {
      setCurrentMessage("Please connect your wallet to enter tournament mode");
      setTimeout(() => setShowTournamentForm(true), 3000);
      return;
    }
    
    setCurrentMessage("Processing tournament entry fee...");
    setTransactionPending(true);
    
    try {
      // Process the tournament entry fee using wallet
      const result = await payTournamentEntryFee();
      
      if (result && result.hash) {
        console.log("Tournament entry fee transaction successful:", result.hash);
        setCurrentMessage("Entry fee paid! Finding opponent...");
        
        // After payment is successful, set tournament mode and connect to socket
        setTournamentMode(true);
        const socket = initializeSocket();
        
        if (socket) {
          socket.emit("find_match", {
            playerName,
            betAmount: bet,
            gameType: "tic-tac-toe",
            transactionHash: result.hash
          });
          
          setIsWaitingForOpponent(true);
          setCurrentMessage("Finding an opponent with a similar bet amount...");
        } else {
          setCurrentMessage("Failed to connect to server. Please try again.");
        }
      } else {
        setCurrentMessage("Failed to process entry fee. Please try again.");
        setTimeout(() => goBack(), 3000);
      }
    } catch (error) {
      console.error("Error processing tournament entry fee:", error);
      setCurrentMessage("Error processing payment. Please try again.");
      setTimeout(() => goBack(), 3000);
    } finally {
      setTransactionPending(false);
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
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinningLine(null);
    
    // Disconnect from socket if connected
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // Handle game over (win or tie)
  const handleGameOver = (result: string | null, finalBoard: (string | null)[]) => {
    if (!result) return;
    
    if (result === "X") {
      // Player won
      setStatus(GameStatus.WON);
      if (gameMode === GameMode.COMPUTER) {
        updateGameResult('tic-tac-toe', 1000, true);
        addPoints(1000);
      } else if (tournamentMode) {
        processTournamentWin();
      }
    } else if (result === "O") {
      // Player lost
      setStatus(GameStatus.LOST);
      if (gameMode === GameMode.COMPUTER) {
        updateGameResult('tic-tac-toe', 200, false);
      }
    } else if (result === "TIE") {
      // Game tied
      setStatus(GameStatus.TIE);
      if (gameMode === GameMode.COMPUTER) {
        updateGameResult('tic-tac-toe', 500, false);
      }
    }
    
    // If in online mode, notify the other player
    if ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && socketRef.current) {
      socketRef.current.emit('game_over', {
        roomId,
        result,
        board: finalBoard,
        gameType: "tic-tac-toe"
      });
    }
  };

  // Render room creation form
  const renderRoomCreation = () => {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Create a Room</h2>
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-3 rounded-lg mb-4">
                  {currentMessage}
                </div>
              )}
              
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label htmlFor="playerName" className="block text-sm font-medium text-gray-300 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    name="playerName"
                    defaultValue={player1}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label htmlFor="betAmount" className="block text-sm font-medium text-gray-300 mb-1">
                    Bet Amount (coins)
                  </label>
                  <input
                    type="number"
                    id="betAmount"
                    name="betAmount"
                    defaultValue={betAmount}
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.0"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Winner takes 90% of the total bet. 10% is platform commission.
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
                  >
                    Create Room
                  </button>
                  
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render room join form
  const renderRoomJoin = () => {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Join a Room</h2>
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-3 rounded-lg mb-4">
                  {currentMessage}
                </div>
              )}
              
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label htmlFor="playerName" className="block text-sm font-medium text-gray-300 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    name="playerName"
                    defaultValue={player1}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label htmlFor="roomCode" className="block text-sm font-medium text-gray-300 mb-1">
                    Room Code
                  </label>
                  <input
                    type="text"
                    id="roomCode"
                    name="roomCode"
                    defaultValue={roomId}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter room code"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
                  >
                    Join Room
                  </button>
                  
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render tournament entry form
  const renderTournamentForm = () => {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Tournament Mode</h2>
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-3 rounded-lg mb-4">
                  {currentMessage}
                </div>
              )}
              
              {transactionPending ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
                  <p className="text-center">Processing transaction...</p>
                </div>
              ) : (
                <form onSubmit={handleTournamentEntry} className="space-y-4">
                  <div>
                    <label htmlFor="playerName" className="block text-sm font-medium text-gray-300 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="playerName"
                      name="playerName"
                      defaultValue={player1}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="betAmount" className="block text-sm font-medium text-gray-300 mb-1">
                      Bet Amount (coins)
                    </label>
                    <input
                      type="number"
                      id="betAmount"
                      name="betAmount"
                      defaultValue={betAmount}
                      min="0.1"
                      step="0.1"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Minimum 0.1 coins"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Winner takes 90% of the total bet. 10% is platform commission.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 p-3 bg-gray-700 rounded-md">
                    <div className="flex items-center space-x-2">
                      <FaCoins className="text-yellow-400" />
                      <span className="text-white">Your Balance:</span>
                    </div>
                    <span className="font-bold text-white">{wallet.balance?.toFixed(2) || "0.00"} coins</span>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
                      disabled={!wallet.connected}
                    >
                      Join Tournament
                    </button>
                    
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition"
                    >
                      Back
                    </button>
                  </div>
                  
                  {!wallet.connected && (
                    <div className="p-3 bg-yellow-900/50 border border-yellow-600 rounded-md text-yellow-200 text-sm">
                      Please connect your wallet to enter tournament mode
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render waiting screen
  const renderWaitingScreen = () => {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Waiting for Opponent</h2>
              
              <div className="flex justify-center mb-6">
                <div className="animate-spin">
                  <FaSpinner className="text-4xl text-blue-400" />
                </div>
              </div>
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-4 rounded-lg mb-6 text-center">
                  {currentMessage}
                </div>
              )}
              
              {roomId && (
                <div className="mb-6">
                  <div className="text-gray-300 mb-2 text-sm">Share this room code with a friend:</div>
                  <div className="flex items-center bg-gray-700 p-3 rounded-md">
                    <div className="flex-1 bg-gray-900 p-2 rounded text-white font-mono text-center">
                      {roomId}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(roomId);
                        setCurrentMessage("Room code copied to clipboard!");
                        setTimeout(() => setCurrentMessage("Waiting for opponent..."), 2000);
                      }}
                      className="ml-2 p-2 bg-gray-600 hover:bg-gray-500 rounded"
                      aria-label="Copy room ID"
                    >
                      <FaCopy className="text-white" />
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-gray-300 mb-2 text-sm">Or share this link:</div>
                    <div className="flex items-center bg-gray-700 p-3 rounded-md">
                      <div className="flex-1 bg-gray-900 p-2 rounded text-white font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                        {`${window.location.origin}/game/tic-tac-toe?join=${roomId}`}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/game/tic-tac-toe?join=${roomId}`);
                          setCurrentMessage("Link copied to clipboard!");
                          setTimeout(() => setCurrentMessage("Waiting for opponent..."), 2000);
                        }}
                        className="ml-2 p-2 bg-gray-600 hover:bg-gray-500 rounded"
                        aria-label="Copy link"
                      >
                        <FaShareAlt className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
                onClick={goBack}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render logic
  if (showRoomCreation) {
    return renderRoomCreation();
  }
  
  if (showRoomJoin) {
    return renderRoomJoin();
  }
  
  if (showTournamentForm) {
    return renderTournamentForm();
  }
  
  if (isWaitingForOpponent) {
    return renderWaitingScreen();
  }

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
            <h1 className="text-4xl font-bold mb-4 text-squid-pink">Tic Tac Toe</h1>
            <p className="text-xl max-w-3xl mx-auto">
              The classic game of X's and O's. Get three in a row to win!
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
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-md mx-auto">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold mb-2 text-squid-pink">Tic Tac Toe</h1>
              
              <div className="flex justify-center space-x-6 mb-4">
                <div className="flex items-center bg-gray-800 py-1 px-3 rounded-lg">
                  <span className="text-red-500 font-bold mr-2">X</span>
                  <span>{player1}</span>
                </div>
                
                <div className="flex items-center bg-gray-800 py-1 px-3 rounded-lg">
                  <span className="text-blue-500 font-bold mr-2">O</span>
                  <span>{player2}</span>
                </div>
              </div>
              
              {status === GameStatus.PLAYING && (
                <div className="bg-gray-800 py-2 px-4 rounded-lg inline-block mb-4">
                  <p className="text-lg">
                    <span className="font-bold" style={{ color: isXNext ? "#EF4444" : "#3B82F6" }}>
                      {isXNext ? player1 : player2}
                    </span>'s turn ({isXNext ? "X" : "O"})
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
              
              {transactionPending && (
                <div className="flex justify-center items-center mb-4">
                  <FaSpinner className="animate-spin text-squid-pink mr-2" />
                  <span>Processing transaction...</span>
                </div>
              )}
            </div>
            
            {/* Game board */}
            <div className="grid grid-cols-3 gap-2 bg-gray-800 p-4 rounded-xl shadow-xl mb-6">
              {board.map((cell, index) => (
                <motion.button
                  key={index}
                  whileHover={cell === null && status === GameStatus.PLAYING ? { scale: 1.05 } : {}}
                  whileTap={cell === null && status === GameStatus.PLAYING ? { scale: 0.95 } : {}}
                  className={`aspect-square flex items-center justify-center text-4xl font-bold rounded bg-gray-700 
                    ${winningLine?.includes(index) ? 'bg-squid-pink bg-opacity-30' : ''}
                    ${cell === null && status === GameStatus.PLAYING ? 'hover:bg-gray-600 cursor-pointer' : ''}
                  `}
                  onClick={() => handleCellClick(index)}
                  disabled={cell !== null || status !== GameStatus.PLAYING}
                >
                  {cell === "X" && <span className="text-red-500">X</span>}
                  {cell === "O" && <span className="text-blue-500">O</span>}
                </motion.button>
              ))}
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
                  <label htmlFor="player1" className="block text-sm font-medium mb-2">Player 1 (X)</label>
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
                    <label htmlFor="player2" className="block text-sm font-medium mb-2">Player 2 (O)</label>
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
  
  // Single return statement for the component
  return <div>Loading...</div>;
} 