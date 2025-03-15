"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type GameResult = {
  gameId: string;
  completed: boolean;
  score: number;
  date: string;
  attempts: number;
};

type PlayerProgress = {
  totalScore: number;
  gamesCompleted: number;
  lastActiveGame: string | null;
  gameResults: Record<string, GameResult>;
  achievements: string[];
};

interface PlayerProgressContextType {
  progress: PlayerProgress;
  updateGameResult: (gameId: string, score: number, completed: boolean) => void;
  resetProgress: () => void;
  getHighestScore: (gameId: string) => number;
  trackGamePlayed: (gameId: string) => void;
  addPoints: (points: number) => void;
  unlockAchievement: (achievementId: string, details: string) => void;
}

const defaultProgress: PlayerProgress = {
  totalScore: 0,
  gamesCompleted: 0,
  lastActiveGame: null,
  gameResults: {},
  achievements: [],
};

// List of all games
const GAME_IDS = [
  'red-light-green-light',
  'tug-of-war',
  'marbles',
  'glass-bridge',
  'squid-game',
];

// List of possible achievements
const ACHIEVEMENTS = {
  'first-victory': 'First Victory',
  'all-games-played': 'Participated in All Games',
  'all-games-completed': 'Completed All Games',
  'high-scorer': 'High Scorer (50,000+ points)',
  'perfect-run': 'Perfect Run (Complete all games in sequence)',
};

const PlayerProgressContext = createContext<PlayerProgressContextType | undefined>(undefined);

export function PlayerProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<PlayerProgress>(defaultProgress);
  
  // Initialize from localStorage on component mount
  useEffect(() => {
    const storedProgress = localStorage.getItem('playerProgress');
    if (storedProgress) {
      setProgress(JSON.parse(storedProgress));
    }
  }, []);
  
  // Save to localStorage whenever progress changes
  useEffect(() => {
    localStorage.setItem('playerProgress', JSON.stringify(progress));
  }, [progress]);
  
  // Check for achievements
  useEffect(() => {
    const newAchievements = [...progress.achievements];
    
    // First victory achievement
    if (Object.values(progress.gameResults).some(game => game.completed) && 
        !progress.achievements.includes('first-victory')) {
      newAchievements.push('first-victory');
    }
    
    // All games played achievement
    const allGamesPlayed = GAME_IDS.every(gameId => progress.gameResults[gameId]);
    if (allGamesPlayed && !progress.achievements.includes('all-games-played')) {
      newAchievements.push('all-games-played');
    }
    
    // All games completed achievement
    const allGamesCompleted = GAME_IDS.every(gameId => 
      progress.gameResults[gameId]?.completed === true
    );
    if (allGamesCompleted && !progress.achievements.includes('all-games-completed')) {
      newAchievements.push('all-games-completed');
    }
    
    // High scorer achievement
    if (progress.totalScore >= 50000 && !progress.achievements.includes('high-scorer')) {
      newAchievements.push('high-scorer');
    }
    
    // Perfect run achievement
    const perfectRunOrder = ['red-light-green-light', 'tug-of-war', 'marbles', 'glass-bridge', 'squid-game'];
    const completedGames = Object.entries(progress.gameResults)
      .filter(([_, result]) => result.completed)
      .sort((a, b) => new Date(a[1].date).getTime() - new Date(b[1].date).getTime())
      .map(([gameId]) => gameId);
    
    const isPerfectRun = perfectRunOrder.every((gameId, index) => 
      completedGames[index] === gameId
    ) && completedGames.length === perfectRunOrder.length;
    
    if (isPerfectRun && !progress.achievements.includes('perfect-run')) {
      newAchievements.push('perfect-run');
    }
    
    // Update achievements if there are new ones
    if (newAchievements.length > progress.achievements.length) {
      setProgress(prev => ({
        ...prev,
        achievements: newAchievements,
      }));
    }
  }, [progress.gameResults, progress.totalScore, progress.achievements]);
  
  // Update a game result
  const updateGameResult = (gameId: string, score: number, completed: boolean) => {
    setProgress(prev => {
      const existingResult = prev.gameResults[gameId];
      const newScore = Math.max(score, existingResult?.score || 0);
      const wasCompletedBefore = existingResult?.completed || false;
      
      // Increment games completed count if this is first completion
      const newGamesCompleted = 
        completed && !wasCompletedBefore 
          ? prev.gamesCompleted + 1 
          : prev.gamesCompleted;
      
      // Update total score
      const scoreIncrease = existingResult 
        ? Math.max(0, newScore - existingResult.score) 
        : newScore;
      
      return {
        ...prev,
        totalScore: prev.totalScore + scoreIncrease,
        gamesCompleted: newGamesCompleted,
        lastActiveGame: gameId,
        gameResults: {
          ...prev.gameResults,
          [gameId]: {
            gameId,
            completed: completed || wasCompletedBefore,
            score: newScore,
            date: new Date().toISOString(),
            attempts: (existingResult?.attempts || 0) + 1,
          },
        },
      };
    });
  };
  
  // Reset progress
  const resetProgress = () => {
    setProgress(defaultProgress);
  };
  
  // Get highest score for a game
  const getHighestScore = (gameId: string): number => {
    return progress.gameResults[gameId]?.score || 0;
  };
  
  // Add new functions
  const trackGamePlayed = (gameId: string) => {
    setProgress(prev => {
      const existingResult = prev.gameResults[gameId] || {
        gameId,
        completed: false,
        score: 0,
        date: new Date().toISOString(),
        attempts: 0
      };
      
      return {
        ...prev,
        lastActiveGame: gameId,
        gameResults: {
          ...prev.gameResults,
          [gameId]: {
            ...existingResult,
            attempts: existingResult.attempts + 1,
            date: new Date().toISOString()
          }
        }
      };
    });
  };

  const addPoints = (points: number) => {
    setProgress(prev => ({
      ...prev,
      totalScore: prev.totalScore + points
    }));
  };

  const unlockAchievement = (achievementId: string, details: string) => {
    if (!progress.achievements.includes(achievementId)) {
      setProgress(prev => ({
        ...prev,
        achievements: [...prev.achievements, achievementId]
      }));
      
      // Could implement achievement notification here
      console.log(`Achievement unlocked: ${achievementId} - ${details}`);
    }
  };

  return (
    <PlayerProgressContext.Provider
      value={{
        progress,
        updateGameResult,
        resetProgress,
        getHighestScore,
        trackGamePlayed,
        addPoints,
        unlockAchievement
      }}
    >
      {children}
    </PlayerProgressContext.Provider>
  );
}

export function usePlayerProgress() {
  const context = useContext(PlayerProgressContext);
  if (context === undefined) {
    throw new Error('usePlayerProgress must be used within a PlayerProgressProvider');
  }
  return context;
}

export function getAchievementDetails(achievementId: string) {
  return ACHIEVEMENTS[achievementId as keyof typeof ACHIEVEMENTS] || 'Unknown Achievement';
} 