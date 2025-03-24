import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';
import { Input } from './input';
import { FaCopy, FaUser, FaUsers, FaClock, FaCoins } from 'react-icons/fa';
import { useToast } from './use-toast';

interface GameRoomProps {
  playerName: string;
  socketConnection: {
    socket: Socket | null;
    isConnected: boolean;
  };
  onRoomCreated: (roomId: string, betAmount: number) => void;
  onGameStart: () => void;
  onPlayerJoined: (opponentName: string) => void;
  onBetWon?: (amount: number, originalBet: number, commission: number) => void;
  onTournamentMatchFound?: (roomId: string, opponentName: string) => void;
  betAmount?: number;
  playerCoins?: number;
  gameType: string;
}

export function GameRoom({
  playerName,
  socketConnection,
  onRoomCreated,
  onGameStart,
  onPlayerJoined,
  onBetWon,
  onTournamentMatchFound,
  betAmount = 0,
  playerCoins = 0,
  gameType = 'game'
}: GameRoomProps) {
  const { toast } = useToast();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isTournamentMode, setIsTournamentMode] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdownTime, setCountdownTime] = useState<number | null>(null);
  const [customBetAmount, setCustomBetAmount] = useState(betAmount.toString());
  
  // Check socket connection and show error if not connected
  useEffect(() => {
    if (isCreatingRoom || isJoiningRoom || isTournamentMode) {
      if (!socketConnection.isConnected) {
        setErrorMessage('Cannot connect to game server. Please try again later.');
      } else {
        setErrorMessage(null);
      }
    }
  }, [socketConnection.isConnected, isCreatingRoom, isJoiningRoom, isTournamentMode]);
  
  // Setup socket event listeners
  useEffect(() => {
    const socket = socketConnection.socket;
    if (!socket) return;
    
    const onRoomCreatedHandler = (data: { roomId: string, betAmount: number }) => {
      setRoomId(data.roomId);
      setWaitingForOpponent(true);
      onRoomCreated(data.roomId, data.betAmount);
    };
    
    const onPlayerJoinedHandler = (data: { playerName: string }) => {
      setWaitingForOpponent(false);
      onPlayerJoined(data.playerName);
      
      // Start countdown
      setCountdownTime(3);
    };
    
    const onGameStartHandler = () => {
      onGameStart();
    };
    
    const onErrorHandler = (error: { message: string }) => {
      setErrorMessage(error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    };
    
    const onBetWonHandler = (data: { amount: number, originalBet: number, commission: number }) => {
      if (onBetWon) {
        onBetWon(data.amount, data.originalBet, data.commission);
      }
      
      toast({
        title: 'Bet Won!',
        description: `You won ${data.amount} coins! (${data.commission} coins commission)`,
        variant: 'default',
      });
    };
    
    const onTournamentMatchFoundHandler = (data: { roomId: string, opponentName: string, betAmount: number }) => {
      setRoomId(data.roomId);
      setWaitingForOpponent(false);
      
      if (onTournamentMatchFound) {
        onTournamentMatchFound(data.roomId, data.opponentName);
      }
      
      toast({
        title: 'Match Found!',
        description: `You've been matched with ${data.opponentName} for a ${data.betAmount} coin game`,
        variant: 'default',
      });
      
      // Start countdown
      setCountdownTime(3);
    };
    
    const onWaitingForOpponentHandler = (data: { queuePosition: number, message: string }) => {
      toast({
        title: 'Waiting in Queue',
        description: data.message,
        variant: 'default',
      });
    };
    
    // Register event listeners
    socket.on('room_created', onRoomCreatedHandler);
    socket.on('player_joined', onPlayerJoinedHandler);
    socket.on('game_start', onGameStartHandler);
    socket.on('error', onErrorHandler);
    socket.on('bet_won', onBetWonHandler);
    socket.on('tournament_match_found', onTournamentMatchFoundHandler);
    socket.on('waiting_for_opponent', onWaitingForOpponentHandler);
    
    // Cleanup
    return () => {
      socket.off('room_created', onRoomCreatedHandler);
      socket.off('player_joined', onPlayerJoinedHandler);
      socket.off('game_start', onGameStartHandler);
      socket.off('error', onErrorHandler);
      socket.off('bet_won', onBetWonHandler);
      socket.off('tournament_match_found', onTournamentMatchFoundHandler);
      socket.off('waiting_for_opponent', onWaitingForOpponentHandler);
    };
  }, [socketConnection.socket, onRoomCreated, onPlayerJoined, onGameStart, onBetWon, onTournamentMatchFound, toast]);
  
  // Handle countdown timer
  useEffect(() => {
    if (countdownTime === null) return;
    
    if (countdownTime > 0) {
      const timer = setTimeout(() => {
        setCountdownTime(countdownTime - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      onGameStart();
    }
  }, [countdownTime, onGameStart]);
  
  // Handle create room
  const handleCreateRoom = () => {
    if (!socketConnection.socket) {
      setErrorMessage('Cannot connect to game server');
      return;
    }
    
    const actualBetAmount = parseFloat(customBetAmount) || 0;
    
    if (actualBetAmount > playerCoins) {
      setErrorMessage(`You don't have enough coins. You need ${actualBetAmount} coins to create a room.`);
      return;
    }
    
    setIsCreatingRoom(true);
    setIsJoiningRoom(false);
    setIsTournamentMode(false);
    setErrorMessage(null);
    
    socketConnection.socket.emit('create_room', {
      playerName,
      gameType,
      betAmount: actualBetAmount
    });
  };
  
  // Handle join room
  const handleJoinRoom = () => {
    if (!socketConnection.socket) {
      setErrorMessage('Cannot connect to game server');
      return;
    }
    
    setIsJoiningRoom(true);
    setIsCreatingRoom(false);
    setIsTournamentMode(false);
    setErrorMessage(null);
  };
  
  // Handle tournament entry
  const handleTournamentEntry = () => {
    if (!socketConnection.socket) {
      setErrorMessage('Cannot connect to game server');
      return;
    }
    
    const actualBetAmount = parseFloat(customBetAmount) || 0;
    
    if (actualBetAmount > playerCoins) {
      setErrorMessage(`You don't have enough coins. You need ${actualBetAmount} coins to enter tournament.`);
      return;
    }
    
    setIsTournamentMode(true);
    setIsCreatingRoom(false);
    setIsJoiningRoom(false);
    setErrorMessage(null);
    setWaitingForOpponent(true);
    
    socketConnection.socket.emit('find_match', {
      playerName,
      gameType,
      betAmount: actualBetAmount
    });
    
    toast({
      title: 'Searching for a match',
      description: `Looking for an opponent with similar bet amount (${actualBetAmount} coins)`,
    });
  };
  
  // Submit join room
  const submitJoinRoom = () => {
    if (!roomId.trim()) {
      setErrorMessage('Please enter a room ID');
      return;
    }
    
    if (!socketConnection.socket) {
      setErrorMessage('Cannot connect to game server');
      return;
    }
    
    socketConnection.socket.emit('check_room', { roomId }, (response: any) => {
      if (response.exists) {
        const roomBetAmount = response.betAmount || 0;
        
        if (roomBetAmount > playerCoins) {
          setErrorMessage(`You don't have enough coins. You need ${roomBetAmount} coins to join this room.`);
          return;
        }
        
        socketConnection.socket?.emit('join_room', {
          roomId,
          playerName,
          gameType
        });
      } else {
        setErrorMessage('Room not found or game already started');
      }
    });
  };
  
  // Copy room ID to clipboard
  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId).then(
        () => {
          toast({
            title: 'Copied!',
            description: 'Room ID copied to clipboard',
          });
        },
        (err) => {
          console.error('Could not copy text: ', err);
        }
      );
    }
  };
  
  // Return loading state
  if (countdownTime !== null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-800 p-8 rounded-xl">
        <h2 className="text-2xl font-bold mb-8 text-center text-white">Game Starting in:</h2>
        <div className="text-7xl font-bold text-white mb-4">{countdownTime}</div>
        <p className="text-gray-300">Get ready to play!</p>
      </div>
    );
  }
  
  // Return waiting for opponent state
  if (waitingForOpponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-800 p-8 rounded-xl">
        <div className="animate-spin mb-6">
          <FaClock className="text-4xl text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-4 text-center text-white">Waiting for an opponent...</h2>
        
        <div className="flex items-center bg-gray-700 p-3 rounded-md mb-6">
          <div className="mr-2 text-lg font-semibold text-white">Room ID:</div>
          <div className="flex-1 bg-gray-900 p-2 rounded text-white font-mono">{roomId}</div>
          <button 
            onClick={copyRoomId}
            className="ml-2 p-2 bg-gray-600 hover:bg-gray-500 rounded"
            aria-label="Copy room ID"
          >
            <FaCopy className="text-white" />
          </button>
        </div>
        
        <div className="text-gray-300 mb-6">
          Share this code with a friend to play together!
        </div>
        
        {isTournamentMode && (
          <div className="text-yellow-300 mb-6 flex items-center">
            <FaCoins className="mr-2" /> Bet amount: {customBetAmount} coins
          </div>
        )}
        
        <Button
          variant="outline"
          onClick={() => {
            setIsCreatingRoom(false);
            setIsJoiningRoom(false);
            setIsTournamentMode(false);
            setWaitingForOpponent(false);
            if (socketConnection.socket) {
              socketConnection.socket.emit('cancel_matchmaking');
            }
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  // Return join room form
  if (isJoiningRoom) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col p-8 bg-gray-800 rounded-xl"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Join Room</h2>
        
        {errorMessage && (
          <div className="bg-red-900/50 text-red-200 p-3 rounded-md mb-4">
            {errorMessage}
          </div>
        )}
        
        <div className="mb-6">
          <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 mb-2">
            Enter Room ID
          </label>
          <Input
            id="roomId"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter the room code"
            className="bg-gray-700 text-white"
          />
        </div>
        
        <div className="flex gap-4">
          <Button 
            onClick={submitJoinRoom}
            className="flex-1"
          >
            Join
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setIsJoiningRoom(false)}
            className="flex-1"
          >
            Back
          </Button>
        </div>
      </motion.div>
    );
  }

  // Main game room options
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col p-8 bg-gray-800 rounded-xl"
    >
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Play Online</h2>
      
      {errorMessage && (
        <div className="bg-red-900/50 text-red-200 p-3 rounded-md mb-4">
          {errorMessage}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-6 bg-gray-700 p-3 rounded-md">
        <div className="flex items-center">
          <FaUser className="text-white mr-2" />
          <span className="text-white font-medium">{playerName}</span>
        </div>
        
        <div className="flex items-center">
          <FaCoins className="text-yellow-300 mr-2" />
          <span className="text-yellow-300 font-medium">{playerCoins.toFixed(2)} coins</span>
        </div>
      </div>
      
      <div className="mb-6">
        <label htmlFor="betAmount" className="block text-sm font-medium text-gray-300 mb-2">
          Bet Amount (coins)
        </label>
        <Input
          id="betAmount"
          type="number"
          min="0"
          step="0.1"
          value={customBetAmount}
          onChange={(e) => setCustomBetAmount(e.target.value)}
          placeholder="0.0"
          className="bg-gray-700 text-white"
        />
        <p className="text-xs text-gray-400 mt-1">
          Winner takes 90% of the total bet. 10% is platform commission.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Button
          onClick={handleCreateRoom}
          className="flex flex-col items-center p-4 h-auto"
          variant="default"
        >
          <div className="text-3xl mb-2">🎮</div>
          <span className="font-medium">Create Room</span>
          <span className="text-xs mt-1">Private match with friend</span>
        </Button>
        
        <Button
          onClick={handleJoinRoom}
          className="flex flex-col items-center p-4 h-auto"
          variant="secondary"
        >
          <div className="text-3xl mb-2">🎲</div>
          <span className="font-medium">Join Room</span>
          <span className="text-xs mt-1">Enter a friend's room code</span>
        </Button>
        
        <Button
          onClick={handleTournamentEntry}
          className="flex flex-col items-center p-4 h-auto"
          variant="outline"
        >
          <div className="text-3xl mb-2">🏆</div>
          <span className="font-medium">Tournament</span>
          <span className="text-xs mt-1">Match with random player</span>
        </Button>
      </div>
      
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => {
            if (socketConnection.socket) {
              socketConnection.socket.disconnect();
            }
            // Call any cancel callback here if needed
          }}
          className="flex-1"
        >
          Exit
        </Button>
      </div>
    </motion.div>
  );
} 