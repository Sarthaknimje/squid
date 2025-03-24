import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaHandRock, FaHandPaper, FaHandScissors, FaCrown, FaSpinner, FaUser, FaUsers, FaRobot } from 'react-icons/fa';
import { Socket } from 'socket.io-client';
import styles from './RockPaperScissors.module.css';

// Enum for game modes
enum GameMode {
  COMPUTER = 1,
  LOCAL_MULTIPLAYER = 2,
  ONLINE_MULTIPLAYER = 3,
  ROOM = 4
}

// Interface for component props
interface RockPaperScissorsGameProps {
  gameMode: GameMode | null;
  player1: string;
  player2: string;
  roomId?: string;
  socket: Socket | null;
  onGameOver: (result: 'won' | 'lost' | 'tie', score: number) => void;
  isMuted: boolean;
  betAmount?: number;
  transactionId?: string;
  escrowAddress?: string;
}

// Choice type
type Choice = 'rock' | 'paper' | 'scissors' | null;

// Choice data with icon and beats information
const choices: Record<string, { icon: JSX.Element; beats: string }> = {
  rock: { icon: <FaHandRock className="text-4xl" />, beats: 'scissors' },
  paper: { icon: <FaHandPaper className="text-4xl" />, beats: 'rock' },
  scissors: { icon: <FaHandScissors className="text-4xl" />, beats: 'paper' },
};

