const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());
const server = http.createServer(app);

// Initialize Socket.IO server with CORS settings
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Game state storage
const rooms = {};
const waitingPlayers = {
  'simon-says': [],
  'rock-paper-scissors': [],
  'red-light-green-light': [],
  'tic-tac-toe': [],
  'connect-four': [],
  'whack-a-mole': []
};

// Tournament brackets
const tournaments = {
  'simon-says': {
    players: [],
    matches: [],
    currentRound: 0,
    status: 'waiting'
  },
  'red-light-green-light': {
    players: [],
    matches: [],
    currentRound: 0,
    status: 'waiting'
  }
};

// Escrow contract storage - in real implementation this would connect to blockchain
const escrowContracts = {};

// Socket connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Create a new game room
  socket.on('create_room', (data) => {
    try {
      console.log('Creating room with data:', data);
      const { playerName, gameType, betAmount = "0" } = data;
      
      if (!playerName || !gameType) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }
      
      // Generate a unique room ID
      const roomId = uuidv4().substring(0, 6);
      
      // Initialize the room
      rooms[roomId] = {
        id: roomId,
        gameType,
        players: [{ id: socket.id, name: playerName }],
        status: 'waiting',
        created: Date.now(),
        betAmount,
        currentTurn: 0,
        gameState: {}
      };
      
      // Join the socket to this room
      socket.join(roomId);
      
      // Save the room ID to the socket for reference
      socket.roomId = roomId;
      
      console.log(`Room created: ${roomId} for game ${gameType}`);
      
      // Notify the creator
      socket.emit('room_created', { 
        roomId, 
        players: [playerName],
        gameType
      });
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });
  
  // Join an existing game room
  socket.on('join_room', (data) => {
    try {
      const { roomId, playerName, gameType } = data;
      
      if (!roomId || !playerName) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }
      
      // Check if room exists
      if (!rooms[roomId]) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Check if room is full
      if (rooms[roomId].players.length >= 2) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
      
      // Check if game type matches
      if (gameType && rooms[roomId].gameType !== gameType) {
        socket.emit('error', { message: 'Game type mismatch' });
        return;
      }
      
      // Add player to room
      rooms[roomId].players.push({ id: socket.id, name: playerName });
      rooms[roomId].status = 'playing';
      
      // Join the socket to this room
      socket.join(roomId);
      
      // Save the room ID to the socket for reference
      socket.roomId = roomId;
      
      // Get player names for reference
      const playerNames = rooms[roomId].players.map(p => p.name);
      
      console.log(`Player ${playerName} joined room ${roomId}`);
      
      // Notify all players in the room
      io.to(roomId).emit('player_joined', { 
        roomId, 
        players: playerNames,
        gameType: rooms[roomId].gameType,
        betAmount: rooms[roomId].betAmount
      });
      
      // Start the game
      io.to(roomId).emit('game_started', { 
        roomId, 
        players: playerNames,
        gameType: rooms[roomId].gameType
      });
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Find a match for tournament play
  socket.on('find_match', (data) => {
    try {
      const { playerName, betAmount, gameType, escrowAddress, walletAddress } = data;
      
      if (!playerName || !gameType) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }
      
      console.log(`Player ${playerName} looking for ${gameType} match with bet ${betAmount}`);
      
      // Create player object
      const player = { 
        id: socket.id, 
        name: playerName,
        betAmount,
        escrowAddress,
        walletAddress,
        joinedAt: Date.now()
      };
      
      // Store player's game type for reference
      socket.gameType = gameType;
      
      // Check for existing players waiting with similar bet amount
      const matchingPlayers = waitingPlayers[gameType].filter(p => {
        // Skip self
        if (p.id === socket.id) return false;
        
        // If bet amount specified, match within 20% range
        if (betAmount && p.betAmount) {
          const betAmountFloat = parseFloat(betAmount);
          const pBetAmountFloat = parseFloat(p.betAmount);
          const minBet = betAmountFloat * 0.8;
          const maxBet = betAmountFloat * 1.2;
          return pBetAmountFloat >= minBet && pBetAmountFloat <= maxBet;
        }
        
        return true;
      });
      
      if (matchingPlayers.length > 0) {
        // Sort by waiting time (oldest first)
        matchingPlayers.sort((a, b) => a.joinedAt - b.joinedAt);
        
        // Match with the first available player
        const opponent = matchingPlayers[0];
        
        // Remove opponent from waiting list
        waitingPlayers[gameType] = waitingPlayers[gameType].filter(p => p.id !== opponent.id);
        
        // Create a new room for the match
        const roomId = uuidv4().substring(0, 6);
        
        // Initialize the room
        rooms[roomId] = {
          id: roomId,
          gameType,
          players: [
            { id: socket.id, name: playerName },
            { id: opponent.id, name: opponent.name }
          ],
          status: 'playing',
          created: Date.now(),
          betAmount: betAmount || opponent.betAmount,
          escrowAddress: escrowAddress || opponent.escrowAddress,
          walletAddresses: [
            walletAddress,
            opponent.walletAddress
          ],
          currentTurn: 0,
          gameState: {}
        };
        
        // Join both sockets to this room
        socket.join(roomId);
        io.sockets.sockets.get(opponent.id)?.join(roomId);
        
        // Save the room ID to both sockets
        socket.roomId = roomId;
        if (io.sockets.sockets.get(opponent.id)) {
          io.sockets.sockets.get(opponent.id).roomId = roomId;
        }
        
        // Register escrow contract
        if (escrowAddress || opponent.escrowAddress) {
          escrowContracts[roomId] = {
            address: escrowAddress || opponent.escrowAddress,
            betAmount: betAmount || opponent.betAmount,
            player1: walletAddress,
            player2: opponent.walletAddress,
            status: 'active'
          };
        }
        
        // Get player names
        const playerNames = [playerName, opponent.name];
        
        console.log(`Match found! Room ${roomId} created for ${playerNames.join(' vs ')}`);
        
        // Notify both players
        io.to(roomId).emit('tournament_match_found', { 
          roomId, 
          players: playerNames,
          gameType,
          betAmount: betAmount || opponent.betAmount,
          escrowAddress: escrowAddress || opponent.escrowAddress
        });
      } else {
        // Add player to waiting list
        waitingPlayers[gameType].push(player);
        
        console.log(`Player ${playerName} added to ${gameType} waiting list. Total waiting: ${waitingPlayers[gameType].length}`);
        
        // Notify player they're waiting
        socket.emit('waiting_for_match', { 
          message: 'Looking for an opponent...',
          position: waitingPlayers[gameType].length
        });
      }
    } catch (error) {
      console.error('Error finding match:', error);
      socket.emit('error', { message: 'Failed to find match' });
    }
  });
  
  // Cancel matchmaking
  socket.on('cancel_matchmaking', () => {
    try {
      const gameType = socket.gameType;
      
      if (!gameType) {
        console.log('No game type found for socket:', socket.id);
        return;
      }
      
      // Remove player from waiting list
      waitingPlayers[gameType] = waitingPlayers[gameType].filter(p => p.id !== socket.id);
      
      console.log(`Player ${socket.id} cancelled matchmaking for ${gameType}. Remaining players: ${waitingPlayers[gameType].length}`);
      
      // Notify player
      socket.emit('matchmaking_cancelled', { 
        message: 'Matchmaking cancelled' 
      });
    } catch (error) {
      console.error('Error cancelling matchmaking:', error);
    }
  });
  
  // Game moves and events for Simon Says
  socket.on('simon_says_move', (data) => {
    try {
      const { roomId, sequence, level } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID required' });
        return;
      }
      
      // Check if room exists
      if (!rooms[roomId]) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Update game state
      rooms[roomId].gameState.currentSequence = sequence;
      rooms[roomId].gameState.level = level;
      
      // Broadcast to other player in the room
      socket.to(roomId).emit('simon_says_update', {
        sequence,
        level
      });
    } catch (error) {
      console.error('Error processing Simon Says move:', error);
    }
  });
  
  // Game events for Red Light Green Light
  socket.on('red_light_green_light_move', (data) => {
    try {
      const { roomId, position, moving, lightState } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID required' });
        return;
      }
      
      // Check if room exists
      if (!rooms[roomId]) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Get player index
      const playerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
      
      // Update game state
      if (!rooms[roomId].gameState.positions) {
        rooms[roomId].gameState.positions = [0, 0];
      }
      
      if (playerIndex >= 0) {
        rooms[roomId].gameState.positions[playerIndex] = position;
        
        // Broadcast to the room
        socket.to(roomId).emit('player_position_update', {
          playerIndex,
          position,
          moving
        });
        
        // If light state provided, broadcast that too
        if (lightState) {
          io.to(roomId).emit('light_state_changed', { lightState });
        }
      }
    } catch (error) {
      console.error('Error processing Red Light Green Light move:', error);
    }
  });
  
  // Game result notification
  socket.on('game_result', (data) => {
    try {
      const { roomId, result, score } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID required' });
        return;
      }
      
      // Check if room exists
      if (!rooms[roomId]) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      console.log(`Game result for room ${roomId}: ${result} with score ${score}`);
      
      // Update room status
      rooms[roomId].status = 'completed';
      
      // Update escrow contract status if exists
      if (escrowContracts[roomId]) {
        escrowContracts[roomId].status = 'completed';
        escrowContracts[roomId].result = result;
        escrowContracts[roomId].winner = socket.id;
      }
      
      // Broadcast result to other players
      socket.to(roomId).emit('opponent_game_result', {
        result,
        score
      });
    } catch (error) {
      console.error('Error processing game result:', error);
    }
  });
  
  // Tournament result for leaderboard updates
  socket.on('tournament_result', (data) => {
    try {
      const { roomId, player, result, walletAddress } = data;
      
      if (!roomId || !result) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }
      
      console.log(`Tournament result for room ${roomId}: Player ${player} ${result}`);
      
      // If room has escrow contract
      if (escrowContracts[roomId]) {
        const contract = escrowContracts[roomId];
        
        // Update contract with winner
        if (result === 'won') {
          contract.status = 'claimed';
          contract.winner = walletAddress;
          
          console.log(`Escrow contract ${contract.address} updated: Winner ${walletAddress}`);
        }
      }
      
      // Notify both players about tournament update
      io.to(roomId).emit('tournament_update', {
        roomId,
        winner: result === 'won' ? player : null,
        completed: true
      });
    } catch (error) {
      console.error('Error processing tournament result:', error);
    }
  });
  
  // Cleanup on disconnect
  socket.on('disconnect', () => {
    try {
      console.log('Client disconnected:', socket.id);
      
      // Remove from any waiting lists
      for (const gameType in waitingPlayers) {
        waitingPlayers[gameType] = waitingPlayers[gameType].filter(p => p.id !== socket.id);
      }
      
      // Handle room cleanup
      if (socket.roomId && rooms[socket.roomId]) {
        const roomId = socket.roomId;
        const room = rooms[roomId];
        
        // Find player in the room
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex >= 0) {
          const playerName = room.players[playerIndex].name;
          
          // Notify other players in the room
          socket.to(roomId).emit('player_disconnected', {
            playerName,
            message: `${playerName} has disconnected`
          });
          
          // If game was in progress, the other player wins by default
          if (room.status === 'playing') {
            const winnerId = room.players.find(p => p.id !== socket.id)?.id;
            
            if (winnerId) {
              socket.to(roomId).emit('opponent_disconnected', {
                result: 'won',
                message: 'Your opponent disconnected. You win!'
              });
              
              // Update escrow contract if exists
              if (escrowContracts[roomId] && winnerId) {
                const winnerSocket = io.sockets.sockets.get(winnerId);
                if (winnerSocket) {
                  const winnerWalletAddress = room.walletAddresses?.find(addr => addr !== escrowContracts[roomId].player1);
                  
                  if (winnerWalletAddress) {
                    escrowContracts[roomId].status = 'claimed';
                    escrowContracts[roomId].winner = winnerWalletAddress;
                    
                    console.log(`Escrow contract ${escrowContracts[roomId].address} updated: Winner ${winnerWalletAddress} (by disconnect)`);
                  }
                }
              }
            }
          }
        }
        
        // Clean up the room if both players disconnected
        if (room.players.length === 1 || room.players.every(p => !io.sockets.sockets.has(p.id))) {
          console.log(`Removing empty room: ${roomId}`);
          delete rooms[roomId];
          
          // Clean up escrow contract too
          if (escrowContracts[roomId]) {
            delete escrowContracts[roomId];
          }
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({
    status: 'ok',
    connections: io.sockets.sockets.size,
    rooms: Object.keys(rooms).length,
    waiting: Object.entries(waitingPlayers).reduce((acc, [game, players]) => {
      acc[game] = players.length;
      return acc;
    }, {})
  });
});

// Get active rooms
app.get('/rooms', (req, res) => {
  res.status(200).send({
    rooms: Object.values(rooms).map(room => ({
      id: room.id,
      gameType: room.gameType,
      playerCount: room.players.length,
      status: room.status,
      created: room.created
    }))
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
}); 