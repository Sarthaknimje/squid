/**
 * Red Light Green Light Game Integration Utilities
 * 
 * This module provides utility functions for properly integrating the Red Light Green Light game
 * with the Next.js application.
 */

// Function to load a script and return a promise
export function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      console.log(`Script ${src} already loaded`);
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false; // Important to maintain loading order
    
    script.onload = () => {
      console.log(`Loaded script: ${src}`);
      resolve();
    };
    
    script.onerror = (error) => {
      console.error(`Error loading script ${src}:`, error);
      reject(new Error(`Failed to load script: ${src}`));
    };
    
    document.head.appendChild(script);
  });
}

// Function to preload audio files
export function preloadAudio() {
  const audioFiles = [
    '/game/red-light-green-light/music/bg.mp3',
    '/game/red-light-green-light/music/win.mp3',
    '/game/red-light-green-light/music/lose.mp3'
  ];
  
  return Promise.all(audioFiles.map(src => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = src;
      audio.preload = 'auto';
      
      audio.oncanplaythrough = () => {
        console.log(`Audio preloaded: ${src}`);
        resolve();
      };
      
      audio.onerror = () => {
        console.warn(`Failed to preload audio: ${src}`);
        resolve(); // Resolve anyway to not block the chain
      };
      
      audio.load();
    });
  }));
}

// Function to ensure THREE.js and GLTFLoader are properly connected
export function ensureThreeJsSetup() {
  if (window.THREE && window.GLTFLoader && !window.THREE.GLTFLoader) {
    console.log('Connecting GLTFLoader to THREE.js namespace');
    window.THREE.GLTFLoader = window.GLTFLoader;
  }
}

// Function to create a fallback renderer if 3D fails
export function createFallbackRenderer(container, onGameOver, isMuted) {
  console.log('Creating 2D fallback renderer');
  
  // Clear container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  // Create a status message
  const statusText = document.createElement('div');
  statusText.style.position = 'absolute';
  statusText.style.top = '20px';
  statusText.style.left = '0';
  statusText.style.width = '100%';
  statusText.style.textAlign = 'center';
  statusText.style.color = 'white';
  statusText.style.fontSize = '24px';
  statusText.style.fontWeight = 'bold';
  statusText.textContent = 'Using simplified 2D mode';
  container.appendChild(statusText);
  
  // Create a canvas for 2D rendering
  const canvas = document.createElement('canvas');
  canvas.width = container.clientWidth || 800;
  canvas.height = container.clientHeight || 600;
  container.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Could not get 2D context");
  }
  
  // Game variables
  let playerX = 100;
  let playerY = canvas.height / 2;
  const playerRadius = 20;
  let playerSpeed = 0;
  let isDead = false;
  let isWinner = false;
  let gameActive = true;
  
  // Red/Green light state
  let isGreenLight = true;
  
  // Position constants
  const startX = 100;
  const finishX = canvas.width - 100;
  const dollX = canvas.width - 100;
  const dollY = canvas.height / 2;
  const dollWidth = 40;
  const dollHeight = 80;
  
  // Audio elements
  const bgMusic = new Audio('/game/red-light-green-light/music/bg.mp3');
  bgMusic.loop = true;
  const winSound = new Audio('/game/red-light-green-light/music/win.mp3');
  const loseSound = new Audio('/game/red-light-green-light/music/lose.mp3');
  
  if (!isMuted) {
    bgMusic.play().catch(e => console.warn("Couldn't play background music:", e));
  }
  
  // Timer for light changes
  let lightChangeInterval;
  let animationId;
  
  // Draw function
  const draw = () => {
    if (!ctx || !gameActive) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = isGreenLight ? '#7CFC00' : '#FF4136';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw finish line
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(finishX, 0, 10, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText('FINISH', finishX - 30, 30);
    
    // Draw player
    ctx.fillStyle = isDead ? '#FF0000' : (isWinner ? '#FFFF00' : '#FFFFFF');
    ctx.beginPath();
    ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw doll
    ctx.fillStyle = '#000000';
    ctx.fillRect(dollX - dollWidth/2, dollY - dollHeight/2, dollWidth, dollHeight);
    
    // Game logic
    if (!isDead && !isWinner) {
      // Update player position
      playerX += playerSpeed;
      
      // Check if player reaches finish
      if (playerX >= finishX - playerRadius) {
        isWinner = true;
        gameActive = false;
        clearInterval(lightChangeInterval);
        statusText.textContent = "You win!";
        
        if (!isMuted) {
          winSound.play().catch(e => console.warn("Couldn't play win sound:", e));
        }
        
        // Report game result
        onGameOver('won', 5000);
      }
      
      // Check if player is moving during red light
      if (!isGreenLight && playerSpeed > 0) {
        isDead = true;
        playerSpeed = 0;
        statusText.textContent = "You moved during red light!";
        
        if (!isMuted) {
          loseSound.play().catch(e => console.warn("Couldn't play lose sound:", e));
        }
        
        // Report game result
        onGameOver('lost', 500);
      }
    }
    
    // Continue animation
    animationId = requestAnimationFrame(draw);
  };
  
  // Start the light change logic
  const startLightChanges = () => {
    lightChangeInterval = setInterval(() => {
      if (!gameActive) {
        clearInterval(lightChangeInterval);
        return;
      }
      
      // Toggle light
      isGreenLight = !isGreenLight;
      statusText.textContent = isGreenLight ? "Green Light" : "Red Light";
    }, 2000 + Math.random() * 2000); // Random interval between 2-4 seconds
  };
  
  // Set up player movement controls
  const handleKeyDown = (e) => {
    if (isDead || isWinner) return;
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      playerSpeed = 5;
    }
  };
  
  const handleKeyUp = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      playerSpeed = 0;
    }
  };
  
  // Add click to start
  const handleClick = () => {
    if (!gameActive) return;
    
    if (!lightChangeInterval) {
      startLightChanges();
      statusText.textContent = "Game started! Green Light";
    } else {
      // Toggle player speed on click
      playerSpeed = playerSpeed > 0 ? 0 : 5;
    }
  };
  
  // Add event listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('click', handleClick);
  
  // Start the animation
  statusText.textContent = "Click to Start";
  draw();
  
  // Return cleanup function
  return () => {
    gameActive = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (lightChangeInterval) {
      clearInterval(lightChangeInterval);
    }
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('click', handleClick);
    
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
  };
}

// Function to load all required resources for the game
export async function loadGameResources() {
  console.log('Loading Red Light Green Light game resources...');
  
  try {
    // Load scripts in sequence
    await loadScript('/game/red-light-green-light/three.min.js');
    await loadScript('/game/red-light-green-light/GLTFLoader.js');
    
    // Ensure GLTFLoader is properly attached to THREE
    ensureThreeJsSetup();
    
    await loadScript('/game/red-light-green-light/gsap.min.js');
    
    // Preload audio in parallel
    await preloadAudio();
    
    console.log('All game resources loaded successfully');
    return true;
  } catch (err) {
    console.error('Error loading game resources:', err);
    return false;
  }
}