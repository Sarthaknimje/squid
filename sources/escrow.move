module squid_game::escrow {
    use std::error;
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::event;

    /// Error codes
    const ERR_NOT_INITIALIZED: u64 = 1;
    const ERR_ALREADY_INITIALIZED: u64 = 2;
    const ERR_GAME_EXISTS: u64 = 3; 
    const ERR_GAME_NOT_FOUND: u64 = 4;
    const ERR_LOW_BALANCE: u64 = 5;
    const ERR_NOT_PARTICIPANT: u64 = 6;
    const ERR_BAD_STATE: u64 = 7;
    const ERR_UNAUTHORIZED: u64 = 8;
    const ERR_BAD_WAGER: u64 = 9;
    const ERR_WAITING: u64 = 10;
    const ERR_DISPUTE_EXISTS: u64 = 11;
    const ERR_NOT_DONE: u64 = 12;
    const ERR_ZERO_WAGER: u64 = 13;
    const ERR_EXPIRATION: u64 = 14;
    const ERR_SELF_GAME: u64 = 15;
    const ERR_NOT_ADMIN: u64 = 16;

    /// Game states
    const STATE_CREATED: u8 = 0;
    const STATE_ACCEPTED: u8 = 1; 
    const STATE_ACTIVE: u8 = 2;
    const STATE_FINISHED: u8 = 3;
    const STATE_DISPUTED: u8 = 4;
    const STATE_VOIDED: u8 = 5;

    /// Game types
    const GAME_TYPE_ROCK_PAPER_SCISSORS: u8 = 1;
    const GAME_TYPE_SIMON_SAYS: u8 = 2;
    const GAME_TYPE_RED_LIGHT_GREEN_LIGHT: u8 = 3;
    const GAME_TYPE_TUG_OF_WAR: u8 = 4;
    const GAME_TYPE_CUSTOM: u8 = 99;

    /// Game data
    struct Game has store {
        game_id: u64,
        game_type: u8,
        player1: address,
        player2: address,
        wager_amount: u64,
        state: u8,
        winner: address,
        start_time: u64,
        end_time: u64,
        expiration_time: u64,
        dispute_by: address,
        dispute_reason: String,
        tournament_id: u64,
        commission_rate: u64, // In basis points (100 = 1%)
    }

    /// Tournament registry
    struct Tournament has key, store {
        tournament_id: u64,
        name: String,
        creator: address,
        total_prize: u64,
        participants: vector<address>,
        active_games: vector<u64>,
        completed_games: vector<u64>,
        start_time: u64,
        end_time: u64,
        commission_rate: u64,
    }

    /// Stores all games
    struct GameRegistry has key {
        games: vector<Game>,
        next_game_id: u64,
        next_tournament_id: u64,
        admin: address,
        treasury: address,
        platform_fee: u64, // In basis points (100 = 1%)
        total_games_created: u64,
        total_games_completed: u64,
        total_wager_volume: u64,
        total_commission_collected: u64,
        active_tournaments: vector<u64>,
    }

    /// Player records
    struct PlayerStats has key {
        addr: address,
        total_games: u64,
        wins: u64, 
        losses: u64,
        draws: u64,
        total_wagered: u64,
        total_earnings: u64,
        open_disputes: u64,
        tournaments_participated: vector<u64>,
        tournaments_won: vector<u64>,
        game_history: vector<u64>,
    }

    /// Resource account data - holds funds
    struct EscrowAccount has key {
        funds: Coin<AptosCoin>,
    }

    /// Events
    #[event]
    struct GameCreatedEvent has store, drop {
        game_id: u64,
        game_type: u8,
        player1: address,
        player2: address,
        wager_amount: u64,
        tournament_id: u64,
        timestamp: u64,
    }

    #[event]
    struct GameAcceptedEvent has store, drop {
        game_id: u64,
        player2: address,
        timestamp: u64,
    }

    #[event]
    struct GameCompletedEvent has store, drop {
        game_id: u64,
        winner: address,
        reward_amount: u64,
        timestamp: u64,
    }

    #[event]
    struct DisputeCreatedEvent has store, drop {
        game_id: u64,
        disputer: address,
        reason: String,
        timestamp: u64,
    }

    #[event]
    struct DisputeResolvedEvent has store, drop {
        game_id: u64,
        resolver: address,
        winner: address,
        timestamp: u64,
    }

    #[event]
    struct TournamentCreatedEvent has store, drop {
        tournament_id: u64,
        name: String,
        creator: address,
        prize_pool: u64,
        timestamp: u64,
    }

    /// =================== Module Initialization ===================

    /// Initialize module with the admin account
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        assert!(!exists<GameRegistry>(admin_addr), error::already_exists(ERR_ALREADY_INITIALIZED));
        
        // Create resource account for holding escrow funds
        let (resource_signer, resource_cap) = account::create_resource_account(admin, vector::empty<u8>());
        let resource_addr = signer::address_of(&resource_signer);
        
        move_to(admin, GameRegistry {
            games: vector::empty<Game>(),
            next_game_id: 0,
            next_tournament_id: 0,
            admin: admin_addr,
            treasury: resource_addr,
            platform_fee: 250, // 2.5% default platform fee
            total_games_created: 0,
            total_games_completed: 0,
            total_wager_volume: 0,
            total_commission_collected: 0,
            active_tournaments: vector::empty<u64>(),
        });
        
        move_to(&resource_signer, EscrowAccount {
            funds: coin::zero<AptosCoin>(),
        });
    }

    /// =================== Game Management Functions ===================

    /// Create a new game
    public entry fun create_game(
        player: &signer,
        opponent: address,
        wager_amount: u64,
        game_type: u8,
        tournament_id: u64,
    ) acquires GameRegistry, PlayerStats, EscrowAccount {
        let player_addr = signer::address_of(player);
        let registry_addr = @squid_game;
        
        // Validations
        assert!(exists<GameRegistry>(registry_addr), error::not_found(ERR_NOT_INITIALIZED));
        assert!(player_addr != opponent, error::invalid_argument(ERR_SELF_GAME));
        assert!(wager_amount > 0, error::invalid_argument(ERR_ZERO_WAGER));
        assert!(coin::balance<AptosCoin>(player_addr) >= wager_amount, error::invalid_argument(ERR_LOW_BALANCE));
        
        let registry = borrow_global_mut<GameRegistry>(registry_addr);
        let game_id = registry.next_game_id;
        
        // Set commission rate (use platform fee as default, can be overridden for tournaments)
        let commission_rate = registry.platform_fee;
        
        // Set expiration time (default 24 hours)
        let current_time = timestamp::now_seconds();
        let expiration_time = current_time + 86400; // 24 hours
        
        let new_game = Game {
            game_id,
            game_type,
            player1: player_addr,
            player2: opponent,
            wager_amount,
            state: STATE_CREATED,
            winner: @0x0,
            start_time: current_time,
            end_time: 0,
            expiration_time,
            dispute_by: @0x0,
            dispute_reason: string::utf8(b""),
            tournament_id,
            commission_rate,
        };
        
        // Transfer funds to escrow
        let escrow_account = borrow_global_mut<EscrowAccount>(registry.treasury);
        let coins = coin::withdraw<AptosCoin>(player, wager_amount);
        coin::merge(&mut escrow_account.funds, coins);
        
        // Update game registry
        vector::push_back(&mut registry.games, new_game);
        registry.next_game_id = game_id + 1;
        registry.total_games_created = registry.total_games_created + 1;
        registry.total_wager_volume = registry.total_wager_volume + wager_amount;
        
        // Create or update player stats
        if (!exists<PlayerStats>(player_addr)) {
            move_to(player, PlayerStats {
                addr: player_addr,
                total_games: 1,
                wins: 0,
                losses: 0,
                draws: 0,
                total_wagered: wager_amount,
                total_earnings: 0,
                open_disputes: 0,
                tournaments_participated: vector::empty<u64>(),
                tournaments_won: vector::empty<u64>(),
                game_history: vector::singleton(game_id),
            });
        } else {
            let player_stats = borrow_global_mut<PlayerStats>(player_addr);
            player_stats.total_games = player_stats.total_games + 1;
            player_stats.total_wagered = player_stats.total_wagered + wager_amount;
            vector::push_back(&mut player_stats.game_history, game_id);
        };
        
        // Emit game created event
        event::emit(GameCreatedEvent {
            game_id,
            game_type,
            player1: player_addr,
            player2: opponent,
            wager_amount,
            tournament_id,
            timestamp: current_time,
        });
    }

    /// Accept a game challenge
    public entry fun accept_game(
        player: &signer,
        game_id: u64,
    ) acquires GameRegistry, Game, PlayerStats, EscrowAccount {
        let player_addr = signer::address_of(player);
        let registry_addr = @squid_game;
        
        // Validations
        assert!(exists<GameRegistry>(registry_addr), error::not_found(ERR_NOT_INITIALIZED));
        
        let registry = borrow_global<GameRegistry>(registry_addr);
        assert!(game_id < registry.next_game_id, error::invalid_argument(ERR_GAME_NOT_FOUND));
        
        let game_index = find_game_index(registry_addr, game_id);
        assert!(game_index < vector::length(&registry.games), error::not_found(ERR_GAME_NOT_FOUND));
        
        let game = borrow_global_mut<Game>(registry_addr, game_id);
        assert!(game.player2 == player_addr, error::permission_denied(ERR_NOT_PARTICIPANT));
        assert!(game.state == STATE_CREATED, error::invalid_state(ERR_BAD_STATE));
        assert!(timestamp::now_seconds() < game.expiration_time, error::invalid_state(ERR_EXPIRATION));
        
        // Check if player has enough balance
        assert!(coin::balance<AptosCoin>(player_addr) >= game.wager_amount, error::invalid_argument(ERR_LOW_BALANCE));
        
        // Transfer funds to escrow
        let escrow_account = borrow_global_mut<EscrowAccount>(registry.treasury);
        let coins = coin::withdraw<AptosCoin>(player, game.wager_amount);
        coin::merge(&mut escrow_account.funds, coins);
        
        // Update game state
        game.state = STATE_ACTIVE;
        game.start_time = timestamp::now_seconds();
        
        // Update player stats
        if (!exists<PlayerStats>(player_addr)) {
            move_to(player, PlayerStats {
                addr: player_addr,
                total_games: 1,
                wins: 0,
                losses: 0,
                draws: 0,
                total_wagered: game.wager_amount,
                total_earnings: 0,
                open_disputes: 0,
                tournaments_participated: vector::empty<u64>(),
                tournaments_won: vector::empty<u64>(),
                game_history: vector::singleton(game_id),
            });
        } else {
            let player_stats = borrow_global_mut<PlayerStats>(player_addr);
            player_stats.total_games = player_stats.total_games + 1;
            player_stats.total_wagered = player_stats.total_wagered + game.wager_amount;
            vector::push_back(&mut player_stats.game_history, game_id);
        };
        
        // Emit game accepted event
        event::emit(GameAcceptedEvent {
            game_id,
            player2: player_addr,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Complete a game and distribute rewards
    public entry fun complete_game(
        admin: &signer,
        game_id: u64,
        winner_addr: address,
    ) acquires GameRegistry, Game, PlayerStats, EscrowAccount {
        let admin_addr = signer::address_of(admin);
        let registry_addr = @squid_game;
        
        // Validations
        assert!(exists<GameRegistry>(registry_addr), error::not_found(ERR_NOT_INITIALIZED));
        let registry = borrow_global<GameRegistry>(registry_addr);
        assert!(admin_addr == registry.admin, error::permission_denied(ERR_NOT_ADMIN));
        
        assert!(game_id < registry.next_game_id, error::invalid_argument(ERR_GAME_NOT_FOUND));
        let game_index = find_game_index(registry_addr, game_id);
        assert!(game_index < vector::length(&registry.games), error::not_found(ERR_GAME_NOT_FOUND));
        
        let game = borrow_global_mut<Game>(registry_addr, game_id);
        assert!(game.state == STATE_ACTIVE, error::invalid_state(ERR_BAD_STATE));
        
        // Validate winner is a participant
        assert!(winner_addr == game.player1 || winner_addr == game.player2 || winner_addr == @0x0, 
            error::invalid_argument(ERR_NOT_PARTICIPANT));
        
        // Update game state
        game.state = STATE_FINISHED;
        game.winner = winner_addr;
        game.end_time = timestamp::now_seconds();
        
        // Distribute rewards
        let treasury_addr = registry.treasury;
        let escrow_account = borrow_global_mut<EscrowAccount>(treasury_addr);
        
        let total_wager = game.wager_amount * 2;
        let commission_amount = (total_wager * game.commission_rate) / 10000;
        let reward_amount = total_wager - commission_amount;
        
        // Handle different outcomes
        if (winner_addr == @0x0) {
            // Draw - return funds to both players
            let refund = game.wager_amount;
            
            let player1_coins = coin::extract(&mut escrow_account.funds, refund);
            coin::deposit(game.player1, player1_coins);
            
            let player2_coins = coin::extract(&mut escrow_account.funds, refund);
            coin::deposit(game.player2, player2_coins);
            
            // Update player stats
            update_player_stats(game.player1, game_id, 0, 0, 1, 0);
            update_player_stats(game.player2, game_id, 0, 0, 1, 0);
        } else {
            // Winner takes all (minus commission)
            let loser_addr = if (winner_addr == game.player1) { game.player2 } else { game.player1 };
            
            let winner_coins = coin::extract(&mut escrow_account.funds, reward_amount);
            coin::deposit(winner_addr, winner_coins);
            
            // Update player stats
            update_player_stats(winner_addr, game_id, 1, 0, 0, reward_amount);
            update_player_stats(loser_addr, game_id, 0, 1, 0, 0);
        };
        
        // Update registry stats
        let registry_mut = borrow_global_mut<GameRegistry>(registry_addr);
        registry_mut.total_games_completed = registry_mut.total_games_completed + 1;
        registry_mut.total_commission_collected = registry_mut.total_commission_collected + commission_amount;
        
        // Emit game completed event
        event::emit(GameCompletedEvent {
            game_id,
            winner: winner_addr,
            reward_amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// File a dispute for a game
    public entry fun file_dispute(
        player: &signer,
        game_id: u64,
        reason: String,
    ) acquires GameRegistry, Game, PlayerStats {
        let player_addr = signer::address_of(player);
        let registry_addr = @squid_game;
        
        // Validations
        assert!(exists<GameRegistry>(registry_addr), error::not_found(ERR_NOT_INITIALIZED));
        
        let registry = borrow_global<GameRegistry>(registry_addr);
        assert!(game_id < registry.next_game_id, error::invalid_argument(ERR_GAME_NOT_FOUND));
        
        let game_index = find_game_index(registry_addr, game_id);
        assert!(game_index < vector::length(&registry.games), error::not_found(ERR_GAME_NOT_FOUND));
        
        let game = borrow_global_mut<Game>(registry_addr, game_id);
        assert!(game.player1 == player_addr || game.player2 == player_addr, 
            error::permission_denied(ERR_NOT_PARTICIPANT));
        assert!(game.state == STATE_ACTIVE || game.state == STATE_FINISHED, 
            error::invalid_state(ERR_BAD_STATE));
        assert!(game.dispute_by == @0x0, error::already_exists(ERR_DISPUTE_EXISTS));
        
        // Update game state
        game.state = STATE_DISPUTED;
        game.dispute_by = player_addr;
        game.dispute_reason = reason;
        
        // Update player stats
        let player_stats = borrow_global_mut<PlayerStats>(player_addr);
        player_stats.open_disputes = player_stats.open_disputes + 1;
        
        // Emit dispute created event
        event::emit(DisputeCreatedEvent {
            game_id,
            disputer: player_addr,
            reason,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Resolve a disputed game
    public entry fun resolve_dispute(
        admin: &signer,
        game_id: u64,
        winner_addr: address,
    ) acquires GameRegistry, Game, PlayerStats, EscrowAccount {
        let admin_addr = signer::address_of(admin);
        let registry_addr = @squid_game;
        
        // Validations
        assert!(exists<GameRegistry>(registry_addr), error::not_found(ERR_NOT_INITIALIZED));
        let registry = borrow_global<GameRegistry>(registry_addr);
        assert!(admin_addr == registry.admin, error::permission_denied(ERR_NOT_ADMIN));
        
        assert!(game_id < registry.next_game_id, error::invalid_argument(ERR_GAME_NOT_FOUND));
        let game_index = find_game_index(registry_addr, game_id);
        assert!(game_index < vector::length(&registry.games), error::not_found(ERR_GAME_NOT_FOUND));
        
        let game = borrow_global_mut<Game>(registry_addr, game_id);
        assert!(game.state == STATE_DISPUTED, error::invalid_state(ERR_BAD_STATE));
        
        // Validate winner is a participant or dispute voided
        assert!(winner_addr == game.player1 || winner_addr == game.player2 || winner_addr == @0x0, 
            error::invalid_argument(ERR_NOT_PARTICIPANT));
        
        // Get disputer's stats to update open disputes
        let disputer_stats = borrow_global_mut<PlayerStats>(game.dispute_by);
        disputer_stats.open_disputes = disputer_stats.open_disputes - 1;
        
        // Distribute rewards based on admin decision
        complete_game(admin, game_id, winner_addr);
        
        // Emit dispute resolved event
        event::emit(DisputeResolvedEvent {
            game_id,
            resolver: admin_addr,
            winner: winner_addr,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// =================== Tournament Functions ===================

    /// Create a new tournament
    public entry fun create_tournament(
        creator: &signer,
        name: String,
        prize_amount: u64,
        commission_rate: u64,
        duration_hours: u64,
    ) acquires GameRegistry, EscrowAccount {
        let creator_addr = signer::address_of(creator);
        let registry_addr = @squid_game;
        
        // Validations
        assert!(exists<GameRegistry>(registry_addr), error::not_found(ERR_NOT_INITIALIZED));
        assert!(prize_amount > 0, error::invalid_argument(ERR_ZERO_WAGER));
        assert!(coin::balance<AptosCoin>(creator_addr) >= prize_amount, error::invalid_argument(ERR_LOW_BALANCE));
        
        let registry = borrow_global_mut<GameRegistry>(registry_addr);
        let tournament_id = registry.next_tournament_id;
        
        // Calculate start and end times
        let current_time = timestamp::now_seconds();
        let end_time = current_time + (duration_hours * 3600);
        
        // Create tournament
        let new_tournament = Tournament {
            tournament_id,
            name,
            creator: creator_addr,
            total_prize: prize_amount,
            participants: vector::empty<address>(),
            active_games: vector::empty<u64>(),
            completed_games: vector::empty<u64>(),
            start_time: current_time,
            end_time,
            commission_rate,
        };
        
        move_to(creator, new_tournament);
        
        // Transfer prize funds to escrow
        let escrow_account = borrow_global_mut<EscrowAccount>(registry.treasury);
        let coins = coin::withdraw<AptosCoin>(creator, prize_amount);
        coin::merge(&mut escrow_account.funds, coins);
        
        // Update registry
        registry.next_tournament_id = tournament_id + 1;
        vector::push_back(&mut registry.active_tournaments, tournament_id);
        
        // Emit tournament created event
        event::emit(TournamentCreatedEvent {
            tournament_id,
            name,
            creator: creator_addr,
            prize_pool: prize_amount,
            timestamp: current_time,
        });
    }

    /// =================== Helper Functions ===================

    /// Find the index of a game in the registry
    fun find_game_index(registry_addr: address, game_id: u64): u64 acquires GameRegistry {
        let registry = borrow_global<GameRegistry>(registry_addr);
        let i = 0;
        let len = vector::length(&registry.games);
        
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.game_id == game_id) {
                return i
            };
            i = i + 1;
        };
        
        return len // Not found
    }

    /// Get a game by ID (view function)
    #[view]
    public fun get_game(game_id: u64): (address, address, u64, u8, address, u64, u64) acquires GameRegistry, Game {
        let registry_addr = @squid_game;
        assert!(exists<GameRegistry>(registry_addr), error::not_found(ERR_NOT_INITIALIZED));
        
        let registry = borrow_global<GameRegistry>(registry_addr);
        assert!(game_id < registry.next_game_id, error::invalid_argument(ERR_GAME_NOT_FOUND));
        
        let game_index = find_game_index(registry_addr, game_id);
        assert!(game_index < vector::length(&registry.games), error::not_found(ERR_GAME_NOT_FOUND));
        
        let game = borrow_global<Game>(registry_addr, game_id);
        
        (
            game.player1,
            game.player2,
            game.wager_amount,
            game.state,
            game.winner,
            game.start_time,
            game.end_time
        )
    }

    /// Update player stats
    fun update_player_stats(
        player_addr: address,
        game_id: u64,
        wins_to_add: u64,
        losses_to_add: u64,
        draws_to_add: u64,
        earnings_to_add: u64
    ) acquires PlayerStats {
        if (exists<PlayerStats>(player_addr)) {
            let player_stats = borrow_global_mut<PlayerStats>(player_addr);
            player_stats.wins = player_stats.wins + wins_to_add;
            player_stats.losses = player_stats.losses + losses_to_add;
            player_stats.draws = player_stats.draws + draws_to_add;
            player_stats.total_earnings = player_stats.total_earnings + earnings_to_add;
        };
    }

    /// Get player stats (view function)
    #[view]
    public fun get_player_stats(player_addr: address): (u64, u64, u64, u64, u64) acquires PlayerStats {
        if (!exists<PlayerStats>(player_addr)) {
            return (0, 0, 0, 0, 0)
        };
        
        let stats = borrow_global<PlayerStats>(player_addr);
        (
            stats.total_games,
            stats.wins,
            stats.losses,
            stats.total_wagered,
            stats.total_earnings
        )
    }

    /// Get platform statistics (view function)
    #[view]
    public fun get_platform_stats(registry_addr: address): (u64, u64, u64, u64) acquires GameRegistry {
        assert!(exists<GameRegistry>(registry_addr), error::not_found(ERR_NOT_INITIALIZED));
        
        let registry = borrow_global<GameRegistry>(registry_addr);
        (
            registry.total_games_created,
            registry.total_games_completed,
            registry.total_wager_volume,
            registry.total_commission_collected
        )
    }
} 