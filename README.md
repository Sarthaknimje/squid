# Squid Game Tournament Platform

A Next.js-based gaming platform featuring multiple interactive games with a Squid Game aesthetic, including wallet integration for cryptocurrency betting and AI agents.

## Features

- Multiple games: Tic Tac Toe, Connect Four, Dots and Boxes, Hangman
- Multiplayer functionality via Socket.io
- AI opponents with different difficulty levels
- Cryptocurrency betting with APTOS wallet integration
- Tournament mode for competitive play
- Responsive design with Squid Game theme

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- An APTOS wallet (for token transactions)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd squid
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag helps resolve any dependency conflicts.

### Running the Application

#### Quick Start (Recommended)

We've created a convenient startup script that handles everything for you:

```bash
./start.sh
```

This script will:
- Check for Node.js and npm
- Install dependencies if needed
- Start the Socket.io server in the background
- Start the Next.js development server
- Properly clean up all processes when you exit

#### Manual Start

If you prefer to start the servers manually:

1. First, start the Socket.io server (required for multiplayer functionality):
```bash
npm run socket-server
```
This will start the Socket.io server on port 3001.

2. In a new terminal, start the Next.js development server:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

### Playing the Games

- Visit `/game` to access the game selection menu
- Individual game URLs:
  - Tic Tac Toe: `/game/tic-tac-toe`
  - Connect Four: `/game/connect-four`
  - Dots and Boxes: `/game/dots-and-boxes`
  - Hangman: `/game/hangman`

## Game Modes

Each game supports multiple modes:
- **Play vs Computer**: Challenge an AI opponent
- **Local Multiplayer**: Play with a friend on the same device
- **Online Multiplayer (Tournament)**: Compete with other players for APTOS tokens
- **Private Room**: Create or join a room with a unique code to play with specific players

## Wallet Integration

To participate in tournaments or betting:
1. Connect your APTOS wallet using the connect button
2. Enter a bet amount when prompted
3. Confirm the transaction in your wallet
4. If you win, your winnings will be automatically transferred to your wallet

## AI Agent System

The platform includes an AI agent system:
- Generate or purchase AI agents with different skills
- Train your agents to improve their capabilities
- Use agents to earn additional rewards
- Trade agents on the marketplace

## Troubleshooting

If you encounter the "agentSurvived is not defined" error or other similar issues:
- Make sure you have the latest version of the code
- Check that both the Socket.io server and Next.js server are running
- Clear your browser cache and reload the page
- Check the browser console for detailed error messages
- Use the provided start.sh script which includes additional error handling

If Socket.io connections are failing:
- Verify that the Socket.io server is running on port 3001
- Check for firewall or network restrictions
- Make sure you're using compatible versions of Socket.io client and server

## Development

### Project Structure

- `src/app`: Next.js application pages
- `src/app/game`: Game implementations
- `src/components`: Reusable UI components
- `src/contexts`: React contexts for state management
- `src/lib`: Utility functions and libraries
- `src/server`: Backend server code (Socket.io)
