# Tic Tac Toe Game

## Game Overview
Tic Tac Toe is a classic two-player game implemented as a web game for the Squid Game Hackathon project. This implementation uses Next.js, React, and Socket.io to provide a rich, interactive gaming experience with the Squid Game aesthetic.

## Features
- **Multiple Game Modes**:
  - Play vs Computer (AI opponent with strategic moves)
  - Local Multiplayer (two players on same device)
  - Online Tournament (compete for APTOS tokens)
  - Private Room (create or join a room to play with friends)
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Multiplayer**: Powered by Socket.io
- **APTOS Wallet Integration**: For tournament play and rewards
- **Player Progress Tracking**: Track wins, losses, and achievements
- **Animations**: Smooth transitions and hover effects using Framer Motion

## Running the Game
To play Tic Tac Toe, follow these steps:

1. Install dependencies:
```
npm install --legacy-peer-deps
```

2. Start the Socket.io server (for online multiplayer):
```
npm run socket-server
```

3. In another terminal, start the Next.js development server:
```
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:3000/game/tic-tac-toe
```

## Game Rules
Tic Tac Toe is played on a 3×3 grid. Players take turns placing their mark (X or O) in an empty cell. The first player to get three of their marks in a row (horizontally, vertically, or diagonally) wins.

### Gameplay
1. Player 1 (X) and Player 2 (O) take turns placing their marks
2. First player to align three of their marks wins
3. If all nine squares are filled and no player has three in a row, the game is a tie

## Implementation Details
- **Game State**: Uses React hooks to manage the game board and player turns
- **AI Opponent**: Implements strategic moves:
  - Tries to win if possible
  - Blocks opponent from winning
  - Prefers center and corners
- **Real-time Multiplayer**: Uses Socket.io events to synchronize game state between players
- **Tournament System**: Matches players based on bet amounts

## Technical Stack
- Next.js 14 (App Router)
- React
- Socket.io for real-time communication
- Framer Motion for animations
- Tailwind CSS for styling
- APTOS blockchain integration for tournaments 