import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface TicTacToeProps {
  mode: 'solo' | 'local' | 'online' | 'tournament';
  player1: string;
  player2?: string;
  socket?: Socket;
  roomId?: string;
  onGameOver: (winner: string) => void;
  betAmount?: string;
  isPlayerTurn?: boolean;
}

const TicTacToeGame: React.FC<TicTacToeProps> = ({ 
  mode, 
  player1, 
  player2 = 'Player 2', 
  socket, 
  roomId,
  onGameOver,
  betAmount,
  isPlayerTurn = true
}) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(mode === 'solo' || mode === 'local');
  const [gameEnded, setGameEnded] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  
  // Track if we've set up socket listeners to avoid duplicates
  const listenersSetupRef = useRef(false);
  
  useEffect(() => {
    // Auto-start game in online/tournament mode when socket is connected
    if ((mode === 'online' || mode === 'tournament') && socket?.connected) {
      if (!gameStarted && !gameEnded) {
        console.log('Auto-starting game in online/tournament mode');
        setGameStarted(true);
      }
    }
  }, [mode, socket?.connected, gameStarted, gameEnded]);
  
  // Set up socket listeners for online game
  useEffect(() => {
    if ((mode === 'online' || mode === 'tournament') && socket && !listenersSetupRef.current) {
      console.log('Setting up socket listeners for Tic Tac Toe game');
      listenersSetupRef.current = true;
      
      // Listen for moves from opponent
      socket.on('move_made', (data) => {
        console.log('Move received:', data);
        setBoard(prevBoard => {
          const newBoard = [...prevBoard];
          newBoard[data.move] = data.player === player1 ? 'X' : 'O';
          return newBoard;
        });
        setXIsNext(prevXIsNext => !prevXIsNext);
      });
      
      // Listen for game_started event
      socket.on('game_started', (data) => {
        console.log('Game started event received:', data);
        setGameStarted(true);
        setGameEnded(false);
        setBoard(Array(9).fill(null));
        setWinner(null);
      });
      
      // Clean up listeners on unmount
      return () => {
        socket.off('move_made');
        socket.off('game_started');
        listenersSetupRef.current = false;
      };
    }
  }, [mode, socket, player1, player2]);
  
  const calculateWinner = (squares: Array<string | null>): string | null => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a] === 'X' ? player1 : player2;
      }
    }
    
    // Check for a draw (all squares filled)
    if (squares.every(square => square !== null)) {
      return 'draw';
    }
    
    return null;
  };
  
  // Handle click on a square
  const handleClick = (i: number) => {
    if (!gameStarted || gameEnded || board[i] || winner) {
      return;
    }
    
    // In online mode, only allow moves when it's the player's turn
    if ((mode === 'online' || mode === 'tournament') && 
        ((xIsNext && player2 === 'X') || (!xIsNext && player2 === 'O'))) {
      return;
    }
    
    const newBoard = [...board];
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    
    // Send move to server in online mode
    if ((mode === 'online' || mode === 'tournament') && socket && roomId) {
      socket.emit('player_move', {
        roomId,
        move: i,
        player: player1
      });
    }
    
    setXIsNext(!xIsNext);
    
    // Check for winner
    const gameWinner = calculateWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      setGameEnded(true);
      
      // Send game_over event in online mode
      if ((mode === 'online' || mode === 'tournament') && socket && roomId) {
        socket.emit('game_over', {
          roomId,
          winner: gameWinner === 'draw' ? 'draw' : gameWinner
        });
      }
      
      onGameOver(gameWinner);
    }
    
    // AI move in solo mode
    if (mode === 'solo' && !xIsNext && !gameWinner) {
      setTimeout(() => {
        const availableSquares = newBoard
          .map((square, index) => (square === null ? index : null))
          .filter(index => index !== null) as number[];
        
        if (availableSquares.length > 0) {
          const aiMove = availableSquares[Math.floor(Math.random() * availableSquares.length)];
          const aiBoard = [...newBoard];
          aiBoard[aiMove] = 'O';
          setBoard(aiBoard);
          setXIsNext(true);
          
          // Check if AI won
          const aiWinner = calculateWinner(aiBoard);
          if (aiWinner) {
            setWinner(aiWinner);
            setGameEnded(true);
            onGameOver(aiWinner);
          }
        }
      }, 500);
    }
  };
  
  const renderSquare = (i: number) => {
    return (
      <button
        className="w-20 h-20 border border-gray-300 flex items-center justify-center text-3xl font-bold bg-white hover:bg-gray-100"
        onClick={() => handleClick(i)}
      >
        {board[i]}
      </button>
    );
  };
  
  const status = winner
    ? winner === 'draw'
      ? "It's a draw!"
      : `Winner: ${winner}`
    : `Next player: ${xIsNext ? player1 : player2}`;
  
  if (!gameStarted && (mode === 'online' || mode === 'tournament')) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <p className="text-xl mb-4">Waiting for the game to start...</p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-squid-pink"></div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center p-4">
      <div className="mb-4 text-xl font-bold">{status}</div>
      {betAmount && (
        <div className="mb-4 text-lg">
          Bet Amount: {betAmount} SQUID
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {renderSquare(0)}
        {renderSquare(1)}
        {renderSquare(2)}
        {renderSquare(3)}
        {renderSquare(4)}
        {renderSquare(5)}
        {renderSquare(6)}
        {renderSquare(7)}
        {renderSquare(8)}
      </div>
      {winner && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {winner === 'draw' 
            ? "It's a draw!" 
            : `${winner} wins${betAmount ? ` ${parseFloat(betAmount) * 1.8} SQUID!` : '!'}`}
        </div>
      )}
    </div>
  );
};

export default TicTacToeGame; 