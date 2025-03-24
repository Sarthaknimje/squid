import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ConnectFourProps {
  mode: 'solo' | 'local' | 'online' | 'tournament';
  player1: string;
  player2?: string;
  socket?: Socket;
  roomId?: string;
  onGameOver: (winner: string) => void;
  betAmount?: string;
  isPlayerTurn?: boolean;
}

const ConnectFourGame: React.FC<ConnectFourProps> = ({
  mode,
  player1,
  player2 = 'Player 2',
  socket,
  roomId,
  onGameOver,
  betAmount,
  isPlayerTurn = true
}) => {
  // Board is 7 columns x 6 rows, represented as an array of columns
  // Each column is an array of cells, null means empty, 'red' or 'yellow' for players
  const [board, setBoard] = useState<Array<Array<string | null>>>(
    Array(7).fill(null).map(() => Array(6).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'red' | 'yellow'>('red');
  const [winner, setWinner] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(mode === 'solo' || mode === 'local');
  const [gameEnded, setGameEnded] = useState(false);
  
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
      console.log('Setting up socket listeners for Connect Four game');
      listenersSetupRef.current = true;
      
      // Listen for moves from opponent
      socket.on('move_made', (data) => {
        console.log('Move received:', data);
        if (data.gameState && data.gameState.board) {
          setBoard(data.gameState.board);
          setCurrentPlayer(currentPlayer === 'red' ? 'yellow' : 'red');
        } else if (data.move !== undefined) {
          // Handle move data in column format
          makeMove(data.move, data.player === player1 ? 'red' : 'yellow', true);
        }
      });
      
      // Listen for game_started event
      socket.on('game_started', (data) => {
        console.log('Game started event received:', data);
        setGameStarted(true);
        setGameEnded(false);
        setBoard(Array(7).fill(null).map(() => Array(6).fill(null)));
        setWinner(null);
        setCurrentPlayer('red');
      });
      
      // Clean up listeners on unmount
      return () => {
        socket.off('move_made');
        socket.off('game_started');
        listenersSetupRef.current = false;
      };
    }
  }, [mode, socket, player1, player2, currentPlayer]);
  
  // Check for a win
  const checkForWin = (board: Array<Array<string | null>>, color: string): boolean => {
    // Check horizontal
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        if (
          board[col][row] === color &&
          board[col + 1][row] === color &&
          board[col + 2][row] === color &&
          board[col + 3][row] === color
        ) {
          return true;
        }
      }
    }
    
    // Check vertical
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 3; row++) {
        if (
          board[col][row] === color &&
          board[col][row + 1] === color &&
          board[col][row + 2] === color &&
          board[col][row + 3] === color
        ) {
          return true;
        }
      }
    }
    
    // Check diagonal (positive slope)
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 3; row++) {
        if (
          board[col][row] === color &&
          board[col + 1][row + 1] === color &&
          board[col + 2][row + 2] === color &&
          board[col + 3][row + 3] === color
        ) {
          return true;
        }
      }
    }
    
    // Check diagonal (negative slope)
    for (let col = 0; col < 4; col++) {
      for (let row = 3; row < 6; row++) {
        if (
          board[col][row] === color &&
          board[col + 1][row - 1] === color &&
          board[col + 2][row - 2] === color &&
          board[col + 3][row - 3] === color
        ) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Check for a draw
  const checkForDraw = (board: Array<Array<string | null>>): boolean => {
    // If all columns are full, it's a draw
    return board.every(column => column.every(cell => cell !== null));
  };
  
  // Make a move
  const makeMove = (columnIndex: number, color: 'red' | 'yellow' = currentPlayer, isOpponentMove = false) => {
    if (!gameStarted || gameEnded || winner) {
      return;
    }
    
    // In online mode, only allow moves when it's the player's turn
    if (!isOpponentMove && (mode === 'online' || mode === 'tournament') && 
        ((currentPlayer === 'red' && player1 !== player1) || 
        (currentPlayer === 'yellow' && player1 === player1))) {
      return;
    }
    
    const newBoard = [...board];
    const column = [...newBoard[columnIndex]];
    
    // Find the lowest empty cell in the column
    const rowIndex = column.lastIndexOf(null);
    
    // If column is full, do nothing
    if (rowIndex === -1) {
      return;
    }
    
    // Update the board
    column[rowIndex] = color;
    newBoard[columnIndex] = column;
    setBoard(newBoard);
    
    // Send move to server in online mode
    if (!isOpponentMove && (mode === 'online' || mode === 'tournament') && socket && roomId) {
      socket.emit('player_move', {
        roomId,
        move: columnIndex,
        player: player1,
        gameState: { board: newBoard }
      });
    }
    
    // Check for a win
    if (checkForWin(newBoard, color)) {
      const winnerName = color === 'red' ? player1 : player2;
      setWinner(winnerName);
      setGameEnded(true);
      
      // Send game_over event in online mode
      if (!isOpponentMove && (mode === 'online' || mode === 'tournament') && socket && roomId) {
        socket.emit('game_over', {
          roomId,
          winner: winnerName
        });
      }
      
      onGameOver(winnerName);
      return;
    }
    
    // Check for a draw
    if (checkForDraw(newBoard)) {
      setWinner('draw');
      setGameEnded(true);
      
      // Send game_over event in online mode
      if (!isOpponentMove && (mode === 'online' || mode === 'tournament') && socket && roomId) {
        socket.emit('game_over', {
          roomId,
          winner: 'draw'
        });
      }
      
      onGameOver('draw');
      return;
    }
    
    // Switch players
    if (!isOpponentMove) {
      setCurrentPlayer(currentPlayer === 'red' ? 'yellow' : 'red');
      
      // AI move in solo mode
      if (mode === 'solo' && color === 'red') {
        setTimeout(() => {
          const availableColumns = newBoard
            .map((column, index) => column.includes(null) ? index : null)
            .filter(index => index !== null) as number[];
          
          if (availableColumns.length > 0) {
            const aiMove = availableColumns[Math.floor(Math.random() * availableColumns.length)];
            makeMove(aiMove, 'yellow');
          }
        }, 500);
      }
    }
  };
  
  const renderColumn = (columnIndex: number) => {
    return (
      <div 
        key={columnIndex}
        className="flex flex-col-reverse items-center bg-blue-700 p-1 rounded-md cursor-pointer hover:bg-blue-600"
        onClick={() => makeMove(columnIndex)}
      >
        {board[columnIndex].map((cell, rowIndex) => (
          <div
            key={rowIndex}
            className={`w-12 h-12 rounded-full m-1 ${
              cell === 'red' 
                ? 'bg-red-500' 
                : cell === 'yellow' 
                  ? 'bg-yellow-400' 
                  : 'bg-white'
            }`}
          />
        ))}
      </div>
    );
  };
  
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
      <div className="mb-4 text-xl font-bold">
        {winner 
          ? winner === 'draw' 
            ? "It's a draw!"
            : `Winner: ${winner}`
          : `Current Player: ${currentPlayer === 'red' ? player1 : player2}`
        }
      </div>
      
      {betAmount && (
        <div className="mb-4 text-lg">
          Bet Amount: {betAmount} SQUID
        </div>
      )}
      
      <div className="flex mb-6 bg-blue-800 p-2 rounded-lg">
        {board.map((_, columnIndex) => renderColumn(columnIndex))}
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

export default ConnectFourGame; 