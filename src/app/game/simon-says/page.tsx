"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { FaUserFriends, FaRobot, FaShareAlt, FaHome, FaTrophy, FaCoins, FaSpinner, FaCopy } from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import { useAptosWallet } from "@/contexts/AptosWalletContext";
import { usePlayerProgress } from "@/contexts/PlayerProgressContext";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { payTournamentEntryFee, payTournamentWinnings, createGameEscrowContract, releaseEscrowToWinner } from '@/lib/petraWalletService';
import SimonSaysGame from "@/components/games/SimonSaysGame";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

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

export default function SimonSaysPage() {
  const router = useRouter();
  const { agent } = useAIAgent();
  const { wallet } = useAptosWallet();
  const { updateGameResult, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();

  // Game state
  const [status, setStatus] = useState<GameStatus>(GameStatus.NOT_STARTED);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.NOT_SELECTED);
  
  // UI States
  const [showEntryForm, setShowEntryForm] = useState<boolean>(false);
  const [showRoomCreation, setShowRoomCreation] = useState<boolean>(false);
  const [showRoomJoin, setShowRoomJoin] = useState<boolean>(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>("");
  const [player1, setPlayer1] = useState<string>("");
  const [player2, setPlayer2] = useState<string>("");
  const [betAmount, setBetAmount] = useState<string>("0.2");
  const [tournamentMode, setTournamentMode] = useState<boolean>(false);
  const [showTournamentForm, setShowTournamentForm] = useState<boolean>(false);
  const [transactionPending, setTransactionPending] = useState<boolean>(false);
  const [showGameBoard, setShowGameBoard] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [connectionMessage, setConnectionMessage] = useState<string>("");
  const [roomState, setRoomState] = useState<string>("initial");
  const [isHost, setIsHost] = useState<boolean>(false);
  
  const socketRef = useRef<Socket | null>(null);

  // Check URL parameters for room joining
  useEffect(() => {
    // Only run once on mount
    const checkUrlParams = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const joinRoomId = params.get('join');
        
        if (joinRoomId) {
          console.log("Found room ID in URL:", joinRoomId);
          setRoomId(joinRoomId);
          setGameMode(GameMode.ROOM);
          setShowRoomJoin(true);
          
          // Can also set a default name if needed
          if (!player1) {
            setPlayer1("Guest");
          }
        }
      }
    };
    
    checkUrlParams();
    trackGamePlayed('simon-says');
    
    // Cleanup socket connection when unmounting
    return () => {
      if (socketRef.current) {
        console.log("Disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [trackGamePlayed]); // Include trackGamePlayed in dependencies

  // Create socket on component mount
  useEffect(() => {
    // Try to initialize socket
    const socket = initializeSocket();
    
    return () => {
      // Clean up socket on unmount
      if (socketRef.current) {
        console.log("Disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Function to initialize socket connection
  const initializeSocket = () => {
    if (socketRef.current) {
      console.log("Socket already initialized, returning existing socket");
      return socketRef.current;
    }

    console.log("Initializing new socket connection");
    try {
      // Connect directly to localhost:3001 for simplicity
      const newSocket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Socket connect event
      newSocket.on('connect', () => {
        console.log('Socket connected!', newSocket.id);
        setConnected(true);
        setConnectionMessage("Connected to game server ✓");
      });

      // Socket errors
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
        setConnectionMessage("Connection error, please try again");
      });
      
      // Room events
      newSocket.on("room_created", (data) => {
        console.log("Room created event received:", data);
        setRoomId(data.roomId);
        setIsWaitingForOpponent(true);
        setCurrentMessage(`Room created! Share this code with your friend: ${data.roomId}`);
      });
      
      newSocket.on("player_joined", (data) => {
        console.log("Player joined event received:", data);
        setPlayer2(data.players[1] || "Opponent");
        setIsWaitingForOpponent(false);
        setShowGameBoard(true);
        setStatus(GameStatus.PLAYING);
        setCurrentMessage(`${data.players[1] || "Opponent"} has joined the game!`);
      });
      
      newSocket.on("game_started", (data) => {
        console.log("Game started event received:", data);
        if (data.players && data.players.length > 1) {
          setPlayer2(data.players.find(p => p !== player1) || "Opponent");
        }
        setIsWaitingForOpponent(false);
        setShowGameBoard(true);
        setStatus(GameStatus.PLAYING);
        setCurrentMessage("Game started!");
      });
      
      newSocket.on("tournament_match_found", (data) => {
        console.log("Tournament match found event received:", data);
        setRoomId(data.roomId || "");
        if (data.players && data.players.length > 1) {
          setPlayer2(data.players.find(p => p !== player1) || "Opponent");
        }
        setRoomState("matched");
        setIsWaitingForOpponent(false);
        setShowGameBoard(true);
        setStatus(GameStatus.PLAYING);
        setTournamentMode(true);
        setCurrentMessage(`Match found! Game starting`);
      });

      // Store socket in ref
      socketRef.current = newSocket;
      return newSocket;
    } catch (err) {
      console.error("Error initializing socket:", err);
      setConnectionMessage("Failed to connect to game server");
      return null;
    }
  };

  // Handle game over callback from the game component
  const handleGameOver = async (result: 'won' | 'lost' | 'tie', score: number) => {
    console.log(`Game over: ${result} with score ${score}`);
    
    // Update status based on result
    if (result === 'won') {
      setStatus(GameStatus.WON);
      updateGameResult('simon-says', true);
      addPoints(score);
      
      // Show achievements based on score
      if (score >= 10) {
        unlockAchievement('simon_master', 'Simon Says Master', 'Reached level 10 in Simon Says');
      }
    } else if (result === 'lost') {
      setStatus(GameStatus.LOST);
      updateGameResult('simon-says', false);
    } else {
      // Tie
      updateGameResult('simon-says', false);
    }
    
    // If in tournament mode or betting mode and player won, handle the payment
    if ((tournamentMode || gameMode === GameMode.ONLINE_MULTIPLAYER) && result === 'won' && wallet?.address) {
      try {
        setTransactionPending(true);
        setCurrentMessage("Processing tournament winnings...");
        
        if (socketRef.current) {
          // Notify server about the win to update tournament brackets
          socketRef.current.emit('tournament_result', {
            roomId,
            player: player1,
            walletAddress: wallet.address,
            result: 'won'
          });
        }
        
        // Release escrow contract funds to winner
        const releaseResult = await releaseEscrowToWinner(
          `0xESCROW${roomId.padStart(58, '0')}`, // Generate escrow address same as creation
          wallet.address,
          betAmount
        );
        
        if (releaseResult.hash) {
          setCurrentMessage(`You won ${parseFloat(betAmount) * 2} APT! Transaction: ${releaseResult.hash.substring(0, 10)}...`);
        } else {
          setCurrentMessage("Tournament completed! You won, but there was an issue processing the payment.");
        }
      } catch (error) {
        console.error("Error paying winnings:", error);
        setCurrentMessage("Error processing winnings. Please contact support.");
      } finally {
        setTransactionPending(false);
      }
    }
  };

  // Reset game state
  const resetGame = () => {
    setStatus(GameStatus.NOT_STARTED);
    setShowGameBoard(false);
    setIsWaitingForOpponent(false);
    setCurrentMessage("");
  };

  // Start game with selected mode
  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    
    if (mode === GameMode.COMPUTER) {
      // Start game against AI
      setPlayer1("You");
      setPlayer2("AI");
      setStatus(GameStatus.PLAYING);
      setShowGameBoard(true);
    } 
    else if (mode === GameMode.LOCAL_MULTIPLAYER) {
      // Start local multiplayer game
      setShowEntryForm(true);
    }
    else if (mode === GameMode.ONLINE_MULTIPLAYER) {
      // Show tournament/betting options
      setShowTournamentForm(true);
    }
    else if (mode === GameMode.ROOM) {
      // Show room options
      setShowRoomCreation(true);
    }
  };

  // Handle player name submission
  const handlePlayerNamesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(GameStatus.PLAYING);
    setShowGameBoard(true);
    setShowEntryForm(false);
  };

  // Handle tournament match
  const handleTournamentMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Tournament match button clicked");
    
    if (!player1) {
      setCurrentMessage("Please enter your name");
      return;
    }
    
    if (!betAmount || isNaN(parseFloat(betAmount)) || parseFloat(betAmount) <= 0) {
      setCurrentMessage("Please enter a valid bet amount");
      return;
    }
    
    try {
      setCurrentMessage("Creating escrow contract...");
      setTransactionPending(true);
      
      // Check if wallet is connected
      if (!wallet?.address) {
        setCurrentMessage("Please connect your Petra wallet first");
        setTransactionPending(false);
        return;
      }
      
      // Create temporary room ID for escrow
      const tempRoomId = `simon-${Date.now()}`;
      
      // Create escrow contract for the bet
      const { hash, escrowAddress } = await createGameEscrowContract(
        tempRoomId,
        betAmount,
        "0x0" // opponent address will be filled when matched
      );
      
      if (!hash || !escrowAddress) {
        setCurrentMessage("Failed to create escrow contract. Please try again.");
        setTransactionPending(false);
        return;
      }
      
      setCurrentMessage(`Escrow contract created! Looking for opponent...`);
      setTransactionPending(false);
      
      // Initialize socket if not already done
      const socket = initializeSocket();
      
      if (!socket) {
        setCurrentMessage("Failed to connect to server. Please try again.");
        return;
      }
      
      // Wait a bit to ensure connection
      setTimeout(() => {
        if (socket.connected) {
          console.log("Sending find_match request with escrow info");
          socket.emit('find_match', {
            playerName: player1,
            betAmount,
            escrowAddress,
            walletAddress: wallet.address,
            gameType: "simon-says"
          });
          
          setShowTournamentForm(false);
          setIsWaitingForOpponent(true);
          setRoomState("waiting");
        } else {
          console.log("Socket not connected, trying again...");
          // Try again after a delay
          setTimeout(() => {
            if (socket.connected) {
              console.log("Sending find_match request (retry)");
              socket.emit('find_match', {
                playerName: player1,
                betAmount,
                escrowAddress,
                walletAddress: wallet.address,
                gameType: "simon-says"
              });
              
              setShowTournamentForm(false);
              setIsWaitingForOpponent(true);
              setRoomState("waiting");
            } else {
              setCurrentMessage("Connection failed. Please try again.");
            }
          }, 2000);
        }
      }, 1000);
    } catch (error) {
      console.error("Error joining tournament:", error);
      setCurrentMessage("Error joining tournament. Please try again.");
      setTransactionPending(false);
    }
  };
  
  // Handle create room
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Create room button clicked");
    
    if (!player1) {
      setCurrentMessage("Please enter your name");
      return;
    }
    
    try {
      setShowRoomCreation(false);
      setCurrentMessage("Creating room...");
      
      // Initialize socket
      const socket = initializeSocket();
      
      if (!socket) {
        setCurrentMessage("Failed to connect to server. Please try again.");
        return;
      }
      
      // Create room after a short delay to ensure connection
      setTimeout(() => {
        if (socket.connected) {
          console.log("Creating room with player:", player1);
          socket.emit('create_room', {
            playerName: player1,
            gameType: "simon-says",
            betAmount: betAmount || "0"
          });
        } else {
          console.log("Socket not connected, trying again...");
          setTimeout(() => {
            if (socket.connected) {
              console.log("Creating room (retry)");
              socket.emit('create_room', {
                playerName: player1,
                gameType: "simon-says",
                betAmount: betAmount || "0"
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
    }
  };
  
  // Handle join room
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Join room button clicked");
    
    if (!player1 || !roomId) {
      setCurrentMessage("Please enter your name and room ID");
      return;
    }
    
    try {
      setShowRoomJoin(false);
      setCurrentMessage("Joining room...");
      
      // Initialize socket
      const socket = initializeSocket();
      
      if (!socket) {
        setCurrentMessage("Failed to connect to server. Please try again.");
        return;
      }
      
      // Join room
      setTimeout(() => {
        if (socket.connected) {
          console.log("Joining room:", roomId);
          socket.emit('join_room', {
            roomId,
            playerName: player1,
            gameType: "simon-says"
          });
        } else {
          console.log("Socket not connected, trying again...");
          setTimeout(() => {
            if (socket.connected) {
              console.log("Joining room (retry)");
              socket.emit('join_room', {
                roomId,
                playerName: player1,
                gameType: "simon-says"
              });
            } else {
              setCurrentMessage("Connection failed. Please try again.");
            }
          }, 2000);
        }
      }, 1000);
    } catch (error) {
      console.error("Error joining room:", error);
      setCurrentMessage("Error joining room. Please try again.");
    }
  };

  // Cancel matchmaking
  const handleCancelMatchmaking = () => {
    if (socketRef.current) {
      socketRef.current.emit('cancel_matchmaking');
      setCurrentMessage("Matchmaking cancelled");
      setRoomState("initial");
      setShowTournamentForm(true);
      setIsWaitingForOpponent(false);
    }
  };

  // Render game mode selection screen
  const renderModeSelection = () => (
    <div className="flex flex-col items-center justify-center gap-6 p-4 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-squid-pink mb-6">Simon Says</h1>
      
      <p className="text-center text-gray-300 mb-6">
        Remember and repeat the sequence of colors. Each successful pattern adds to your score. One wrong move and it's game over!
      </p>
      
      <button
        className="w-full py-4 px-6 bg-squid-pink text-white rounded-md flex items-center justify-center gap-3 hover:bg-opacity-80 transition-all"
        onClick={() => startGame(GameMode.COMPUTER)}
      >
        <FaRobot size={24} />
        <span>Play Solo</span>
      </button>
      
      <button
        className="w-full py-4 px-6 bg-blue-600 text-white rounded-md flex items-center justify-center gap-3 hover:bg-opacity-80 transition-all"
        onClick={() => startGame(GameMode.LOCAL_MULTIPLAYER)}
      >
        <FaUserFriends size={24} />
        <span>Local Multiplayer</span>
      </button>
      
      <button
        className="w-full py-4 px-6 bg-green-600 text-white rounded-md flex items-center justify-center gap-3 hover:bg-opacity-80 transition-all"
        onClick={() => startGame(GameMode.ONLINE_MULTIPLAYER)}
      >
        <FaTrophy size={24} />
        <span>Tournament Mode</span>
      </button>
      
      <button
        className="w-full py-4 px-6 bg-purple-600 text-white rounded-md flex items-center justify-center gap-3 hover:bg-opacity-80 transition-all"
        onClick={() => startGame(GameMode.ROOM)}
      >
        <FaShareAlt size={24} />
        <span>Create/Join Room</span>
      </button>
      
      <Link href="/" className="mt-4 text-gray-400 hover:text-white flex items-center gap-2">
        <FaHome />
        <span>Back to Home</span>
      </Link>
    </div>
  );

  // Render player name entry form for local multiplayer
  const renderPlayerNamesForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gray-800 rounded-lg max-w-md mx-auto"
    >
      <h2 className="text-2xl font-bold text-squid-pink mb-4">Enter Player Names</h2>
      
      <form onSubmit={handlePlayerNamesSubmit} className="space-y-4">
        <div>
          <label htmlFor="player1" className="block text-gray-300 mb-2">Player 1 Name</label>
          <input
            type="text"
            id="player1"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="player2" className="block text-gray-300 mb-2">Player 2 Name</label>
          <input
            type="text"
            id="player2"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            required
          />
        </div>
        
        <div className="flex gap-4 pt-2">
          <button
            type="button"
            className="flex-1 py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            onClick={() => setShowEntryForm(false)}
          >
            Back
          </button>
          
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-squid-pink text-white rounded hover:bg-opacity-80 transition-colors"
          >
            Start Game
          </button>
        </div>
      </form>
    </motion.div>
  );

  // Render room creation form
  const renderRoomCreationForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gray-800 rounded-lg max-w-md mx-auto"
    >
      <h2 className="text-2xl font-bold text-squid-pink mb-4">Create Room</h2>
      
      <form onSubmit={handleCreateRoom} className="space-y-4">
        <div>
          <label htmlFor="create-name" className="block text-gray-300 mb-2">Your Name</label>
          <input
            type="text"
            id="create-name"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            required
          />
        </div>
        
        <div className="flex gap-4 pt-2">
          <button
            type="button"
            className="flex-1 py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            onClick={() => setShowRoomCreation(false)}
          >
            Back
          </button>
          
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-squid-pink text-white rounded hover:bg-opacity-80 transition-colors"
          >
            Create Room
          </button>
        </div>
      </form>
      
      <div className="mt-4 border-t border-gray-700 pt-4">
        <button
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
          onClick={() => {
            setShowRoomCreation(false);
            setShowRoomJoin(true);
          }}
        >
          Join Existing Room
        </button>
      </div>
    </motion.div>
  );

  // Render room join form
  const renderRoomJoinForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gray-800 rounded-lg max-w-md mx-auto"
    >
      <h2 className="text-2xl font-bold text-squid-pink mb-4">Join Room</h2>
      
      <form onSubmit={handleJoinRoom} className="space-y-4">
        <div>
          <label htmlFor="join-name" className="block text-gray-300 mb-2">Your Name</label>
          <input
            type="text"
            id="join-name"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="room-id" className="block text-gray-300 mb-2">Room ID</label>
          <input
            type="text"
            id="room-id"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
          />
        </div>
        
        <div className="flex gap-4 pt-2">
          <button
            type="button"
            className="flex-1 py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            onClick={() => {
              setShowRoomJoin(false);
              setShowRoomCreation(true);
            }}
          >
            Back
          </button>
          
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-squid-pink text-white rounded hover:bg-opacity-80 transition-colors"
          >
            Join Room
          </button>
        </div>
      </form>
    </motion.div>
  );

  // Render tournament form with escrow information
  const renderTournamentForm = () => (
    <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-gray-800 shadow-lg w-full max-w-md">
      <h2 className="text-xl font-bold text-center">Find Tournament Match</h2>
      
      <div className="w-full">
        <p className="text-sm mb-2">Connection status: 
          <span className={connected ? "text-green-500" : "text-red-500"}>
            {" "}{connectionMessage}
          </span>
        </p>
        
        {wallet?.address ? (
          <div className="mb-4 p-2 bg-gray-700 rounded">
            <p className="text-xs">Connected wallet: 
              <span className="text-green-400 ml-1 break-all">
                {wallet.address.substring(0, 10)}...{wallet.address.substring(wallet.address.length - 8)}
              </span>
            </p>
          </div>
        ) : (
          <div className="mb-4 p-2 bg-red-900 rounded">
            <p className="text-xs text-red-300">
              Please connect your Petra wallet to participate in tournaments
            </p>
          </div>
        )}
        
        <form onSubmit={handleTournamentMatch} className="space-y-4 w-full">
          <div>
            <label className="block text-sm font-medium">Your Name</label>
            <input
              type="text"
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
              className="w-full px-4 py-2 border rounded bg-gray-700 text-white"
              placeholder="Enter your name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium">Bet Amount (SQUID)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full px-4 py-2 border rounded bg-gray-700 text-white"
              placeholder="0.2"
              step="0.1"
              min="0.1"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              You'll be matched with players betting a similar amount
            </p>
          </div>
          
          <div className="pt-2 text-xs">
            <p className="text-gray-300">How it works:</p>
            <ul className="list-disc pl-5 text-gray-400 space-y-1 mt-1">
              <li>Your bet is held in an escrow contract</li>
              <li>When matched, both players' bets are locked</li>
              <li>Winner automatically receives both bets</li>
            </ul>
          </div>
          
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            disabled={!connected || !wallet?.address || transactionPending}
          >
            {transactionPending ? (
              <span className="flex items-center justify-center">
                <FaSpinner className="animate-spin mr-2" /> Processing...
              </span>
            ) : (
              connected ? "Find Match" : "Connecting..."
            )}
          </button>
        </form>
      </div>
    </div>
  );

  // Render waiting screen with cancel option
  const renderWaitingScreen = () => {
    return (
      <div className="flex flex-col items-center space-y-6 p-6 border rounded-lg bg-gray-800 shadow-lg max-w-md">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">
            {roomState === "waiting" ? "Waiting for Opponent" : "Match Found!"}
          </h3>
          <p className="text-md">{currentMessage}</p>
          
          <div className="mt-2 text-sm">
            <span className={connected ? "text-green-500" : "text-red-500"}>
              {connected ? "Connected to server ✓" : "Connecting to server..."}
            </span>
          </div>
          
          {roomId && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300 mb-1">Room ID:</p>
              <div className="flex items-center justify-center space-x-2">
                <code className="text-yellow-400 text-xl font-mono">{roomId}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(roomId);
                    setCurrentMessage("Room ID copied to clipboard!");
                  }}
                  className="p-1 text-xs bg-gray-600 hover:bg-gray-500 rounded"
                >
                  <FaCopy />
                </button>
              </div>
            </div>
          )}
          
          {betAmount && parseFloat(betAmount) > 0 && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300 mb-1">Escrow Contract:</p>
              <p className="text-yellow-400 text-xs font-mono break-all">
                {`0xESCROW${roomId ? roomId.padStart(58, '0') : ''.padStart(58, '0')}`}
              </p>
              <p className="mt-2 text-green-400 font-semibold">Bet amount: {betAmount} SQUID</p>
              <p className="text-xs text-gray-400 mt-1">Winner will receive {parseFloat(betAmount) * 2} SQUID</p>
            </div>
          )}
        </div>
        
        {roomState === "waiting" && (
          <button
            onClick={handleCancelMatchmaking}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            disabled={transactionPending}
          >
            {transactionPending ? (
              <span className="flex items-center justify-center">
                <FaSpinner className="animate-spin mr-2" /> Processing...
              </span>
            ) : (
              "Cancel"
            )}
          </button>
        )}
      </div>
    );
  };
  
  // Render game over state
  const renderGameOverScreen = () => (
    <div className="absolute inset-0 bg-black bg-opacity-80 z-10 flex flex-col items-center justify-center">
      <div className="p-8 bg-gray-800 rounded-lg max-w-md mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4 text-squid-pink">
          {status === GameStatus.WON ? "Victory!" : "Game Over!"}
        </h2>
        
        <p className="text-xl text-gray-300 mb-6">
          {status === GameStatus.WON 
            ? "Congratulations! You won the game!" 
            : "Better luck next time!"}
        </p>
        
        {currentMessage && (
          <p className="my-4 p-3 bg-gray-700 rounded text-yellow-400">
            {currentMessage}
          </p>
        )}
        
        <div className="flex gap-4 mt-6">
          <button
            onClick={resetGame}
            className="flex-1 py-3 px-6 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
          >
            New Game
          </button>
          
          <Link href="/" className="flex-1 py-3 px-6 bg-squid-pink text-white rounded hover:bg-opacity-80 transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 relative">
      {gameMode === GameMode.NOT_SELECTED && renderModeSelection()}
      
      {showEntryForm && renderPlayerNamesForm()}
      
      {showRoomCreation && renderRoomCreationForm()}
      
      {showRoomJoin && renderRoomJoinForm()}
      
      {showTournamentForm && renderTournamentForm()}
      
      {isWaitingForOpponent && renderWaitingScreen()}
      
      {showGameBoard && (
        <div className="w-full h-[80vh] relative">
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-gray-800 rounded-full"
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          </div>
          
          <SimonSaysGame
            gameMode={gameMode}
            player1={player1}
            player2={player2}
            roomId={roomId}
            socket={socketRef.current}
            onGameOver={handleGameOver}
            isMuted={isMuted}
            betAmount={betAmount}
          />
        </div>
      )}
      
      {(status === GameStatus.WON || status === GameStatus.LOST) && renderGameOverScreen()}
    </div>
  );
} 