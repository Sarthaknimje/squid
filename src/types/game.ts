// Game modes
export enum GameMode {
  NOT_SELECTED = 0,
  COMPUTER = 1,
  LOCAL_MULTIPLAYER = 2,
  ONLINE_MULTIPLAYER = 3,
  ROOM = 4
}

// Game status states
export enum GameStatus {
  NOT_STARTED = 0,
  PLAYING = 1,
  WON = 2,
  LOST = 3,
  TIE = 4
}

// Player data for multiplayer games
export interface PlayerData {
  name: string;
  position?: number;
  score?: number;
  isActive?: boolean;
  isWinner?: boolean;
}

// Tournament data
export interface TournamentData {
  roomId: string;
  playerName: string;
  betAmount: string;
  gameType: string;
  transactionHash?: string;
}

// Room data for multiplayer games
export interface RoomData {
  roomId: string;
  playerName: string;
  gameType: string;
} 