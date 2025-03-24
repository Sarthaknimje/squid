//chess_escrow/sources/chess_escrow.move

module chess_escrow::escrow {
     use std::error;
     use std::signer;
     use std::vector;
     use aptos_framework::coin::{Self, Coin};
     use aptos_framework::aptos_coin::AptosCoin;
     use aptos_framework::timestamp;
     use aptos_framework::account;
 
     /// Error codes
     const E_NOT_INITIALIZED: u64 = 1;
     const E_GAME_ALREADY_EXISTS: u64 = 2;
     const E_GAME_NOT_FOUND: u64 = 3;
     const E_INSUFFICIENT_BALANCE: u64 = 4;
     const E_NOT_GAME_PLAYER: u64 = 5;
     const E_INVALID_STATE_TRANSITION: u64 = 6;
     const E_NOT_AUTHORIZED: u64 = 7;
     const E_INVALID_STAKE_AMOUNT: u64 = 8;
     const E_WAITING_FOR_OPPONENT: u64 = 9;
     const E_DISPUTE_ALREADY_FILED: u64 = 10;
     const E_GAME_NOT_COMPLETED: u64 = 11;
 
     /// Game status enum
     const STATUS_PENDING: u8 = 0;
     const STATUS_FUNDED: u8 = 1;
     const STATUS_PLAYING: u8 = 2;
     const STATUS_COMPLETED: u8 = 3;
     const STATUS_DISPUTED: u8 = 4;
     const STATUS_CANCELLED: u8 = 5;
 
     /// Game data structure
     struct ChessGame has store {
         game_id: u64,
         white_player: address,
         black_player: address,
         stake_amount: u64,
         status: u8,
         winner: address,
         start_time: u64,
         end_time: u64,
         dispute_filed_by: address,
         dispute_reason: vector<u8>,
     }
 
     /// GameStore holds all games
     struct GameStore has key {
         games: vector<ChessGame>,
         next_game_id: u64,
     }
 
     /// Player stats
     struct PlayerStats has key {
         address: address,
         games_played: u64,
         games_won: u64,
         total_earnings: u64,
         active_disputes: u64,
     }
 
     /// Module initialization
     public fun init_module(admin: &signer) {
         let admin_addr = signer::address_of(admin);
         
         if (!exists<GameStore>(admin_addr)) {
             move_to(admin, GameStore {
                 games: vector::empty<ChessGame>(),
                 next_game_id: 0,
             });
         };
     }
 
     /// Creates a new chess game with stake
     public entry fun create_game(
         player: &signer,
         opponent: address,
         stake_amount: u64,
     ) acquires GameStore {
         let player_addr = signer::address_of(player);
         let resource_account = @chess_escrow;
         
         assert!(coin::balance<AptosCoin>(player_addr) >= stake_amount, error::invalid_argument(E_INSUFFICIENT_BALANCE));
         assert!(stake_amount > 0, error::invalid_argument(E_INVALID_STAKE_AMOUNT));
         
         let game_store = borrow_global_mut<GameStore>(resource_account);
         let game_id = game_store.next_game_id;
         
         let new_game = ChessGame {
             game_id,
             white_player: player_addr,
             black_player: opponent,
             stake_amount,
             status: STATUS_PENDING,
             winner: @0x0,
             start_time: 0,
             end_time: 0,
             dispute_filed_by: @0x0,
             dispute_reason: vector::empty<u8>(),
         };
         
         // Transfer stake to module
         let coins = coin::withdraw<AptosCoin>(player, stake_amount);
         coin::deposit(resource_account, coins);
         
         vector::push_back(&mut game_store.games, new_game);
         game_store.next_game_id = game_id + 1;
         
         // Initialize player stats if they don't exist
         if (!exists<PlayerStats>(player_addr)) {
             move_to(player, PlayerStats {
                 address: player_addr,
                 games_played: 0,
                 games_won: 0,
                 total_earnings: 0,
                 active_disputes: 0,
             });
         };
     }
 
