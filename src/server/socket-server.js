const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://squid-game-tournament.vercel.app']
    : ['http://localhost:3000', 'http://localhost:3004']
}));

// Parse JSON body
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://squid-game-tournament.vercel.app']
      : ['http://localhost:3000', 'http://localhost:3004'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Right after creating the io server, increase max listeners
io.setMaxListeners(100); // Increase max listeners to avoid warnings

// Store active rooms
const rooms = {};
const users = {};
// Tournament matchmaking queue
const tournamentQueue = [];

// Get room by ID or create if doesn't exist
function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      id: roomId,
      players: [],
      gameState: null,
      betAmount: 0,
      isActive: true,
      createdAt: Date.now()
    };
  }
  return rooms[roomId];
}

// Generate a new room ID
function generateRoomId(game) {
  return `${game}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Clean up old rooms (older than 1 hour)
function cleanupOldRooms() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  Object.keys(rooms).forEach(roomId => {
    const room = rooms[roomId];
    if (now - room.createdAt > oneHour) {
      delete rooms[roomId];
    }
  });
}

// Set up automatic cleanup every hour
setInterval(cleanupOldRooms, 60 * 60 * 1000);

// Log all rooms for debugging
function logRoomStatus() {
  console.log('\n--- ACTIVE ROOMS ---');
  let count = 0;
  Object.keys(rooms).forEach(roomId => {
    const room = rooms[roomId];
    count++;
    console.log(`Room ${roomId}: ${room.players.length} players, game: ${room.game}`);
  });
  console.log(`Total rooms: ${count}\n`);
}

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // User disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from tournament queue if they disconnect
    const queueIndex = tournamentQueue.findIndex(entry => entry.socketId === socket.id);
    if (queueIndex !== -1) {
      console.log(`Removing user ${socket.id} from tournament queue due to disconnect`);
      tournamentQueue.splice(queueIndex, 1);
    }
    
    // Notify rooms this user was in
    if (users[socket.id]) {
      users[socket.id].rooms.forEach(roomId => {
        const room = rooms[roomId];
        if (room) {
          // Remove player from room
          room.players = room.players.filter(p => p.socketId !== socket.id);
          
          // Notify remaining players
          socket.to(roomId).emit('opponent_left', { socketId: socket.id });
          
          // Remove room if empty
          if (room.players.length === 0) {
            delete rooms[roomId];
          }
        }
      });
      
      // Remove user data
      delete users[socket.id];
    }
  });
  
  // Create a room
  socket.on('create_room', (data) => {
    try {
      // Generate a unique room ID
      const roomId = generateRoomId(data.gameType || "generic");
      const playerName = data.playerName || "Player";
      const gameType = data.gameType || "tic-tac-toe";
      const betAmount = parseFloat(data.betAmount) || 0;
      
      console.log(`Creating room for ${playerName}, game: ${gameType}, bet: ${betAmount}`);
      
      // Store room info
      rooms[roomId] = {
        id: roomId,
        players: [],
        gameState: null,
        betAmount: betAmount,
        isActive: true,
        createdAt: Date.now(),
        game: gameType
      };
      
      // Add player to room
      const player = {
        socketId: socket.id,
        playerName,
        isHost: true,
        joinedAt: Date.now()
      };
      
      rooms[roomId].players.push(player);
      
      // Join socket.io room
      socket.join(roomId);
      
      // Track user's rooms
      if (!users[socket.id]) {
        users[socket.id] = { rooms: [] };
      }
      users[socket.id].rooms = [...(users[socket.id].rooms || []), roomId];
      
      // Send back room info
      socket.emit('room_created', { 
        roomId, 
        game: gameType,
        betAmount: betAmount
      });
      
      console.log(`Room created: ${roomId} by ${playerName}`);
      logRoomStatus();
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });
  
  // Check if room exists
  socket.on('check_room', (data, callback) => {
    const { roomId } = data;
    
    if (rooms[roomId] && rooms[roomId].isActive && rooms[roomId].players.length < 2) {
      callback({ 
        exists: true, 
        betAmount: rooms[roomId].betAmount,
        game: rooms[roomId].game
      });
    } else {
      callback({ exists: false });
    }
  });
  
  // Join an existing room
  socket.on('join_room', (data) => {
    try {
      const { roomId, playerName, gameType } = data;
      
      console.log(`Attempting to join room ${roomId} for ${playerName}, game: ${gameType}`);
      
      // Check if room exists
      if (!rooms[roomId]) {
        console.log(`Room ${roomId} not found`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      const room = rooms[roomId];
      
      // Check if room is full
      if (room.players.length >= 2) {
        console.log(`Room ${roomId} is full`);
        socket.emit('error', { message: 'Room is full' });
        return;
      }
      
      // Add player to room
      const player = {
        socketId: socket.id,
        playerName,
        isHost: false,
        joinedAt: Date.now()
      };
      
      room.players.push(player);
      
      // Join socket.io room
      socket.join(roomId);
      
      // Track user's rooms
      if (!users[socket.id]) {
        users[socket.id] = { rooms: [] };
      }
      users[socket.id].rooms = [...(users[socket.id].rooms || []), roomId];
      
      // Notify all players in the room
      io.to(roomId).emit('player_joined', { 
        playerName,
        socketId: socket.id
      });
      
      // For Simon Says, start the game immediately when a second player joins
      if (room.game === 'simon-says' && room.players.length === 2) {
        console.log(`Starting Simon Says game in room ${roomId}`);
        io.to(roomId).emit('game_started', {
          roomId,
          gameType: 'simon-says',
          players: room.players.map(p => p.playerName)
        });
      } else {
        // For other games, notify joining player
        socket.emit('joined_room', {
          roomId,
          game: room.game,
          players: room.players.map(p => ({ name: p.playerName, isHost: p.isHost }))
        });
      }
      
      console.log(`Player ${playerName} joined room ${roomId}`);
      logRoomStatus();
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Game action - used for in-game moves
  socket.on('game_action', (data) => {
    const { roomId, action, gameState } = data;
    
    if (!rooms[roomId]) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Update game state
    if (gameState) {
      rooms[roomId].gameState = gameState;
    }
    
    // Notify the other player
    socket.to(roomId).emit('opponent_action', {
      action,
      gameState,
      socketId: socket.id
    });
  });
  
  // Game over
  socket.on('game_over', (data) => {
    const { roomId, result, winnerSocketId } = data;
    
    if (!rooms[roomId]) return;
    
    const room = rooms[roomId];
    
    // Calculate winnings if there was a bet
    if (room.betAmount > 0 && winnerSocketId) {
      const totalPot = room.betAmount * 2;
      const commission = totalPot * 0.1;  // 10% commission
      const winnings = totalPot - commission;
      
      io.to(winnerSocketId).emit('bet_won', {
        amount: winnings,
        originalBet: room.betAmount,
        commission: commission
      });
      
      console.log(`Player ${winnerSocketId} won ${winnings} coins (bet: ${room.betAmount}, commission: ${commission})`);
    }
    
    // Broadcast game over to everyone in the room
    io.to(roomId).emit('game_over', {
      result,
      winnerSocketId
    });
    
    // Mark room as inactive (will be cleaned up later)
    rooms[roomId].isActive = false;
  });
  
  // Namespace specific handlers
  // Rock Paper Scissors
  const rockPaperScissorsNsp = io.of('/rock-paper-scissors');
  rockPaperScissorsNsp.on('connection', (socket) => {
    console.log(`RPS connection: ${socket.id}`);
    
    socket.on('player_choice', (data) => {
      const { roomId, choice } = data;
      socket.to(roomId).emit('opponent_choice', { choice });
    });
  });
  
  // Simon Says
  const simonSaysNsp = io.of('/simon-says');
  simonSaysNsp.on('connection', (socket) => {
    console.log(`Simon Says connection: ${socket.id}`);
    
    socket.on('pattern_complete', (data) => {
      const { roomId, score } = data;
      socket.to(roomId).emit('opponent_score', { score });
    });
  });
  
  // Tournament matchmaking
  socket.on('find_match', (data) => {
    try {
      const { playerName, betAmount, gameType } = data;
      
      if (!gameType) {
        console.error('No gameType provided for matchmaking');
        socket.emit('error', { message: 'Game type is required for matchmaking' });
        return;
      }
      
      console.log(`Finding match for ${playerName} in ${gameType} with bet ${betAmount}`);
      
      // Remove any existing entries for this socket
      const existingIndex = tournamentQueue.findIndex(entry => entry.socketId === socket.id);
      if (existingIndex !== -1) {
        tournamentQueue.splice(existingIndex, 1);
      }
      
      // Add player to matchmaking queue
      const queueEntry = {
        socketId: socket.id,
        playerName,
        betAmount: parseFloat(betAmount) || 0,
        gameType,
        timestamp: Date.now()
      };
      
      tournamentQueue.push(queueEntry);
      
      console.log(`Added ${playerName} to queue for ${gameType}. Queue size: ${tournamentQueue.length}`);
      console.log(`Queue: ${JSON.stringify(tournamentQueue.map(e => ({ name: e.playerName, game: e.gameType, bet: e.betAmount })))}`);
      
      // Find a match
      const matchIndex = tournamentQueue.findIndex(entry => 
        entry.socketId !== socket.id && 
        entry.gameType === gameType && 
        Math.abs(entry.betAmount - queueEntry.betAmount) < 0.01
      );
      
      if (matchIndex !== -1) {
        const match = tournamentQueue[matchIndex];
        
        console.log(`Match found between ${playerName} and ${match.playerName} for ${gameType}`);
        
        // Remove both players from queue
        tournamentQueue.splice(matchIndex, 1);
        const currentPlayerIndex = tournamentQueue.findIndex(entry => entry.socketId === socket.id);
        if (currentPlayerIndex !== -1) {
          tournamentQueue.splice(currentPlayerIndex, 1);
        }
        
        // Create a room for the match
        const roomId = generateRoomId(gameType);
        
        rooms[roomId] = {
          id: roomId,
          players: [],
          gameState: null,
          betAmount: queueEntry.betAmount,
          isActive: true,
          createdAt: Date.now(),
          game: gameType,
          isTournament: true
        };
        
        // Add players to room
        const player1 = {
          socketId: socket.id,
          playerName: queueEntry.playerName,
          isHost: true,
          joinedAt: Date.now()
        };
        
        const player2 = {
          socketId: match.socketId,
          playerName: match.playerName,
          isHost: false,
          joinedAt: Date.now()
        };
        
        rooms[roomId].players.push(player1, player2);
        
        // Both players join the socket.io room
        socket.join(roomId);
        io.sockets.sockets.get(match.socketId)?.join(roomId);
        
        // Track users' rooms
        if (!users[socket.id]) users[socket.id] = { rooms: [] };
        if (!users[match.socketId]) users[match.socketId] = { rooms: [] };
        
        users[socket.id].rooms = [...(users[socket.id].rooms || []), roomId];
        users[match.socketId].rooms = [...(users[match.socketId].rooms || []), roomId];
        
        // Notify both players of the match
        io.to(socket.id).emit('tournament_match_found', {
          roomId,
          opponentName: match.playerName,
          betAmount: queueEntry.betAmount,
          gameType
        });
        
        io.to(match.socketId).emit('tournament_match_found', {
          roomId,
          opponentName: queueEntry.playerName,
          betAmount: match.betAmount,
          gameType
        });
        
        // For Simon Says, start the game immediately
        if (gameType === 'simon-says') {
          setTimeout(() => {
            console.log(`Starting Simon Says game for tournament match in room ${roomId}`);
            io.to(roomId).emit('game_started', {
              roomId,
              gameType: 'simon-says',
              players: [player1.playerName, player2.playerName]
            });
          }, 2000); // Small delay to ensure both clients are ready
        }
        
        console.log(`Tournament match created in room ${roomId}`);
        logRoomStatus();
      } else {
        socket.emit('waiting_for_match', { 
          position: tournamentQueue.filter(e => e.gameType === gameType).length,
          gameType
        });
      }
    } catch (error) {
      console.error('Error in matchmaking:', error);
      socket.emit('error', { message: 'Matchmaking failed' });
    }
  });
  
  // Cancel matchmaking
  socket.on('cancel_matchmaking', () => {
    const index = tournamentQueue.findIndex(entry => entry.socketId === socket.id);
    if (index !== -1) {
      console.log(`Removing ${tournamentQueue[index].playerName} from matchmaking queue`);
      tournamentQueue.splice(index, 1);
      socket.emit('matchmaking_cancelled');
    }
  });
  
  // Game specific events for Simon Says
  socket.on('simon_game_update', (data) => {
    try {
      const { roomId, action, payload } = data;
      
      if (!rooms[roomId]) {
        console.log(`Room ${roomId} not found for simon game update`);
        return;
      }
      
      // Broadcast to other players in the room
      socket.to(roomId).emit('simon_game_update', {
        action,
        payload,
        from: socket.id
      });
      
      // Track game state if needed
      if (action === 'game_over') {
        const room = rooms[roomId];
        room.gameState = {
          ...room.gameState,
          isGameOver: true,
          winner: payload.winner,
          finalScore: payload.score
        };
        
        // Clean up the room after a short delay
        setTimeout(() => {
          delete rooms[roomId];
        }, 60 * 1000); // Keep the room around for 1 minute for final UI updates
      }
    } catch (error) {
      console.error('Error in simon game update:', error);
    }
  });
  
  // Generic game action handler
  socket.on('make_move', (data) => {
    // ... existing code ...
  });
});

// API routes
app.get('/', (req, res) => {
  res.send('Game Socket.io Server');
});

// Get server stats
app.get('/stats', (req, res) => {
  res.json({
    activeRooms: Object.keys(rooms).length,
    connectedUsers: Object.keys(users).length,
    uptime: process.uptime()
  });
});

// API endpoint to create room via HTTP (for testing)
app.post('/api/create-room', (req, res) => {
  try {
    const { playerName, game = 'test', betAmount = 0 } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ success: false, message: 'playerName is required' });
    }
    
    // Generate room ID
    const roomId = generateRoomId(game);
    
    // Create room
    const room = getRoom(roomId);
    room.game = game;
    room.betAmount = betAmount;
    room.players.push({
      socketId: 'http-api-' + Date.now(),
      playerName,
      isHost: true,
      joinedAt: Date.now()
    });
    
    return res.status(201).json({ 
      success: true, 
      roomId,
      message: 'Room created successfully',
      room: {
        id: roomId,
        game,
        betAmount,
        createdAt: room.createdAt,
        players: room.players.map(p => ({ playerName: p.playerName, isHost: p.isHost }))
      }
    });
  } catch (error) {
    console.error('Error creating room via API:', error);
    return res.status(500).json({ success: false, message: 'Failed to create room' });
  }
});

// API endpoint to get room info
app.get('/api/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  if (!rooms[roomId]) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }
  
  const room = rooms[roomId];
  
  return res.json({
    success: true,
    room: {
      id: roomId,
      game: room.game,
      betAmount: room.betAmount,
      createdAt: room.createdAt,
      playerCount: room.players.length,
      isFull: room.players.length >= 2,
      isActive: room.isActive,
      players: room.players.map(p => ({ playerName: p.playerName, isHost: p.isHost }))
    }
  });
});

// List all active rooms
app.get('/api/rooms', (req, res) => {
  const activeRooms = Object.keys(rooms)
    .filter(roomId => rooms[roomId].isActive)
    .map(roomId => {
      const room = rooms[roomId];
      return {
        id: roomId,
        game: room.game,
        betAmount: room.betAmount,
        playerCount: room.players.length,
        isFull: room.players.length >= 2,
        createdAt: room.createdAt
      };
    });
  
  return res.json({
    success: true,
    count: activeRooms.length,
    rooms: activeRooms
  });
});

// Set up periodic room status logging
setInterval(() => {
  logRoomStatus();
}, 60000); // Log room status every minute

console.log('Socket.io server running on port 3001');

// Log when server starts
server.listen(3001, () => {
  console.log('Socket.io server running on port 3001');
}); 