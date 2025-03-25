

module squid::arena {
     use std::error;
     use std::signer;
     use std::vector;
     use aptos_framework::coin::{Self, Coin};
     use aptos_framework::aptos_coin::AptosCoin;
     use aptos_framework::timestamp;
     use aptos_framework::account;

     /// Error codes
     const ERR_NOT_SETUP: u64 = 1;
     const ERR_BATTLE_EXISTS: u64 = 2; 
     const ERR_BATTLE_NOT_FOUND: u64 = 3;
     const ERR_LOW_BALANCE: u64 = 4;
     const ERR_NOT_PARTICIPANT: u64 = 5;
     const ERR_BAD_STATE: u64 = 6;
     const ERR_UNAUTHORIZED: u64 = 7;
     const ERR_BAD_WAGER: u64 = 8;
     const ERR_WAITING: u64 = 9;
     const ERR_DISPUTE_EXISTS: u64 = 10;
     const ERR_NOT_DONE: u64 = 11;

     /// Battle states
     const STATE_CREATED: u8 = 0;
     const STATE_ACCEPTED: u8 = 1; 
     const STATE_ACTIVE: u8 = 2;
     const STATE_FINISHED: u8 = 3;
     const STATE_DISPUTED: u8 = 4;
     const STATE_VOIDED: u8 = 5;

     /// Battle data
     struct Battle has store {
         battle_id: u64,
         challenger: address,
         opponent: address,
         wager: u64,
         state: u8,
         victor: address,
         start_ts: u64,
         end_ts: u64,
         dispute_by: address,
         dispute_notes: vector<u8>,
     }

     /// Stores all battles
     struct BattleRegistry has key {
         battles: vector<Battle>,
         next_id: u64,
     }

     /// Player records
     struct PlayerRecord has key {
         addr: address,
         total_battles: u64,
         victories: u64, 
         earnings: u64,
         open_disputes: u64,
     }

     /// Initialize module
     public fun initialize(admin: &signer) {
         let admin_addr = signer::address_of(admin);
         
         if (!exists<BattleRegistry>(admin_addr)) {
             move_to(admin, BattleRegistry {
                 battles: vector::empty<Battle>(),
                 next_id: 0,
             });
         };
     }

     /// Start new battle
     public entry fun start_battle(
         challenger: &signer,
         opponent: address,
         wager: u64,
     ) acquires BattleRegistry {
         let challenger_addr = signer::address_of(challenger);
         let registry_addr = @crypto_battles;
         
         assert!(coin::balance<AptosCoin>(challenger_addr) >= wager, error::invalid_argument(ERR_LOW_BALANCE));
         assert!(wager > 0, error::invalid_argument(ERR_BAD_WAGER));
         
         let registry = borrow_global_mut<BattleRegistry>(registry_addr);
         let battle_id = registry.next_id;
         
         let new_battle = Battle {
             battle_id,
             challenger: challenger_addr,
             opponent,
             wager,
             state: STATE_CREATED,
             victor: @0x0,
             start_ts: 0,
             end_ts: 0,
             dispute_by: @0x0,
             dispute_notes: vector::empty<u8>(),
         };
         
         let coins = coin::withdraw<AptosCoin>(challenger, wager);
         coin::deposit(registry_addr, coins);
         
         vector::push_back(&mut registry.battles, new_battle);
         registry.next_id = battle_id + 1;
         
         if (!exists<PlayerRecord>(challenger_addr)) {
             move_to(challenger, PlayerRecord {
                 addr: challenger_addr,
                 total_battles: 0,
                 victories: 0,
                 earnings: 0,
                 open_disputes: 0,
             });
         };
     }

     // Rest of functions would follow similar pattern of renaming...
}