     /// Opponent accepts game and deposits stake
     public entry fun accept_game(
         player: &signer,
         game_id: u64,
     ) acquires GameStore {
         let player_addr = signer::address_of(player);
         let resource_account = @chess_escrow;
         
         let game_store = borrow_global_mut<GameStore>(resource_account);
         let game_exists = false;
         let game_idx = 0;
         
         let i = 0;
         let len = vector::length(&game_store.games);
         while (i < len) {
             let game = vector::borrow(&game_store.games, i);
             if (game.game_id == game_id) {
                 game_exists = true;
                 game_idx = i;
                 break
             };
             i = i + 1;
         };
         
         assert!(game_exists, error::not_found(E_GAME_NOT_FOUND));
         
         let game = vector::borrow_mut(&mut game_store.games, game_idx);
         assert!(game.black_player == player_addr, error::permission_denied(E_NOT_GAME_PLAYER));
         assert!(game.status == STATUS_PENDING, error::invalid_state(E_INVALID_STATE_TRANSITION));
         
         // Verify player has enough balance
         assert!(coin::balance<AptosCoin>(player_addr) >= game.stake_amount, error::invalid_argument(E_INSUFFICIENT_BALANCE));
         
         // Transfer stake to module
         let coins = coin::withdraw<AptosCoin>(player, game.stake_amount);
         coin::deposit(resource_account, coins);
         
         // Update game status
         game.status = STATUS_FUNDED;
         game.start_time = timestamp::now_seconds();
         
         // Initialize player stats if they don't exist
         if (!exists<PlayerStats>(player_addr)) {
             move_to(player, PlayerStats {
                 address: player_addr,
                 games_played: 0,
                 games_won: 0,
                 total_earnings: 0,
                 active_disputes: 0,
             });
         };
     }
 
     /// Record game result
     public entry fun record_game_result(
         player: &signer,
         game_id: u64,
         winner_addr: address,
     ) acquires GameStore, PlayerStats {
         let player_addr = signer::address_of(player);
         let resource_account = @chess_escrow;
         
         let game_store = borrow_global_mut<GameStore>(resource_account);
         let game_exists = false;
         let game_idx = 0;
         
         let i = 0;
         let len = vector::length(&game_store.games);
         while (i < len) {
             let game = vector::borrow(&game_store.games, i);
             if (game.game_id == game_id) {
                 game_exists = true;
                 game_idx = i;
                 break
             };
             i = i + 1;
         };
         
         assert!(game_exists, error::not_found(E_GAME_NOT_FOUND));
         
         let game = vector::borrow_mut(&mut game_store.games, game_idx);
         assert!(
             game.white_player == player_addr || game.black_player == player_addr,
             error::permission_denied(E_NOT_GAME_PLAYER)
         );
         assert!(
             game.status == STATUS_FUNDED || game.status == STATUS_PLAYING,
             error::invalid_state(E_INVALID_STATE_TRANSITION)
         );
         assert!(
             winner_addr == game.white_player || winner_addr == game.black_player,
             error::invalid_argument(E_NOT_GAME_PLAYER)
         );
         
         // Update game status
         game.status = STATUS_COMPLETED;
         game.winner = winner_addr;
         game.end_time = timestamp::now_seconds();
         
         // Update player stats
         let winner_stats = borrow_global_mut<PlayerStats>(winner_addr);
         winner_stats.games_played = winner_stats.games_played + 1;
         winner_stats.games_won = winner_stats.games_won + 1;
         winner_stats.total_earnings = winner_stats.total_earnings + (game.stake_amount * 2);
         
         let loser_addr = if (winner_addr == game.white_player) { game.black_player } else { game.white_player };
         let loser_stats = borrow_global_mut<PlayerStats>(loser_addr);
         loser_stats.games_played = loser_stats.games_played + 1;
         
         // Transfer prize to winner
         coin::transfer<AptosCoin>(resource_account, winner_addr, game.stake_amount * 2);
     }
 
     /// File a dispute
     public entry fun file_dispute(
         player: &signer,
         game_id: u64,
         reason: vector<u8>,
     ) acquires GameStore, PlayerStats {
         let player_addr = signer::address_of(player);
         let resource_account = @chess_escrow;
         
         let game_store = borrow_global_mut<GameStore>(resource_account);
         let game_exists = false;
         let game_idx = 0;
         
         let i = 0;
         let len = vector::length(&game_store.games);
         while (i < len) {
             let game = vector::borrow(&game_store.games, i);
             if (game.game_id == game_id) {
                 game_exists = true;
                 game_idx = i;
                 break
             };
             i = i + 1;
         };
         
         assert!(game_exists, error::not_found(E_GAME_NOT_FOUND));
         
         let game = vector::borrow_mut(&mut game_store.games, game_idx);
         assert!(
             game.white_player == player_addr || game.black_player == player_addr,
             error::permission_denied(E_NOT_GAME_PLAYER)
         );
         assert!(
             game.status == STATUS_FUNDED || game.status == STATUS_PLAYING || game.status == STATUS_COMPLETED,
             error::invalid_state(E_INVALID_STATE_TRANSITION)
         );
         assert!(
             game.dispute_filed_by == @0x0,
             error::already_exists(E_DISPUTE_ALREADY_FILED)
         );
         
         // Update game status
         game.status = STATUS_DISPUTED;
         game.dispute_filed_by = player_addr;
         game.dispute_reason = reason;
         
         // Update player stats
         let player_stats = borrow_global_mut<PlayerStats>(player_addr);
         player_stats.active_disputes = player_stats.active_disputes + 1;
     }
 
