import { io, Socket, ManagerOptions } from 'socket.io-client';

// Default socket server URL with fallback
const DEFAULT_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';

// Connection options
const connectionOptions: Partial<ManagerOptions> = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
  transports: ['websocket', 'polling']
};

/**
 * Creates a socket connection with proper error handling
 * @param namespace Optional namespace to connect to
 * @param customUrl Optional custom URL to connect to
 * @returns Socket instance and connection state helpers
 */
export function createGameSocket(namespace?: string, customUrl?: string) {
  const socketUrl = customUrl || DEFAULT_SOCKET_URL;
  const fullUrl = namespace ? `${socketUrl}/${namespace}` : socketUrl;
  
  let socket: Socket | null = null;
  
  const connect = () => {
    if (socket && socket.connected) {
      console.log('Socket already connected');
      return socket;
    }
    
    try {
      // Create new socket connection
      socket = io(fullUrl, {
        ...connectionOptions,
        autoConnect: true
      });
      
      // Setup event listeners
      socket.on('connect', () => {
        console.log(`Socket connected to ${fullUrl}`);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // For development, create mock responses when server is not available
        if (process.env.NODE_ENV === 'development') {
          setupMockSocketHandlers(socket);
        }
      });
      
      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${reason}`);
      });
      
      return socket;
    } catch (error) {
      console.error('Error initializing socket:', error);
      return null;
    }
  };
  
  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };
  
  return {
    connect,
    disconnect,
    getSocket: () => socket
  };
}

/**
 * Setup mock handlers for development when server is not available
 */
function setupMockSocketHandlers(socket: Socket | null) {
  if (!socket) return;
  
  // Simulate server responses for development
  const originalEmit = socket.emit;
  
  // Override emit to intercept calls and mock responses
  socket.emit = function(event: string, ...args: any[]) {
    console.log(`[MOCK] Socket emit: ${event}`, args);
    
    // Mock responses for common events
    setTimeout(() => {
      if (event === 'create_room') {
        const mockRoomId = 'room_' + Math.random().toString(36).substring(2, 10);
        socket?.emit('room_created', { roomId: mockRoomId });
      } else if (event === 'join_room') {
        const roomData = args[0];
        if (roomData && roomData.roomId) {
          socket?.emit('player_joined', { 
            playerName: 'Mock Player',
            roomId: roomData.roomId 
          });
        }
      }
    }, 500);
    
    // Call original emit
    return originalEmit.apply(this, [event, ...args]);
  };
} 