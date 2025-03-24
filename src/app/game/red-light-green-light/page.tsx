"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaUserFriends, FaShareAlt, FaHome, FaTrophy, FaCoins, FaSpinner, FaVolumeUp, FaVolumeMute, FaPlay, FaPause } from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import { useAptosWallet } from "@/contexts/AptosWalletContext";
import { usePlayerProgress } from "@/contexts/PlayerProgressContext";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { payTournamentEntryFee, payTournamentWinnings } from '@/lib/petraWalletService';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import Header from "@/components/ui/Header";
import ErrorBoundary from "@/components/ErrorBoundary";

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

// Game states
const GAME_STATES = {
  WAITING: 'waiting',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  WIN: 'win',
};

// Light states
const LIGHT_STATES = {
  GREEN: 'green',
  RED: 'red',
};

// Dynamic import for the game component 
const RedLightGreenLightGame = dynamic(() => import('@/components/games/RedLightGreenLightGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-800 rounded-lg flex flex-col items-center justify-center">
      <FaSpinner className="animate-spin text-squid-pink text-4xl mb-4" />
      <span className="text-white text-xl">Loading game assets...</span>
      <p className="text-gray-400 mt-2">Preparing the game</p>
    </div>
  ),
});

export default function RedLightGreenLightPage() {
  const { agent } = useAIAgent();
  const { wallet } = useAptosWallet();
  const { updateGameResult, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();

  // Import our integration utilities
  const { initializeRedLightGreenLight, checkGameResources, recoverFromLoadingErrors, createFallbackRenderer } = require('./integration');

  // Resource loading state
  const [resourcesLoaded, setResourcesLoaded] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Add preloading for audio files
  useEffect(() => {
    // Load game resources
    const loadResources = async () => {
      try {
        setCurrentMessage("Loading game resources...");
        
        // Simple audio preloading
        const audioFiles = [
          '/sounds/alert.mp3',
          '/sounds/success.mp3',
          '/sounds/win.mp3',
          '/sounds/lose.mp3',
          '/sounds/click.mp3'
        ];
        
        // Preload audio files
        const preloadPromises = audioFiles.map(src => {
          return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = src;
            audio.oncanplaythrough = () => resolve(true);
            audio.onerror = () => {
              console.warn(`Could not load audio: ${src}`);
              resolve(false); // Still resolve to not block the game
            };
          });
        });
        
        // Wait for all audio files to load (or fail)
        await Promise.all(preloadPromises);
        
        setResourcesLoaded(true);
        setCurrentMessage("Game resources loaded successfully!");
        console.log("All game resources loaded successfully");
        
        // Show game immediately
        setShowGameBoard(true);
      } catch (error) {
        console.error("Error loading game resources:", error);
        
        // Still proceed even with error
        setResourcesLoaded(true);
        setShowGameBoard(true);
        setCurrentMessage("Ready to play!");
      }
    };
    
    loadResources();
  }, []);

  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.WAITING);
  const [lightState, setLightState] = useState(LIGHT_STATES.GREEN);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [finishPosition] = useState(100);
  const [isMoving, setIsMoving] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [dollRotation, setDollRotation] = useState(0);
  const [gameMode, setGameMode] = useState('solo');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [opponents, setOpponents] = useState([]);
  const [gameResult, setGameResult] = useState({ won: false, message: '' });
  
  // UI States
  const [showEntryForm, setShowEntryForm] = useState<boolean>(false);
  const [showRoomCreation, setShowRoomCreation] = useState<boolean>(false);
  const [showRoomJoin, setShowRoomJoin] = useState<boolean>(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState<boolean>(false);
  const [tournamentMode, setTournamentMode] = useState<boolean>(false);
  const [showTournamentForm, setShowTournamentForm] = useState<boolean>(false);
  const [transactionPending, setTransactionPending] = useState<boolean>(false);
  const [showGameBoard, setShowGameBoard] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<string>("");

  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Timers
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lightChangeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle game over events
  const handleGameOver = (result: 'won' | 'lost', score: number) => {
    setGameState(result === 'won' ? GAME_STATES.WIN : GAME_STATES.GAME_OVER);
    setGameResult({ 
      won: result === 'won', 
      message: result === 'won' ? 'You reached the finish line!' : 'You were eliminated!' 
    });
    setScore(score);
    
    if (result === 'won') {
      playWinSound();
      // Add points to player progress
      addPoints(score);
      trackGamePlayed('red-light-green-light');
      updateGameResult('red-light-green-light', true);
      
      if (tournamentMode) {
        processTournamentWin();
      }
    } else {
      playLoseSound();
      // Track game played even when lost
      trackGamePlayed('red-light-green-light');
      updateGameResult('red-light-green-light', false);
    }
    
    // Notify other players if in multiplayer mode
    if (socket && (gameMode === 'online' || roomId)) {
      socket.emit('game_over', { roomId, playerId, result, score });
    }
  };

  // Initialize audio with proper error handling
  useEffect(() => {
    trackGamePlayed('red-light-green-light');
    
    // Initialize audio with proper error handling
    try {
      // Use absolute paths and check if files exist first
      bgMusicRef.current = new Audio('/sounds/bg.mp3');
      bgMusicRef.current.loop = true;
      
      // Use correct paths for win/lose sounds
      winSoundRef.current = new Audio('/sounds/win.mp3');
      loseSoundRef.current = new Audio('/sounds/lose.mp3');
      
      // Create fallback for missing sounds
      bgMusicRef.current.onerror = () => {
        console.error("Failed to load background music");
        setIsMuted(true);
      };
      
      if (!isMuted) {
        bgMusicRef.current.play().catch(error => {
          console.log("Audio playback prevented: ", error);
          // Auto-mute on error for better user experience
          setIsMuted(true);
        });
      }
    } catch (error) {
      console.error("Error initializing audio:", error);
      setIsMuted(true);
    }
    
    // Make sure game board shows immediately when in solo mode
    if (gameMode === 'solo' || gameMode === 'local') {
      setShowGameBoard(true);
    }
    
    // Cleanup socket connection and audio when unmounting
    return () => {
      if (socket) {
        socket.disconnect();
      }
      
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
      }
    };
  }, [trackGamePlayed]);

  // Toggle audio mute
  const toggleMute = () => {
    setIsMuted(prev => {
      const newMuteState = !prev;
      
      if (bgMusicRef.current) {
        bgMusicRef.current.muted = newMuteState;
      }
      if (winSoundRef.current) {
        winSoundRef.current.muted = newMuteState;
      }
      if (loseSoundRef.current) {
        loseSoundRef.current.muted = newMuteState;
      }
      
      return newMuteState;
    });
  };

  // Initialize socket connection for online play
  const initializeSocket = () => {
    if (!socket) {
      try {
        // Get server URL based on environment
        const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001";
        
        console.log("Connecting to socket server at:", socketServerUrl);
        const newSocket = io(socketServerUrl, {
          transports: ["websocket"],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000
        });
        
        newSocket.on("connect", () => {
          console.log("Connected to socket server with ID:", newSocket.id);
          setPlayerId(newSocket.id);
          setCurrentMessage("Connected to game server");
        });
        
        newSocket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          setCurrentMessage("Error connecting to game server. Retrying...");
        });
        
        newSocket.on("disconnect", (reason) => {
          console.log("Disconnected from socket server:", reason);
          setCurrentMessage("Disconnected from game server");
        });
        
        newSocket.on("room_created", (data: {roomId: string}) => {
          setRoomId(data.roomId);
          setIsWaitingForOpponent(true);
          setCurrentMessage(`Room created! Share this code with your friend: ${data.roomId}`);
        });
        
        newSocket.on("player_joined", (data: {playerName: string}) => {
          setOpponents([{ id: data.playerName, position: 0, caught: false }]);
          setIsWaitingForOpponent(false);
          setShowGameBoard(true);
          setGameState(GAME_STATES.PLAYING);
          setCurrentMessage(`${data.playerName} has joined the game!`);
        });
        
        newSocket.on("move_made", (data: {position: number, isX: boolean}) => {
          // Handle move made by opponent
          console.log("Opponent made a move:", data);
          setOpponents((prev) =>
            prev.map((opponent) =>
              opponent.id === data.playerName ? { ...opponent, position: data.position } : opponent
            )
          );
        });
        
        newSocket.on("game_reset", () => {
          resetGame();
        });
        
        newSocket.on("opponent_disconnected", () => {
          setCurrentMessage("Your opponent has disconnected.");
          setGameState(GAME_STATES.GAME_OVER);
          setGameResult({ won: false, message: 'Your opponent has disconnected.' });
          stopTimers();
          playLoseSound();
        });
        
        newSocket.on("tournament_match_found", (data: { roomId: string, playerName: string }) => {
          setRoomId(data.roomId);
          setOpponents([{ id: data.playerName, position: 0, caught: false }]);
          setIsWaitingForOpponent(false);
          setShowGameBoard(true);
          setGameState(GAME_STATES.PLAYING);
          setCurrentMessage(`Tournament match found! Playing against ${data.playerName}`);
        });
        
        newSocket.on("player_won", (data: { roomId: string, playerId: string }) => {
          if (data.playerId !== playerId) {
            setGameState(GAME_STATES.GAME_OVER);
            setGameResult({ won: false, message: 'Another player reached the finish line first!' });
            stopTimers();
            playLoseSound();
          }
        });
        
        newSocket.on("player_caught", (data: { roomId: string, playerId: string }) => {
          setOpponents((prev) =>
            prev.map((opponent) =>
              opponent.id === data.playerId ? { ...opponent, caught: true } : opponent
            )
          );
        });
        
        newSocket.on("error", (data: { message: string }) => {
          console.error("Socket server error:", data.message);
          setCurrentMessage(`Error: ${data.message}`);
        });
        
        setSocket(newSocket);
      } catch (error) {
        console.error("Failed to initialize socket:", error);
        setCurrentMessage("Failed to connect to game server. Please try again.");
      }
    }
  };

  // Process tournament win
  const processTournamentWin = async () => {
    try {
      setTransactionPending(true);
      setCurrentMessage("Processing your winnings...");
      
      // Get opponent's wallet address from the socket connection
      const opponentAddress = socket?.id || "0x00a654ef527594d2165fdab60e22ef14e9da2fdf22bd485493e60311638d6801";
      
      // Process winnings payment
      const paymentResult = await payTournamentWinnings(opponentAddress);
      
      if (paymentResult.winnerHash) {
        setTransactionPending(false);
        setCurrentMessage(`Congratulations! You won 0.36 APT! Transaction ID: ${paymentResult.winnerHash.substring(0, 8)}...`);
        
        // Update player progress
        addPoints(1000);
        unlockAchievement('tournament_win', 'red-light-green-light');
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
    setGameState(GAME_STATES.WAITING);
    setLightState(LIGHT_STATES.GREEN);
    setPlayerPosition(0);
    setScore(0);
    setTimeRemaining(60);
    stopTimers();
    
    // Reset in online mode
    if (gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) {
      socket?.emit("reset_game", { 
        roomId,
        gameType: "red-light-green-light"
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
    
    if (gameMode === 'computer') {
      player2Name = "AI Opponent";
    }
    
setOpponents([{ id: player1Name, position: 0, caught: false } as const]);
    setShowEntryForm(false);
    setShowGameBoard(true);
    
    // Force a small delay then set the game state to ensure component renders
    setTimeout(() => {
      setGameState(GAME_STATES.PLAYING);
    }, 100);
  };

  // Handle room creation
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const playerName = form.playerName?.value || "Host";
    
    setOpponents([{ id: playerName, position: 0, caught: false }]);
    setShowRoomCreation(false);
    initializeSocket();
    
    if (socket) {
      socket.emit("create_room", {
        playerName,
        gameType: "red-light-green-light"
      });
    }
  };

  // Handle room joining
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const playerName = form.playerName?.value || "Guest";
    const roomCode = form.roomCode?.value;
    
    setOpponents([{ id: playerName, position: 0, caught: false }]);
    setRoomId(roomCode);
    setShowRoomJoin(false);
    initializeSocket();
    
    if (socket) {
      socket.emit("join_room", {
        roomId: roomCode,
        playerName,
        gameType: "red-light-green-light"
      });
      
      setShowGameBoard(true);
      setGameState(GAME_STATES.PLAYING);
    }
  };

  // Handle tournament entry
  const handleTournamentEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const playerName = form.playerName?.value || "Player";
    const bet = form.betAmount?.value || "0.2";
    
    setOpponents([{ id: playerName, position: 0, caught: false }]);
    setShowTournamentForm(false);
    setCurrentMessage("Processing tournament entry fee...");
    setTransactionPending(true);
    
    try {
      // Process the tournament entry fee using Petra wallet
      const result = await payTournamentEntryFee();
      
      if (result && result.hash) {
        console.log("Tournament entry fee transaction successful:", result.hash);
        setCurrentMessage("Entry fee paid! Transaction ID: " + result.hash.substring(0, 8) + "...");
        
        // After payment is successful, set tournament mode and connect to socket
        setTournamentMode(true);
        initializeSocket();
        
        if (socket) {
          socket.emit("find_match", {
            playerName,
            betAmount: bet,
            gameType: "red-light-green-light",
            transactionHash: result.hash
          });
          
          setIsWaitingForOpponent(true);
          setCurrentMessage("Finding an opponent with a similar bet amount...");
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
    setGameState(GAME_STATES.WAITING);
    setIsWaitingForOpponent(false);
    setTournamentMode(false);
    
    // Disconnect from socket if connected
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // Start/stop player movement
  const handleMovement = (moving: boolean) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    setIsMoving(moving);
    
    if (moving) {
      if (lightState === LIGHT_STATES.RED) {
        caughtMoving();
        return;
      }
      
      // Start movement timer
      moveTimerRef.current = setInterval(() => {
        setPlayerPosition((prev) => {
          const newPosition = prev + 1;
          
          // Check if player reached finish line
          if (newPosition >= finishPosition) {
            setGameState(GAME_STATES.WIN);
            setGameResult({ won: true, message: 'You reached the finish line!' });
            stopTimers();
            playWinSound();
            
            if (socket && gameMode === 'online') {
              socket.emit('player_won', { roomId, playerId });
            }
            
            return finishPosition;
          }
          
          // Send position update to server in online mode
          if (socket && gameMode === 'online') {
            socket.emit('move_made', { roomId, playerId, position: newPosition });
        }
        
        return newPosition;
      });
      }, 100);
    } else {
      // Stop movement
      if (moveTimerRef.current) {
        clearInterval(moveTimerRef.current);
        moveTimerRef.current = null;
      }
    }
  };

  // Player caught moving during red light
  const caughtMoving = () => {
    setGameState(GAME_STATES.GAME_OVER);
    setGameResult({ won: false, message: 'You moved during red light!' });
    stopTimers();
    playLoseSound();
    
    if (socket && gameMode === 'online') {
      socket.emit('player_caught', { roomId, playerId });
    }
  };

  // Start game timers
  const startGameTimers = () => {
    // Timer for game duration
    gameTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setGameState(GAME_STATES.GAME_OVER);
          setGameResult({ won: false, message: 'Time ran out!' });
          stopTimers();
          playLoseSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Timer for light changes
    scheduleLightChange();
  };
  
  // Schedule light change
  const scheduleLightChange = () => {
    const minTime = 2000; // Minimum time before light change (ms)
    const maxTime = 5000; // Maximum time before light change (ms)
    const changeTime = Math.random() * (maxTime - minTime) + minTime;
    
    lightChangeTimerRef.current = setTimeout(() => {
      toggleLight();
      
      // Schedule next change if game is still playing
      if (gameState === GAME_STATES.PLAYING) {
        scheduleLightChange();
      }
    }, changeTime);
  };
  
  // Toggle light between red and green
  const toggleLight = () => {
    setLightState((prev) => {
      const newState = prev === LIGHT_STATES.GREEN ? LIGHT_STATES.RED : LIGHT_STATES.GREEN;
      
      if (newState === LIGHT_STATES.RED) {
        // Rotate the doll to face players
        setDollRotation(180);
        
        // Check if player is moving during red light
        if (isMoving) {
          caughtMoving();
        }
      } else {
        // Rotate the doll to face away
        setDollRotation(0);
      }
      
      return newState;
    });
  };

  // Play background music
  const playBackgroundMusic = () => {
    if (bgMusicRef.current && gameState === GAME_STATES.PLAYING) {
      bgMusicRef.current.play().catch(e => console.error("Error playing background music:", e));
    }
  };
  
  // Play win sound
  const playWinSound = () => {
    if (winSoundRef.current) {
      winSoundRef.current.play().catch(e => console.error("Error playing win sound:", e));
    }
  };
  
  // Play lose sound
  const playLoseSound = () => {
    if (loseSoundRef.current) {
      loseSoundRef.current.play().catch(e => console.error("Error playing lose sound:", e));
    }
  };

  // Stop all timers
  const stopTimers = () => {
    if (moveTimerRef.current) {
      clearInterval(moveTimerRef.current);
      moveTimerRef.current = null;
    }
    
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    if (lightChangeTimerRef.current) {
      clearTimeout(lightChangeTimerRef.current);
      lightChangeTimerRef.current = null;
    }
    
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
    }
  };

  // Create a new room for online play
  const createRoom = () => {
    if (socket) {
      socket.emit('create_room');
    }
  };

  // Join an existing room
  const joinRoom = (id: string) => {
    if (socket) {
      socket.emit('join_room', { roomId: id });
      setRoomId(id);
    }
  };

  // Render content based on game state
  let content;
  
  // Game mode selection screen
  if (gameMode === GameMode.NOT_SELECTED) {
    content = (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-4xl font-bold mb-4 text-squid-pink">Red Light, Green Light</h1>
            <p className="text-xl max-w-3xl mx-auto">
              Stop when the doll turns! If she catches you moving, you're eliminated.
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
                  <p className="text-sm mt-2 text-blue-200">Challenge AI opponents</p>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center"
                  onClick={() => selectGameMode(GameMode.LOCAL_MULTIPLAYER)}
                >
                  <FaUserFriends className="text-4xl mb-3" />
                  <span className="text-xl font-bold">Local Multiplayer</span>
                  <p className="text-sm mt-2 text-green-200">Play with friends on the same device</p>
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
  else if (showGameBoard) {
    content = (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold mb-2 text-squid-pink">Red Light, Green Light</h1>
              
              <div className="flex justify-center space-x-6 mb-4">
                <div className="flex items-center bg-gray-800 py-1 px-3 rounded-lg">
                  <span className="font-bold mr-2 text-red-500">P1</span>
                  <span>{opponents.map((opponent) => opponent.id).join(', ')}</span>
                </div>
          </div>
          
              {gameState !== GAME_STATES.PLAYING && (
                <div className={`py-2 px-4 rounded-lg inline-block mb-4 ${
                  gameState === GAME_STATES.WIN ? 'bg-green-800' : 'bg-red-800'
                }`}>
                  <p className="text-lg font-bold">
                    {gameState === GAME_STATES.WIN ? 'You Win!' : 'You Lost!'}
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
              
              {/* Audio control */}
              <button 
                onClick={toggleMute} 
                className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition-colors mb-4"
              >
                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>
            </div>
            
            {/* Game container */}
            <div className="bg-gray-800 p-4 rounded-xl shadow-xl mb-6 h-[500px] relative">
              {/* Game container */}
              <div id="game-container" className="w-full h-full overflow-hidden relative">
                <ErrorBoundary
                  fallback={
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="text-red-500 text-3xl mb-4">Failed to load game</div>
                      <button 
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 rounded text-white"
                      >
                        Reload Game
                      </button>
                    </div>
                  }
                >
                  <RedLightGreenLightGame 
                    key={`rlgl-game-${gameMode}-${roomId}-${Date.now()}`}
                    gameMode={gameMode === 'solo' ? 1 : gameMode === 'local' ? 2 : gameMode === 'online' ? 3 : 4} 
                    player1={opponents.length > 0 ? opponents[0].id : "Player 1"}
                    player2={opponents.length > 1 ? opponents[1].id : "Player 2"}
                    roomId={roomId}
                    socket={socket}
                    onGameOver={handleGameOver}
                    isMuted={isMuted}
                  />
                </ErrorBoundary>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={goBack}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center"
              >
                <FaHome className="mr-2" /> Exit Game
              </button>
              
              {gameState !== GAME_STATES.PLAYING && (
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
  
  // Waiting for opponent screen
  else if (isWaitingForOpponent) {
    content = (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-6 text-squid-pink">Waiting for Opponent</h2>
              
              <div className="flex justify-center mb-6">
                <FaSpinner className="animate-spin text-4xl text-squid-pink" />
              </div>
              
              {currentMessage && (
                <div className="bg-blue-900 text-blue-100 p-4 rounded-lg mb-6">
                  {currentMessage}
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
  
  // Entry form
  else if (showEntryForm) {
    content = (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Enter Player Names</h2>
              
              <form onSubmit={handlePlayerFormSubmit}>
                <div className="mb-4">
                  <label htmlFor="player1" className="block text-sm font-medium mb-2">Player 1</label>
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
                    <label htmlFor="player2" className="block text-sm font-medium mb-2">Player 2</label>
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
  
  // Room creation form
  else if (showRoomCreation) {
    content = (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Create or Join Room</h2>
              
              <div className="grid grid-cols-1 gap-6">
                <form onSubmit={handleCreateRoom} className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-xl font-medium mb-4">Create a New Room</h3>
                  
                  <div className="mb-4">
                    <label htmlFor="playerName" className="block text-sm font-medium mb-2">Your Name</label>
                    <input
                      type="text"
                      id="playerName"
                      name="playerName"
                      className="w-full px-4 py-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-squid-pink"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-squid-pink hover:bg-opacity-80 text-white py-2 px-6 rounded"
                  >
                    Create Room
                  </button>
                </form>
                
                <form onSubmit={handleJoinRoom} className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-xl font-medium mb-4">Join Existing Room</h3>
                  
                  <div className="mb-4">
                    <label htmlFor="playerNameJoin" className="block text-sm font-medium mb-2">Your Name</label>
                    <input
                      type="text"
                      id="playerNameJoin"
                      name="playerName"
                      className="w-full px-4 py-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-squid-pink"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="roomCode" className="block text-sm font-medium mb-2">Room Code</label>
                    <input
                      type="text"
                      id="roomCode"
                      name="roomCode"
                      className="w-full px-4 py-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-squid-pink"
                      placeholder="Enter room code"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded"
                  >
                    Join Room
                  </button>
                </form>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={goBack}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Back to Game Modes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Tournament form
  else if (showTournamentForm) {
    content = (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-squid-pink">Tournament Mode</h2>
              
              <form onSubmit={handleTournamentEntry}>
                <div className="mb-4">
                  <label htmlFor="playerName" className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    id="playerName"
                    name="playerName"
                    className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-squid-pink"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="betAmount" className="block text-sm font-medium mb-2">Bet Amount (APTOS)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCoins className="text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="betAmount"
                      name="betAmount"
                      min="0.1"
                      step="0.1"
                      defaultValue="0.2"
                      className="w-full pl-10 px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-squid-pink"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    You'll be matched with players betting similar amounts.
                    Winner takes 90% of the pot (10% platform fee).
                  </p>
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
                    Find Match
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
  return content || <div>Loading...</div>;
} 