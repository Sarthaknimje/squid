'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaArrowRight, FaCoins, FaUsers, FaRobot, FaUser, FaHandRock, FaHandPaper, FaHandScissors } from 'react-icons/fa';
import { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import RockPaperScissorsGame from '@/components/games/RockPaperScissors/RockPaperScissorsGame';
import { usePlayerContext } from '@/context/PlayerContext';
import { useMuteContext } from '@/context/MuteContext';
import { GameRoom } from '@/components/ui/GameRoom';
import { createGameSocket } from '@/lib/socket';

// Enums for game modes and statuses
enum GameMode {
  COMPUTER = 1,
  LOCAL_MULTIPLAYER = 2,
  ONLINE_MULTIPLAYER = 3,
  ROOM = 4
}

enum GameStatus {
  NOT_STARTED = 1,
  PLAYING = 2,
  WON = 3,
  LOST = 4,
  TIE = 5
}

// Main page component
const RockPaperScissorsPage = () => {
  const router = useRouter();
  const { playerName, setPlayerName, setPlayerCoins, playerCoins, addCoins, deductCoins } = usePlayerContext();
  const { isMuted } = useMuteContext();
  
  // State
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.NOT_STARTED);
  const [localPlayerName, setLocalPlayerName] = useState<string>(playerName || '');
  const [player2Name, setPlayer2Name] = useState<string>('Player 2');
  const [showPlayerNameForm, setShowPlayerNameForm] = useState<boolean>(false);
  const [showPlayer2NameForm, setShowPlayer2NameForm] = useState<boolean>(false);
  const [showRoomForm, setShowRoomForm] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('');
  const [waitingForOpponent, setWaitingForOpponent] = useState<boolean>(false);
  const [showTournamentForm, setShowTournamentForm] = useState<boolean>(false);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [showGameOver, setShowGameOver] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [finalResult, setFinalResult] = useState<'won' | 'lost' | 'tie' | null>(null);
  const [winnings, setWinnings] = useState<number>(0);
  
  // Escrow data
  const [escrowAddress, setEscrowAddress] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [transactionError, setTransactionError] = useState<string | null>(null);
  
  // Socket connection
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const socketManagerRef = useRef(createGameSocket('rock-paper-scissors'));
  
  // Initialize socket connection
  useEffect(() => {
    if (gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) {
      // Connect to socket server
      socketRef.current = socketManagerRef.current.connect();
      
      if (socketRef.current) {
        // Listen for connection status
        socketRef.current.on('connect', () => {
          console.log('Connected to game server');
          setSocketConnected(true);
        });
        
        socketRef.current.on('disconnect', () => {
          console.log('Disconnected from game server');
          setSocketConnected(false);
        });
        
        socketRef.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          // Connection error is handled in socket.ts with mock responses
        });
        
        // If connected, set status
        if (socketRef.current.connected) {
          setSocketConnected(true);
        }
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketManagerRef.current.disconnect();
      }
    };
  }, [gameMode]);
  
  // Handle player name submission
  const handlePlayerNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localPlayerName.trim()) {
      setPlayerName(localPlayerName);
      
      if (gameMode === GameMode.LOCAL_MULTIPLAYER) {
        setShowPlayer2NameForm(true);
        setShowPlayerNameForm(false);
      } else if (gameMode === GameMode.ONLINE_MULTIPLAYER) {
        setShowRoomForm(true);
        setShowPlayerNameForm(false);
      } else {
        setGameStatus(GameStatus.PLAYING);
        setShowPlayerNameForm(false);
      }
    }
  };
  
  // Handle player 2 name submission
  const handlePlayer2NameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (player2Name.trim()) {
      setGameStatus(GameStatus.PLAYING);
      setShowPlayer2NameForm(false);
    }
  };
  
  // Handle tournament entry form submission
  const handleTournamentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if player has enough coins
    if (betAmount > playerCoins) {
      setTransactionError("You don't have enough coins for this bet");
      return;
    }
    
    // Deduct coins for the bet
    deductCoins(betAmount);
    setTransactionError(null);
    
    // Generate fake escrow address and transaction ID for UI purposes
    const fakeEscrowAddress = '0x' + Math.random().toString(36).substring(2, 12);
    const fakeTransactionId = '0x' + Math.random().toString(36).substring(2, 12);
    
    setEscrowAddress(fakeEscrowAddress);
    setTransactionId(fakeTransactionId);
    
    setShowTournamentForm(false);
    setGameStatus(GameStatus.PLAYING);
  };
  
  // Handle room creation
  const handleRoomCreated = (newRoomId: string) => {
    setRoomId(newRoomId);
    setWaitingForOpponent(true);
    
    // If betting is enabled, deduct coins
    if (betAmount > 0) {
      deductCoins(betAmount);
    }
  };
  
  // Handle player joined
  const handlePlayerJoined = (opponentName: string) => {
    setPlayer2Name(opponentName);
    setWaitingForOpponent(false);
  };
  
  // Handle game start
  const handleGameStart = () => {
    setShowRoomForm(false);
    setGameStatus(GameStatus.PLAYING);
  };
  
  // Handle game over event
  const handleGameOver = (result: 'won' | 'lost' | 'tie', score: number) => {
    setFinalResult(result);
    setFinalScore(score);
    setShowGameOver(true);
    
    // Calculate winnings if applicable
    if (result === 'won' && betAmount > 0) {
      const winAmount = betAmount * 2;
      setWinnings(winAmount);
      addCoins(winAmount);
    } else if (result === 'tie' && betAmount > 0) {
      // Return the original bet
      addCoins(betAmount);
      setWinnings(betAmount);
    }
  };
  
  // Render mode selection
  const renderModeSelection = () => (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-8 text-center">Rock Paper Scissors</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-gray-800 p-6 rounded-lg cursor-pointer shadow-lg"
          onClick={() => {
            setGameMode(GameMode.COMPUTER);
            setShowPlayerNameForm(true);
          }}
        >
          <div className="flex justify-center mb-4">
            <FaRobot className="text-5xl text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-2">Play vs Computer</h2>
          <p className="text-gray-300 text-center">Challenge the AI in a game of Rock Paper Scissors</p>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-gray-800 p-6 rounded-lg cursor-pointer shadow-lg"
          onClick={() => {
            setGameMode(GameMode.LOCAL_MULTIPLAYER);
            setShowPlayerNameForm(true);
          }}
        >
          <div className="flex justify-center mb-4">
            <FaUser className="text-5xl text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-2">Local Multiplayer</h2>
          <p className="text-gray-300 text-center">Play with a friend on the same device</p>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-gray-800 p-6 rounded-lg cursor-pointer shadow-lg col-span-1 md:col-span-2"
          onClick={() => {
            setGameMode(GameMode.ONLINE_MULTIPLAYER);
            setShowPlayerNameForm(true);
          }}
        >
          <div className="flex justify-center mb-4">
            <FaUsers className="text-5xl text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-2">Online Multiplayer</h2>
          <p className="text-gray-300 text-center">Play against other players online</p>
          
          <div className="mt-4">
            <div className="flex items-center justify-center space-x-2">
              <FaCoins className="text-yellow-400" />
              <span className="text-gray-300">Optional betting available</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => router.push('/game')}
          className="flex items-center space-x-2 text-white bg-squid-pink px-6 py-3 rounded-md hover:bg-opacity-90 transition-all"
        >
          <FaArrowLeft />
          <span>Back to Games</span>
        </button>
      </div>
    </div>
  );
  
  // Render player name form
  const renderPlayerNameForm = () => (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Enter Your Name</h2>
      
      <form onSubmit={handlePlayerNameSubmit}>
        <div className="mb-4">
          <label htmlFor="playerName" className="block text-gray-300 mb-2">Your Name</label>
          <input
            type="text"
            id="playerName"
            value={localPlayerName}
            onChange={(e) => setLocalPlayerName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-squid-pink"
            maxLength={15}
            required
          />
        </div>
        
        {gameMode === GameMode.ONLINE_MULTIPLAYER && (
          <div className="mb-6">
            <label htmlFor="betAmount" className="block text-gray-300 mb-2">Bet Amount (Optional)</label>
            <div className="flex items-center">
              <FaCoins className="text-yellow-400 mr-2" />
              <input
                type="number"
                id="betAmount"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                max={playerCoins}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-squid-pink"
              />
            </div>
            <p className="text-gray-400 text-sm mt-1">Your balance: {playerCoins} coins</p>
          </div>
        )}
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => {
              setGameMode(null);
              setShowPlayerNameForm(false);
            }}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-squid-pink text-white rounded-md hover:bg-opacity-90 transition-colors"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
  
  // Render player 2 name form
  const renderPlayer2NameForm = () => (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Enter Player 2's Name</h2>
      
      <form onSubmit={handlePlayer2NameSubmit}>
        <div className="mb-6">
          <label htmlFor="player2Name" className="block text-gray-300 mb-2">Player 2 Name</label>
          <input
            type="text"
            id="player2Name"
            value={player2Name}
            onChange={(e) => setPlayer2Name(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-squid-pink"
            maxLength={15}
            required
          />
        </div>
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => {
              setShowPlayer2NameForm(false);
              setShowPlayerNameForm(true);
            }}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-squid-pink text-white rounded-md hover:bg-opacity-90 transition-colors"
          >
            Start Game
          </button>
        </div>
      </form>
    </div>
  );
  
  // Render room form (using the new GameRoom component)
  const renderRoomForm = () => (
    <div className="max-w-2xl mx-auto">
      <GameRoom
        playerName={localPlayerName}
        socketConnection={{
          socket: socketRef.current,
          isConnected: socketConnected
        }}
        onRoomCreated={handleRoomCreated}
        onPlayerJoined={handlePlayerJoined}
        onGameStart={handleGameStart}
        betAmount={betAmount}
        playerCoins={playerCoins}
      />
    </div>
  );
  
  // Render game over screen
  const renderGameOver = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-center mb-6">
          {finalResult === 'won' ? (
            <span className="text-green-400">You Won!</span>
          ) : finalResult === 'lost' ? (
            <span className="text-red-400">You Lost!</span>
          ) : (
            <span className="text-yellow-400">It's a Tie!</span>
          )}
        </h2>
        
        <div className="text-center mb-6">
          <p className="text-xl text-white">Final Score: {finalScore}</p>
          
          {betAmount > 0 && (
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              {finalResult === 'won' ? (
                <p className="flex items-center justify-center text-green-400">
                  <FaCoins className="mr-2" /> You won {winnings} coins!
                </p>
              ) : finalResult === 'tie' ? (
                <p className="flex items-center justify-center text-yellow-400">
                  <FaCoins className="mr-2" /> Your {betAmount} coins have been returned.
                </p>
              ) : (
                <p className="flex items-center justify-center text-red-400">
                  <FaCoins className="mr-2" /> You lost {betAmount} coins.
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setShowGameOver(false);
              setGameStatus(GameStatus.NOT_STARTED);
              setGameMode(null);
              setBetAmount(0);
              setRoomId('');
              setEscrowAddress('');
              setTransactionId('');
            }}
            className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-500 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            <span>Back to Menu</span>
          </button>
          
          <button
            onClick={() => {
              setShowGameOver(false);
              setGameStatus(GameStatus.PLAYING);
            }}
            className="flex-1 flex items-center justify-center space-x-2 bg-squid-pink text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors"
          >
            <FaArrowRight className="mr-2" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen py-12">
      {/* Mode Selection */}
      {gameMode === null && renderModeSelection()}
      
      {/* Player Name Form */}
      {showPlayerNameForm && renderPlayerNameForm()}
      
      {/* Player 2 Name Form */}
      {showPlayer2NameForm && renderPlayer2NameForm()}
      
      {/* Room Form */}
      {showRoomForm && renderRoomForm()}
      
      {/* Game */}
      {gameStatus === GameStatus.PLAYING && (
        <div className="container mx-auto px-4">
          <RockPaperScissorsGame
            gameMode={gameMode}
            player1={localPlayerName}
            player2={player2Name}
            roomId={roomId}
            socket={socketRef.current}
            onGameOver={handleGameOver}
            isMuted={isMuted}
            betAmount={betAmount}
            transactionId={transactionId}
            escrowAddress={escrowAddress}
          />
        </div>
      )}
      
      {/* Game Over */}
      {showGameOver && renderGameOver()}
    </div>
  );
};

export default RockPaperScissorsPage; 