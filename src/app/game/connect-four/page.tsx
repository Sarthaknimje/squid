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
  name: string;
  color: "red" | "yellow";
  isComputer?: boolean;
  address?: string;
};

export default function ConnectFourPage() {
  const router = useRouter();
  const { agent } = useAIAgent();
  const { wallet } = useAptosWallet();
  const { updateGameResult, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();

  // Game state
  const [board, setBoard] = useState<string[][]>(Array(6).fill(0).map(() => Array(7).fill("")));
  const [currentPlayer, setCurrentPlayer] = useState<"red" | "yellow">("red");
  const [winner, setWinner] = useState<string | null>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.NOT_STARTED);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.NOT_SELECTED);
  const [roomId, setRoomId] = useState<string>("");
  const [player1, setPlayer1] = useState<Player>({ name: "", color: "red" });
  const [player2, setPlayer2] = useState<Player>({ name: "", color: "yellow" });
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

  useEffect(() => {
    // Track that this game was played
    trackGamePlayed('connect-four');
    
    // Cleanup socket connection when unmounting
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [trackGamePlayed]);

  // Handle computer moves when it's the computer's turn
  useEffect(() => {
    if (gameMode === GameMode.COMPUTER && status === GameStatus.PLAYING && !isPlayerTurn && !winner) {
      // Add a small delay to simulate "thinking"
      const timeout = setTimeout(() => {
        makeComputerMove();
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [isPlayerTurn, gameMode, status, winner]);
  
  // Initialize socket connection for online play
  const initializeSocket = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log("Socket already connected");
      return socketRef.current;
    }
    
    try {
      console.log("Initializing socket connection to http://localhost:3001");
      setCurrentMessage("Connecting to server...");
      
      // Connect to socket server
      const socket = io("http://localhost:3001", {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });
      
      socketRef.current = socket;
      
      // Socket connection handlers
      socket.on("connect", () => {
        console.log("Connected to socket server:", socket.id);
        setCurrentMessage("Connected to server ✓");
      });
      
      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setCurrentMessage(`Connection error: ${error.message}`);
      });
      
      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setCurrentMessage(`Disconnected: ${reason}`);
      });
      
      // Room events
      socket.on("room_created", (data: {roomId: string, betAmount?: string}) => {
        console.log("Room created:", data);
        setRoomId(data.roomId);
        setBetAmount(data.betAmount || "0");
        setIsWaitingForOpponent(true);
        setCurrentMessage(`Room created! Share code: ${data.roomId}`);
      });
      
      socket.on("player_joined", (data: {playerName: string}) => {
        console.log("Player joined:", data);
        setPlayer2({...player2, name: data.playerName});
        setIsWaitingForOpponent(false);
        setShowGameBoard(true);
        setStatus(GameStatus.PLAYING);
        
        // Reset any game over state if it was set
        if (status === GameStatus.WON || status === GameStatus.LOST) {
          setStatus(GameStatus.PLAYING);
        }
        
        setCurrentMessage(`${data.playerName} has joined the game!`);
      });
      
      socket.on("game_started", (data: {opponentName: string}) => {
        console.log("Game started:", data);
        setPlayer2({...player2, name: data.opponentName});
        setIsWaitingForOpponent(false);
        setShowGameBoard(true);
        setStatus(GameStatus.PLAYING);
        
        // Reset any game over state if it was set
        if (status === GameStatus.WON || status === GameStatus.LOST) {
          setStatus(GameStatus.PLAYING);
        }
        
        setCurrentMessage(`Game started with ${data.opponentName}!`);
      });
      
      socket.on("move_made", (data: {col: number, color: "red" | "yellow"}) => {
        console.log("Move made:", data);
        dropPiece(data.col, data.color, false);
        setIsPlayerTurn(true);
      });
      
      socket.on("game_reset", () => {
        console.log("Game reset received");
        resetBoard();
      });
      
      socket.on("opponent_disconnected", () => {
        console.log("Opponent disconnected");
        setCurrentMessage("Your opponent has disconnected.");
        setStatus(GameStatus.WON);
      });
      
      socket.on("tournament_match_found", (data) => {
        console.log("Tournament match found:", data);
        try {
          setRoomId(data.roomId || "");
          setPlayer2({...player2, name: data.opponentName || "Opponent"});
          setIsWaitingForOpponent(false);
          setBetAmount(data.betAmount ? data.betAmount.toString() : "0.2");
          setCurrentMessage(`Match found! Playing against ${data.opponentName}`);
          setShowGameBoard(true);
          setStatus(GameStatus.PLAYING);
          setTournamentMode(true);
          
          // Reset any game over state if it was set
          if (status === GameStatus.WON || status === GameStatus.LOST) {
            setStatus(GameStatus.PLAYING);
          }
          
          // Reset the board
          resetBoard();
        } catch (error) {
          console.error("Error handling tournament match:", error);
        }
      });
      
      socket.on("waiting_for_opponent", (data) => {
        console.log("Waiting for opponent:", data);
        setCurrentMessage(data.message || "Waiting for opponent...");
      });
      
      socket.on("bet_won", (data) => {
        console.log("Bet won:", data);
        setCurrentMessage(`You won ${data.amount} SQUID! (10% commission deducted)`);
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
  
  // Select game mode
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
      setPlayer1({name: player1Name, color: "red"});
      setPlayer2({name: player2Name, color: "yellow", isComputer: true});
    } else {
      setPlayer1({name: player1Name, color: "red"});
      setPlayer2({name: player2Name || "Player 2", color: "yellow"});
    }
    
    setShowEntryForm(false);
    setShowGameBoard(true);
    setStatus(GameStatus.PLAYING);
  };
  
  // Handle tournament entry
  const handleTournamentEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!player1) {
      setCurrentMessage("Please enter your name");
      return;
    }
    
    if (!betAmount || isNaN(parseFloat(betAmount)) || parseFloat(betAmount) <= 0) {
      setCurrentMessage("Please enter a valid bet amount");
      return;
    }
    
    try {
      // Check if wallet is connected
      if (!wallet.connected) {
        setCurrentMessage("Please connect your wallet to place a bet");
        return;
      }
      
      setTransactionPending(true);
      setCurrentMessage("Processing tournament entry fee...");
      
      // Process the tournament entry fee using wallet
      let transactionHash;
      try {
        const result = await payTournamentEntryFee(betAmount);
        if (result && result.hash) {
          transactionHash = result.hash;
          setCurrentMessage("Entry fee paid! Finding opponent...");
        } else {
          setTransactionPending(false);
          setCurrentMessage("Failed to process entry fee. Please try again.");
          return;
        }
      } catch (err) {
        console.error("Error processing entry fee:", err);
        setTransactionPending(false);
        setCurrentMessage("Error processing payment. Please try again.");
        return;
      }
      
      setTransactionPending(false);
      setCurrentMessage("Connecting to matchmaking server...");
      
      // Initialize socket if not already done
      const socket = initializeSocket();
      
      if (!socket) {
        setCurrentMessage("Failed to connect to server. Please try again.");
        return;
      }
      
      if (!socket.connected) {
        setCurrentMessage("Waiting for connection to server...");
        
        // Wait a bit and retry
        setTimeout(() => {
          if (socket.connected) {
            sendMatchRequest(socket, transactionHash);
          } else {
            setCurrentMessage("Connection failed. Please try again.");
          }
        }, 2000);
      } else {
        sendMatchRequest(socket, transactionHash);
      }
    } catch (error) {
      console.error("Error joining tournament:", error);
      setCurrentMessage("Error joining tournament. Please try again.");
      setTransactionPending(false);
    }
  };
  
  // Send match request to server
  const sendMatchRequest = (socket, transactionHash = "pending") => {
    console.log("Sending find_match request with game type: connect-four, bet amount:", betAmount);
    setCurrentMessage(`Looking for opponent with ${betAmount} SQUID bet...`);
    
    socket.emit('find_match', {
      playerName: player1,
      betAmount,
      gameType: "connect-four",
      transactionHash // Pass the actual transaction hash
    });
    
    setShowTournamentForm(false);
    setIsWaitingForOpponent(true);
  };
  
  // Handle creating a room with betting
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!player1) {
      setCurrentMessage("Please enter your name");
      return;
    }
    
    try {
      // For betting rooms, check wallet connection
      if (parseFloat(betAmount) > 0 && !wallet.connected) {
        setCurrentMessage("Please connect your wallet to create a betting room");
        return;
      }
      
      // If betting amount is set, process payment
      let transactionHash = null;
      if (parseFloat(betAmount) > 0) {
        setTransactionPending(true);
        setCurrentMessage("Processing room creation fee...");
        
        try {
          const result = await payTournamentEntryFee(betAmount);
          if (result && result.hash) {
            transactionHash = result.hash;
            setCurrentMessage("Room fee paid! Creating room...");
          } else {
            setTransactionPending(false);
            setCurrentMessage("Failed to process room fee. Please try again.");
            return;
          }
        } catch (err) {
          console.error("Error processing room fee:", err);
          setTransactionPending(false);
          setCurrentMessage("Error processing payment. Please try again.");
          return;
        }
        
        setTransactionPending(false);
      }
      
      setShowRoomCreation(false);
      setCurrentMessage("Connecting to server...");
      
      // Initialize socket
      const socket = initializeSocket();
      
      if (!socket) {
        setCurrentMessage("Failed to connect to server. Please try again.");
        return;
      }
      
      // Create room with delay to ensure connection
      setTimeout(() => {
        if (socket.connected) {
          console.log("Creating room with player name:", player1, "and bet amount:", betAmount);
          socket.emit('create_room', {
            playerName: player1,
            gameType: "connect-four",
            betAmount: betAmount || "0", // Include bet amount with room creation
            transactionHash
          });
        } else {
          console.log("Socket not connected, waiting...");
          // Try again after a delay
          setTimeout(() => {
            if (socket.connected) {
              console.log("Creating room (second attempt)");
              socket.emit('create_room', {
                playerName: player1,
                gameType: "connect-four",
                betAmount: betAmount || "0",
                transactionHash
              });
            } else {
              setCurrentMessage("Connection failed. Please try again.");
            }
          }, 2000);
        }
      }, 1000);
    } catch (error) {
      console.error("Error creating room:", error);
      setCurrentMessage("Error creating room. Please try again.");
      setTransactionPending(false);
    }
  };
  
  // Handle joining a room with betting
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!player1 || !roomId) {
      setCurrentMessage("Please enter your name and room ID");
      return;
    }
    
    try {
      setShowRoomJoin(false);
      setCurrentMessage("Checking room details...");
      
      // Initialize socket to check room
      const socket = initializeSocket();
      
      if (!socket) {
        setCurrentMessage("Failed to connect to server. Please try again.");
        return;
      }
      
      // Check if room exists and if it has a bet
      socket.emit('check_room', { roomId }, async (response) => {
        if (!response.exists) {
          setCurrentMessage("Room not found. Please check the room ID and try again.");
          setShowRoomJoin(true);
          return;
        }
        
        // If room has a bet, process payment
        let transactionHash = null;
        if (response.betAmount && parseFloat(response.betAmount) > 0) {
          // Check wallet connection
          if (!wallet.connected) {
            setCurrentMessage("Please connect your wallet to join this betting room");
            setShowRoomJoin(true);
            return;
          }
          
          setBetAmount(response.betAmount);
          setTransactionPending(true);
          setCurrentMessage(`Processing room entry fee (${response.betAmount} SQUID)...`);
          
          try {
            const result = await payTournamentEntryFee(response.betAmount);
            if (result && result.hash) {
              transactionHash = result.hash;
              setCurrentMessage("Room fee paid! Joining room...");
            } else {
              setTransactionPending(false);
              setCurrentMessage("Failed to process room fee. Please try again.");
              setShowRoomJoin(true);
              return;
            }
          } catch (err) {
            console.error("Error processing room fee:", err);
            setTransactionPending(false);
            setCurrentMessage("Error processing payment. Please try again.");
            setShowRoomJoin(true);
            return;
          }
          
          setTransactionPending(false);
        }
        
        // Join room with delay to ensure connection
        setTimeout(() => {
          if (socket.connected) {
            console.log("Joining room:", roomId, "with player name:", player1);
            socket.emit('join_room', {
              roomId,
              playerName: player1,
              gameType: "connect-four",
              transactionHash
            });
            setCurrentMessage(`Joining room ${roomId}...`);
          } else {
            console.log("Socket not connected, waiting...");
            // Try again after a delay
            setTimeout(() => {
              if (socket.connected) {
                console.log("Joining room (second attempt)");
                socket.emit('join_room', {
                  roomId,
                  playerName: player1,
                  gameType: "connect-four",
                  transactionHash
                });
              } else {
                setCurrentMessage("Connection failed. Please try again.");
                setShowRoomJoin(true);
              }
            }, 2000);
          }
        }, 1000);
      });
    } catch (error) {
      console.error("Error joining room:", error);
      setCurrentMessage("Error joining room. Please try again.");
      setTransactionPending(false);
      setShowRoomJoin(true);
    }
  };
  
  // Drop a piece in a column
  const dropPiece = (col: number, playerColor?: "red" | "yellow", emitMove = true) => {
    // Prevent moves if game not in progress
    if (status !== GameStatus.PLAYING || winner || !isValidMove(col)) {
      return;
    }
    
    // Prevent move if it's not the player's turn in online modes
    if ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && !isPlayerTurn) {
      return;
    }
    
    const color = playerColor || currentPlayer;
    const newBoard = [...board];
    
    // Find the lowest empty cell in the column
    for (let row = 5; row >= 0; row--) {
      if (newBoard[row][col] === "") {
        newBoard[row][col] = color;
        setBoard(newBoard);
        
        // Handle online game move
        if (emitMove && (gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && socketRef.current) {
          socketRef.current.emit("make_move", {
            roomId,
            col,
            color
          });
          setIsPlayerTurn(false);
        } else if (gameMode === GameMode.COMPUTER && emitMove) {
          setIsPlayerTurn(false);
        }
        
        // Switch players if not computer or online mode where we're waiting
        if (gameMode === GameMode.LOCAL_MULTIPLAYER || 
            (gameMode === GameMode.COMPUTER && isPlayerTurn) || 
            ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && isPlayerTurn)) {
          setCurrentPlayer(currentPlayer === "red" ? "yellow" : "red");
        }
        
        // Check for winner
        checkForWinner(newBoard);
        break;
      }
    }
  };
  
  // Check if a move is valid
  const isValidMove = (col: number): boolean => {
    return board[0][col] === "";
  };
  
  // Make a computer move
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
  
  // Check if a player can win with a move
  const canWinWithMove = (col: number, color: string): boolean => {
    const testBoard = board.map(row => [...row]);
    
    // Find the lowest empty cell in the column
    for (let row = 5; row >= 0; row--) {
      if (testBoard[row][col] === "") {
        testBoard[row][col] = color;
        
        // Check for a win with this move
        if (checkForWinningPattern(testBoard, color)) {
          return true;
        }
        
        return false;
      }
    }
    
    return false;
  };
  
  // Check for a winner
  const checkForWinner = (currentBoard: string[][]) => {
    // Check for a winner
    if (checkForWinningPattern(currentBoard, "red")) {
      setWinner("red");
      if (player1.color === "red") {
        setStatus(GameStatus.WON);
        updateGameResult('connect-four', 1200, true);
        if (tournamentMode) {
          processTournamentWin();
        }
      } else {
        setStatus(GameStatus.LOST);
        updateGameResult('connect-four', 200, false);
      }
      return true;
    }
    
    if (checkForWinningPattern(currentBoard, "yellow")) {
      setWinner("yellow");
      if (player1.color === "yellow") {
        setStatus(GameStatus.WON);
        updateGameResult('connect-four', 1200, true);
        if (tournamentMode) {
          processTournamentWin();
        }
      } else {
        setStatus(GameStatus.LOST);
        updateGameResult('connect-four', 200, false);
      }
      return true;
    }
    
    // Check for a tie (full board)
    if (currentBoard[0].every(cell => cell !== "")) {
      setStatus(GameStatus.TIE);
      updateGameResult('connect-four', 500, false);
      return true;
    }
    
    return false;
  };
  
  // Check for winning patterns
  const checkForWinningPattern = (currentBoard: string[][], color: string): boolean => {
    // Check horizontal
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        if (currentBoard[row][col] === color && 
            currentBoard[row][col+1] === color && 
            currentBoard[row][col+2] === color && 
            currentBoard[row][col+3] === color) {
          return true;
        }
      }
    }
    
    // Check vertical
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 7; col++) {
        if (currentBoard[row][col] === color && 
            currentBoard[row+1][col] === color && 
            currentBoard[row+2][col] === color && 
            currentBoard[row+3][col] === color) {
          return true;
        }
      }
    }
    
    // Check diagonal (down-right)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        if (currentBoard[row][col] === color && 
            currentBoard[row+1][col+1] === color && 
            currentBoard[row+2][col+2] === color && 
            currentBoard[row+3][col+3] === color) {
          return true;
        }
      }
    }
    
    // Check diagonal (up-right)
    for (let row = 3; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        if (currentBoard[row][col] === color && 
            currentBoard[row-1][col+1] === color && 
            currentBoard[row-2][col+2] === color && 
            currentBoard[row-3][col+3] === color) {
          return true;
        }
      }
    }
    
    return false;
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
      addPoints(1200);
      unlockAchievement('tournament_win', 'connect-four');
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionPending(false);
      setCurrentMessage("Failed to process winnings. Please contact support.");
    }
  };
  
  // Reset the game board
  const resetBoard = () => {
    setBoard(Array(6).fill(0).map(() => Array(7).fill("")));
    setCurrentPlayer("red");
    setWinner(null);
    setStatus(GameStatus.PLAYING);
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
    resetBoard();
    
    // Disconnect from socket if connected
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // Render game mode selection
  if (gameMode === GameMode.NOT_SELECTED) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-4xl font-bold mb-4 text-squid-pink">Connect Four</h1>
            <p className="text-xl max-w-3xl mx-auto">
              Drop your colored discs to connect four in a row and win!
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
  
  // Render player names form (similar to Tic Tac Toe)
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
                    <label htmlFor="player2" className="block text-sm font-medium mb-2">Player 2 (Yellow)</label>
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
  
  // Tournament form, Room Creation, Room Join (similar to Tic Tac Toe)
  // ... skipping these for brevity (they're very similar to Tic Tac Toe) ...
  
  // Render game board
  if (showGameBoard) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 text-center">
              <h1 className="text-3xl font-bold mb-2 text-squid-pink">Connect Four</h1>
              
              {status === GameStatus.PLAYING && (
                <div className="bg-gray-800 py-2 px-4 rounded-lg inline-block mb-4">
                  <p className="text-lg">
                    <span className="font-bold" style={{ color: currentPlayer === "red" ? "#EF4444" : "#EAB308" }}>
                      {currentPlayer === "red" ? player1.name : player2.name}
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
            
            <div className="bg-blue-900 p-4 rounded-xl shadow-xl mb-6">
              {/* Column selector buttons */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                  <button
                    key={`btn-${col}`}
                    onClick={() => dropPiece(col)}
                    disabled={!isValidMove(col) || status !== GameStatus.PLAYING || 
                              (gameMode !== GameMode.LOCAL_MULTIPLAYER && !isPlayerTurn)}
                    className={`w-full py-1 rounded-t-md ${
                      isValidMove(col) && status === GameStatus.PLAYING && 
                      (gameMode === GameMode.LOCAL_MULTIPLAYER || isPlayerTurn) 
                        ? 'bg-blue-700 hover:bg-blue-600' 
                        : 'bg-blue-800 cursor-not-allowed'
                    }`}
                  >
                    ▼
                  </button>
                ))}
              </div>
              
              {/* Game board */}
              <div className="bg-blue-800 p-2 rounded-lg">
                {board.map((row, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="flex">
                    {row.map((cell, colIndex) => (
                      <div
                        key={`cell-${rowIndex}-${colIndex}`}
                        className="w-full aspect-square p-1"
                      >
                        <div className={`w-full h-full rounded-full ${
                          cell === "red" ? 'bg-red-500' : 
                          cell === "yellow" ? 'bg-yellow-400' : 
                          'bg-gray-700'
                        }`}></div>
                      </div>
                    ))}
                  </div>
                ))}
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
                  onClick={resetBoard}
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
  
  // Tournament form
  if (showTournamentForm) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Tournament Mode</h2>
              
              <p className="text-gray-300 mb-6">
                In tournament mode, you'll be matched with another player who is betting a similar amount. 
                Winner takes 90% of the pot (10% platform fee).
              </p>
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-3 rounded-lg mb-4">
                  {currentMessage}
                </div>
              )}
              
              <div className="mb-6">
                <label htmlFor="betAmount" className="block text-sm font-medium mb-2">Bet Amount (APTOS)</label>
                <div className="relative">
                  <input
                    type="number"
                    id="betAmount"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    step="0.1"
                    min="0.1"
                    className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-squid-pink"
                    disabled={transactionPending}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FaCoins className="text-yellow-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum bet: 0.1 APTOS</p>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={goBack}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                  disabled={transactionPending}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleTournamentEntry}
                  className={`bg-squid-pink hover:bg-opacity-80 text-white py-2 px-6 rounded flex items-center ${
                    transactionPending ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  disabled={transactionPending}
                >
                  {transactionPending ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaTrophy className="mr-2" />
                      Enter Tournament
                    </>
                  )}
                </button>
              </div>
              
              {wallet.connected && (
                <div className="mt-4 p-2 bg-gray-700 rounded text-xs text-center">
                  <p className="text-gray-300">Connected: {wallet.address?.substring(0, 10)}...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Room Creation
  if (showRoomCreation) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Create or Join Room</h2>
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-3 rounded-lg mb-4">
                  {currentMessage}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={handleCreateRoom}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex flex-col items-center"
                >
                  <div className="text-3xl mb-2">🎮</div>
                  <span className="font-medium">Create Room</span>
                </button>
                
                <button
                  onClick={() => setShowRoomJoin(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex flex-col items-center"
                >
                  <div className="text-3xl mb-2">🎲</div>
                  <span className="font-medium">Join Room</span>
                </button>
              </div>
              
              <button
                onClick={goBack}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Room Join
  if (showRoomJoin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Join Room</h2>
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-3 rounded-lg mb-4">
                  {currentMessage}
                </div>
              )}
              
              <form onSubmit={handleJoinRoom}>
                <div className="mb-6">
                  <label htmlFor="roomId" className="block text-sm font-medium mb-2">Room Code</label>
                  <input
                    type="text"
                    id="roomId"
                    name="roomId"
                    className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-squid-pink"
                    placeholder="Enter the 6-digit room code"
                    required
                    pattern="[a-zA-Z0-9]{6}"
                    title="Room code should be 6 characters"
                  />
                </div>
                
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setShowRoomJoin(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="bg-squid-pink hover:bg-opacity-80 text-white py-2 px-6 rounded"
                  >
                    Join Game
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Waiting for opponent view
  if (isWaitingForOpponent) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-6 text-squid-pink">Waiting for Opponent</h2>
              
              <div className="flex justify-center mb-6">
                <div className="animate-spin text-4xl text-blue-500">
                  <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              </div>
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-3 rounded-lg mb-6">
                  {currentMessage}
                </div>
              )}
              
              {roomId && (
                <div className="mb-6">
                  <p className="text-gray-300 mb-2">Share this code with your friend:</p>
                  <div className="bg-gray-700 p-3 rounded-lg font-mono text-xl tracking-wider">
                    {roomId}
                  </div>
                </div>
              )}
              
              <button
                onClick={goBack}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // This should never happen but adding as a fallback
  return <div>Loading...</div>;
} 