# Squid Game - Blockchain Gaming Platform

A decentralized gaming platform built on the Aptos blockchain with real smart contract integration for tournaments, escrowed betting, and NFT rewards.

## Overview

Squid Game is a blockchain-based gaming platform that features multiple mini-games with wagering capabilities, tournaments, and rewards. The platform uses real smart contracts on the Aptos blockchain to handle escrow for bets, tournament management, and achievements/rewards.

## Features

- **Multiple Games**: 
  - Rock Paper Scissors
  - Simon Says
  - Red Light Green Light
  - Tic Tac Toe
  - Connect Four
  - Snake
  - and more!

- **Real Smart Contract Integration**:
  - Virtual escrow system for secure wagering
  - Tournament contract for managing brackets and prizes
  - Rewards contract for tracking achievements and issuing NFTs

- **Multiplayer Capabilities**:
  - Local multiplayer
  - Online multiplayer via WebSockets
  - Tournament mode with multiple participants

- **Wallet Integration**:
  - Full integration with Petra Wallet for Aptos blockchain
  - Transaction signing for game entries, wagers, and rewards

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Socket.IO for real-time communication
- **Blockchain**: Aptos blockchain, Move language smart contracts
- **Tools**: Aptos SDK, Move Agent Kit

## Smart Contract Structure

The platform includes three main smart contract modules:

1. **Escrow Module** (`squid_game::escrow`):
   - Handles secure funds for wagers between players
   - Manages game creation, acceptance, and completion
   - Tracks player statistics (wins, losses, earnings)

2. **Tournament Module** (`squid_game::tournament`):
   - Manages tournament creation and player registration
   - Handles bracket generation and tracking
   - Distributes tournament winnings based on results

3. **Rewards Module** (`squid_game::rewards`):
   - Tracks player achievements across games
   - Issues NFT rewards for milestones and tournament victories
   - Manages player progression and experience

## Getting Started

### Prerequisites

- Node.js (v16+)
- NPM or Yarn
- Petra Wallet browser extension

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/squid.git
   cd squid
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file with your configuration:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x1 # Replace with your deployed contract address
   NEXT_PUBLIC_APTOS_NETWORK=testnet # or mainnet for production
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Start the socket server (in a separate terminal):
   ```
   npm run socket
   ```

### Contract Deployment

The smart contracts are located in the `/sources` directory and are written in the Move language for the Aptos blockchain.

1. Deploy contracts using the Aptos CLI:
   ```
   aptos move publish --package-dir ./sources
   ```

2. Update the contract address in the `.env.local` file with the deployed contract address.

## Project Structure

- `/src`: Frontend application
  - `/app`: Next.js application routes
  - `/components`: Reusable React components
  - `/contexts`: React contexts for state management
  - `/lib`: Utility functions and services
    - `/contractService.ts`: Service for interacting with the blockchain contracts
    - `/walletService.ts`: Service for interacting with the Aptos wallet
    - `/moveAgentKit.ts`: Integration with Move AI Agent Kit
    - `/realSigner.ts`: Implementation of transaction signing
  - `/models`: Data models
  - `/server`: Socket server for multiplayer games
  - `/types`: TypeScript type definitions
  - `/utils`: Utility functions

- `/sources`: Move smart contracts
  - `/escrow.move`: Smart contract for game wagers and escrow
  - `/tournament.move`: Smart contract for tournament management
  - `/rewards.move`: Smart contract for achievements and rewards

## Games

### Rock Paper Scissors
A classic game with single-player, local multiplayer, and online multiplayer modes. Supports wagering through escrow contracts and tournament play.

### Simon Says
Memory game where players must repeat sequences. Features wagering and tournament modes with smart contract integration.

### Red Light Green Light
Race-style game inspired by the TV show. Players must move when the light is green and stop when it's red.

## Development Workflow

1. **Running locally**:
   - Start the Next.js app: `npm run dev`
   - Start the socket server: `npm run socket`

2. **Testing**:
   - Run tests: `npm test`

3. **Building for production**:
   - Build the app: `npm run build`
   - Start the production server: `npm start`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Aptos Labs for the blockchain platform
- Move Agent Kit for AI integration capabilities
