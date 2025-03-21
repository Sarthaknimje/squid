"use client";

import React, { useState, useEffect } from 'react';
import { FaVolumeUp, FaVolumeMute, FaPlay } from 'react-icons/fa';
import { useAudio } from '@/contexts/AudioContext';

export default function GlobalAudioControl() {
  const { isMuted, toggleMute, forcePlay } = useAudio();
  const [showHint, setShowHint] = useState(false);
  
  useEffect(() => {
    // Check if this is first visit
    const hasVisited = localStorage.getItem('squid-audio-visited');
    
    if (!hasVisited) {
      // Show hint after a short delay
      setTimeout(() => {
        setShowHint(true);
      }, 2000);
      
      // Hide hint after 8 seconds
      setTimeout(() => {
        setShowHint(false);
        localStorage.setItem('squid-audio-visited', 'true');
      }, 10000);
    }
  }, []);

  const handleClick = () => {
    toggleMute();
    forcePlay();
    setShowHint(false);
  };

  return (
    <div className="fixed top-20 right-4 z-50">
      {showHint && (
        <div className="absolute right-0 -top-14 bg-squid-dark text-white p-3 rounded-lg shadow-glow text-sm whitespace-nowrap mb-2 animate-pulse">
          Click to enable music <span className="ml-1">🎵</span>
          <div className="absolute -bottom-2 right-3 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-squid-dark"></div>
        </div>
      )}
      <button 
        onClick={handleClick} 
        className="bg-squid-dark p-2 rounded-full hover:bg-opacity-80 transition-all shadow-glow"
        aria-label={isMuted ? "Unmute background music" : "Mute background music"}
      >
        {isMuted ? 
          <FaVolumeMute className="text-white text-xl" /> : 
          <FaVolumeUp className="text-white text-xl" />
        }
      </button>
    </div>
  );
} 