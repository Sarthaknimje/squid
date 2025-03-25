# Squid Game Tournament Smart Contract Deployment Guide

This document provides instructions for deploying the Squid Game Tournament smart contracts on the Aptos blockchain.

## Prerequisites

- [Aptos CLI](https://github.com/aptos-labs/aptos-core/releases)
- [Move Compiler](https://github.com/move-language/move)
- An Aptos account with sufficient funds for deployment

## Contract Architecture

The Squid Game Tournament platform consists of three main modules:

1. **Escrow** (`squid_game::escrow`): Handles all game-related financial transactions, including wagers, payouts, and dispute resolution.
2. **Tournament** (`squid_game::tournament`): Manages tournament creation, player registration, match-making, and tournament progression.
3. **Rewards** (`squid_game::rewards`): Handles achievements, badges, and NFT rewards for players.

## Setup and Configuration

1. Clone the repository:
```bash
git clone https://github.com/your-org/squid-game-contracts.git
cd squid-game-contracts
```

2. Update the account address in `Move.toml`:
Replace the placeholder `_` with your actual account address:
```toml
[addresses]
squid_game = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
```

## Deployment Steps

### 1. Compile the modules

```bash
aptos move compile
```

### 2. Run tests

```bash
aptos move test
```

### 3. Publish the modules

```bash
aptos move publish
```

### 4. Initialize the modules

After publishing, you need to initialize each module. You can use the Aptos CLI to call the initialization functions:

```bash
# Initialize escrow module
aptos move run --function-id $ACCOUNT_ADDRESS::escrow::initialize

# Initialize tournament module
aptos move run --function-id $ACCOUNT_ADDRESS::tournament::initialize

# Initialize rewards module
aptos move run --function-id $ACCOUNT_ADDRESS::rewards::initialize
```

Replace `$ACCOUNT_ADDRESS` with your account address.

## Post-Deployment Setup

After deploying and initializing the contracts, you'll need to:

1. **Create Achievements**:
```bash
aptos move run --function-id $ACCOUNT_ADDRESS::rewards::create_achievement \
    --args string:"First Win" \
    --args string:"Win your first game" \
    --args u8:1 \
    --args u8:1 \
    --args u64:100 \
    --args string:"First Win Badge" \
    --args string:"https://squidgame.io/badges/first_win" \
    --args u64:1 \
    --args u8:0
```

2. **Create a Tournament**:
```bash
aptos move run --function-id $ACCOUNT_ADDRESS::tournament::create_tournament \
    --args string:"Inaugural Squid Game Tournament" \
    --args u64:8 \
    --args u64:1000000 \
    --args u64:$(date -d "+1 day" +%s) \
    --args u64:48
```

## Contract Interaction Flow

Here's how the games and tournaments interact with the contracts:

1. **Game Flow**:
   - Player creates a game with wager (`escrow::create_game`)
   - Opponent accepts the game (`escrow::accept_game`)
   - Game is played on frontend
   - Game result is reported (`escrow::complete_game`)
   - Achievements are processed (`rewards::process_game_achievements`)

2. **Tournament Flow**:
   - Admin creates a tournament (`tournament::create_tournament`)
   - Players register for the tournament (`tournament::register_for_tournament`)
   - Tournament starts automatically when full
   - Matches are played through the `escrow` module
   - Match results are recorded (`tournament::record_match_result`)
   - Tournament completes when all rounds are finished

## Mainnet Deployment Considerations

When deploying to mainnet:

1. **Security**: Thoroughly audit the contracts before deployment
2. **Gas costs**: Estimate and plan for gas costs
3. **Admin keys**: Secure the admin private keys
4. **Upgradability**: Consider implementation of upgradable contracts
5. **Testing**: Test extensively on testnets before mainnet deployment

## Contract Addresses

Below is a table of the deployed contract addresses (update after deployment):

| Network | Module | Address |
|---------|--------|---------|
| Mainnet | squid_game | 0x... |
| Testnet | squid_game | 0x... |
| Devnet  | squid_game | 0x... |

## Advanced Integration

For advanced integration with the frontend:

1. **SDK**: Use the Aptos SDKs (JavaScript, Python, Rust) to interact with the contracts
2. **Indexer**: Set up an indexer to track events and contract state changes
3. **API**: Build an API layer to abstract blockchain interactions

## Support and Resources

- [Aptos Documentation](https://aptos.dev)
- [Squid Game DApp Repository](https://github.com/your-org/squid-game-dapp)
- [Move Language Documentation](https://move-book.com) 