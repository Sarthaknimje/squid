const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Create HTTP server
const server = http.createServer();

// Create Socket.io server with CORS enabled
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Map to store active rooms
const rooms = new Map();

// Array to store users in tournament queue
const tournamentQueue = [];

// Socket connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create a room
  socket.on('create_room', (data) => {
    // Generate a unique room ID (short and easy to share)
    const roomId = crypto.randomBytes(3).toString('hex');
    const playerName = data.playerName || "Player";
    const gameType = data.gameType || "tic-tac-toe";
    
    // Store room info
    rooms.set(roomId, {
      id: roomId,
      host: socket.id,
      hostName: playerName,
      guest: null,
      guestName: null,
      gameType: gameType,
      active: false
    });
    
    // Join the room
    socket.join(roomId);
    
    // Notify client
    socket.emit('room_created', { roomId });
    
    console.log(`Room created: ${roomId} by ${socket.id} for game ${gameType}`);
  });

  // Join a room
  socket.on('join_room', (data) => {
    const { roomId, playerName } = data;
    const gameType = data.gameType || "tic-tac-toe";
    
    // Check if room exists
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const room = rooms.get(roomId);
    
    // Check if room is full
    if (room.active) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    // Join the room
    socket.join(roomId);
    
    // Update room info
    room.guest = socket.id;
    room.guestName = playerName;
    room.active = true;
    rooms.set(roomId, room);
    
    // Notify both players
    io.to(room.host).emit('player_joined', { 
      playerName, 
      socketId: socket.id,
      gameType
    });
    
    socket.emit('game_started', {
      opponentName: room.hostName,
      isPlayerX: false,  // Second player is O
      gameType
    });
    
    console.log(`Player ${socket.id} joined room ${roomId}`);
  });

  // Handle game move
  socket.on('make_move', (data) => {
    const { roomId, position, isX, gameType } = data;
    
    // Check if room exists
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const room = rooms.get(roomId);
    
    // Forward move to opponent
    const opponentId = socket.id === room.host ? room.guest : room.host;
    
    if (opponentId) {
      io.to(opponentId).emit('move_made', {
        position,
        isX,
        gameType
      });
    }
  });

  // Find tournament match
  socket.on('find_match', (data) => {
    const { playerName, betAmount, gameType, transactionHash } = data;
    
    // Add player to tournament queue
    tournamentQueue.push({
      socketId: socket.id,
      playerName,
      betAmount: parseFloat(betAmount),
      gameType,
      transactionHash,
      timestamp: Date.now()
    });
    
    // Try to find a match
    findTournamentMatch(socket.id);
  });

  // Reset game
  socket.on('reset_game', (data) => {
    const { roomId, gameType } = data;
    
    // Check if room exists
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const room = rooms.get(roomId);
    
    // Forward reset to opponent
    const opponentId = socket.id === room.host ? room.guest : room.host;
    
    if (opponentId) {
      io.to(opponentId).emit('game_reset', { gameType });
    }
  });

  // Game over
  socket.on('game_over', (data) => {
    const { roomId, result, board, gameType } = data;
    
    // Check if room exists
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const room = rooms.get(roomId);
    
    // Forward game over to opponent
    const opponentId = socket.id === room.host ? room.guest : room.host;
    
    if (opponentId) {
      io.to(opponentId).emit('game_over', {
        result,
        board,
        gameType
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove from tournament queue
    const queueIndex = tournamentQueue.findIndex(player => player.socketId === socket.id);
    if (queueIndex >= 0) {
      tournamentQueue.splice(queueIndex, 1);
    }
    
    // Check if user was in a room
    rooms.forEach((room, roomId) => {
      if (room.host === socket.id || room.guest === socket.id) {
        const opponentId = room.host === socket.id ? room.guest : room.host;
        
        // Notify opponent
        if (opponentId) {
          io.to(opponentId).emit('opponent_disconnected');
        }
        
        // If host disconnects or room is empty, delete room
        if (room.host === socket.id || !opponentId) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (${room.host === socket.id ? 'host left' : 'empty'})`);
        } else {
          // Update room data - guest becomes host
          room.host = opponentId;
          room.hostName = room.guestName;
          room.guest = null;
          room.guestName = null;
          room.active = false;
          rooms.set(roomId, room);
        }
      }
    });
  });
});

// Function to find a tournament match
function findTournamentMatch(currentPlayerSocketId) {
  // Find player in queue
  const playerIndex = tournamentQueue.findIndex(player => player.socketId === currentPlayerSocketId);
  if (playerIndex === -1) return;
  
  const currentPlayer = tournamentQueue[playerIndex];
  
  // Find a matching opponent (same game, similar bet amount)
  const opponentIndex = tournamentQueue.findIndex(player => 
    player.socketId !== currentPlayerSocketId && 
    player.gameType === currentPlayer.gameType &&
    Math.abs(player.betAmount - currentPlayer.betAmount) <= 0.1
  );
  
  if (opponentIndex === -1) return;
  
  const opponent = tournamentQueue[opponentIndex];
  
  // Create a room for the match
  const roomId = crypto.randomBytes(3).toString('hex');
  
  // Store room info
  rooms.set(roomId, {
    id: roomId,
    host: currentPlayer.socketId,
    hostName: currentPlayer.playerName,
    guest: opponent.socketId,
    guestName: opponent.playerName,
    gameType: currentPlayer.gameType,
    active: true,
    isTournament: true,
    betAmount: (currentPlayer.betAmount + opponent.betAmount) / 2
  });
  
  // Join player sockets to the room
  const currentPlayerSocket = io.sockets.sockets.get(currentPlayer.socketId);
  const opponentSocket = io.sockets.sockets.get(opponent.socketId);
  
  if (currentPlayerSocket) currentPlayerSocket.join(roomId);
  if (opponentSocket) opponentSocket.join(roomId);
  
  // Notify players about the match
  io.to(currentPlayer.socketId).emit('tournament_match_found', {
    roomId,
    playerName: opponent.playerName,
    gameType: currentPlayer.gameType
  });
  
  io.to(opponent.socketId).emit('tournament_match_found', {
    roomId,
    playerName: currentPlayer.playerName,
    gameType: opponent.gameType
  });
  
  console.log(`Tournament match created: ${currentPlayer.gameType} in room ${roomId}, ${currentPlayer.playerName} vs ${opponent.playerName}`);
  
  // Remove players from the tournament queue
  tournamentQueue.splice(Math.max(playerIndex, opponentIndex), 1);
  tournamentQueue.splice(Math.min(playerIndex, opponentIndex), 1);
}

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
}); 