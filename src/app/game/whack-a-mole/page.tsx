"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown, Gamepad2, Siren, Users, Coins, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/hooks/use-wallet';
import { useTournament } from '@/lib/hooks/use-tournament';
import WhackAMoleGame from '@/components/games/WhackAMoleGame';

// Game modes
enum GameMode {
  COMPUTER = 1,
  LOCAL_MULTIPLAYER = 2,
  ONLINE_MULTIPLAYER = 3,
  ROOM = 4,
}

// Game status
enum GameStatus {
  NOT_STARTED = 0,
  PLAYING = 1,
  WON = 2,
  LOST = 3,
  TIE = 4,
}

const WhackAMolePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { balance, addBalance, subtractBalance } = useWallet();
  const { isInTournament, tournamentData, updateProgress } = useTournament();

  // Game state
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.NOT_STARTED);
  const [playerName, setPlayerName] = useState<string>('');
  const [player2Name, setPlayer2Name] = useState<string>('Computer');
  const [roomId, setRoomId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(10);
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  const [showRoomCreation, setShowRoomCreation] = useState<boolean>(false);
  const [showRoomJoin, setShowRoomJoin] = useState<boolean>(false);
  const [showTournamentEntry, setShowTournamentEntry] = useState<boolean>(false);
  const [showWaitingScreen, setShowWaitingScreen] = useState<boolean>(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);
  
  // Socket connection
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  // Initialize socket connection
  useEffect(() => {
    // Check if we need to auto-join a room
    const roomParam = searchParams.get('room');
    const modeParam = searchParams.get('mode');
    
    if (roomParam) {
      setRoomId(roomParam);
      setGameMode(GameMode.ROOM);
      setShowNameInput(true);
    } else if (modeParam === 'tournament' && isInTournament) {
      // Join tournament game
      handleTournamentEntry();
    }
    
    // Initialize socket
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    
    socketInstance.on('connect', () => {
      console.log('Socket connected');
    });
    
    socketInstance.on('room_created', (data) => {
      toast({
        title: 'Room Created',
        description: `Room ID: ${data.roomId}`,
      });
      
      setRoomId(data.roomId);
      setShowRoomCreation(false);
      setShowWaitingScreen(true);
    });
    
    socketInstance.on('player_joined', (data) => {
      toast({
        title: 'Player Joined',
        description: `${data.playerName} has joined the game!`,
      });
      
      setPlayer2Name(data.playerName);
      setShowWaitingScreen(false);
      setGameStatus(GameStatus.PLAYING);
    });
    
    socketInstance.on('opponent_disconnected', () => {
      toast({
        title: 'Opponent Disconnected',
        description: 'Your opponent has left the game.',
      });
      
      setOpponentDisconnected(true);
      // Auto-win if opponent disconnects
      if (gameStatus === GameStatus.PLAYING) {
        handleGameOver('won', 0);
      }
    });
    
    setSocket(socketInstance);
    socketRef.current = socketInstance;
    
    // Cleanup socket connection
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [searchParams, isInTournament]);
  
  // Start the game
  const startGame = () => {
    if (!playerName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your name.',
        variant: 'destructive',
      });
      return;
    }
    
    setShowNameInput(false);
    
    if (gameMode === GameMode.ROOM) {
      // Join existing room
      if (socketRef.current) {
        socketRef.current.emit('join_room', {
          roomId,
          playerName,
          game: 'whack-a-mole',
        });
        
        setGameStatus(GameStatus.PLAYING);
      }
    } else if (gameMode === GameMode.ONLINE_MULTIPLAYER) {
      setShowRoomCreation(true);
    } else {
      // Start local game modes
      setGameStatus(GameStatus.PLAYING);
    }
  };
  
  // Handle player name submission
  const handlePlayerNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startGame();
  };
  
  // Create a new room
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (betAmount > balance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You do not have enough coins for this bet.',
        variant: 'destructive',
      });
      return;
    }
    
    if (socketRef.current) {
      subtractBalance(betAmount);
      
      socketRef.current.emit('create_room', {
        playerName,
        game: 'whack-a-mole',
        betAmount,
      });
    }
  };
  
  // Join an existing room
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a room ID.',
        variant: 'destructive',
      });
      return;
    }
    
    if (socketRef.current) {
      socketRef.current.emit('check_room', { roomId }, (response: any) => {
        if (response.exists) {
          if (response.betAmount > balance) {
            toast({
              title: 'Insufficient Balance',
              description: `You need ${response.betAmount} coins to join this room.`,
              variant: 'destructive',
            });
            return;
          }
          
          subtractBalance(response.betAmount);
          setBetAmount(response.betAmount);
          
          socketRef.current?.emit('join_room', {
            roomId,
            playerName,
            game: 'whack-a-mole',
          });
          
          setShowRoomJoin(false);
          setGameStatus(GameStatus.PLAYING);
        } else {
          toast({
            title: 'Room Not Found',
            description: 'The room does not exist or the game has already started.',
            variant: 'destructive',
          });
        }
      });
    }
  };
  
  // Handle tournament entry
  const handleTournamentEntry = () => {
    if (!isInTournament || !tournamentData) {
      toast({
        title: 'Not In Tournament',
        description: 'You are not currently in a tournament.',
        variant: 'destructive',
      });
      return;
    }
    
    setGameMode(GameMode.COMPUTER);
    setPlayerName(tournamentData.playerName || 'Player');
    setGameStatus(GameStatus.PLAYING);
    setShowTournamentEntry(false);
  };
  
  // Handle game over
  const handleGameOver = useCallback((result: 'won' | 'lost' | 'tie', score: number) => {
    setGameStatus(result === 'won' ? GameStatus.WON : result === 'lost' ? GameStatus.LOST : GameStatus.TIE);
    
    // Update winner
    if (result === 'won') {
      setWinner(playerName);
    } else if (result === 'lost') {
      setWinner(player2Name);
    } else {
      setWinner(null);
    }
    
    // Handle bet results for online multiplayer
    if (gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) {
      if (result === 'won') {
        const winnings = betAmount * 2;
        addBalance(winnings);
        
        toast({
          title: 'You Won!',
          description: `You earned ${winnings} coins.`,
        });
      } else if (result === 'tie') {
        // Return the original bet
        addBalance(betAmount);
        
        toast({
          title: 'It\'s a Tie!',
          description: `Your ${betAmount} coins have been returned.`,
        });
      } else {
        toast({
          title: 'You Lost',
          description: 'Better luck next time!',
        });
      }
    }
    
    // Update tournament progress
    if (isInTournament) {
      updateProgress('whack-a-mole', {
        result,
        score,
      });
    }
  }, [playerName, player2Name, gameMode, betAmount, addBalance, isInTournament, updateProgress]);
  
  // Render game mode selection
  const renderGameModeSelection = () => {
    return (
      <div className="flex flex-col items-center gap-6 p-6 bg-black/20 rounded-lg backdrop-blur-sm w-full max-w-md">
        <h1 className="text-3xl font-bold text-white">Whack-A-Mole</h1>
        
        <div className="grid grid-cols-1 gap-4 w-full">
          <Button 
            variant="outline"
            className="flex items-center justify-between py-6 bg-black/30 hover:bg-black/50 transition"
            onClick={() => {
              setGameMode(GameMode.COMPUTER);
              setShowNameInput(true);
            }}
          >
            <span className="text-xl">Solo Play</span>
            <Gamepad2 className="w-6 h-6" />
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center justify-between py-6 bg-black/30 hover:bg-black/50 transition"
            onClick={() => {
              setGameMode(GameMode.LOCAL_MULTIPLAYER);
              setShowNameInput(true);
            }}
          >
            <span className="text-xl">Local Multiplayer</span>
            <Users className="w-6 h-6" />
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center justify-between py-6 bg-black/30 hover:bg-black/50 transition"
            onClick={() => {
              setGameMode(GameMode.ONLINE_MULTIPLAYER);
              setShowNameInput(true);
            }}
          >
            <span className="text-xl">Online Multiplayer</span>
            <Siren className="w-6 h-6" />
          </Button>
          
          {isInTournament && (
            <Button 
              variant="outline"
              className="flex items-center justify-between py-6 bg-black/30 hover:bg-black/50 transition"
              onClick={() => setShowTournamentEntry(true)}
            >
              <span className="text-xl">Tournament Mode</span>
              <Crown className="w-6 h-6" />
            </Button>
          )}
        </div>
        
        <Link href="/game">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </Link>
      </div>
    );
  };
  
  // Render player name input
  const renderNameInput = () => {
    return (
      <div className="flex flex-col items-center gap-6 p-6 bg-black/20 rounded-lg backdrop-blur-sm w-full max-w-md">
        <h1 className="text-3xl font-bold text-white">Enter Your Name</h1>
        
        <form onSubmit={handlePlayerNameSubmit} className="w-full space-y-4">
          <Input
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="bg-black/30 text-white border-gray-700"
            maxLength={20}
            required
          />
          
          {gameMode === GameMode.LOCAL_MULTIPLAYER && (
            <Input
              type="text"
              placeholder="Player 2 Name"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              className="bg-black/30 text-white border-gray-700"
              maxLength={20}
              required
            />
          )}
          
          <div className="flex justify-between gap-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setGameMode(null);
                setShowNameInput(false);
              }}
              className="w-1/2"
            >
              Back
            </Button>
            <Button 
              type="submit" 
              variant="default"
              className="w-1/2 bg-squid-pink hover:bg-squid-pink/80"
            >
              Continue
            </Button>
          </div>
        </form>
      </div>
    );
  };
  
  // Render room creation form
  const renderRoomCreation = () => {
    return (
      <div className="flex flex-col items-center gap-6 p-6 bg-black/20 rounded-lg backdrop-blur-sm w-full max-w-md">
        <h1 className="text-3xl font-bold text-white">Create Room</h1>
        
        <form onSubmit={handleCreateRoom} className="w-full space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-gray-300">Bet Amount</label>
            <Input
              type="number"
              min={1}
              max={balance}
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
              className="bg-black/30 text-white border-gray-700"
              required
            />
            <p className="text-sm text-gray-400">Your balance: {balance} coins</p>
          </div>
          
          <div className="flex justify-between gap-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setShowRoomCreation(false);
                setShowRoomJoin(true);
              }}
              className="w-full"
            >
              Join Room Instead
            </Button>
          </div>
          
          <div className="flex justify-between gap-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setGameMode(null);
                setShowRoomCreation(false);
              }}
              className="w-1/2"
            >
              Back
            </Button>
            <Button 
              type="submit" 
              variant="default"
              className="w-1/2 bg-squid-pink hover:bg-squid-pink/80"
            >
              Create Room
            </Button>
          </div>
        </form>
      </div>
    );
  };
  
  // Render room join form
  const renderRoomJoin = () => {
    return (
      <div className="flex flex-col items-center gap-6 p-6 bg-black/20 rounded-lg backdrop-blur-sm w-full max-w-md">
        <h1 className="text-3xl font-bold text-white">Join Room</h1>
        
        <form onSubmit={handleJoinRoom} className="w-full space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-gray-300">Room ID</label>
            <Input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="bg-black/30 text-white border-gray-700"
              required
            />
          </div>
          
          <p className="text-sm text-gray-400">Your balance: {balance} coins</p>
          
          <div className="flex justify-between gap-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setShowRoomJoin(false);
                setShowRoomCreation(true);
              }}
              className="w-full"
            >
              Create Room Instead
            </Button>
          </div>
          
          <div className="flex justify-between gap-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setGameMode(null);
                setShowRoomJoin(false);
              }}
              className="w-1/2"
            >
              Back
            </Button>
            <Button 
              type="submit" 
              variant="default"
              className="w-1/2 bg-squid-pink hover:bg-squid-pink/80"
            >
              Join Room
            </Button>
          </div>
        </form>
      </div>
    );
  };
  
  // Render tournament entry
  const renderTournamentEntry = () => {
    return (
      <div className="flex flex-col items-center gap-6 p-6 bg-black/20 rounded-lg backdrop-blur-sm w-full max-w-md">
        <h1 className="text-3xl font-bold text-white">Tournament Mode</h1>
        
        {tournamentData && (
          <div className="text-center">
            <p className="text-lg text-gray-200 mb-2">Tournament: {tournamentData.name}</p>
            <p className="text-gray-300">Progress: {tournamentData.currentGame} / {tournamentData.totalGames}</p>
            <p className="text-gray-300 mt-2">Complete this game to advance in the tournament!</p>
          </div>
        )}
        
        <div className="flex justify-between gap-4 w-full">
          <Button 
            variant="outline"
            onClick={() => setShowTournamentEntry(false)}
            className="w-1/2"
          >
            Back
          </Button>
          <Button 
            variant="default"
            onClick={handleTournamentEntry}
            className="w-1/2 bg-squid-pink hover:bg-squid-pink/80"
          >
            Start Game
          </Button>
        </div>
      </div>
    );
  };
  
  // Render waiting screen
  const renderWaitingScreen = () => {
    return (
      <div className="flex flex-col items-center gap-6 p-6 bg-black/20 rounded-lg backdrop-blur-sm w-full max-w-md">
        <h1 className="text-3xl font-bold text-white">Waiting for Player</h1>
        
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-squid-pink"></div>
        
        <div className="text-center">
          <p className="text-lg text-gray-200 mb-4">Room ID: {roomId}</p>
          <p className="text-gray-400">Share this room ID with a friend to play together!</p>
        </div>
        
        <Button 
          variant="outline"
          onClick={() => {
            // Leave room
            if (socketRef.current) {
              socketRef.current.emit('leave_room', { roomId });
            }
            // Return bet amount
            addBalance(betAmount);
            // Reset states
            setGameMode(null);
            setRoomId('');
            setShowWaitingScreen(false);
          }}
          className="mt-4"
        >
          Cancel
        </Button>
      </div>
    );
  };
  
  // Render game over screen
  const renderGameOverScreen = () => {
    if (gameStatus === GameStatus.PLAYING) return null;
    
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
        <div className="flex flex-col items-center gap-6 p-6 bg-black/40 rounded-lg backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-white">
            {gameStatus === GameStatus.WON ? 'You Won!' : 
             gameStatus === GameStatus.LOST ? 'You Lost!' : 'It\'s a Tie!'}
          </h1>
          
          {winner && <p className="text-xl text-gray-200">Winner: {winner}</p>}
          
          {opponentDisconnected && (
            <p className="text-gray-300 mt-2">Your opponent disconnected from the game.</p>
          )}
          
          <div className="flex gap-4 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                router.push('/game');
              }}
            >
              Exit
            </Button>
            
            <Button
              variant="default"
              className="bg-squid-pink hover:bg-squid-pink/80"
              onClick={() => {
                // Reset game
                setGameStatus(GameStatus.NOT_STARTED);
                setOpponentDisconnected(false);
                setWinner(null);
                
                // Go back to game mode selection
                setGameMode(null);
              }}
            >
              Play Again
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full h-full min-h-screen bg-gradient-to-b from-green-900 to-green-800 flex flex-col items-center justify-center p-4"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 z-0 bg-[url('/images/pattern-bg.png')] bg-repeat"></div>
      
      {/* Top bar with controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <Link href="/game">
          <Button variant="ghost" className="text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </Link>
        
        <Button variant="ghost" className="text-white" onClick={toggleMute}>
          {isMuted ? (
            <span className="flex items-center">
              <span className="mr-2">Unmute</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </span>
          ) : (
            <span className="flex items-center">
              <span className="mr-2">Mute</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 8a5 5 0 0 1 0 8"></path>
                <path d="M17.7 5a9 9 0 0 1 0 14"></path>
                <path d="M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5A.8.8 0 0 1 11 5v14a.8.8 0 0 1-1.5.5L6 15z"></path>
              </svg>
            </span>
          )}
        </Button>
      </div>
      
      {/* Balance display */}
      <div className="absolute top-4 right-20 z-10 bg-black/30 px-3 py-1.5 rounded-full flex items-center">
        <Coins className="w-4 h-4 mr-1.5 text-yellow-400" />
        <span className="text-white">{balance}</span>
      </div>
      
      {/* Game content */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center">
        {/* Game UI states */}
        {gameMode === null && !showNameInput && !showRoomCreation && !showRoomJoin && !showTournamentEntry && !showWaitingScreen && renderGameModeSelection()}
        {showNameInput && renderNameInput()}
        {showRoomCreation && renderRoomCreation()}
        {showRoomJoin && renderRoomJoin()}
        {showTournamentEntry && renderTournamentEntry()}
        {showWaitingScreen && renderWaitingScreen()}
        
        {/* Game area */}
        {gameStatus === GameStatus.PLAYING && (
          <div className="w-full h-[500px] bg-black/30 rounded-lg overflow-hidden relative">
            <WhackAMoleGame
              gameMode={gameMode || 1}
              player1={playerName}
              player2={player2Name}
              roomId={roomId}
              socket={socket}
              onGameOver={handleGameOver}
              isMuted={isMuted}
            />
          </div>
        )}
      </div>
      
      {/* Game over overlay */}
      {renderGameOverScreen()}
    </motion.div>
  );
};

export default WhackAMolePage; 