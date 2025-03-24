// Simple Socket.io client test
const { io } = require("socket.io-client");

console.log("Testing Socket.io connection...");

// Connect to the Socket.io server
const socket = io("http://localhost:3001");

// Connection events
socket.on("connect", () => {
  console.log("Connected to Socket.io server successfully!");
  console.log("Socket ID:", socket.id);
  
  // Test creating a room
  socket.emit("create_room", { 
    gameType: "tic-tac-toe", 
    playerName: "TestPlayer" 
  });
  
  // Wait for 2 seconds then disconnect
  setTimeout(() => {
    console.log("Test complete, disconnecting...");
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

// Room created event
socket.on("room_created", (data) => {
  console.log("Room created successfully:", data);
});

// Error event
socket.on("error", (error) => {
  console.error("Socket error:", error);
});

// Connection error
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  process.exit(1);
});

// Disconnection
socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

// Timeout after 5 seconds if no connection
setTimeout(() => {
  if (!socket.connected) {
    console.error("Failed to connect to Socket.io server after 5 seconds");
    process.exit(1);
  }
}, 5000); 