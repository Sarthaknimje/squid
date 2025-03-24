import React, { useState, useEffect } from 'react';
import { processWinningsPayout } from '@/utils/wallet';

interface GameResultDisplayProps {
  result: 'won' | 'lost' | 'tie' | null;
  winner: string | null;
  betAmount?: string;
  onPlayAgain: () => void;
  onReturn: () => void;
}

const GameResultDisplay: React.FC<GameResultDisplayProps> = ({
  result,
  winner,
  betAmount,
  onPlayAgain,
  onReturn
}) => {
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [payoutComplete, setPayoutComplete] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  // Calculate winning amount (1.9 times bet amount, which is 90% of the total pool)
  const winningAmount = betAmount ? (parseFloat(betAmount) * 1.9).toFixed(2) : "0";
  
  useEffect(() => {
    // Auto-process payout when it's a win
    const processPayout = async () => {
      if (result === 'won' && betAmount && parseFloat(betAmount) > 0 && !payoutComplete) {
        setIsProcessingPayout(true);
        
        try {
          const payoutResult = await processWinningsPayout(winningAmount);
          setTransactionHash(payoutResult.hash);
          setPayoutComplete(true);
        } catch (error) {
          console.error('Error processing payout:', error);
        } finally {
          setIsProcessingPayout(false);
        }
      }
    };
    
    processPayout();
  }, [result, betAmount, winningAmount, payoutComplete]);
  
  if (!result) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold mb-4 text-center">
          {result === 'won' 
            ? '🎉 You Won! 🎉' 
            : result === 'lost' 
              ? '😢 Game Over 😢' 
              : '🤝 It\'s a Tie! 🤝'}
        </h2>
        
        {result === 'won' && (
          <div className="mb-6 text-center">
            {betAmount && parseFloat(betAmount) > 0 ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-green-600">
                  You won {winningAmount} SQUID!
                </p>
                
                {isProcessingPayout ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-squid-pink"></div>
                    <p>Processing payout...</p>
                  </div>
                ) : payoutComplete ? (
                  <div className="text-sm">
                    <p className="text-green-600">Payout complete!</p>
                    {transactionHash && (
                      <p className="truncate">
                        TX: {transactionHash.substring(0, 10)}...{transactionHash.substring(transactionHash.length - 10)}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <p>Congratulations on your victory!</p>
            )}
          </div>
        )}
        
        {result === 'lost' && (
          <div className="mb-6 text-center">
            {winner && <p>Winner: {winner}</p>}
            {betAmount && parseFloat(betAmount) > 0 && (
              <p className="text-red-600 mt-2">
                You lost {betAmount} SQUID
              </p>
            )}
          </div>
        )}
        
        {result === 'tie' && (
          <div className="mb-6 text-center">
            <p>Nobody wins or loses!</p>
          </div>
        )}
        
        <div className="flex justify-center gap-4">
          <button
            onClick={onPlayAgain}
            className="px-6 py-2 bg-squid-pink text-white rounded-md hover:bg-opacity-90 transition"
          >
            Play Again
          </button>
          
          <button
            onClick={onReturn}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameResultDisplay; 