// Main component
const RockPaperScissorsGame: React.FC<RockPaperScissorsGameProps> = ({
  gameMode,
  player1,
  player2,
  roomId,
  socket,
  onGameOver,
  isMuted,
  betAmount = 0,
  transactionId,
  escrowAddress,
}) => {
  // State for game
  const [player1Choice, setPlayer1Choice] = useState<Choice>(null);
  const [player2Choice, setPlayer2Choice] = useState<Choice>(null);
  const [result, setResult] = useState<string | null>(null);
  const [player1Score, setPlayer1Score] = useState<number>(0);
  const [player2Score, setPlayer2Score] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [isPlayer1Turn, setIsPlayer1Turn] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState<boolean>(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState<boolean>(false);

  // Sound effects
  const rockSound = useRef<HTMLAudioElement | null>(null);
  const paperSound = useRef<HTMLAudioElement | null>(null);
  const scissorsSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const loseSound = useRef<HTMLAudioElement | null>(null);
  const tieSound = useRef<HTMLAudioElement | null>(null);

  // Initialize sound effects
  useEffect(() => {
    rockSound.current = new Audio('/sounds/rock.mp3');
    paperSound.current = new Audio('/sounds/paper.mp3');
    scissorsSound.current = new Audio('/sounds/scissors.mp3');
    winSound.current = new Audio('/sounds/win.mp3');
    loseSound.current = new Audio('/sounds/lose.mp3');
    tieSound.current = new Audio('/sounds/tie.mp3');

    return () => {
      // Clean up audio
      [rockSound, paperSound, scissorsSound, winSound, loseSound, tieSound].forEach(sound => {
        if (sound.current) {
          sound.current.pause();
          sound.current.currentTime = 0;
        }
      });
    };
  }, []);

  // Play sound effect
  const playSound = (sound: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (sound.current && !isMuted) {
      sound.current.currentTime = 0;
      sound.current.play().catch(error => console.error('Error playing sound:', error));
    }
  };

  // Setup socket event listeners for online multiplayer
  useEffect(() => {
    if ((gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) && socket) {
      // When opponent makes a choice
      const handleOpponentChoice = (data: { choice: Choice }) => {
        console.log('Opponent choice received:', data.choice);
        setPlayer2Choice(data.choice);
        setWaitingForOpponent(false);
        
        // If player has already made a choice, determine the result immediately
        if (player1Choice) {
          handleResult(player1Choice, data.choice);
        }
      };

      // When opponent disconnects
      const handleOpponentLeft = () => {
        console.log('Opponent left the game');
        setOpponentDisconnected(true);
        setWaitingForOpponent(false);
        setMessage(`${player2} disconnected. You win!`);
        
        // Auto-win for player 1
        setPlayer1Score(prev => prev + 1);
        setResult('won');
        playSound(winSound);
        
        // End the game after a short delay
        setTimeout(() => {
          setGameEnded(true);
          onGameOver('won', player1Score + 1);
        }, 2000);
      };

      // Register socket event listeners
      socket.on('opponent_choice', handleOpponentChoice);
      socket.on('opponent_left', handleOpponentLeft);

      // Log socket connection status
      console.log('Socket connected:', socket.connected);
      
      // Send a ping to make sure the connection is working
      socket.emit('ping', { message: 'Ping from game client' }, () => {
        console.log('Ping acknowledged by server');
      });

      // Cleanup event listeners on component unmount
      return () => {
        socket.off('opponent_choice', handleOpponentChoice);
        socket.off('opponent_left', handleOpponentLeft);
      };
    }
  }, [gameMode, socket, player1Choice, player2, player1Score, onGameOver]);

  // Handle computer's choice after player selects
  useEffect(() => {
    if (gameMode === GameMode.COMPUTER && player1Choice && !player2Choice) {
      // Delay to simulate the computer thinking
      const timer = setTimeout(() => {
        const choices: Choice[] = ['rock', 'paper', 'scissors'];
        const computerChoice = choices[Math.floor(Math.random() * choices.length)];
        setPlayer2Choice(computerChoice);
        handleResult(player1Choice, computerChoice);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameMode, player1Choice, player2Choice]);

  // Reset for next round
  useEffect(() => {
    if (showResult && !gameEnded) {
      const timer = setTimeout(() => {
        setPlayer1Choice(null);
        setPlayer2Choice(null);
        setResult(null);
        setShowResult(false);
        setRound(prev => prev + 1);
        setIsPlayer1Turn(true);
        setMessage('');
        
        // Check if game should end
        if (player1Score >= 3 || player2Score >= 3) {
          setGameEnded(true);
          const finalResult = player1Score > player2Score ? 'won' : 'lost';
          onGameOver(finalResult, player1Score);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showResult, gameEnded, player1Score, player2Score, onGameOver]);

  // Determine the result of the round
  const handleResult = (p1Choice: Choice, p2Choice: Choice) => {
    if (!p1Choice || !p2Choice) return;
    
    setShowResult(true);
    
    if (p1Choice === p2Choice) {
      setResult('tie');
      setMessage("It's a tie!");
      playSound(tieSound);
    } else if (choices[p1Choice].beats === p2Choice) {
      setResult('player1');
      setPlayer1Score(prev => prev + 1);
      setMessage(`${player1} wins this round!`);
      playSound(winSound);
    } else {
      setResult('player2');
      setPlayer2Score(prev => prev + 1);
      setMessage(`${player2} wins this round!`);
      playSound(loseSound);
    }
  };

  // Handle player choice
  const handleChoice = (choice: Choice) => {
    if (gameEnded || showResult || (waitingForOpponent && gameMode !== GameMode.LOCAL_MULTIPLAYER)) return;
    
    // Play appropriate sound
    switch (choice) {
      case 'rock':
        playSound(rockSound);
        break;
      case 'paper':
        playSound(paperSound);
        break;
      case 'scissors':
        playSound(scissorsSound);
        break;
    }
    
    if (isPlayer1Turn) {
      setPlayer1Choice(choice);
      
      if (gameMode === GameMode.LOCAL_MULTIPLAYER) {
        setIsPlayer1Turn(false);
        setMessage(`${player2}'s turn to choose`);
      } else if (gameMode === GameMode.ONLINE_MULTIPLAYER || gameMode === GameMode.ROOM) {
        setWaitingForOpponent(true);
        setMessage(`Waiting for ${player2}'s choice...`);
        
        // Send player's choice to opponent
        if (socket && roomId) {
          console.log('Sending choice to opponent:', choice);
          socket.emit('player_choice', { roomId, choice });
        }
      }
    } else if (gameMode === GameMode.LOCAL_MULTIPLAYER) {
      setPlayer2Choice(choice);
      handleResult(player1Choice, choice);
    }
  };

  // Render game UI
  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl shadow-2xl p-6 max-w-4xl mx-auto">
      {/* Game header with scores */}
      <div className="flex justify-between items-center mb-6 bg-gray-900 p-4 rounded-lg">
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-white">{player1}</span>
            {result === 'player1' && <FaCrown className="text-yellow-400" />}
          </div>
          <div className="text-3xl font-bold text-squid-pink">{player1Score}</div>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-white">Round {round}</span>
          {betAmount > 0 && (
            <span className="text-sm text-yellow-400 mt-1">Bet: {betAmount} coins</span>
          )}
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-white">{player2}</span>
            {result === 'player2' && <FaCrown className="text-yellow-400" />}
          </div>
          <div className="text-3xl font-bold text-squid-pink">{player2Score}</div>
        </div>
      </div>
      
      {/* Game mode indicator */}
      <div className="flex justify-center mb-4">
        <div className="bg-gray-900 px-4 py-2 rounded-full flex items-center space-x-2">
          {gameMode === GameMode.COMPUTER ? (
            <>
              <FaRobot className="text-blue-400" />
              <span className="text-white">VS Computer</span>
            </>
          ) : gameMode === GameMode.LOCAL_MULTIPLAYER ? (
            <>
              <FaUser className="text-green-400" />
              <span className="text-white">Local Multiplayer</span>
            </>
          ) : (
            <>
              <FaUsers className="text-purple-400" />
              <span className="text-white">Online Multiplayer</span>
              {roomId && (
                <span className="text-gray-400 text-xs ml-2">Room: {roomId}</span>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Message display */}
      {message && (
        <div className="text-center mb-4">
          <span className="text-white text-lg">{message}</span>
          {waitingForOpponent && <FaSpinner className="animate-spin inline ml-2 text-squid-pink" />}
        </div>
      )}
      
      {/* Opponent disconnected message */}
      {opponentDisconnected && (
        <div className="text-center mb-6 bg-red-900/30 p-4 rounded-lg">
          <span className="text-white text-lg">{player2} disconnected from the game. You win!</span>
        </div>
      )}
      
      {/* Choices display area */}
      <div className="flex justify-center space-x-10 mb-8">
        <div className="flex flex-col items-center">
          <div className={`w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center ${player1Choice ? 'border-4 border-squid-pink' : ''}`}>
            {player1Choice ? choices[player1Choice].icon : <FaUser className="text-4xl text-white" />}
          </div>
          <span className="text-white mt-2">{player1}</span>
        </div>
        
        <div className="text-white text-4xl font-bold flex items-center">VS</div>
        
        <div className="flex flex-col items-center">
          <div className={`w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center ${player2Choice ? 'border-4 border-squid-pink' : ''}`}>
            {player2Choice ? choices[player2Choice].icon : (
              gameMode === GameMode.COMPUTER ? 
                <FaRobot className="text-4xl text-white" /> : 
                <FaUser className="text-4xl text-white" />
            )}
          </div>
          <span className="text-white mt-2">{player2}</span>
        </div>
      </div>
      
      {/* Show result animation */}
      {showResult && (
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-3xl font-bold ${
              result === 'player1' ? 'text-green-500' : 
              result === 'player2' ? 'text-red-500' : 
              'text-yellow-500'
            }`}
          >
            {result === 'player1' ? 'You Win!' : 
             result === 'player2' ? 'You Lose!' : 
             "It's a Tie!"}
          </motion.div>
        </div>
      )}
      
      {/* Choice buttons */}
      {!gameEnded && !opponentDisconnected && (
        <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
          {Object.entries(choices).map(([name, { icon }]) => (
            <motion.button
              key={name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                bg-gray-800 hover:bg-gray-700 text-white p-6 rounded-xl flex flex-col items-center justify-center transition-colors
                ${showResult || (waitingForOpponent && gameMode !== GameMode.LOCAL_MULTIPLAYER) ? 'opacity-50 cursor-not-allowed' : ''}
                ${((isPlayer1Turn && player1Choice === name) || (!isPlayer1Turn && player2Choice === name)) ? 'bg-squid-pink hover:bg-squid-pink' : ''}
              `}
              onClick={() => handleChoice(name as Choice)}
              disabled={showResult || (waitingForOpponent && gameMode !== GameMode.LOCAL_MULTIPLAYER)}
            >
              {icon}
              <span className="mt-2 capitalize">{name}</span>
            </motion.button>
          ))}
        </div>
      )}
      
      {/* Game over message */}
      {gameEnded && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 mt-8"
        >
          <div className="text-3xl font-bold text-white mb-2">Game Over!</div>
          <div className="text-xl text-gray-300 mb-4">
            {player1Score > player2Score
              ? `${player1} won the game!`
              : `${player2} won the game!`}
          </div>
          <div className="text-lg text-gray-400">Final Score: {player1Score} - {player2Score}</div>
        </motion.div>
      )}
      
      {/* Transaction details for betting */}
      {betAmount > 0 && transactionId && (
        <div className="mt-8 bg-gray-800 p-4 rounded-lg text-xs text-gray-400">
          <div className="flex justify-between mb-1">
            <span>Bet Amount:</span>
            <span>{betAmount} coins</span>
          </div>
          {escrowAddress && (
            <div className="flex justify-between mb-1">
              <span>Escrow:</span>
              <span className="truncate max-w-[200px]">{escrowAddress}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>TX ID:</span>
            <span className="truncate max-w-[200px]">{transactionId}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RockPaperScissorsGame; 