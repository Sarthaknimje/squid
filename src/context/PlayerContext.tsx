'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type PlayerContextType = {
  playerName: string;
  setPlayerName: (name: string) => void;
  playerCoins: number;
  setPlayerCoins: React.Dispatch<React.SetStateAction<number>>;
  addCoins: (amount: number) => void;
  deductCoins: (amount: number) => void;
};

const defaultContext: PlayerContextType = {
  playerName: '',
  setPlayerName: () => {},
  playerCoins: 1000,
  setPlayerCoins: () => {},
  addCoins: () => {},
  deductCoins: () => {},
};

const PlayerContext = createContext<PlayerContextType>(defaultContext);

export const usePlayerContext = () => useContext(PlayerContext);

export const PlayerContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [playerName, setPlayerName] = useState<string>('');
  const [playerCoins, setPlayerCoins] = useState<number>(1000);

  // Load player data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('playerName');
      const savedCoins = localStorage.getItem('playerCoins');
      
      if (savedName) setPlayerName(savedName);
      if (savedCoins) setPlayerCoins(Number(savedCoins));
    }
  }, []);

  // Save player data to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('playerName', playerName);
      localStorage.setItem('playerCoins', String(playerCoins));
    }
  }, [playerName, playerCoins]);

  const addCoins = (amount: number) => {
    setPlayerCoins(prev => prev + amount);
  };

  const deductCoins = (amount: number) => {
    setPlayerCoins(prev => Math.max(0, prev - amount));
  };

  return (
    <PlayerContext.Provider
      value={{
        playerName,
        setPlayerName,
        playerCoins,
        setPlayerCoins,
        addCoins,
        deductCoins,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerContext; 