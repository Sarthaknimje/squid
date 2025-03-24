\"use client";

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
import Header from "@/components/ui/Header";
import ErrorBoundary from "@/components/ErrorBoundary";

// Import our integration utilities
import { initializeRedLightGreenLight, checkGameResources, recoverFromLoadingErrors } from './integration';

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

// Dynamic import for the 3D game component
const RedLightGreenLightGame = dynamic(() => import('@/components/games/RedLightGreenLightGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-800 rounded-lg flex flex-col items-center justify-center">
      <FaSpinner className="animate-spin text-squid-pink text-4xl mb-4" />
      <span className="text-white text-xl">Loading game assets...</span>
      <p className="text-gray-400 mt-2">Please wait while the 3D assets are loaded</p>
    </div>
  ),
});

export default function RedLightGreenLightPage() {
  const { agent } = useAIAgent();
  const { wallet } = useAptosWallet();
  const { updateGameResult, addPoints, trackGamePlayed, unlockAchievement } = usePlayerProgress();

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
  
  // Resource loading state
  const [resourcesLoaded, setResourcesLoaded] = useState<boolean>(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Timers
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lightChangeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game resources
  useEffect(() => {
    const loadResources = async () => {
      try {
        setCurrentMessage("Loading game resources...");
        
        // Initialize the game resources
        const success = await initializeRedLightGreenLight();
        
        if (success) {
          setResourcesLoaded(true);
          setCurrentMessage("Game resources loaded successfully!");
          console.log("All game resources loaded successfully");
        } else {
          // Try to recover from loading errors
          setCurrentMessage("Attempting to recover from loading errors...");
          const recovered = await recoverFromLoadingErrors();
          
          if (recovered) {
            setResourcesLoaded(true);
            setCurrentMessage("Game resources recovered successfully!");
            console.log("Game resources recovered successfully");
          } else {
            // Still proceed but with a warning
            setResourcesLoaded(true);
            setLoadingError("Some game resources could not be loaded. The game will use a simplified renderer.");
            setCurrentMessage("Game will use simplified mode");
            console.warn("Some game resources could not be loaded. Using fallback renderer.");
          }
        }
        
        // Make sure game board shows immediately when in solo mode
        if (gameMode === 'solo' || gameMode === 'local') {
          setShowGameBoard(true);
        }
      } catch (error) {
        console.error("Error loading game resources:", error);
        setLoadingError("Failed to load game resources. Please refresh the page.");
        setCurrentMessage("Error loading game resources");
        
        // Still proceed but with a warning
        setResourcesLoaded(true);
      }
    };
    
    loadResources();
    
    // Initialize audio with proper error handling
    try {
      // Use absolute paths and check if files exist first
      bgMusicRef.current = new Audio('/game/red-light-green-light/music/bg.mp3');
      bgMusicRef.current.loop = true;
      
      // Use correct paths for win/lose sounds - they should be in the game folder
      winSoundRef.current = new Audio('/game/red-light-green-light/music/win.mp3');
      loseSoundRef.current = new Audio('/game/red-light-green-light/music/lose.mp3');
      
      // Create fallback for missing sounds
      bgMusicRef.current.onerror = () => {
        console.error("Failed to load background music");
        setIsMuted(true);
      };
      
      winSoundRef.current.onerror = () => {
        console.error("Failed to load win sound");
      };
      
      loseSoundRef.current.onerror = () => {
        console.error("Failed to load lose sound");
      };
    } catch (error) {
      console.error("Error initializing audio:", error);
      setIsMuted(true);
    }
    
    // Track that the game was played
    trackGamePlayed('red-light-green-light');
    
    // Cleanup socket connection and audio when unmounting
    return () => {
      if (socket) {
        socket.disconnect();
      }
      
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
      }
      
      // Clear all timers
      stopTimers();
    };
  }, [trackGamePlayed]);

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

  // Play win sound
  const playWinSound = () => {
    if (winSoundRef.current && !isMuted) {
      winSoundRef.current.play().catch(error => {
        console.log("Audio playback prevented: ", error);
      });
    }
  };

  // Play lose sound
  const playLoseSound = () => {
    if (loseSoundRef.current && !isMuted) {
      loseSoundRef.current.play().catch(error => {
        console.log("Audio playback prevented: ", error);
      });
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
              opponent.id === data.playerName ? { ...opponent, position: data.position } :