'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaMedal, FaUserAlt, FaRobot } from 'react-icons/fa';

type Match = {
  id: string;
  round: number;
  player1: {
    id: string;
    name: string;
    score?: number;
    isWinner?: boolean;
    isBot?: boolean;
  };
  player2: {
    id: string;
    name: string;
    score?: number;
    isWinner?: boolean;
    isBot?: boolean;
  };
  winner?: string;
  game?: string;
  status: 'pending' | 'in_progress' | 'completed';
  nextMatchId?: string;
};

type Round = {
  id: number;
  name: string;
  matches: Match[];
};

interface TournamentBracketProps {
  rounds: Round[];
  currentRound: number;
  onMatchSelect?: (match: Match) => void;
  highlightedMatchId?: string;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({
  rounds,
  currentRound,
  onMatchSelect,
  highlightedMatchId
}) => {
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  
  // Set highlighted match as selected
  useEffect(() => {
    if (highlightedMatchId) {
      setSelectedMatch(highlightedMatchId);
    }
  }, [highlightedMatchId]);
  
  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match.id);
    if (onMatchSelect) {
      onMatchSelect(match);
    }
  };
  
  const getPlayerIcon = (player: Match['player1']) => {
    if (!player) return null;
    return player.isBot ? <FaRobot className="text-blue-400" /> : <FaUserAlt className="text-green-400" />;
  };
  
  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="min-w-[900px] flex justify-center space-x-8 p-4">
        {rounds.map((round, roundIndex) => (
          <div key={round.id} className="flex flex-col space-y-8">
            <div className="text-center text-squid-pink font-bold mb-4">
              {round.name}
              {currentRound === round.id && (
                <span className="ml-2 px-2 py-0.5 bg-squid-pink text-white text-xs rounded-full">
                  Current
                </span>
              )}
            </div>
            
            <div className="flex flex-col space-y-12">
              {round.matches.map((match, matchIndex) => {
                const isSelected = selectedMatch === match.id;
                const isHighlighted = highlightedMatchId === match.id;
                
                return (
                  <motion.div 
                    key={match.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: matchIndex * 0.1 }}
                    className={`w-64 rounded-lg p-4 cursor-pointer transition-all duration-300 ${isSelected || isHighlighted ? 'ring-2 ring-squid-pink shadow-lg' : ''} ${
                      match.status === 'pending' ? 'bg-gray-800 border border-gray-700' :
                      match.status === 'in_progress' ? 'bg-gray-800 border border-yellow-500' :
                      'bg-gray-800 border border-gray-600'
                    }`}
                    onClick={() => handleMatchClick(match)}
                  >
                    {match.game && (
                      <div className="text-xs text-center bg-gray-700 rounded py-1 px-2 mb-3">
                        {match.game}
                      </div>
                    )}
                    
                    <div className={`p-3 rounded mb-2 flex justify-between items-center ${
                      match.player1.isWinner ? 'bg-green-900/20 border-l-4 border-green-500' : 
                      match.status === 'completed' && !match.player1.isWinner ? 'bg-gray-700/50' : 'bg-gray-700'
                    }`}>
                      <div className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center mr-2">
                          {getPlayerIcon(match.player1)}
                        </span>
                        <span className="truncate max-w-[120px]">{match.player1.name || 'TBD'}</span>
                      </div>
                      {match.status !== 'pending' && (
                        <span className="font-bold">{match.player1.score !== undefined ? match.player1.score : '-'}</span>
                      )}
                    </div>
                    
                    <div className="text-center text-xs text-gray-500 my-1 flex items-center justify-center">
                      <div className="h-px bg-gray-700 flex-grow"></div>
                      <span className="px-2">VS</span>
                      <div className="h-px bg-gray-700 flex-grow"></div>
                    </div>
                    
                    <div className={`p-3 rounded flex justify-between items-center ${
                      match.player2.isWinner ? 'bg-green-900/20 border-l-4 border-green-500' : 
                      match.status === 'completed' && !match.player2.isWinner ? 'bg-gray-700/50' : 'bg-gray-700'
                    }`}>
                      <div className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center mr-2">
                          {getPlayerIcon(match.player2)}
                        </span>
                        <span className="truncate max-w-[120px]">{match.player2.name || 'TBD'}</span>
                      </div>
                      {match.status !== 'pending' && (
                        <span className="font-bold">{match.player2.score !== undefined ? match.player2.score : '-'}</span>
                      )}
                    </div>
                    
                    {match.status === 'in_progress' && (
                      <div className="mt-3 text-center">
                        <span className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full animate-pulse">
                          In Progress
                        </span>
                      </div>
                    )}
                    
                    {match.status === 'completed' && match.winner && (
                      <div className="mt-3 text-center">
                        <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          Completed
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
            
            {/* Add connecting lines between rounds if not the last round */}
            {roundIndex < rounds.length - 1 && round.matches.length > 0 && (
              <div className="relative h-full">
                {round.matches.map((match, matchIndex) => (
                  <div key={`line-${match.id}`} className="absolute right-0 top-0 h-full">
                    {/* Horizontal line */}
                    <div className="absolute top-1/2 right-0 w-8 h-px bg-gray-600"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Tournament Legend */}
      <div className="flex justify-center mt-6 space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-700 rounded mr-2"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-500/20 border border-yellow-500 rounded mr-2"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-900/20 border-l-4 border-green-500 rounded mr-2"></div>
          <span>Winner</span>
        </div>
      </div>
    </div>
  );
};

export default TournamentBracket;