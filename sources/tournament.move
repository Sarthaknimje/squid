module squid_game::tournament {
    use std::error;
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use squid_game::escrow;

    /// Error codes
    const ERR_NOT_INITIALIZED: u64 = 1;
    const ERR_ALREADY_INITIALIZED: u64 = 2;
    const ERR_TOURNAMENT_EXISTS: u64 = 3;
    const ERR_TOURNAMENT_NOT_FOUND: u64 = 4;
    const ERR_NOT_ADMIN: u64 = 5;
    const ERR_UNAUTHORIZED: u64 = 6;
    const ERR_TOURNAMENT_FULL: u64 = 7;
    const ERR_ALREADY_REGISTERED: u64 = 8;
    const ERR_REGISTRATION_CLOSED: u64 = 9;
    const ERR_TOURNAMENT_ACTIVE: u64 = 10;
    const ERR_TOURNAMENT_INACTIVE: u64 = 11;
    const ERR_LOW_BALANCE: u64 = 12;
    const ERR_TOURNAMENT_ENDED: u64 = 13;
    const ERR_INVALID_MATCH: u64 = 14;

    /// Tournament status
    const TOURNAMENT_REGISTRATION: u8 = 0;
    const TOURNAMENT_ACTIVE: u8 = 1;
    const TOURNAMENT_COMPLETED: u8 = 2;
    const TOURNAMENT_CANCELLED: u8 = 3;

    /// Match status
    const MATCH_PENDING: u8 = 0;
    const MATCH_ACTIVE: u8 = 1;
    const MATCH_COMPLETED: u8 = 2;
    const MATCH_CANCELLED: u8 = 3;

    /// Tournament configuration
    struct TournamentConfig has key {
        admin: address,
        next_tournament_id: u64,
        active_tournaments: vector<u64>,
        platform_fee: u64, // In basis points (100 = 1%)
        total_tournaments_created: u64,
    }

    /// Tournament data
    struct Tournament has key, store {
        tournament_id: u64,
        name: String,
        creator: address,
        status: u8,
        max_participants: u64,
        entry_fee: u64,
        prize_pool: u64,
        start_time: u64,
        end_time: u64,
        participants: vector<address>,
        matches: vector<Match>,
        rounds: u64,
        current_round: u64,
        winner: address,
    }

    /// Match data
    struct Match has store {
        match_id: u64,
        tournament_id: u64,
        round: u64,
        player1: address,
        player2: address,
        status: u8,
        winner: address,
        game_id: u64,
        start_time: u64,
        end_time: u64,
    }

    /// Player tournament data
    struct PlayerTournament has key {
        tournaments_entered: vector<u64>,
        tournaments_won: vector<u64>,
        total_tournament_earnings: u64,
        active_tournament: u64,
    }

    /// Events
    #[event]
    struct TournamentCreatedEvent has store, drop {
        tournament_id: u64,
        name: String,
        creator: address,
        max_participants: u64,
        entry_fee: u64,
        prize_pool: u64,
        start_time: u64,
        timestamp: u64,
    }

    #[event]
    struct TournamentStatusChangedEvent has store, drop {
        tournament_id: u64,
        old_status: u8,
        new_status: u8,
        timestamp: u64,
    }

    #[event] 
    struct PlayerRegisteredEvent has store, drop {
        tournament_id: u64,
        player: address,
        timestamp: u64,
    }

    #[event]
    struct MatchCreatedEvent has store, drop {
        tournament_id: u64,
        match_id: u64,
        round: u64,
        player1: address,
        player2: address,
        timestamp: u64,
    }

    #[event]
    struct MatchCompletedEvent has store, drop {
        tournament_id: u64,
        match_id: u64,
        winner: address,
        timestamp: u64,
    }

    #[event]
    struct TournamentCompletedEvent has store, drop {
        tournament_id: u64,
        winner: address,
        prize_amount: u64,
        timestamp: u64,
    }

    /// Initialize module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        assert!(!exists<TournamentConfig>(admin_addr), error::already_exists(ERR_ALREADY_INITIALIZED));
        
        move_to(admin, TournamentConfig {
            admin: admin_addr,
            next_tournament_id: 0,
            active_tournaments: vector::empty<u64>(),
            platform_fee: 250, // 2.5% default
            total_tournaments_created: 0,
        });
    }

    /// Create a new tournament
    public entry fun create_tournament(
        creator: &signer,
        name: String,
        max_participants: u64,
        entry_fee: u64,
        start_time: u64,
        duration_hours: u64,
    ) acquires TournamentConfig {
        let creator_addr = signer::address_of(creator);
        let config_addr = @squid_game;
        
        assert!(exists<TournamentConfig>(config_addr), error::not_found(ERR_NOT_INITIALIZED));
        
        let config = borrow_global_mut<TournamentConfig>(config_addr);
        let tournament_id = config.next_tournament_id;
        
        // Calculate prize pool (entry fee * max participants - platform fee)
        let total_fees = entry_fee * max_participants;
        let platform_fee_amount = (total_fees * config.platform_fee) / 10000;
        let prize_pool = total_fees - platform_fee_amount;
        
        // Calculate end time
        let end_time = start_time + (duration_hours * 3600);
        
        // Create tournament
        let new_tournament = Tournament {
            tournament_id,
            name,
            creator: creator_addr,
            status: TOURNAMENT_REGISTRATION,
            max_participants,
            entry_fee,
            prize_pool,
            start_time,
            end_time,
            participants: vector::empty<address>(),
            matches: vector::empty<Match>(),
            rounds: 0,
            current_round: 0,
            winner: @0x0,
        };
        
        move_to(creator, new_tournament);
        
        // Update config
        config.next_tournament_id = tournament_id + 1;
        vector::push_back(&mut config.active_tournaments, tournament_id);
        config.total_tournaments_created = config.total_tournaments_created + 1;
        
        // Emit event
        event::emit(TournamentCreatedEvent {
            tournament_id,
            name,
            creator: creator_addr,
            max_participants,
            entry_fee,
            prize_pool,
            start_time,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Register for a tournament
    public entry fun register_for_tournament(
        player: &signer,
        tournament_id: u64,
    ) acquires Tournament, PlayerTournament, TournamentConfig {
        let player_addr = signer::address_of(player);
        
        // Get tournament
        let tournament_addr = find_tournament_address(tournament_id);
        let tournament = borrow_global_mut<Tournament>(tournament_addr);
        
        // Validations
        assert!(tournament.status == TOURNAMENT_REGISTRATION, error::invalid_state(ERR_REGISTRATION_CLOSED));
        assert!(vector::length(&tournament.participants) < tournament.max_participants, error::invalid_state(ERR_TOURNAMENT_FULL));
        assert!(!vector::contains(&tournament.participants, &player_addr), error::already_exists(ERR_ALREADY_REGISTERED));
        assert!(coin::balance<AptosCoin>(player_addr) >= tournament.entry_fee, error::invalid_argument(ERR_LOW_BALANCE));
        
        // Add player to tournament
        vector::push_back(&mut tournament.participants, player_addr);
        
        // Update player tournament data
        if (!exists<PlayerTournament>(player_addr)) {
            move_to(player, PlayerTournament {
                tournaments_entered: vector::singleton(tournament_id),
                tournaments_won: vector::empty<u64>(),
                total_tournament_earnings: 0,
                active_tournament: tournament_id,
            });
        } else {
            let player_tournament = borrow_global_mut<PlayerTournament>(player_addr);
            vector::push_back(&mut player_tournament.tournaments_entered, tournament_id);
            player_tournament.active_tournament = tournament_id;
        };
        
        // Transfer entry fee to escrow
        // Note: In a real implementation, this would involve interacting with the escrow module
        
        // Emit event
        event::emit(PlayerRegisteredEvent {
            tournament_id,
            player: player_addr,
            timestamp: timestamp::now_seconds(),
        });
        
        // Check if tournament is full and should start
        if (vector::length(&tournament.participants) == tournament.max_participants) {
            start_tournament(tournament_id);
        };
    }

    /// Start a tournament
    public entry fun start_tournament(tournament_id: u64) acquires Tournament, TournamentConfig {
        // Get tournament
        let tournament_addr = find_tournament_address(tournament_id);
        let tournament = borrow_global_mut<Tournament>(tournament_addr);
        
        // Validations
        assert!(tournament.status == TOURNAMENT_REGISTRATION, error::invalid_state(ERR_TOURNAMENT_ACTIVE));
        
        // Update tournament status
        let old_status = tournament.status;
        tournament.status = TOURNAMENT_ACTIVE;
        tournament.start_time = timestamp::now_seconds();
        
        // Calculate number of rounds based on participants
        let participant_count = vector::length(&tournament.participants);
        tournament.rounds = calculate_rounds(participant_count);
        tournament.current_round = 1;
        
        // Generate first round matches
        generate_matches(tournament);
        
        // Emit event
        event::emit(TournamentStatusChangedEvent {
            tournament_id,
            old_status,
            new_status: TOURNAMENT_ACTIVE,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Record a match result
    public entry fun record_match_result(
        admin: &signer,
        tournament_id: u64,
        match_id: u64,
        winner_addr: address,
    ) acquires Tournament, TournamentConfig, PlayerTournament {
        let admin_addr = signer::address_of(admin);
        let config_addr = @squid_game;
        
        assert!(exists<TournamentConfig>(config_addr), error::not_found(ERR_NOT_INITIALIZED));
        let config = borrow_global<TournamentConfig>(config_addr);
        assert!(admin_addr == config.admin, error::permission_denied(ERR_NOT_ADMIN));
        
        // Get tournament
        let tournament_addr = find_tournament_address(tournament_id);
        let tournament = borrow_global_mut<Tournament>(tournament_addr);
        
        // Validations
        assert!(tournament.status == TOURNAMENT_ACTIVE, error::invalid_state(ERR_TOURNAMENT_INACTIVE));
        
        // Find and update match
        let match_index = find_match_index(tournament, match_id);
        let match = vector::borrow_mut(&mut tournament.matches, match_index);
        
        assert!(match.status == MATCH_ACTIVE, error::invalid_state(ERR_INVALID_MATCH));
        assert!(match.player1 == winner_addr || match.player2 == winner_addr, error::invalid_argument(ERR_UNAUTHORIZED));
        
        // Update match
        match.status = MATCH_COMPLETED;
        match.winner = winner_addr;
        match.end_time = timestamp::now_seconds();
        
        // Emit event
        event::emit(MatchCompletedEvent {
            tournament_id,
            match_id,
            winner: winner_addr,
            timestamp: timestamp::now_seconds(),
        });
        
        // Check if round is complete
        if (is_round_complete(tournament)) {
            // Advance to next round or complete tournament
            if (tournament.current_round < tournament.rounds) {
                // Advance to next round
                tournament.current_round = tournament.current_round + 1;
                generate_matches(tournament);
            } else {
                // Tournament complete - winner is the last match winner
                complete_tournament(tournament_id, winner_addr);
            };
        };
    }

    /// Complete a tournament
    public entry fun complete_tournament(
        tournament_id: u64,
        winner_addr: address,
    ) acquires Tournament, TournamentConfig, PlayerTournament {
        // Get tournament
        let tournament_addr = find_tournament_address(tournament_id);
        let tournament = borrow_global_mut<Tournament>(tournament_addr);
        
        // Validations
        assert!(tournament.status == TOURNAMENT_ACTIVE, error::invalid_state(ERR_TOURNAMENT_INACTIVE));
        
        // Update tournament
        let old_status = tournament.status;
        tournament.status = TOURNAMENT_COMPLETED;
        tournament.winner = winner_addr;
        tournament.end_time = timestamp::now_seconds();
        
        // Update winner's stats
        if (exists<PlayerTournament>(winner_addr)) {
            let player_tournament = borrow_global_mut<PlayerTournament>(winner_addr);
            vector::push_back(&mut player_tournament.tournaments_won, tournament_id);
            player_tournament.total_tournament_earnings = player_tournament.total_tournament_earnings + tournament.prize_pool;
            player_tournament.active_tournament = 0;
        };
        
        // Remove from active tournaments
        let config_addr = @squid_game;
        let config = borrow_global_mut<TournamentConfig>(config_addr);
        let active_index = vector::index_of(&config.active_tournaments, &tournament_id);
        if (active_index < vector::length(&config.active_tournaments)) {
            vector::remove(&mut config.active_tournaments, active_index);
        };
        
        // Emit events
        event::emit(TournamentStatusChangedEvent {
            tournament_id,
            old_status,
            new_status: TOURNAMENT_COMPLETED,
            timestamp: timestamp::now_seconds(),
        });
        
        event::emit(TournamentCompletedEvent {
            tournament_id,
            winner: winner_addr,
            prize_amount: tournament.prize_pool,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// =================== Helper Functions ===================

    /// Find tournament owner address
    fun find_tournament_address(tournament_id: u64): address acquires TournamentConfig {
        let config_addr = @squid_game;
        assert!(exists<TournamentConfig>(config_addr), error::not_found(ERR_NOT_INITIALIZED));
        
        // In a real implementation, we'd have a mapping or other efficient lookup
        // This is a simplified version that would need enhancement for production
        @squid_game
    }

    /// Calculate number of tournament rounds
    fun calculate_rounds(participant_count: u64): u64 {
        let rounds = 0;
        let slots = 1;
        
        while (slots < participant_count) {
            slots = slots * 2;
            rounds = rounds + 1;
        };
        
        rounds
    }

    /// Generate matches for the current round
    fun generate_matches(tournament: &mut Tournament) {
        let round = tournament.current_round;
        let player_count = vector::length(&tournament.participants);
        
        // For the first round, match players sequentially
        if (round == 1) {
            let i = 0;
            let match_id = 0;
            
            while (i + 1 < player_count) {
                let player1 = *vector::borrow(&tournament.participants, i);
                let player2 = *vector::borrow(&tournament.participants, i + 1);
                
                let new_match = Match {
                    match_id,
                    tournament_id: tournament.tournament_id,
                    round,
                    player1,
                    player2,
                    status: MATCH_ACTIVE,
                    winner: @0x0,
                    game_id: 0, // This would connect to the escrow game
                    start_time: timestamp::now_seconds(),
                    end_time: 0,
                };
                
                vector::push_back(&mut tournament.matches, new_match);
                
                // Emit event
                event::emit(MatchCreatedEvent {
                    tournament_id: tournament.tournament_id,
                    match_id,
                    round,
                    player1,
                    player2,
                    timestamp: timestamp::now_seconds(),
                });
                
                match_id = match_id + 1;
                i = i + 2;
            };
        } else {
            // For subsequent rounds, match winners from previous round
            let winners = get_round_winners(tournament, round - 1);
            let winner_count = vector::length(&winners);
            let match_id = vector::length(&tournament.matches);
            
            let i = 0;
            while (i + 1 < winner_count) {
                let player1 = *vector::borrow(&winners, i);
                let player2 = *vector::borrow(&winners, i + 1);
                
                let new_match = Match {
                    match_id,
                    tournament_id: tournament.tournament_id,
                    round,
                    player1,
                    player2,
                    status: MATCH_ACTIVE,
                    winner: @0x0,
                    game_id: 0, // This would connect to the escrow game
                    start_time: timestamp::now_seconds(),
                    end_time: 0,
                };
                
                vector::push_back(&mut tournament.matches, new_match);
                
                // Emit event
                event::emit(MatchCreatedEvent {
                    tournament_id: tournament.tournament_id,
                    match_id,
                    round,
                    player1,
                    player2,
                    timestamp: timestamp::now_seconds(),
                });
                
                match_id = match_id + 1;
                i = i + 2;
            };
        };
    }

    /// Find match index in tournament matches
    fun find_match_index(tournament: &Tournament, match_id: u64): u64 {
        let i = 0;
        let len = vector::length(&tournament.matches);
        
        while (i < len) {
            let match = vector::borrow(&tournament.matches, i);
            if (match.match_id == match_id) {
                return i
            };
            i = i + 1;
        };
        
        len // Not found
    }

    /// Check if all matches in the current round are complete
    fun is_round_complete(tournament: &Tournament): bool {
        let round = tournament.current_round;
        let i = 0;
        let len = vector::length(&tournament.matches);
        
        while (i < len) {
            let match = vector::borrow(&tournament.matches, i);
            if (match.round == round && match.status != MATCH_COMPLETED) {
                return false
            };
            i = i + 1;
        };
        
        true
    }

    /// Get winners from a specific round
    fun get_round_winners(tournament: &Tournament, round: u64): vector<address> {
        let winners = vector::empty<address>();
        let i = 0;
        let len = vector::length(&tournament.matches);
        
        while (i < len) {
            let match = vector::borrow(&tournament.matches, i);
            if (match.round == round && match.status == MATCH_COMPLETED) {
                vector::push_back(&mut winners, match.winner);
            };
            i = i + 1;
        };
        
        winners
    }

    /// =================== View Functions ===================

    /// Get tournament details (view function)
    #[view]
    public fun get_tournament_details(tournament_id: u64): (String, address, u8, u64, u64, u64, u64, address) acquires Tournament, TournamentConfig {
        let tournament_addr = find_tournament_address(tournament_id);
        assert!(exists<Tournament>(tournament_addr), error::not_found(ERR_TOURNAMENT_NOT_FOUND));
        
        let tournament = borrow_global<Tournament>(tournament_addr);
        
        (
            tournament.name,
            tournament.creator,
            tournament.status,
            tournament.max_participants,
            tournament.entry_fee,
            tournament.prize_pool,
            vector::length(&tournament.participants),
            tournament.winner
        )
    }

    /// Get player's tournament stats (view function)
    #[view]
    public fun get_player_tournament_stats(player_addr: address): (u64, u64, u64) acquires PlayerTournament {
        if (!exists<PlayerTournament>(player_addr)) {
            return (0, 0, 0)
        };
        
        let player_tournament = borrow_global<PlayerTournament>(player_addr);
        
        (
            vector::length(&player_tournament.tournaments_entered),
            vector::length(&player_tournament.tournaments_won),
            player_tournament.total_tournament_earnings
        )
    }
} 