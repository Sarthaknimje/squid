import { useState, useCallback } from 'react';

// Tournament data interface
interface TournamentData {
  id: string;
  name: string;
  playerName: string;
  betAmount: number;
  isActive: boolean;
}

// Game progress interface
interface GameProgress {
  result: 'won' | 'lost' | 'tie';
  score: number;
}

export function useTournament() {
  const [isInTournament, setIsInTournament] = useState(false);
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [gameProgress, setGameProgress] = useState<Record<string, GameProgress>>({});
  
  // Enter tournament function
  const enterTournament = useCallback((data: Omit<TournamentData, 'isActive'>) => {
    setTournamentData({
      ...data,
      isActive: true
    });
    setIsInTournament(true);
    return true;
  }, []);
  
  // Leave tournament function
  const leaveTournament = useCallback(() => {
    setTournamentData(null);
    setIsInTournament(false);
    setGameProgress({});
  }, []);
  
  // Update game progress
  const updateProgress = useCallback((gameId: string, progress: GameProgress) => {
    setGameProgress(prev => ({
      ...prev,
      [gameId]: progress
    }));
  }, []);
  
  // Get progress for a specific game
  const getProgress = useCallback((gameId: string) => {
    return gameProgress[gameId] || null;
  }, [gameProgress]);
  
  return {
    isInTournament,
    tournamentData,
    enterTournament,
    leaveTournament,
    updateProgress,
    getProgress,
    gameProgress
  };
} 