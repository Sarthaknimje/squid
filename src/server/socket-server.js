const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://squid-game-tournament.vercel.app']
    : ['http://localhost:3000']
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
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Right after creating the io server, increase max listeners
io.setMaxListeners(100); // Increase max listeners to avoid warnings

// Store active rooms
const rooms = {};
const users = {};

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
      
      // Notify host
      const host = room.players.find(p => p.isHost);
      if (host) {
        console.log(`Notifying host ${host.playerName} about joined player ${playerName}`);
        io.to(host.socketId).emit('player_joined', { 
          playerName,
          socketId: socket.id
        });
      }
      
      // Notify joining player of the host
      socket.emit('game_started', {
        opponentName: host ? host.playerName : 'Host',
        isPlayerX: false  // Second player is O
      });
      
      // Prepare for game start
      setTimeout(() => {
        io.to(roomId).emit('game_start', { roomId });
      }, 3000);
      
      console.log(`Player ${playerName} joined room: ${roomId}`);
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
  
  // Find tournament match
  socket.on('find_match', (data) => {
    try {
      const { playerName, betAmount, gameType, transactionHash } = data;
      const parsedBetAmount = parseFloat(betAmount) || 0.2;
      const game = gameType || 'tic-tac-toe';
      
      console.log(`Player ${playerName} looking for ${game} match with bet ${parsedBetAmount}`);
      
      // Store player in queue with matchmaking data
      const playerEntry = {
        socketId: socket.id,
        playerName,
        betAmount: parsedBetAmount,
        gameType: game,
        joinedQueue: Date.now(),
        transactionHash
      };
      
      // Look for existing player with similar bet amount (within 10%)
      const betVariance = parsedBetAmount * 0.1;
      const matchingOpponent = tournamentQueue.find(opponent => 
        opponent.gameType === game && 
        Math.abs(opponent.betAmount - parsedBetAmount) <= betVariance &&
        opponent.socketId !== socket.id
      );
      
      if (matchingOpponent) {
        // Remove the opponent from queue
        const opponentIndex = tournamentQueue.findIndex(p => p.socketId === matchingOpponent.socketId);
        if (opponentIndex !== -1) {
          tournamentQueue.splice(opponentIndex, 1);
        }
        
        // Create a room for the match
        const roomId = generateRoomId(game);
        
        // Use average of the two bets
        const matchBetAmount = (parsedBetAmount + matchingOpponent.betAmount) / 2;
        
        // Create room
        rooms[roomId] = {
          id: roomId,
          players: [],
          gameState: null,
          betAmount: matchBetAmount,
          isActive: true,
          createdAt: Date.now(),
          game: game,
          isTournament: true
        };
        
        // Add both players to the room
        const player1 = {
          socketId: matchingOpponent.socketId,
          playerName: matchingOpponent.playerName,
          isHost: true,
          joinedAt: Date.now()
        };
        
        const player2 = {
          socketId: socket.id,
          playerName: playerName,
          isHost: false,
          joinedAt: Date.now()
        };
        
        rooms[roomId].players.push(player1, player2);
        
        // Join both to socket.io room
        io.sockets.sockets.get(matchingOpponent.socketId)?.join(roomId);
        socket.join(roomId);
        
        // Track room for both users
        if (!users[matchingOpponent.socketId]) {
          users[matchingOpponent.socketId] = { rooms: [] };
        }
        users[matchingOpponent.socketId].rooms = [...(users[matchingOpponent.socketId].rooms || []), roomId];
        
        if (!users[socket.id]) {
          users[socket.id] = { rooms: [] };
        }
        users[socket.id].rooms = [...(users[socket.id].rooms || []), roomId];
        
        // Notify both players
        io.to(matchingOpponent.socketId).emit('tournament_match_found', {
          roomId,
          opponentName: playerName,
          isPlayerX: true,
          betAmount: matchBetAmount
        });
        
        socket.emit('tournament_match_found', {
          roomId, 
          opponentName: matchingOpponent.playerName,
          isPlayerX: false,
          betAmount: matchBetAmount
        });
        
        console.log(`Tournament match created: ${roomId} for ${matchingOpponent.playerName} vs ${playerName} with bet ${matchBetAmount}`);
        
        // Prepare for game start
        setTimeout(() => {
          io.to(roomId).emit('game_start', { roomId });
        }, 3000);
        
        logRoomStatus();
      } else {
        // No match found, add to queue
        tournamentQueue.push(playerEntry);
        socket.emit('waiting_for_opponent', { 
          queuePosition: tournamentQueue.length,
          message: "Waiting for an opponent with a similar bet amount..." 
        });
        
        console.log(`Added player ${playerName} to tournament queue for ${game} (bet: ${parsedBetAmount})`);
      }
    } catch (error) {
      console.error('Error in tournament matchmaking:', error);
      socket.emit('error', { message: 'Failed to find match' });
    }
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