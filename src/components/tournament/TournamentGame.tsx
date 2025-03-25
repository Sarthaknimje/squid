'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPlay, FaSpinner, FaTrophy, FaCoins, FaUserAlt, FaRobot } from 'react-icons/fa';
import { useAptosWallet } from '@/contexts/AptosWalletContext';
import { useAIAgent } from '@/contexts/AIAgentContext';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { payTournamentWinnings } from '@/lib/petraWalletService';

// Dynamically import game components to reduce initial load time
const RedLightGreenLightGame = dynamic(() => import('@/components/games/RedLightGreenLightGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-800 rounded-lg flex flex-col items-center justify-center">
      <FaSpinner className="animate-spin text-squid-pink text-4xl mb-4" />
      <span className="text-white text-xl">Loading game...</span>
    </div>
  ),
});

interface TournamentGameProps {
  matchId: string;
  game: string;
  player1: {
    id: string;
    name: string;
    isBot?: boolean;
    address?: string;
  };
  player2: {
    id: string;
    name: string;
    isBot?: boolean;
    address?: string;
  };
  onGameComplete?: (result: {
    matchId: string;
    winnerId: string;
    score1: number;
    score2: number;
  }) => void;
}

const TournamentGame: React.FC<TournamentGameProps> = ({
  matchId,
  game,
  player1,
  player2,
  onGameComplete
}) => {
  const { wallet } = useAptosWallet();
  const { agent } = useAIAgent();
  
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'completed'>('waiting');
  const [winner, setWinner] = useState<string | null>(null);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [isProcessingReward, setIsProcessingReward] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Start countdown when component mounts
  useEffect(() => {
    if (gameState === 'waiting') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('playing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [gameState]);
  
  // Handle game completion and rewards
  const handleGameOver = async (result: 'won' | 'lost', score: number) => {
    // Determine winner based on player perspective (player1 is always the current user)
    const winnerId = result === 'won' ? player1.id : player2.id;
    const winnerAddress = result === 'won' ? player1.address : player2.address;
    
    // Set scores
    if (result === 'won') {
      setPlayer1Score(score);
      setPlayer2Score(Math.floor(score * 0.7)); // AI opponent gets lower score
    } else {
      setPlayer1Score(score);
      setPlayer2Score(score + Math.floor(Math.random() * 3) + 1); // AI opponent wins by small margin
    }
    
    setWinner(winnerId);
    setGameState('completed');
    
    // Process tournament rewards if this is a real player (not bot) and has a wallet address
    if (winnerAddress && !isProcessingReward) {
      setIsProcessingReward(true);
      
      try {
        // Only process rewards if wallet is connected
        if (wallet.isConnected) {
          const rewardResult = await payTournamentWinnings(winnerAddress);
          
          if (rewardResult.winnerHash) {
            toast.success('Tournament winnings paid!');
          } else {
            toast.error('Failed to process tournament winnings');
          }
        }
      } catch (error) {
        console.error('Error processing tournament rewards:', error);
        toast.error('Error processing tournament rewards');
      } finally {
        setIsProcessingReward(false);
      }
    }
    
    // Notify parent component about game completion
    if (onGameComplete) {
      onGameComplete({
        matchId,
        winnerId,
        score1: player1Score,
        score2: player2Score
      });
    }
  };
  
  // Render appropriate game component based on game type
  const renderGame = () => {
    switch (game) {
      case 'Red Light, Green Light':
        return (
          <RedLightGreenLightGame 
            onGameOver={handleGameOver}
            gameMode="tournament"
            isMuted={false}
          />
        );
      // Add other game types here as they are implemented
      default:
        return (
          <div className="w-full h-64 bg-gray-800 rounded-lg flex flex-col items-center justify-center">
            <span className="text-white text-xl">Game not available</span>
            <p className="text-gray-400 mt-2">This game is not yet implemented in tournament mode</p>
          </div>
        );
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* Game header with player info */}
      <div className="bg-gray-700 p-4">
        <h2 className="text-xl font-bold mb-2 text-center">{game}</h2>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xl mr-2">
              {player1.isBot ? <FaRobot /> : <FaUserAlt />}
            </div>
            <div>
              <p className="font-semibold">{player1.name}</p>
              <p className="text-xs text-gray-400">{player1.isBot ? 'AI Agent' : 'Player'}</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">
              {gameState === 'completed' ? `${player1Score} - ${player2Score}` : 'VS'}
            </div>
            {gameState === 'waiting' && (
              <div className="text-squid-pink text-xl font-bold">{countdown}</div>
            )}
          </div>
          
          <div className="flex items-center">
            <div>
              <p className="font-semibold text-right">{player2.name}</p>
              <p className="text-xs text-gray-400 text-right">{player2.isBot ? 'AI Agent' : 'Player'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-xl ml-2">
              {player2.isBot ? <FaRobot /> : <FaUserAlt />}
            </div>
          </div>
        </div>
      </div>
      
      {/* Game content */}
      <div className="p-4">
        {gameState === 'waiting' ? (
          <motion.div 
            className="w-full h-64 bg-gray-900 rounded-lg flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-white text-3xl font-bold mb-4">Get Ready!</span>
            <div className="text-squid-pink text-6xl font-bold">{countdown}</div>
            <p className="text-gray-400 mt-4">Game starting soon...</p>
          </motion.div>
        ) : gameState === 'playing' ? (
          <div className="w-full rounded-lg overflow-hidden">
            {renderGame()}
          </div>
        ) : (
          <motion.div 
            className="w-full h-64 bg-gray-900 rounded-lg flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FaTrophy className="text-yellow-400 text-5xl mb-4" />
            <span className="text-white text-2xl font-bold mb-2">
              {winner === player1.id ? 'You Won!' : 'You Lost!'}
            </span>
            <div className="text-xl font-bold mb-4">
              {player1Score} - {player2Score}
            </div>
            {isProcessingReward ? (
              <div className="flex items-center text-green-400">
                <FaSpinner className="animate-spin mr-2" /> Processing rewards...
              </div>
            ) : winner === player1.id && (
              <div className="flex items-center text-green-400">
                <FaCoins className="mr-2" /> Rewards claimed!
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TournamentGame;