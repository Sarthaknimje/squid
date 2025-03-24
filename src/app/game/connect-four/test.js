// Test script for Connect Four game
const io = require('socket.io-client');

// Connect to local socket server
const socket1 = io('http://localhost:3001');
const socket2 = io('http://localhost:3001');

let roomId = null;

// Player 1 - Create room
socket1.on('connect', () => {
  console.log('Player 1 connected');
  
  socket1.emit('create_room', {
    playerName: 'Player 1',
    game: 'connect-four'
  });
});

// Player 1 - Room created
socket1.on('room_created', (data) => {
  console.log('Room created with ID:', data.roomId);
  roomId = data.roomId;
  
  // Player 2 joins the room
  socket2.emit('join_room', {
    roomId,
    playerName: 'Player 2'
  });
});

// Player 2 - Room joined
socket2.on('room_joined', (data) => {
  console.log('Player 2 joined room:', data.roomId);
  console.log('Game type:', data.game);
  
  // Simulate dropping pieces in column 3
  setTimeout(() => {
    socket2.emit('make_move', {
      roomId,
      col: 3,
      color: 'yellow'
    });
    console.log('Player 2 dropped yellow piece in column 3');
  }, 1000);
});

// Player 1 - Player joined
socket1.on('player_joined', (data) => {
  console.log('Player joined:', data.playerName);
  
  // Player 1 drops a piece after player 2
  setTimeout(() => {
    socket1.emit('make_move', {
      roomId,
      col: 2,
      color: 'red'
    });
    console.log('Player 1 dropped red piece in column 2');
  }, 2000);
});

// Player 1 - Move made
socket1.on('move_made', (data) => {
  console.log('Player 1 received move from opponent:', data);
});

// Player 2 - Move made
socket2.on('move_made', (data) => {
  console.log('Player 2 received move from opponent:', data);
  
  // Reset game after a delay
  setTimeout(() => {
    socket2.emit('reset_game', { roomId });
    console.log('Player 2 reset the game');
  }, 1000);
});

// Game reset
socket1.on('game_reset', () => {
  console.log('Player 1 received game reset notification');
  
  // Disconnect after test is complete
  setTimeout(() => {
    socket1.disconnect();
    socket2.disconnect();
    console.log('Test complete. Disconnected from server.');
  }, 1000);
});

// Error handling
socket1.on('error', (data) => {
  console.error('Player 1 error:', data.message);
});

socket2.on('error', (data) => {
  console.error('Player 2 error:', data.message);
});

// Disconnect events
socket1.on('disconnect', () => {
  console.log('Player 1 disconnected');
});

socket2.on('disconnect', () => {
  console.log('Player 2 disconnected');
});

// Run test for 10 seconds then force exit
setTimeout(() => {
  console.log('Test timeout reached, exiting...');
  process.exit(0);
}, 10000);

console.log('Connect Four test started. Running for 10 seconds...'); 