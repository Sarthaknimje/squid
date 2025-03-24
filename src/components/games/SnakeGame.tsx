import { useEffect, useRef, useState, useCallback } from 'react';

type Props = {
  onGameOver: (finalScore: number) => void;
  gameStatus: number;
  onRestart: () => void;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface SnakePart {
  x: number;
  y: number;
}

interface Food {
  x: number;
  y: number;
}

const SnakeGame = ({
  onGameOver,
  gameStatus,
  onRestart
}: Props) => {
  // Game references
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  
  // Game settings
  const gridSize = 20;
  const initialSpeed = 150; // ms between moves
  
  // Game state
  const [score, setScore] = useState(0);
  const [snake, setSnake] = useState<SnakePart[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]);
  const [food, setFood] = useState<Food>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gridWidth, setGridWidth] = useState(30);
  const [gridHeight, setGridHeight] = useState(20);
  const [speed, setSpeed] = useState(initialSpeed);
  
  // Use refs to avoid closure issues in game loop
  const scoreRef = useRef(0);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const directionRef = useRef(direction);
  const isPlayingRef = useRef(isPlaying);
  const isPausedRef = useRef(isPaused);
  const gridWidthRef = useRef(gridWidth);
  const gridHeightRef = useRef(gridHeight);
  const speedRef = useRef(speed);
  
  // Initialize game when status changes
  useEffect(() => {
    if (gameStatus === 2) { // PLAYING
      initializeGame();
    }
    
    return () => {
      if (gameLoopRef.current) {
        clearTimeout(gameLoopRef.current);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameStatus]);
  
  // Update refs when state changes
  useEffect(() => {
    snakeRef.current = snake;
    foodRef.current = food;
    directionRef.current = direction;
    scoreRef.current = score;
    isPlayingRef.current = isPlaying;
    isPausedRef.current = isPaused;
    gridWidthRef.current = gridWidth;
    gridHeightRef.current = gridHeight;
    speedRef.current = speed;
  }, [snake, food, direction, score, isPlaying, isPaused, gridWidth, gridHeight, speed]);

  // Initialize game
  const initializeGame = () => {
    if (!containerRef.current || !canvasRef.current) return;

    // Reset game state
    setScore(0);
    scoreRef.current = 0;
    
    setSnake([
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ]);
    
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    setIsPaused(false);
    isPausedRef.current = false;

    // Adjust canvas to container size
    resizeCanvas();
    
    // Generate initial food
    generateFood();
    
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Start game loop
    startGameLoop();
  };

  // Resize canvas to fit container
  const resizeCanvas = () => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const { width, height } = containerRef.current.getBoundingClientRect();
    
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    
    // Calculate grid dimensions based on canvas size
    const cellSize = Math.min(
      Math.floor(width / 30),
      Math.floor(height / 20)
    );
    
    setGridWidth(Math.floor(width / cellSize));
    setGridHeight(Math.floor(height / cellSize));
    
    gridWidthRef.current = Math.floor(width / cellSize);
    gridHeightRef.current = Math.floor(height / cellSize);
  };

  // Generate food at random position
  const generateFood = () => {
    const snake = snakeRef.current;
    const gridWidth = gridWidthRef.current;
    const gridHeight = gridHeightRef.current;
    
    let x = Math.floor(Math.random() * gridWidth);
    let y = Math.floor(Math.random() * gridHeight);
    
    // Ensure food doesn't spawn on snake
    while (snake.some(part => part.x === x && part.y === y)) {
      x = Math.floor(Math.random() * gridWidth);
      y = Math.floor(Math.random() * gridHeight);
    }
    
    const newFood = { x, y };
    setFood(newFood);
    foodRef.current = newFood;
  };

  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPlayingRef.current) return;
    
    switch (e.key) {
      case 'ArrowUp':
        if (directionRef.current !== 'DOWN') {
          setDirection('UP');
          directionRef.current = 'UP';
        }
        break;
      case 'ArrowDown':
        if (directionRef.current !== 'UP') {
          setDirection('DOWN');
          directionRef.current = 'DOWN';
        }
        break;
      case 'ArrowLeft':
        if (directionRef.current !== 'RIGHT') {
          setDirection('LEFT');
          directionRef.current = 'LEFT';
        }
        break;
      case 'ArrowRight':
        if (directionRef.current !== 'LEFT') {
          setDirection('RIGHT');
          directionRef.current = 'RIGHT';
        }
        break;
      case ' ':
        togglePause();
        break;
    }
  }, []);

  // Toggle pause state
  const togglePause = () => {
    const newPausedState = !isPausedRef.current;
    setIsPaused(newPausedState);
    isPausedRef.current = newPausedState;
  };

  // Start game loop
  const startGameLoop = () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    
    let lastUpdateTime = 0;
    
    const loop = (timestamp: number) => {
      if (!isPlayingRef.current) return;
      
      const elapsed = timestamp - lastUpdateTime;
      
      if (elapsed > speedRef.current && !isPausedRef.current) {
        lastUpdateTime = timestamp;
        updateGame();
      }
      
      drawGame();
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    
    gameLoopRef.current = requestAnimationFrame(loop);
  };

  // Update game state
  const updateGame = () => {
    const snake = snakeRef.current;
    const food = foodRef.current;
    const direction = directionRef.current;
    let score = scoreRef.current;
    
    // Calculate new head position
    const head = { ...snake[0] };
    
    switch (direction) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }
    
    // Check for wall collision
    if (
      head.x < 0 ||
      head.x >= gridWidthRef.current ||
      head.y < 0 ||
      head.y >= gridHeightRef.current
    ) {
      endGame();
      return;
    }
    
    // Check for self collision
    if (snake.slice(1).some(part => part.x === head.x && part.y === head.y)) {
      endGame();
      return;
    }
    
    // Create new snake by adding head
    const newSnake = [head, ...snake];
    
    // Check if food eaten
    if (head.x === food.x && head.y === food.y) {
      // Increase score
      score += 10;
      scoreRef.current = score;
      setScore(score);
      
      // Generate new food
      generateFood();
      
      // Speed up slightly every 5 food items
      if (score % 50 === 0) {
        const newSpeed = Math.max(50, speedRef.current - 10);
        speedRef.current = newSpeed;
        setSpeed(newSpeed);
      }
    } else {
      // Remove tail if no food eaten
      newSnake.pop();
    }
    
    snakeRef.current = newSnake;
    setSnake(newSnake);
  };

  // Draw game on canvas
  const drawGame = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const snake = snakeRef.current;
    const food = foodRef.current;
    const gridWidth = gridWidthRef.current;
    const gridHeight = gridHeightRef.current;
    
    // Calculate cell size
    const cellWidth = canvasRef.current.width / gridWidth;
    const cellHeight = canvasRef.current.height / gridHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw background grid
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw snake
    snake.forEach((part, i) => {
      // Head is different color than body
      ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e';
      
      ctx.fillRect(
        part.x * cellWidth,
        part.y * cellHeight,
        cellWidth - 1,
        cellHeight - 1
      );
      
      // Draw eyes on head
      if (i === 0) {
        ctx.fillStyle = '#000';
        const eyeSize = cellWidth / 5;
        
        // Position eyes based on direction
        if (directionRef.current === 'RIGHT' || directionRef.current === 'LEFT') {
          ctx.fillRect(
            part.x * cellWidth + (directionRef.current === 'RIGHT' ? cellWidth * 0.7 : cellWidth * 0.2),
            part.y * cellHeight + cellHeight * 0.3,
            eyeSize,
            eyeSize
          );
          ctx.fillRect(
            part.x * cellWidth + (directionRef.current === 'RIGHT' ? cellWidth * 0.7 : cellWidth * 0.2),
            part.y * cellHeight + cellHeight * 0.6,
            eyeSize,
            eyeSize
          );
        } else {
          ctx.fillRect(
            part.x * cellWidth + cellWidth * 0.3,
            part.y * cellHeight + (directionRef.current === 'DOWN' ? cellHeight * 0.7 : cellHeight * 0.2),
            eyeSize,
            eyeSize
          );
          ctx.fillRect(
            part.x * cellWidth + cellWidth * 0.6,
            part.y * cellHeight + (directionRef.current === 'DOWN' ? cellHeight * 0.7 : cellHeight * 0.2),
            eyeSize,
            eyeSize
          );
        }
      }
    });
    
    // Draw food
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(
      food.x * cellWidth + cellWidth / 2,
      food.y * cellHeight + cellHeight / 2,
      Math.min(cellWidth, cellHeight) / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Draw score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 20);
  }, []);

  // End game
  const endGame = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    document.removeEventListener('keydown', handleKeyDown);
    
    // Notify parent component
    onGameOver(scoreRef.current);
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full border border-gray-700 rounded-lg overflow-hidden touch-none select-none relative"
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full" 
      />
      
      {isPaused && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
          <div className="text-white text-2xl font-bold">PAUSED</div>
          <div className="text-white text-lg mt-2">Press Space to Resume</div>
        </div>
      )}
    </div>
  );
};

export default SnakeGame;
