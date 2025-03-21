"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface AudioContextProps {
  isMuted: boolean;
  toggleMute: () => void;
  forcePlay: () => void;
}

const AudioContext = createContext<AudioContextProps | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioElementId = 'squid-game-audio-player';
  
  // Initialize the audio on client side only
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Try to restore mute state from localStorage
    const savedMuteState = localStorage.getItem('squid-audio-muted');
    if (savedMuteState === 'true') {
      setIsMuted(true);
    }

    // Check if audio element already exists
    let audioElement = document.getElementById(audioElementId) as HTMLAudioElement;
    
    // If not, create it and add to body
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = audioElementId;
      audioElement.src = '/squid_game.mp3';
      audioElement.loop = true;
      audioElement.autoplay = true;
      audioElement.volume = 0.8;
      audioElement.preload = 'auto';
      // Hidden but not display:none as some browsers won't autoplay hidden audio
      audioElement.style.position = 'absolute';
      audioElement.style.left = '-9999px';
      audioElement.style.top = '-9999px';
      audioElement.setAttribute('playsinline', '');
      audioElement.setAttribute('webkit-playsinline', '');
      
      if (savedMuteState === 'true') {
        audioElement.muted = true;
      }
      
      document.body.appendChild(audioElement);
    }
    
    audioRef.current = audioElement;
    
    // Attempt to play the audio when possible
    const attemptPlay = () => {
      if (!audioRef.current || isMuted) return;
      
      audioRef.current.muted = false;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setTimeout(attemptPlay, 300);
        });
      }
    };
    
    if (!isMuted) {
      // Try multiple times
      attemptPlay();
      setTimeout(attemptPlay, 500);
      setTimeout(attemptPlay, 1000);
      setTimeout(attemptPlay, 2000);
    }
    
    // Setup ALL possible user interaction events to enable audio
    const userInteractions = ['click', 'touchstart', 'touchend', 'mousedown', 
                             'mouseup', 'keydown', 'keyup', 'scroll', 'wheel', 
                             'mousemove', 'focus', 'visibilitychange'];
    
    const handleUserInteraction = () => {
      if (audioRef.current && !isMuted) {
        audioRef.current.play()
          .catch(() => {/* Ignore errors */});
      }
    };
    
    userInteractions.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: false });
    });
    
    // Cleanup
    return () => {
      userInteractions.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [isMuted]);

  // Handle mute/unmute
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.pause();
      audioRef.current.muted = true;
    } else {
      audioRef.current.muted = false;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Try again after a short delay
          setTimeout(() => {
            if (audioRef.current) audioRef.current.play().catch(() => {});
          }, 100);
        });
      }
    }
    
    // Save mute preference
    localStorage.setItem('squid-audio-muted', isMuted.toString());
  }, [isMuted]);

  // Toggle mute function
  const toggleMute = () => {
    setIsMuted(prevState => !prevState);
  };
  
  // Force play function that can be called from any component
  const forcePlay = () => {
    if (audioRef.current && !isMuted) {
      // Unmute first (important for iOS)
      audioRef.current.muted = false;
      audioRef.current.play()
        .catch(() => {
          // Try again with user interaction simulation
          const simulatedEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(simulatedEvent);
        });
    }
  };

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, forcePlay }}>
      {children}
    </AudioContext.Provider>
  );
}

// Custom hook to use the audio context
export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
} 