     /// Resolve dispute by admin
     public entry fun resolve_dispute(
         admin: &signer,
         game_id: u64,
         winner_addr: address,
     ) acquires GameStore, PlayerStats {
         let admin_addr = signer::address_of(admin);
         assert!(admin_addr == @chess_escrow, error::permission_denied(E_NOT_AUTHORIZED));
         
         let resource_account = @chess_escrow;
         let game_store = borrow_global_mut<GameStore>(resource_account);
         let game_exists = false;
         let game_idx = 0;
         
         let i = 0;
         let len = vector::length(&game_store.games);
         while (i < len) {
             let game = vector::borrow(&game_store.games, i);
             if (game.game_id == game_id) {
                 game_exists = true;
                 game_idx = i;
                 break
             };
             i = i + 1;
         };
         
         assert!(game_exists, error::not_found(E_GAME_NOT_FOUND));
         
         let game = vector::borrow_mut(&mut game_store.games, game_idx);
         assert!(game.status == STATUS_DISPUTED, error::invalid_state(E_INVALID_STATE_TRANSITION));
         assert!(
             winner_addr == game.white_player || winner_addr == game.black_player,
             error::invalid_argument(E_NOT_GAME_PLAYER)
         );
         
         // Update game status
         game.status = STATUS_COMPLETED;
         game.winner = winner_addr;
         game.end_time = timestamp::now_seconds();
         
         // Update player stats
         let dispute_filer = game.dispute_filed_by;
         let dispute_filer_stats = borrow_global_mut<PlayerStats>(dispute_filer);
         dispute_filer_stats.active_disputes = dispute_filer_stats.active_disputes - 1;
         
         let winner_stats = borrow_global_mut<PlayerStats>(winner_addr);
         winner_stats.games_won = winner_stats.games_won + 1;
         winner_stats.total_earnings = winner_stats.total_earnings + (game.stake_amount * 2);
         
         // Transfer prize to winner
         coin::transfer<AptosCoin>(resource_account, winner_addr, game.stake_amount * 2);
     }
 
     /// Cancel game and refund if opponent hasn't joined
     public entry fun cancel_game(
         player: &signer,
         game_id: u64,
     ) acquires GameStore {
         let player_addr = signer::address_of(player);
         let resource_account = @chess_escrow;
         
         let game_store = borrow_global_mut<GameStore>(resource_account);
         let game_exists = false;
         let game_idx = 0;
         
         let i = 0;
         let len = vector::length(&game_store.games);
         while (i < len) {
             let game = vector::borrow(&game_store.games, i);
             if (game.game_id == game_id) {
                 game_exists = true;
                 game_idx = i;
                 break
             };
             i = i + 1;
         };
         
         assert!(game_exists, error::not_found(E_GAME_NOT_FOUND));
         
         let game = vector::borrow_mut(&mut game_store.games, game_idx);
         assert!(game.white_player == player_addr, error::permission_denied(E_NOT_GAME_PLAYER));
         assert!(game.status == STATUS_PENDING, error::invalid_state(E_INVALID_STATE_TRANSITION));
         
         // Update game status
         game.status = STATUS_CANCELLED;
         
         // Refund stake to player
         coin::transfer<AptosCoin>(resource_account, player_addr, game.stake_amount);
     }
 
     /// Get player stats
     public fun get_player_stats(player_addr: address): (u64, u64, u64, u64) acquires PlayerStats {
         assert!(exists<PlayerStats>(player_addr), error::not_found(E_NOT_INITIALIZED));
         
         let stats = borrow_global<PlayerStats>(player_addr);
         (stats.games_played, stats.games_won, stats.total_earnings, stats.active_disputes)
     }
 
     /// Check if game exists and get its status
     public fun get_game_status(game_id: u64): (bool, u8) acquires GameStore {
         let resource_account = @chess_escrow;
         
         if (!exists<GameStore>(resource_account)) {
             return (false, 0)
         };
         
         let game_store = borrow_global<GameStore>(resource_account);
         let game_exists = false;
         let status = 0;
         
         let i = 0;
         let len = vector::length(&game_store.games);
         while (i < len) {
             let game = vector::borrow(&game_store.games, i);
             if (game.game_id == game_id) {
                 game_exists = true;
                 status = game.status;
                 break
             };
             i = i + 1;
         };
         
         (game_exists, status)
     }
 }