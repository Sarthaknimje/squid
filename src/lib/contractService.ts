import { AccountAddress, Aptos, AptosConfig, Network, MoveStructId, U64, TokenType } from "@aptos-labs/ts-sdk";
import { BaseSigner } from "./moveAgentKit";

// Smart contract module and function names
const ESCROW_MODULE = "squid_game::escrow";
const TOURNAMENT_MODULE = "squid_game::tournament";
const REWARDS_MODULE = "squid_game::rewards";

// Module constants
const CONTRACT_ADDRESS = "0x1"; // Replace with actual deployed contract address

export class ContractService {
  private aptos: Aptos;
  private account: BaseSigner | null = null;

  constructor(network: Network = Network.TESTNET) {
    const config = new AptosConfig({ network });
    this.aptos = new Aptos(config);
  }

  setAccount(account: BaseSigner) {
    this.account = account;
  }

  /**
   * Initialize the account with the contract service
   */
  async initialize() {
    if (!this.account) {
      throw new Error("Account not set. Call setAccount first.");
    }
    
    try {
      // Check if the account is already initialized
      const accountResources = await this.aptos.getAccountResources({
        accountAddress: this.account.address(),
      });
      
      const playerStatsResource = accountResources.find(
        (r) => r.type === `${CONTRACT_ADDRESS}::${ESCROW_MODULE}::PlayerStats`
      );
      
      // If player stats already exists, no need to initialize
      if (playerStatsResource) {
        return { success: true, initialized: true };
      }
      
      // Otherwise initialize
      const transaction = await this.aptos.build.transaction({
        sender: this.account.address(),
        data: {
          function: `${CONTRACT_ADDRESS}::${ESCROW_MODULE}::initialize`,
          typeArguments: [],
          functionArguments: [],
        },
      });
      
      const signedTx = await this.account.signTransaction(transaction);
      const result = await this.aptos.submitTransaction({ transaction: signedTx });
      
      return {
        success: true,
        hash: result.hash,
      };
    } catch (error) {
      console.error("Error initializing contract:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a game escrow contract between two players
   */
  async createGame(
    opponent: AccountAddress,
    wagerAmount: string,
    gameType: number,
    tournamentId: number = 0
  ) {
    if (!this.account) {
      throw new Error("Account not set. Call setAccount first.");
    }
    
    try {
      const transaction = await this.aptos.build.transaction({
        sender: this.account.address(),
        data: {
          function: `${CONTRACT_ADDRESS}::${ESCROW_MODULE}::create_game`,
          typeArguments: [],
          functionArguments: [
            opponent,
            new U64(Math.floor(parseFloat(wagerAmount) * 100000000)), // Convert to Octas (8 decimal places)
            gameType,
            tournamentId,
          ],
        },
      });
      
      const signedTx = await this.account.signTransaction(transaction);
      const result = await this.aptos.submitTransaction({ transaction: signedTx });
      
      // Get the game ID from transaction events
      const txnEvents = await this.aptos.getTransactionByHash({ transactionHash: result.hash });
      const gameCreatedEvent = txnEvents.events?.find(
        (e) => e.type === `${CONTRACT_ADDRESS}::${ESCROW_MODULE}::GameCreatedEvent`
      );
      
      const gameId = gameCreatedEvent?.data?.game_id || 0;
      
      return {
        success: true,
        hash: result.hash,
        gameId,
      };
    } catch (error) {
      console.error("Error creating game:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Accept a game challenge
   */
  async acceptGame(gameId: number) {
    if (!this.account) {
      throw new Error("Account not set. Call setAccount first.");
    }
    
    try {
      const transaction = await this.aptos.build.transaction({
        sender: this.account.address(),
        data: {
          function: `${CONTRACT_ADDRESS}::${ESCROW_MODULE}::accept_game`,
          typeArguments: [],
          functionArguments: [gameId],
        },
      });
      
      const signedTx = await this.account.signTransaction(transaction);
      const result = await this.aptos.submitTransaction({ transaction: signedTx });
      
      return {
        success: true,
        hash: result.hash,
      };
    } catch (error) {
      console.error("Error accepting game:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Complete a game and distribute rewards
   * Note: This would typically be called by an admin or oracle service
   */
  async completeGame(gameId: number, winner: AccountAddress) {
    if (!this.account) {
      throw new Error("Account not set. Call setAccount first.");
    }
    
    try {
      const transaction = await this.aptos.build.transaction({
        sender: this.account.address(),
        data: {
          function: `${CONTRACT_ADDRESS}::${ESCROW_MODULE}::complete_game`,
          typeArguments: [],
          functionArguments: [gameId, winner],
        },
      });
      
      const signedTx = await this.account.signTransaction(transaction);
      const result = await this.aptos.submitTransaction({ transaction: signedTx });
      
      return {
        success: true,
        hash: result.hash,
      };
    } catch (error) {
      console.error("Error completing game:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new tournament
   */
  async createTournament(
    name: string,
    maxParticipants: number,
    entryFee: string,
    startTime: number,
    durationHours: number
  ) {
    if (!this.account) {
      throw new Error("Account not set. Call setAccount first.");
    }
    
    try {
      const transaction = await this.aptos.build.transaction({
        sender: this.account.address(),
        data: {
          function: `${CONTRACT_ADDRESS}::${TOURNAMENT_MODULE}::create_tournament`,
          typeArguments: [],
          functionArguments: [
            name,
            maxParticipants,
            new U64(Math.floor(parseFloat(entryFee) * 100000000)), // Convert to Octas
            startTime,
            durationHours,
          ],
        },
      });
      
      const signedTx = await this.account.signTransaction(transaction);
      const result = await this.aptos.submitTransaction({ transaction: signedTx });
      
      // Get tournament ID from transaction events
      const txnEvents = await this.aptos.getTransactionByHash({ transactionHash: result.hash });
      const tournamentCreatedEvent = txnEvents.events?.find(
        (e) => e.type === `${CONTRACT_ADDRESS}::${TOURNAMENT_MODULE}::TournamentCreatedEvent`
      );
      
      const tournamentId = tournamentCreatedEvent?.data?.tournament_id || 0;
      
      return {
        success: true,
        hash: result.hash,
        tournamentId,
      };
    } catch (error) {
      console.error("Error creating tournament:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Register for a tournament
   */
  async registerForTournament(tournamentId: number) {
    if (!this.account) {
      throw new Error("Account not set. Call setAccount first.");
    }
    
    try {
      const transaction = await this.aptos.build.transaction({
        sender: this.account.address(),
        data: {
          function: `${CONTRACT_ADDRESS}::${TOURNAMENT_MODULE}::register_for_tournament`,
          typeArguments: [],
          functionArguments: [tournamentId],
        },
      });
      
      const signedTx = await this.account.signTransaction(transaction);
      const result = await this.aptos.submitTransaction({ transaction: signedTx });
      
      return {
        success: true,
        hash: result.hash,
      };
    } catch (error) {
      console.error("Error registering for tournament:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Record match result in tournament
   * Note: This would typically be called by an admin or oracle service
   */
  async recordMatchResult(tournamentId: number, matchId: number, winner: AccountAddress) {
    if (!this.account) {
      throw new Error("Account not set. Call setAccount first.");
    }
    
    try {
      const transaction = await this.aptos.build.transaction({
        sender: this.account.address(),
        data: {
          function: `${CONTRACT_ADDRESS}::${TOURNAMENT_MODULE}::record_match_result`,
          typeArguments: [],
          functionArguments: [tournamentId, matchId, winner],
        },
      });
      
      const signedTx = await this.account.signTransaction(transaction);
      const result = await this.aptos.submitTransaction({ transaction: signedTx });
      
      return {
        success: true,
        hash: result.hash,
      };
    } catch (error) {
      console.error("Error recording match result:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process game achievements
   */
  async processGameAchievements(playerAddr: AccountAddress, gameId: number, gameType: number, isWinner: boolean) {
    if (!this.account) {
      throw new Error("Account not set. Call setAccount first.");
    }
    
    try {
      const transaction = await this.aptos.build.transaction({
        sender: this.account.address(),
        data: {
          function: `${CONTRACT_ADDRESS}::${REWARDS_MODULE}::process_game_achievements`,
          typeArguments: [],
          functionArguments: [playerAddr, gameId, gameType, isWinner],
        },
      });
      
      const signedTx = await this.account.signTransaction(transaction);
      const result = await this.aptos.submitTransaction({ transaction: signedTx });
      
      return {
        success: true,
        hash: result.hash,
      };
    } catch (error) {
      console.error("Error processing game achievements:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get player stats from the contract
   */
  async getPlayerStats(playerAddr: AccountAddress) {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::${ESCROW_MODULE}::get_player_stats`,
          typeArguments: [],
          functionArguments: [playerAddr],
        },
      });
      
      if (result && result.length >= 5) {
        return {
          totalGames: Number(result[0]),
          wins: Number(result[1]),
          losses: Number(result[2]),
          totalWagered: Number(result[3]) / 100000000, // Convert from Octas
          totalEarnings: Number(result[4]) / 100000000, // Convert from Octas
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting player stats:", error);
      return null;
    }
  }

  /**
   * Get player tournament stats
   */
  async getPlayerTournamentStats(playerAddr: AccountAddress) {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::${TOURNAMENT_MODULE}::get_player_tournament_stats`,
          typeArguments: [],
          functionArguments: [playerAddr],
        },
      });
      
      if (result && result.length >= 3) {
        return {
          tournamentsEntered: Number(result[0]),
          tournamentsWon: Number(result[1]),
          totalEarnings: Number(result[2]) / 100000000, // Convert from Octas
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting player tournament stats:", error);
      return null;
    }
  }

  /**
   * Get player achievements
   */
  async getPlayerAchievements(playerAddr: AccountAddress) {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::${REWARDS_MODULE}::get_player_achievements`,
          typeArguments: [],
          functionArguments: [playerAddr],
        },
      });
      
      if (result && result.length >= 2) {
        return {
          achievements: result[0], // Vector of achievement IDs
          totalPoints: Number(result[1]),
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting player achievements:", error);
      return null;
    }
  }
}

// Export singleton instance
export const contractService = new ContractService(); 