import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

type Props = {
  gameMode: number | string;
  player1?: string;
  player2?: string;
  roomId?: string;
  socket: Socket | null;
  onGameOver: (result: 'won' | 'lost', score: number) => void;
  isMuted: boolean;
};

const RedLightGreenLightGame = ({ 
  gameMode, 
  player1 = "Player 1", 
  player2 = "Player 2", 
  roomId = "", 
  socket, 
  onGameOver,
  isMuted
}: Props) => {
  // Convert gameMode to numeric format for consistency
  const gameModeNum = typeof gameMode === 'string' 
    ? gameMode === 'solo' ? 1 : gameMode === 'local' ? 2 : gameMode === 'online' ? 3 : 4
    : gameMode;
  
  // Game container reference
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [lightState, setLightState] = useState<'red' | 'green'>('green');
  const [message, setMessage] = useState("Click to start");
  const [timeLeft, setTimeLeft] = useState(60);
  const [isWinner, setIsWinner] = useState(false);
  
  // Player states using refs to avoid re-renders
  const playerPosRef = useRef(10); // % from left of screen
  const [playerPos, setPlayerPos] = useState(10);
  const aiPlayersRef = useRef<{id: string, pos: number, eliminated: boolean, color: string}[]>([]);
  const [aiPlayers, setAiPlayers] = useState<{id: string, pos: number, eliminated: boolean, color: string}[]>([]);
  
  // Doll animation states
  const dollRotationRef = useRef(0); // 0 = back to players, 180 = facing players
  const [dollRotation, setDollRotation] = useState(0);
  const isRotatingRef = useRef(false);
  const [isRotating, setIsRotating] = useState(false);
  
  // Audio elements
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const redLightRef = useRef<HTMLAudioElement | null>(null);
  const greenLightRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  const dollSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Animation frame ref
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const frameIntervalRef = useRef<number>(1000 / 60); // 60 FPS default
  
  // Game timers
  const lightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Movement state
  const isMovingRef = useRef(false);
  const [isMoving, setIsMoving] = useState(false);
  const movementSpeedRef = useRef(0.2); // % per frame
  
  // Performance monitoring
  const fpsCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);
  const [fps, setFps] = useState<number>(0);
  
  // Memoize the drawGame function to prevent unnecessary recreations
  const drawGame = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background based on light state
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    
    if (lightState === 'green') {
      bgGradient.addColorStop(0, '#2a7d2a');
      bgGradient.addColorStop(1, '#3c9c3c');
    } else {
      bgGradient.addColorStop(0, '#7d2a2a');
      bgGradient.addColorStop(1, '#9c3c3c');
    }
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw game field (grass)
    ctx.fillStyle = lightState === 'green' ? '#4caf50' : '#e57373';
    ctx.fillRect(0, height * 0.7, width, height * 0.3);
    
    // Draw finish line
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(width * 0.9, 0, 5, height);
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText('FINISH', width * 0.9 - 70, 30);
    
    // Draw doll at the finish line
    drawDoll(ctx, width * 0.85, height * 0.3, height * 0.2, dollRotationRef.current);
    
    // Draw player
    const playerSize = height * 0.08;
    ctx.fillStyle = '#f5dd42';
    ctx.beginPath();
    ctx.arc(width * (playerPosRef.current / 100), height * 0.8, playerSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player body
    ctx.fillStyle = '#34baeb';
    ctx.fillRect(
      width * (playerPosRef.current / 100) - playerSize/2,
      height * 0.8 - playerSize/2,
      playerSize,
      playerSize * 2
    );
    
    // Draw player name
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(player1, width * (playerPosRef.current / 100) - 20, height * 0.8 + playerSize * 2 + 20);
    
    // Draw AI players
    aiPlayersRef.current.forEach((player, index) => {
      const yOffset = 0.75 - (index * 0.08); // Stagger AI players vertically
      
      if (player.eliminated) {
        // Draw as a red X for eliminated players
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 5;
        const xPos = width * (player.pos / 100);
        const yPos = height * yOffset;
        const xSize = playerSize * 0.7;
        
        ctx.beginPath();
        ctx.moveTo(xPos - xSize, yPos - xSize);
        ctx.lineTo(xPos + xSize, yPos + xSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(xPos + xSize, yPos - xSize);
        ctx.lineTo(xPos - xSize, yPos + xSize);
        ctx.stroke();
      } else {
        // Draw normal AI player
        // Head
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(
          width * (player.pos / 100), 
          height * yOffset, 
          playerSize * 0.7, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
        
        // Body
        ctx.fillRect(
          width * (player.pos / 100) - playerSize * 0.35,
          height * yOffset,
          playerSize * 0.7,
          playerSize * 1.4
        );
      }
      
      // Draw player name
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.fillText(
        player.id, 
        width * (player.pos / 100) - 15, 
        height * yOffset + playerSize * 1.8
      );
    });
    
    // Draw game info
    drawGameInfo(ctx, width, height);
    
    // Draw FPS counter for performance monitoring
    if (isPlaying) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '12px Arial';
      ctx.fillText(`FPS: ${fps}`, 10, height - 10);
    }
  }, [lightState, player1, fps, isPlaying]);
  
  // Draw doll with rotation
  const drawDoll = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    size: number, 
    rotation: number
  ) => {
    // Save context state
    ctx.save();
    
    // Move to doll position and apply rotation
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Draw doll body (create a more detailed doll that looks like the Squid Game doll)
    // Dress
    ctx.fillStyle = '#ff9aa2';
    ctx.beginPath();
    ctx.moveTo(-size/3, -size/2);
    ctx.lineTo(size/3, -size/2);
    ctx.lineTo(size/2, size/2);
    ctx.lineTo(-size/2, size/2);
    ctx.closePath();
    ctx.fill();
    
    // Arms
    ctx.fillStyle = '#ffdac1';
    ctx.fillRect(-size/2, -size/3, size/6, size/1.5); // Left arm
    ctx.fillRect(size/2 - size/6, -size/3, size/6, size/1.5); // Right arm
    
    // Head
    ctx.fillStyle = '#ffdac1';
    ctx.beginPath();
    ctx.arc(0, -size/2 - size/4, size/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, -size/2 - size/4, size/4, Math.PI, 2 * Math.PI);
    ctx.fillRect(-size/4, -size/2 - size/4 - size/8, size/2, size/8);
    ctx.fill();
    
    // Eyes (drawn only when facing forward)
    if (rotation > 90) {
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-size/10, -size/2 - size/4, size/20, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(size/10, -size/2 - size/4, size/20, 0, Math.PI * 2);
      ctx.fill();
      
      // Smile
      ctx.beginPath();
      ctx.arc(0, -size/2 - size/6, size/10, 0, Math.PI);
      ctx.stroke();
    }
    
    // Restore context state
    ctx.restore();
  };
  
  // Draw game information
  const drawGameInfo = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Draw semi-transparent background for UI
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, 60);
    
    // Draw message
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, width / 2, 35);
    ctx.textAlign = 'start'; // Reset alignment
    
    // Draw timer
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText(`Time: ${timeLeft}s`, 20, 35);
    
    // Draw light indicator
    ctx.fillStyle = lightState === 'green' ? '#4caf50' : '#f44336';
    ctx.beginPath();
    ctx.arc(width - 30, 30, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw controls info if not playing
    if (!isPlaying && !isGameOver) {
      // Semi-transparent box for instructions
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(width / 2 - 200, height / 2 - 100, 400, 200);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText("Red Light, Green Light", width / 2, height / 2 - 60);
      
      ctx.font = '16px Arial';
      ctx.fillText("Move when the light is GREEN", width / 2, height / 2 - 20);
      ctx.fillText("Stop when the light is RED", width / 2, height / 2 + 10);
      ctx.fillText("Use RIGHT ARROW or 'D' key to move", width / 2, height / 2 + 40);
      
      ctx.fillStyle = '#f5dd42';
      ctx.fillText("Click to Start", width / 2, height / 2 + 80);
      
      ctx.textAlign = 'start'; // Reset alignment
    }
    
    // Draw game over message
    if (isGameOver) {
      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);
      
      // Game over text
      ctx.fillStyle = isWinner ? '#4caf50' : '#f44336';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(isWinner ? "You Won!" : "Game Over", width / 2, height / 2 - 50);
      
      // Score text
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Arial';
      
      // Calculate score
      const distancePoints = Math.floor(playerPosRef.current * 50);
      const timePoints = isWinner ? timeLeft * 10 : 0;
      const totalScore = isWinner ? 5000 + timePoints : distancePoints;
      
      ctx.fillText(`Score: ${totalScore}`, width / 2, height / 2);
      
      if (isWinner) {
        ctx.fillText(`Bonus: +${timePoints} (time remaining)`, width / 2, height / 2 + 40);
      } else {
        ctx.fillText(`Distance: ${Math.floor(playerPosRef.current)}%`, width / 2, height / 2 + 40);
      }
      
      ctx.fillStyle = '#f5dd42';
      ctx.fillText("Click to Play Again", width / 2, height / 2 + 100);
      
      ctx.textAlign = 'start'; // Reset alignment
    }
  };
  
  // Initialize game
  useEffect(() => {
    // Reduce animation frame rate for better performance
    fpsRef.current = 30; // Lower FPS for better stability
    frameIntervalRef.current = 1000 / fpsRef.current;
    
    // Setup canvas
    if (canvasRef.current && containerRef.current) {
      // Set canvas size to match container size
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;
      
      // Initial render
      drawGame();
    }
    
    // Setup audio with fallbacks and error handling
    try {
      // Load audio elements only once
      if (!bgMusicRef.current) {
        bgMusicRef.current = new Audio('/game/red-light-green-light/music/bg.mp3');
        bgMusicRef.current.loop = true;
        
        redLightRef.current = new Audio('/sounds/alert.mp3');
        greenLightRef.current = new Audio('/sounds/success.mp3');
        winSoundRef.current = new Audio('/sounds/win.mp3');
        loseSoundRef.current = new Audio('/sounds/lose.mp3');
        dollSoundRef.current = new Audio('/sounds/click.mp3');
        
        // Preload audio to avoid delays
        bgMusicRef.current.preload = 'auto';
        redLightRef.current.preload = 'auto';
        greenLightRef.current.preload = 'auto';
        winSoundRef.current.preload = 'auto';
        loseSoundRef.current.preload = 'auto';
        dollSoundRef.current.preload = 'auto';
      }
    } catch (error) {
      console.error("Error setting up audio:", error);
    }
    
    // Create AI players for single player mode
    if (gameModeNum === 1 && aiPlayersRef.current.length === 0) {
      const initialAiPlayers = [
        { id: "AI-1", pos: 10, eliminated: false, color: "#FF5555" },
        { id: "AI-2", pos: 10, eliminated: false, color: "#55FF55" },
        { id: "AI-3", pos: 10, eliminated: false, color: "#5555FF" }
      ];
      aiPlayersRef.current = initialAiPlayers;
      setAiPlayers(initialAiPlayers);
    }
    
    // Add keyboard listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    setIsReady(true);
    
    // Handle window resize with throttling
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      // Clear the timeout if it exists
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      // Setup a new timeout
      resizeTimeout = setTimeout(() => {
        if (canvasRef.current && containerRef.current) {
          canvasRef.current.width = containerRef.current.clientWidth;
          canvasRef.current.height = containerRef.current.clientHeight;
          drawGame();
        }
      }, 200); // 200ms throttle, increased from 100ms for better performance
    };
    
    window.addEventListener('resize', handleResize);
    
    // Setup FPS monitoring
    const fpsMonitoringInterval = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    
    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      if (lightTimerRef.current) {
        clearTimeout(lightTimerRef.current);
        lightTimerRef.current = null;
      }
      
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
      
      clearInterval(fpsMonitoringInterval);
      
      // Stop all audio
      stopAllAudio();
    };
  }, [drawGame, gameModeNum]);
  
  // Handle keyboard controls
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'd') {
      isMovingRef.current = true;
      setIsMoving(true);
    }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'd') {
      isMovingRef.current = false;
      setIsMoving(false);
    }
  };
  
  // Handle game click to start
  const handleClick = () => {
    if (isReady && !isPlaying && !isGameOver) {
      startGame();
    } else if (isGameOver) {
      // Reset game if game over
      resetGame();
    }
  };
  
  // Reset game
  const resetGame = () => {
    // Reset game state
    setIsPlaying(false);
    setIsGameOver(false);
    setLightState('green');
    setMessage("Click to start");
    setTimeLeft(60);
    setIsWinner(false);
    
    // Reset player state
    playerPosRef.current = 10;
    setPlayerPos(10);
    isMovingRef.current = false;
    setIsMoving(false);
    
    // Reset AI players
    if (gameModeNum === 1) {
      const resetAiPlayers = [
        { id: "AI-1", pos: 10, eliminated: false, color: "#FF5555" },
        { id: "AI-2", pos: 10, eliminated: false, color: "#55FF55" },
        { id: "AI-3", pos: 10, eliminated: false, color: "#5555FF" }
      ];
      aiPlayersRef.current = resetAiPlayers;
      setAiPlayers(resetAiPlayers);
    }
    
    // Reset animation state
    dollRotationRef.current = 0;
    setDollRotation(0);
    isRotatingRef.current = false;
    setIsRotating(false);
    
    // Clear timers
    if (lightTimerRef.current) {
      clearTimeout(lightTimerRef.current);
      lightTimerRef.current = null;
    }
    
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Draw reset state
    drawGame();
  };
  
  // Start the game
  const startGame = () => {
    setIsPlaying(true);
    setMessage("Ready...");
    
    // Start background music if not muted
    if (!isMuted && bgMusicRef.current) {
      bgMusicRef.current.play().catch(err => console.error("Error playing audio:", err));
    }
    
    // Countdown sequence
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setMessage(`${count}...`);
      } else {
        clearInterval(countdownInterval);
        setMessage("Green Light!");
        setLightState('green');
        
        // Play green light sound
        if (greenLightRef.current && !isMuted) {
          greenLightRef.current.play().catch(err => console.error("Error playing audio:", err));
        }
        
        startGameLoop();
      }
    }, 1000);
  };
  
  // Start the main game loop
  const startGameLoop = () => {
    // Start game timer
    gameTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          endGame('timeout');
          return 0;
        }
        return newTime;
      });
    }, 1000);
    
    // Schedule light changes
    scheduleLightChange();
    
    // Reset animation timing references
    lastFrameTimeRef.current = performance.now();
    
    // Start animation loop
    animationLoop(performance.now());
  };
  
  // Schedule random light changes
  const scheduleLightChange = () => {
    if (!isPlaying) return;
    
    // Random time between 2-5 seconds for green light
    const greenTime = Math.random() * 3000 + 2000;
    
    // Schedule change to red light
    lightTimerRef.current = setTimeout(() => {
      changeLightToRed();
      
      // Schedule change back to green after red
      lightTimerRef.current = setTimeout(() => {
        if (isPlaying) {
          changeLightToGreen();
          scheduleLightChange();
        }
      }, 2000); // Red light lasts 2 seconds
      
    }, greenTime);
  };
  
  // Change light to red
  const changeLightToRed = () => {
    if (!isPlaying) return;
    
    isRotatingRef.current = true;
    setIsRotating(true);
    
    // Play doll rotation sound
    if (dollSoundRef.current && !isMuted) {
      dollSoundRef.current.play().catch(err => console.error("Error playing audio:", err));
    }
    
    // Animate doll rotation with smoother transitions
    let rotationAnimation = 0;
    const rotationStep = 10; // Slightly slower rotation
    const targetRotation = 180;
    
    const rotateInterval = setInterval(() => {
      rotationAnimation += rotationStep;
      dollRotationRef.current = rotationAnimation;
      setDollRotation(rotationAnimation);
      
      if (rotationAnimation >= targetRotation) {
        clearInterval(rotateInterval);
        dollRotationRef.current = targetRotation;
        setDollRotation(targetRotation);
        isRotatingRef.current = false;
        setIsRotating(false);
        
        // Set light to red after doll has turned
        setLightState('red');
        setMessage("Red Light!");
        
        // Play red light sound
        if (redLightRef.current && !isMuted) {
          redLightRef.current.play().catch(err => console.error("Error playing audio:", err));
        }
        
        // Check if player is moving
        if (isMovingRef.current) {
          endGame('caught');
        }
        
        // Check AI players
        checkAIPlayers();
      }
    }, 30); // Slightly slower interval
  };
  
  // Change light to green
  const changeLightToGreen = () => {
    if (!isPlaying) return;
    
    isRotatingRef.current = true;
    setIsRotating(true);
    
    // Play doll rotation sound
    if (dollSoundRef.current && !isMuted) {
      dollSoundRef.current.play().catch(err => console.error("Error playing audio:", err));
    }
    
    // Animate doll rotation back with smoother transitions
    let rotationAnimation = 180;
    const rotationStep = 10; // Slightly slower rotation
    const targetRotation = 0;
    
    const rotateInterval = setInterval(() => {
      rotationAnimation -= rotationStep;
      dollRotationRef.current = rotationAnimation;
      setDollRotation(rotationAnimation);
      
      if (rotationAnimation <= targetRotation) {
        clearInterval(rotateInterval);
        dollRotationRef.current = targetRotation;
        setDollRotation(targetRotation);
        isRotatingRef.current = false;
        setIsRotating(false);
        
        // Set light to green after doll has turned
        setLightState('green');
        setMessage("Green Light!");
        
        // Play green light sound
        if (greenLightRef.current && !isMuted) {
          greenLightRef.current.play().catch(err => console.error("Error playing audio:", err));
        }
      }
    }, 30); // Slightly slower interval
  };
  
  // Animation loop for game rendering with timestamp-based timing
  const animationLoop = (timestamp: number) => {
    if (!isPlaying) return;
    
    // Calculate elapsed time since last frame
    const elapsed = timestamp - lastFrameTimeRef.current;
    
    // Only update if enough time has passed (frame rate control)
    if (elapsed > frameIntervalRef.current) {
      // Update time reference with adjustment to maintain consistent frame rate
      lastFrameTimeRef.current = timestamp - (elapsed % frameIntervalRef.current);
      
      // Increment FPS counter
      fpsCountRef.current++;
      
      // Move player if moving during green light
      if (isMovingRef.current && lightState === 'green') {
        const newPos = playerPosRef.current + movementSpeedRef.current;
        
        // Check if player reached finish line
        if (newPos >= 90) {
          playerPosRef.current = 90;
          endGame('win');
        } else {
          playerPosRef.current = newPos;
          // Only update React state occasionally to reduce re-renders
          if (Math.floor(newPos * 10) !== Math.floor(playerPos * 10)) {
            setPlayerPos(newPos);
          }
        }
      }
      
      // Move AI players
      moveAIPlayers();
      
      // Draw game state
      drawGame();
    }
    
    // Continue animation loop if game is still playing
    if (isPlaying && !isGameOver) {
      animationRef.current = requestAnimationFrame(animationLoop);
    }
  };
  
  // Move AI players with some intelligence
  const moveAIPlayers = () => {
    if (gameModeNum !== 1) return;
    
    const updatedAiPlayers = aiPlayersRef.current.map(player => {
      if (player.eliminated) return player;
      
      let newPos = player.pos;
      let shouldMove = false;
      
      if (lightState === 'green') {
        // Different AI strategies
        if (player.id === "AI-1") {
          // Aggressive AI - moves fast but higher risk of mistakes
          shouldMove = true;
        } else if (player.id === "AI-2") {
          // Cautious AI - moves slower but fewer mistakes
          shouldMove = Math.random() > 0.1;
        } else {
          // Balanced AI
          shouldMove = true;
        }
      } else {
        // Small chance to make a mistake during red light
        const mistakeChance = Math.random();
        if (mistakeChance < 0.02) {
          shouldMove = true;
        }
      }
      
      if (shouldMove) {
        // Different AIs move at different speeds
        let aiSpeed;
        
        if (player.id === "AI-1") {
          aiSpeed = 0.25; // Fast
        } else if (player.id === "AI-2") {
          aiSpeed = 0.15; // Slow
        } else {
          aiSpeed = 0.2; // Medium
        }
        
        newPos += aiSpeed;
        
        // Check if AI reached finish line
        if (newPos >= 90) {
          // AI wins
          setMessage(`${player.id} won!`);
          endGame('caught');
          return { ...player, pos: 90 };
        }
        
        // Check if AI got caught moving during red light
        if (lightState === 'red' && !isRotatingRef.current) {
          return { ...player, eliminated: true };
        }
      }
      
      return { ...player, pos: newPos };
    });
    
    // Update the ref
    aiPlayersRef.current = updatedAiPlayers;
    
    // Only update the state if something actually changed
    if (JSON.stringify(aiPlayersRef.current) !== JSON.stringify(aiPlayers)) {
      setAiPlayers([...updatedAiPlayers]);
    }
  };
  
  // Check if AI players are moving during red light
  const checkAIPlayers = () => {
    const updatedAiPlayers = aiPlayersRef.current.map(player => {
      if (player.eliminated) return player;
      
      // AI has different chances of getting caught
      let caughtChance = 0.3;
      
      if (player.id === "AI-1") {
        caughtChance = 0.4; // Aggressive AI gets caught more often
      } else if (player.id === "AI-2") {
        caughtChance = 0.2; // Cautious AI gets caught less often
      }
      
      if (Math.random() < caughtChance) {
        return { ...player, eliminated: true };
      }
      
      return player;
    });
    
    // Update the ref
    aiPlayersRef.current = updatedAiPlayers;
    // Update the state
    setAiPlayers([...updatedAiPlayers]);
  };
  
  // End the game
  const endGame = (reason: 'win' | 'caught' | 'timeout') => {
    setIsPlaying(false);
    setIsGameOver(true);
    
    // Clear timers
    if (lightTimerRef.current) {
      clearTimeout(lightTimerRef.current);
      lightTimerRef.current = null;
    }
    
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    // Calculate score based on distance and time
    const distancePoints = Math.floor(playerPosRef.current * 50);
    const timePoints = timeLeft * 10;
    const totalScore = reason === 'win' ? 
      5000 + timePoints : 
      distancePoints;
    
    // Update game state based on reason
    if (reason === 'win') {
      setMessage("You Won!");
      setIsWinner(true);
      
      // Play win sound
      if (winSoundRef.current && !isMuted) {
        winSoundRef.current.play().catch(err => console.error("Error playing audio:", err));
      }
      
      // Report win to parent component
      onGameOver('won', totalScore);
    } else {
      if (reason === 'caught') {
        setMessage("You moved on red light!");
      } else {
        setMessage("Time's up!");
      }
      
      // Play lose sound
      if (loseSoundRef.current && !isMuted) {
        loseSoundRef.current.play().catch(err => console.error("Error playing audio:", err));
      }
      
      // Report loss to parent component
      onGameOver('lost', totalScore);
    }
    
    // Final draw to update visuals
    drawGame();
    
    // If animation is still running, stop it
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };
  
  // Stop all audio
  const stopAllAudio = () => {
    const audioRefs = [
      bgMusicRef, redLightRef, greenLightRef, 
      winSoundRef, loseSoundRef, dollSoundRef
    ];
    
    audioRefs.forEach(ref => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });
  };
  
  // Update audio on mute change
  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div 
      className="w-full h-full relative" 
      ref={containerRef}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70">
          <div className="text-white text-2xl">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default RedLightGreenLightGame;