// Global declarations for external libraries
interface Window {
  // No external libraries are needed for our current implementation
  petra?: PetraWallet;
} 

// Petra wallet interface
interface PetraWallet {
  isConnected(): Promise<boolean>;
  connect(): Promise<any>;
  account(): Promise<{ address: string }>;
  signAndSubmitTransaction(transaction: any): Promise<{ hash: string }>;
  waitForTransaction(hash: string): Promise<any>;
  disconnect(): Promise<void>;
}

// Socket.io response types
interface RoomCreatedResponse {
  roomId: string;
  gameType: string;
  betAmount: string;
}

interface PlayerJoinedResponse {
  roomId: string;
  players: string[];
  betAmount: string;
}

interface GameStartedResponse {
  roomId: string;
  players: string[];
  gameType: string;
  betAmount: string;
  firstPlayer: number;
}

interface GameEndedResponse {
  winner: string;
  winnerSocketId: string;
  reason?: string;
  betAmount: string;
  winningAmount: string;
  transactionHashes: string[];
}

interface TournamentMatchFoundResponse {
  roomId: string;
  players: string[];
  gameType: string;
  betAmount: string;
  firstPlayer: number;
} 