const { io } = require('socket.io-client');

// Connect to the socket server
const socket = io('http://localhost:3001', {
  autoConnect: true,
  reconnection: true
});

// Event handlers
socket.on('connect', () => {
  console.log('Connected to server!');
  console.log('Socket ID:', socket.id);
  
  // Create a test room
  socket.emit('create_room', {
    playerName: 'TestPlayer',
    game: 'rock-paper-scissors',
    betAmount: 100
  });
});

socket.on('room_created', (data) => {
  console.log('Room created successfully!');
  console.log('Room ID:', data.roomId);
  
  // Now let's test joining this room
  const secondSocket = io('http://localhost:3001');
  
  secondSocket.on('connect', () => {
    console.log('Second player connected!');
    console.log('Second socket ID:', secondSocket.id);
    
    // Join the room
    secondSocket.emit('join_room', {
      roomId: data.roomId,
      playerName: 'Opponent',
      game: 'rock-paper-scissors'
    });
  });
  
  secondSocket.on('player_joined', (joinData) => {
    console.log('Player joined event received!');
    console.log('Joining player:', joinData.playerName);
    
    // Test game action
    setTimeout(() => {
      console.log('Testing game action...');
      secondSocket.emit('player_choice', {
        roomId: data.roomId,
        choice: 'rock'
      });
    }, 1000);
  });
  
  secondSocket.on('game_start', (startData) => {
    console.log('Game started!');
    console.log(startData);
  });
  
  secondSocket.on('disconnect', () => {
    console.log('Second player disconnected.');
  });
  
  secondSocket.on('error', (error) => {
    console.error('Second socket error:', error);
  });
});

socket.on('opponent_choice', (data) => {
  console.log('Opponent choice received!');
  console.log('Choice:', data.choice);
});

socket.on('player_joined', (data) => {
  console.log('First socket: Player joined event received!');
  console.log('Player name:', data.playerName);
  
  // Test game action
  setTimeout(() => {
    console.log('First player making a choice...');
    socket.emit('player_choice', {
      roomId: data.roomId,
      choice: 'paper'
    });
  }, 2000);
});

socket.on('game_start', (data) => {
  console.log('First socket: Game started!');
  console.log(data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server.');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Handle terminal signals
process.on('SIGINT', () => {
  console.log('Closing sockets...');
  socket.disconnect();
  process.exit(0);
}); 