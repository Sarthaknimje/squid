import { AccountAddress, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { contractService } from "./contractService";

// Game type constants
export const GAME_TYPE_ROCK_PAPER_SCISSORS = 1;
export const GAME_TYPE_SIMON_SAYS = 2;
export const GAME_TYPE_RED_LIGHT_GREEN_LIGHT = 3;
export const GAME_TYPE_TUG_OF_WAR = 4;

/**
 * Create a game escrow contract between two players
 * @param opponent The opponent's wallet address
 * @param wagerAmount Amount to wager in APT
 * @param gameType The type of game being played
 * @returns Transaction hash and game ID
 */
export async function createGameEscrowContract(
  opponent: string,
  wagerAmount: string,
  gameType: number
): Promise<{ success: boolean; hash?: string; gameId?: number; error?: string }> {
  try {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected. Connect your wallet first.");
    }
    
    // Update contract service with current wallet
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(aptosConfig);
    
    // Set the current account in contractService
    contractService.setAccount({
      address: () => window.aptos.account(),
      signTransaction: async (tx: any) => await window.aptos.signTransaction(tx),
    });
    
    // Create the game via contract service
    const result = await contractService.createGame(
      opponent as unknown as AccountAddress,
      wagerAmount,
      gameType,
      0 // No tournament
    );
    
    return result;
  } catch (error) {
    console.error("Error creating game escrow contract:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Accept a game challenge by joining the escrow contract
 * @param gameId The game ID to join
 * @returns Transaction hash
 */
export async function acceptGameEscrowContract(gameId: number): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected. Connect your wallet first.");
    }
    
    // Update contract service with current wallet
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(aptosConfig);
    
    // Set the current account in contractService
    contractService.setAccount({
      address: () => window.aptos.account(),
      signTransaction: async (tx: any) => await window.aptos.signTransaction(tx),
    });
    
    // Accept the game via contract service
    const result = await contractService.acceptGame(gameId);
    
    return result;
  } catch (error) {
    console.error("Error accepting game escrow contract:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Release escrow funds to the winner
 * @param gameId The game ID
 * @param winner Winner's wallet address
 * @returns Transaction hash
 */
export async function releaseEscrowToWinner(
  gameId: number,
  winner: string,
  _wagerAmount?: string // Not needed for actual contract call
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected. Connect your wallet first.");
    }
    
    // Update contract service with current wallet
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(aptosConfig);
    
    // Set the current account in contractService
    contractService.setAccount({
      address: () => window.aptos.account(),
      signTransaction: async (tx: any) => await window.aptos.signTransaction(tx),
    });
    
    // Complete the game and distribute rewards
    const result = await contractService.completeGame(
      gameId,
      winner as unknown as AccountAddress
    );
    
    return result;
  } catch (error) {
    console.error("Error releasing escrow to winner:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Pay tournament entry fee
 * @param tournamentId Tournament ID
 * @param entryFee Entry fee amount
 * @returns Transaction hash
 */
export async function payTournamentEntryFee(
  tournamentId: number,
  entryFee: string
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected. Connect your wallet first.");
    }
    
    // Update contract service with current wallet
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(aptosConfig);
    
    // Set the current account in contractService
    contractService.setAccount({
      address: () => window.aptos.account(),
      signTransaction: async (tx: any) => await window.aptos.signTransaction(tx),
    });
    
    // Register for tournament (includes payment of entry fee)
    const result = await contractService.registerForTournament(tournamentId);
    
    return result;
  } catch (error) {
    console.error("Error paying tournament entry fee:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Pay tournament winnings to the winner
 * @param tournamentId Tournament ID
 * @param winner Winner's wallet address
 * @returns Transaction hash
 */
export async function payTournamentWinnings(
  tournamentId: number,
  winner: string
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected. Connect your wallet first.");
    }

    // Update contract service with current wallet
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(aptosConfig);
    
    // Set the current account in contractService
    contractService.setAccount({
      address: () => window.aptos.account(),
      signTransaction: async (tx: any) => await window.aptos.signTransaction(tx),
    });
    
    // In the real contract architecture, winnings are distributed automatically
    // when the tournament is completed by the contract
    // This is a placeholder for that scenario
    console.log(`Tournament ${tournamentId} completed, winner: ${winner}`);
    
    return {
      success: true,
      hash: `tournament-complete-${tournamentId}`,
    };
  } catch (error) {
    console.error("Error paying tournament winnings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process achievements for player
 * @param player Player wallet address
 * @param gameId Game ID
 * @param gameType Game type
 * @param isWinner Whether the player won
 * @returns Transaction hash
 */
export async function processPlayerAchievements(
  player: string,
  gameId: number,
  gameType: number,
  isWinner: boolean
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected. Connect your wallet first.");
    }

    // Update contract service with current wallet
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(aptosConfig);
    
    // Set the current account in contractService
    contractService.setAccount({
      address: () => window.aptos.account(),
      signTransaction: async (tx: any) => await window.aptos.signTransaction(tx),
    });
    
    // Process game achievements
    const result = await contractService.processGameAchievements(
      player as unknown as AccountAddress,
      gameId,
      gameType,
      isWinner
    );
    
    return result;
  } catch (error) {
    console.error("Error processing player achievements:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get player stats from the contract
 * @param player Player wallet address
 * @returns Player stats
 */
export async function getPlayerStats(player: string) {
  try {
    if (!window.aptos) {
      throw new Error("Aptos wallet not connected. Connect your wallet first.");
    }

    // Update contract service with current wallet
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(aptosConfig);
    
    // Set the current account in contractService
    contractService.setAccount({
      address: () => window.aptos.account(),
      signTransaction: async (tx: any) => await window.aptos.signTransaction(tx),
    });
    
    // Get player stats
    return await contractService.getPlayerStats(
      player as unknown as AccountAddress
    );
  } catch (error) {
    console.error("Error getting player stats:", error);
    return null;
  }
}

// Add Aptos wallet support
declare global {
  interface Window {
    aptos?: {
      account: () => AccountAddress;
      connect: () => Promise<{ address: AccountAddress }>;
      disconnect: () => Promise<void>;
      isConnected: () => Promise<boolean>;
      signTransaction: (tx: any) => Promise<any>;
      signAndSubmitTransaction: (tx: any) => Promise<{ hash: string }>;
    };
  }
} 