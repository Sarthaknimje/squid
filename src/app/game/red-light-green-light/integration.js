/**
 * Red Light Green Light Game Integration Module
 * 
 * This module provides integration between the Red Light Green Light game
 * and the Next.js application.
 */

// Function to preload audio files
export function preloadAudio() {
  console.log('Preloading audio files...');
  
  const audioFiles = [
    '/sounds/alert.mp3',
    '/sounds/success.mp3',
    '/sounds/win.mp3',
    '/sounds/lose.mp3',
    '/sounds/click.mp3'
  ];
  
  const promises = audioFiles.map(url => {
    return new Promise((resolve) => {
      const audio = new Audio();
      
      audio.oncanplaythrough = () => {
        console.log(`Audio loaded: ${url}`);
        resolve(true);
      };
      
      audio.onerror = () => {
        console.warn(`Failed to load audio: ${url}`);
        resolve(false); // Resolve anyway to not block the game
      };
      
      audio.src = url;
    });
  });
  
  return Promise.all(promises);
}

// Main function to initialize the game
export async function initializeRedLightGreenLight() {
  console.log('Initializing Red Light Green Light game...');
  
  try {
    // Preload audio files
    await preloadAudio();
    
    console.log('All game resources loaded successfully');
    return true;
  } catch (err) {
    console.error('Error initializing game resources:', err);
    return false;
  }
}

// Function to check if all required resources are available
export function checkGameResources() {
  // No external resources needed for canvas version
  return {
    allAvailable: true
  };
}

// Function to recover from loading errors
export async function recoverFromLoadingErrors() {
  console.log('No recovery needed for canvas implementation');
  return true;
}

// Function to create a fallback renderer (not needed anymore but kept for compatibility)
export function createFallbackRenderer() {
  console.log('Using canvas renderer by default');
  return true;
}

// Load a script from URL
export function loadScript(url) {
  return new Promise((resolve, reject) => {
    // For compatibility - just resolve immediately since we don't use external scripts
    resolve(true);
  });
}