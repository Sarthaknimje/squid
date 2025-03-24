# Dots and Boxes Game

## Game Overview
Dots and Boxes is a classic pencil-and-paper game implemented as a multiplayer web game for the Squid Game Hackathon project. This implementation uses Next.js, React, and Socket.io to provide a rich, interactive gaming experience.

## Features
- **Adjustable Grid Size**: Play on 3x3, 4x4, or 5x5 grids
- **Multiple Game Modes**:
  - Play vs Computer (AI opponent)
  - Local Multiplayer (two players on same device)
  - Online Tournament (compete for APTOS tokens)
  - Private Room (create or join a room to play with friends)
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Multiplayer**: Powered by Socket.io
- **APTOS Wallet Integration**: For tournament play and rewards
- **Player Progress Tracking**: Track wins, losses, and achievements

## Running the Game
To play Dots and Boxes, follow these steps:

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
http://localhost:3000/game/dots-and-boxes
```

## Testing the Socket.io Integration
To verify that the Socket.io server is working correctly with the game, run:
```
npm test -- -t "dots-and-boxes"
```

## Game Rules
Dots and Boxes is played on a grid of dots. Players take turns drawing a line between two adjacent dots. When a player completes the fourth side of a box, they claim that box and get another turn. The game ends when all possible lines have been drawn. The player with the most boxes wins.

### Gameplay
1. Players take turns drawing lines between adjacent dots
2. When a player completes a box, they score a point and get another turn
3. The game ends when all lines are drawn
4. The player with the most boxes wins

## Implementation Details
- **Game Board Representation**: The game board is represented as two arrays - one for lines and one for boxes
- **Real-time Multiplayer**: Uses Socket.io events to synchronize game state between players
- **AI Opponent**: Uses a strategy-based approach to make intelligent moves

## Technical Stack
- Next.js 14 (App Router)
- React
- Socket.io for real-time communication
- Framer Motion for animations
- Tailwind CSS for styling
- APTOS blockchain integration for tournaments 