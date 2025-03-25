module squid_game::rewards {
    use std::error;
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_framework::account;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use aptos_token::token::{Self as aptos_token};
    use squid_game::escrow;
    use squid_game::tournament;

    /// Error codes
    const ERR_NOT_INITIALIZED: u64 = 1;
    const ERR_ALREADY_INITIALIZED: u64 = 2;
    const ERR_NOT_ADMIN: u64 = 3;
    const ERR_UNAUTHORIZED: u64 = 4;
    const ERR_ACHIEVEMENT_EXISTS: u64 = 5;
    const ERR_ACHIEVEMENT_NOT_FOUND: u64 = 6;
    const ERR_ACHIEVEMENT_ALREADY_EARNED: u64 = 7;
    const ERR_COLLECTION_EXISTS: u64 = 8;
    const ERR_COLLECTION_NOT_FOUND: u64 = 9;
    const ERR_TOKEN_ALREADY_MINTED: u64 = 10;

    /// Achievement types
    const ACHIEVEMENT_TYPE_GAME_WIN: u8 = 1;
    const ACHIEVEMENT_TYPE_TOURNAMENT_WIN: u8 = 2;
    const ACHIEVEMENT_TYPE_STREAK: u8 = 3;
    const ACHIEVEMENT_TYPE_MILESTONE: u8 = 4;
    const ACHIEVEMENT_TYPE_SPECIAL: u8 = 5;

    /// Achievement difficulty
    const DIFFICULTY_EASY: u8 = 1;
    const DIFFICULTY_MEDIUM: u8 = 2;
    const DIFFICULTY_HARD: u8 = 3;
    const DIFFICULTY_EXPERT: u8 = 4;

    /// Rewards configuration
    struct RewardsConfig has key {
        admin: address,
        collection_name: String,
        description: String,
        uri: String,
        next_achievement_id: u64,
        treasury: address,
    }

    /// Achievement definition
    struct Achievement has store, drop {
        id: u64,
        name: String,
        description: String,
        achievement_type: u8,
        difficulty: u8,
        points: u64,
        token_name: String,
        token_uri: String,
        required_count: u64,
        game_type: u8, // 0 for any game
    }

    /// Player achievements
    struct PlayerAchievements has key {
        achievements_earned: vector<u64>,
        total_points: u64,
        badges: Table<u64, AchievementBadge>,
        stats: PlayerGameStats,
    }

    /// Badge data
    struct AchievementBadge has store, drop {
        achievement_id: u64,
        earned_date: u64,
        token_property_version: u64,
    }

    /// Player game statistics for achievement tracking
    struct PlayerGameStats has store {
        game_wins: Table<u8, u64>, // game_type -> win_count
        tournament_wins: u64,
        win_streak: u64,
        current_streak: u64,
        total_games: u64,
        total_wager: u64,
    }

    /// Events
    #[event]
    struct AchievementCreatedEvent has store, drop {
        achievement_id: u64,
        name: String,
        achievement_type: u8,
        difficulty: u8,
        points: u64,
        timestamp: u64,
    }

    #[event]
    struct AchievementEarnedEvent has store, drop {
        player: address,
        achievement_id: u64,
        timestamp: u64,
    }

    #[event]
    struct BadgeMintedEvent has store, drop {
        player: address,
        achievement_id: u64,
        token_name: String,
        token_property_version: u64,
        timestamp: u64,
    }

    /// Initialize rewards module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        assert!(!exists<RewardsConfig>(admin_addr), error::already_exists(ERR_ALREADY_INITIALIZED));
        
        // Create resource account for treasury
        let (resource_signer, _resource_cap) = account::create_resource_account(admin, vector::empty<u8>());
        let resource_addr = signer::address_of(&resource_signer);
        
        // Create the NFT collection for badges
        let collection_name = string::utf8(b"Squid Game Achievements");
        let description = string::utf8(b"Official achievement badges for the Squid Game Tournament");
        let uri = string::utf8(b"https://squidgame.io/achievements");
        
        aptos_token::create_collection(
            admin,
            collection_name,
            description,
            uri,
            0, // no maximum supply
            vector<bool>[false, false, false] // no mutable props
        );
        
        move_to(admin, RewardsConfig {
            admin: admin_addr,
            collection_name,
            description,
            uri,
            next_achievement_id: 0,
            treasury: resource_addr,
        });
    }

    /// Create a new achievement
    public entry fun create_achievement(
        admin: &signer,
        name: String,
        description: String,
        achievement_type: u8,
        difficulty: u8,
        points: u64,
        token_name: String,
        token_uri: String,
        required_count: u64,
        game_type: u8,
    ) acquires RewardsConfig {
        let admin_addr = signer::address_of(admin);
        let config_addr = @squid_game;
        
        assert!(exists<RewardsConfig>(config_addr), error::not_found(ERR_NOT_INITIALIZED));
        let config = borrow_global_mut<RewardsConfig>(config_addr);
        assert!(admin_addr == config.admin, error::permission_denied(ERR_NOT_ADMIN));
        
        let achievement_id = config.next_achievement_id;
        
        let achievement = Achievement {
            id: achievement_id,
            name,
            description,
            achievement_type,
            difficulty,
            points,
            token_name,
            token_uri,
            required_count,
            game_type,
        };
        
        // Would typically store this in a table in the config
        // For simplicity, we're just emitting an event for demonstration
        event::emit(AchievementCreatedEvent {
            achievement_id,
            name,
            achievement_type,
            difficulty,
            points,
            timestamp: timestamp::now_seconds(),
        });
        
        config.next_achievement_id = achievement_id + 1;
    }

    /// Process achievements when a game is completed
    public entry fun process_game_achievements(
        player_addr: address,
        game_id: u64,
        game_type: u8,
        is_winner: bool,
    ) acquires RewardsConfig, PlayerAchievements {
        let config_addr = @squid_game;
        assert!(exists<RewardsConfig>(config_addr), error::not_found(ERR_NOT_INITIALIZED));
        
        // Initialize player achievements if not exists
        if (!exists<PlayerAchievements>(player_addr)) {
            initialize_player_achievements(player_addr);
        };
        
        let player_achievements = borrow_global_mut<PlayerAchievements>(player_addr);
        
        // Update stats
        player_achievements.stats.total_games = player_achievements.stats.total_games + 1;
        
        if (is_winner) {
            // Update game wins
            if (!table::contains(&player_achievements.stats.game_wins, game_type)) {
                table::add(&mut player_achievements.stats.game_wins, game_type, 1);
            } else {
                let win_count = table::borrow_mut(&mut player_achievements.stats.game_wins, game_type);
                *win_count = *win_count + 1;
            };
            
            // Update streak
            player_achievements.stats.current_streak = player_achievements.stats.current_streak + 1;
            if (player_achievements.stats.current_streak > player_achievements.stats.win_streak) {
                player_achievements.stats.win_streak = player_achievements.stats.current_streak;
            };
            
            // Check for game win achievements
            check_game_win_achievements(player_addr, game_type);
            
            // Check for streak achievements
            check_streak_achievements(player_addr);
        } else {
            // Reset streak on loss
            player_achievements.stats.current_streak = 0;
        };
    }

    /// Process achievements when a tournament is completed
    public entry fun process_tournament_achievements(
        player_addr: address,
        tournament_id: u64,
        is_winner: bool,
    ) acquires RewardsConfig, PlayerAchievements {
        let config_addr = @squid_game;
        assert!(exists<RewardsConfig>(config_addr), error::not_found(ERR_NOT_INITIALIZED));
        
        // Initialize player achievements if not exists
        if (!exists<PlayerAchievements>(player_addr)) {
            initialize_player_achievements(player_addr);
        };
        
        let player_achievements = borrow_global_mut<PlayerAchievements>(player_addr);
        
        if (is_winner) {
            // Update tournament wins
            player_achievements.stats.tournament_wins = player_achievements.stats.tournament_wins + 1;
            
            // Check for tournament win achievements
            check_tournament_win_achievements(player_addr);
        };
    }

    /// Award an achievement to a player
    public entry fun award_achievement(
        admin: &signer,
        player_addr: address,
        achievement_id: u64,
    ) acquires RewardsConfig, PlayerAchievements {
        let admin_addr = signer::address_of(admin);
        let config_addr = @squid_game;
        
        assert!(exists<RewardsConfig>(config_addr), error::not_found(ERR_NOT_INITIALIZED));
        let config = borrow_global<RewardsConfig>(config_addr);
        assert!(admin_addr == config.admin, error::permission_denied(ERR_NOT_ADMIN));
        
        // Initialize player achievements if not exists
        if (!exists<PlayerAchievements>(player_addr)) {
            initialize_player_achievements(player_addr);
        };
        
        let player_achievements = borrow_global_mut<PlayerAchievements>(player_addr);
        
        // Check if player already has the achievement
        assert!(!vector::contains(&player_achievements.achievements_earned, &achievement_id), 
            error::already_exists(ERR_ACHIEVEMENT_ALREADY_EARNED));
            
        // Get achievement data
        // In a real implementation, this would be retrieved from a stored table
        let achievement = get_achievement_by_id(achievement_id);
        
        // Award the achievement
        vector::push_back(&mut player_achievements.achievements_earned, achievement_id);
        player_achievements.total_points = player_achievements.total_points + achievement.points;
        
        // Mint NFT badge
        let token_property_version = mint_achievement_badge(admin, player_addr, achievement);
        
        // Record badge details
        let badge = AchievementBadge {
            achievement_id,
            earned_date: timestamp::now_seconds(),
            token_property_version,
        };
        
        table::add(&mut player_achievements.badges, achievement_id, badge);
        
        // Emit event
        event::emit(AchievementEarnedEvent {
            player: player_addr,
            achievement_id,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// =================== Helper Functions ===================

    /// Initialize player achievements
    fun initialize_player_achievements(player_addr: address) {
        if (!exists<PlayerAchievements>(player_addr)) {
            let game_wins = table::new<u8, u64>();
            
            let player_achievements = PlayerAchievements {
                achievements_earned: vector::empty<u64>(),
                total_points: 0,
                badges: table::new<u64, AchievementBadge>(),
                stats: PlayerGameStats {
                    game_wins,
                    tournament_wins: 0,
                    win_streak: 0,
                    current_streak: 0,
                    total_games: 0,
                    total_wager: 0,
                },
            };
            
            move_to<PlayerAchievements>(&account::create_signer_with_capability(
                &account::create_test_signer_cap(player_addr)), player_achievements);
        };
    }

    /// Get achievement by ID
    /// In a real implementation, this would retrieve from storage
    fun get_achievement_by_id(achievement_id: u64): Achievement {
        // Simplified for demonstration
        // In a real implementation, this would retrieve the achievement from a table
        
        // Sample achievement
        let achievement = Achievement {
            id: achievement_id,
            name: string::utf8(b"Sample Achievement"),
            description: string::utf8(b"This is a sample achievement"),
            achievement_type: ACHIEVEMENT_TYPE_GAME_WIN,
            difficulty: DIFFICULTY_MEDIUM,
            points: 100,
            token_name: string::utf8(b"Sample Badge"),
            token_uri: string::utf8(b"https://squidgame.io/badges/sample"),
            required_count: 1,
            game_type: 0,
        };
        
        achievement
    }

    /// Mint an NFT badge for an achievement
    fun mint_achievement_badge(
        admin: &signer,
        player_addr: address,
        achievement: Achievement
    ): u64 {
        let config_addr = @squid_game;
        let config = borrow_global<RewardsConfig>(config_addr);
        
        // Create token data
        let token_data_id = aptos_token::create_tokendata(
            admin,
            config.collection_name,
            achievement.token_name,
            achievement.description,
            1, // max supply 1 per player
            achievement.token_uri,
            config.admin, // royalty payee address
            100, // royalty points denominator
            5, // royalty points numerator
            vector<String>[
                string::utf8(b"achievement_id"),
                string::utf8(b"difficulty"),
                string::utf8(b"points"),
                string::utf8(b"timestamp")
            ],
            vector<vector<u8>>[
                bcs::to_bytes(&achievement.id),
                bcs::to_bytes(&achievement.difficulty),
                bcs::to_bytes(&achievement.points),
                bcs::to_bytes(&timestamp::now_seconds())
            ],
            vector<String>[
                string::utf8(b"achievement_id"),
                string::utf8(b"difficulty"),
                string::utf8(b"points"),
                string::utf8(b"timestamp")
            ]
        );
        
        // Mint and transfer token to player
        let (token_id, token_property_version) = aptos_token::mint_token(
            admin,
            token_data_id,
            1 // amount
        );
        
        aptos_token::direct_transfer(admin, player_addr, token_id, 1);
        
        // Emit badge minted event
        event::emit(BadgeMintedEvent {
            player: player_addr,
            achievement_id: achievement.id,
            token_name: achievement.token_name,
            token_property_version,
            timestamp: timestamp::now_seconds(),
        });
        
        token_property_version
    }

    /// Check for game win achievements
    fun check_game_win_achievements(player_addr: address, game_type: u8) acquires RewardsConfig, PlayerAchievements {
        let player_achievements = borrow_global_mut<PlayerAchievements>(player_addr);
        let win_count = *table::borrow(&player_achievements.stats.game_wins, game_type);
        
        // Example achievement checks:
        // - Win 1 game of a specific type (First Win)
        // - Win 5 games of a specific type (Regular)
        // - Win 25 games of a specific type (Master)
        // - Win 100 games of a specific type (Grandmaster)
        
        // In a real implementation, we would retrieve all achievements from a table
        // and check each one to see if the player has met the requirements
        
        // For demonstration, we'll just emit a log
        if (win_count == 1) {
            // First win achievement would be awarded here
        } else if (win_count == 5) {
            // Regular player achievement would be awarded here
        } else if (win_count == 25) {
            // Master achievement would be awarded here
        } else if (win_count == 100) {
            // Grandmaster achievement would be awarded here
        };
    }

    /// Check for streak achievements
    fun check_streak_achievements(player_addr: address) acquires RewardsConfig, PlayerAchievements {
        let player_achievements = borrow_global_mut<PlayerAchievements>(player_addr);
        let streak = player_achievements.stats.win_streak;
        
        // Example streak achievements:
        // - 3 win streak
        // - 5 win streak
        // - 10 win streak
        
        // For demonstration, we'll just emit a log
        if (streak == 3) {
            // 3 win streak achievement would be awarded here
        } else if (streak == 5) {
            // 5 win streak achievement would be awarded here
        } else if (streak == 10) {
            // 10 win streak achievement would be awarded here
        };
    }

    /// Check for tournament win achievements
    fun check_tournament_win_achievements(player_addr: address) acquires RewardsConfig, PlayerAchievements {
        let player_achievements = borrow_global_mut<PlayerAchievements>(player_addr);
        let tournament_wins = player_achievements.stats.tournament_wins;
        
        // Example tournament achievements:
        // - Win 1 tournament (Tournament Victor)
        // - Win 5 tournaments (Tournament Champion)
        // - Win 10 tournaments (Tournament Legend)
        
        // For demonstration, we'll just emit a log
        if (tournament_wins == 1) {
            // First tournament win achievement would be awarded here
        } else if (tournament_wins == 5) {
            // Tournament Champion achievement would be awarded here
        } else if (tournament_wins == 10) {
            // Tournament Legend achievement would be awarded here
        };
    }

    /// =================== View Functions ===================

    /// Get player achievements
    #[view]
    public fun get_player_achievements(player_addr: address): (vector<u64>, u64) acquires PlayerAchievements {
        if (!exists<PlayerAchievements>(player_addr)) {
            return (vector::empty<u64>(), 0)
        };
        
        let player_achievements = borrow_global<PlayerAchievements>(player_addr);
        
        (
            player_achievements.achievements_earned,
            player_achievements.total_points
        )
    }

    /// Get player game stats
    #[view]
    public fun get_player_game_stats(player_addr: address): (u64, u64, u64, u64) acquires PlayerAchievements {
        if (!exists<PlayerAchievements>(player_addr)) {
            return (0, 0, 0, 0)
        };
        
        let player_achievements = borrow_global<PlayerAchievements>(player_addr);
        
        (
            player_achievements.stats.total_games,
            player_achievements.stats.tournament_wins,
            player_achievements.stats.win_streak,
            player_achievements.stats.current_streak
        )
    }
} 