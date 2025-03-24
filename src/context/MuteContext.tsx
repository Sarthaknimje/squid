'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type MuteContextType = {
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMute: () => void;
};

const defaultContext: MuteContextType = {
  isMuted: false,
  setIsMuted: () => {},
  toggleMute: () => {},
};

const MuteContext = createContext<MuteContextType>(defaultContext);

export const useMuteContext = () => useContext(MuteContext);

export const MuteContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Load mute preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMuteState = localStorage.getItem('isMuted');
      if (savedMuteState) {
        setIsMuted(savedMuteState === 'true');
      }
    }
  }, []);

  // Save mute preference to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isMuted', String(isMuted));
    }
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  return (
    <MuteContext.Provider
      value={{
        isMuted,
        setIsMuted,
        toggleMute,
      }}
    >
      {children}
    </MuteContext.Provider>
  );
};

export default MuteContext; 