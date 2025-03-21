"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaMusic, FaVolumeUp } from 'react-icons/fa';
import { useAudio } from '@/contexts/AudioContext';

export default function AudioStarter() {
  const [showStarter, setShowStarter] = useState(true);
  const { forcePlay } = useAudio();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Always show until manually dismissed
  // No localStorage check to ensure it always appears
  
  useEffect(() => {
    // Create an inline audio element for direct DOM access
    if (typeof window !== 'undefined' && audioRef.current) {
      // Attempt to play on mount
      const playAttempt = audioRef.current.play();
      if (playAttempt) {
        playAttempt.catch(() => {
          // Ignore play errors - will be handled by user click
        });
      }
    }
  }, []);
  
  const handleStart = () => {
    // Play the inline audio element
    if (audioRef.current) {
      // Set volume
      audioRef.current.volume = 0.8;
      // Unmute if needed
      audioRef.current.muted = false;
      // Play audio
      audioRef.current.play().catch(() => {
        // If direct play fails, try forcing play through context
        forcePlay();
      });
    }
    
    // Also trigger the global audio context
    forcePlay();
    
    // Try multiple times to ensure audio plays
    setTimeout(() => forcePlay(), 100);
    setTimeout(() => forcePlay(), 500);
    
    // Hide after starting
    setShowStarter(false);
  };
  
  if (!showStarter) return null;
  
  return (
    <AnimatePresence>
      {showStarter && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Hidden audio element */}
          <audio 
            ref={audioRef}
            src="/squid_game.mp3" 
            loop 
            preload="auto"
            autoPlay
            playsInline 
            className="hidden"
          />
          
          <motion.div 
            className="bg-squid-dark p-8 rounded-xl shadow-glow max-w-md w-full text-center border-4 border-squid-pink"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ 
              scale: 1, 
              y: 0,
              boxShadow: ["0 0 10px #FF0067", "0 0 20px #FF0067", "0 0 10px #FF0067"]
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300,
              boxShadow: {
                repeat: Infinity,
                duration: 2
              }
            }}
          >
            <div className="relative">
              <div className="absolute -top-20 left-1/2 transform -translate-x-1/2">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotateZ: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <FaVolumeUp className="text-squid-pink text-7xl mx-auto" />
                </motion.div>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">START AUDIO</h2>
            <p className="text-gray-300 mb-6">
              <span className="text-squid-pink font-bold text-xl">ATTENTION!</span><br/>
              To experience the full Squid Game immersion with the iconic soundtrack, you MUST click the button below!
            </p>
            <motion.button
              onClick={handleStart}
              className="bg-squid-pink hover:bg-opacity-80 text-white font-bold py-5 px-8 rounded-md transition duration-200 flex items-center justify-center mx-auto shadow-glow w-full text-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                backgroundColor: ["#FF0067", "#ff66a3", "#FF0067"],
                y: [0, -5, 0]
              }}
              transition={{
                backgroundColor: {
                  duration: 2,
                  repeat: Infinity,
                },
                y: {
                  duration: 1,
                  repeat: Infinity,
                }
              }}
            >
              <FaPlay className="mr-2 text-2xl" /> ENABLE GAME AUDIO
            </motion.button>
            <motion.p
              className="mt-4 text-squid-pink font-bold"
              animate={{
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity
              }}
            >
              *Click to unlock the full experience*
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 