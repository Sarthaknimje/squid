'use client';

import React, { useState, useEffect } from 'react';
import { useAptosWallet } from '@/contexts/AptosWalletContext';
import { FaCoins, FaTrophy, FaUsers, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { payTournamentEntryFee } from '@/lib/petraWalletService';

interface TournamentPrizePoolProps {
  tournamentId: string;
  entryFee: string;
  totalParticipants: number;
  maxParticipants: number;
  prizeDistribution?: {
    first: number;
    second: number;
    third: number;
    platform: number;
  };
  onJoinSuccess?: () => void;
}

const TournamentPrizePool: React.FC<TournamentPrizePoolProps> = ({
  tournamentId,
  entryFee,
  totalParticipants,
  maxParticipants,
  prizeDistribution = {
    first: 70,
    second: 20,
    third: 5,
    platform: 5
  },
  onJoinSuccess
}) => {
  const { wallet } = useAptosWallet();
  const [isJoining, setIsJoining] = useState(false);
  const [prizePool, setPrizePool] = useState('0');
  const [prizeBreakdown, setPrizeBreakdown] = useState<{[key: string]: string}>({});
  
  // Calculate prize pool based on entry fee and participants
  useEffect(() => {
    if (!entryFee) return;
    
    try {
      // Remove 'APT' suffix if present and convert to number
      const feeValue = parseFloat(entryFee.replace(' APT', ''));
      const totalPool = feeValue * totalParticipants;
      
      // Format to 2 decimal places
      setPrizePool(totalPool.toFixed(2));
      
      // Calculate prize breakdown
      const breakdown = {
        first: ((totalPool * prizeDistribution.first) / 100).toFixed(2),
        second: ((totalPool * prizeDistribution.second) / 100).toFixed(2),
        third: ((totalPool * prizeDistribution.third) / 100).toFixed(2),
        platform: ((totalPool * prizeDistribution.platform) / 100).toFixed(2)
      };
      
      setPrizeBreakdown(breakdown);
    } catch (error) {
      console.error('Error calculating prize pool:', error);
    }
  }, [entryFee, totalParticipants, prizeDistribution]);
  
  const handleJoinTournament = async () => {
    if (!wallet.isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    setIsJoining(true);
    
    try {
      const result = await payTournamentEntryFee();
      
      if (result && result.hash) {
        toast.success('Successfully joined tournament!');
        if (onJoinSuccess) onJoinSuccess();
      } else {
        toast.error('Failed to join tournament');
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast.error('Error processing payment');
    } finally {
      setIsJoining(false);
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-squid-pink flex items-center">
        <FaTrophy className="mr-2" /> Prize Pool
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300">Total Prize Pool:</span>
            <span className="text-2xl font-bold text-squid-pink">{prizePool} APT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Entry Fee:</span>
            <span className="font-semibold">{entryFee}</span>
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-300">Participants:</span>
            <span className="font-semibold">{totalParticipants} / {maxParticipants}</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2.5 mb-1">
            <div 
              className="bg-squid-pink h-2.5 rounded-full" 
              style={{ width: `${(totalParticipants / maxParticipants) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400 text-right">
            {Math.round((totalParticipants / maxParticipants) * 100)}% Full
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <FaCoins className="mr-2 text-yellow-500" /> Prize Distribution
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-gray-700 p-2 rounded">
            <span className="flex items-center">
              <FaTrophy className="text-yellow-400 mr-2" /> 1st Place
            </span>
            <span className="font-semibold">{prizeBreakdown.first} APT</span>
          </div>
          <div className="flex items-center justify-between bg-gray-700 p-2 rounded">
            <span className="flex items-center">
              <FaTrophy className="text-gray-400 mr-2" /> 2nd Place
            </span>
            <span className="font-semibold">{prizeBreakdown.second} APT</span>
          </div>
          <div className="flex items-center justify-between bg-gray-700 p-2 rounded">
            <span className="flex items-center">
              <FaTrophy className="text-amber-700 mr-2" /> 3rd Place
            </span>
            <span className="font-semibold">{prizeBreakdown.third} APT</span>
          </div>
          <div className="flex items-center justify-between bg-gray-700 p-2 rounded text-sm">
            <span className="text-gray-400">Platform Fee</span>
            <span className="text-gray-400">{prizeBreakdown.platform} APT</span>
          </div>
        </div>
      </div>
      
      <button
        onClick={handleJoinTournament}
        disabled={isJoining || totalParticipants >= maxParticipants || !wallet.isConnected}
        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center ${isJoining || totalParticipants >= maxParticipants || !wallet.isConnected ? 'bg-gray-600 cursor-not-allowed' : 'bg-squid-pink hover:bg-pink-700'}`}
      >
        {isJoining ? (
          <>
            <FaSpinner className="animate-spin mr-2" /> Processing...
          </>
        ) : totalParticipants >= maxParticipants ? (
          <>
            <FaExclamationTriangle className="mr-2" /> Tournament Full
          </>
        ) : !wallet.isConnected ? (
          'Connect Wallet to Join'
        ) : (
          <>Join Tournament ({entryFee})</>
        )}
      </button>
      
      {!wallet.isConnected && (
        <p className="text-sm text-gray-400 mt-2 text-center">
          You need to connect your APTOS wallet to join this tournament
        </p>
      )}
    </div>
  );
};

export default TournamentPrizePool;