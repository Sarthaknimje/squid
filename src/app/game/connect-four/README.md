# Connect Four Game

This is a multiplayer Connect Four game implemented with Next.js, React, and Socket.io for the Squid Game Hackathon project.

## Features

- 6x7 grid classic Connect Four gameplay
- Four game modes:
  - Play vs Computer (AI opponent with strategic moves)
  - Local Multiplayer (two players on the same device)
  - Online Multiplayer (tournament mode with APTOS betting)
  - Private Room (create or join a room with a friend)
- Responsive design with animations
- Real-time multiplayer with Socket.io
- APTOS wallet integration for tournament mode
- Player progress tracking and achievements

## Running the Game

1. Make sure you have installed all dependencies:
   ```
   npm install --legacy-peer-deps
   ```

2. Start the Socket.io server in a separate terminal:
   ```
   npm run socket-server
   ```

3. Start the Next.js development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000/game/connect-four
   ```

## Testing the Socket.io Integration

A test script is included to verify the Socket.io server is working correctly with the Connect Four game:

1. Make sure the Socket.io server is running:
   ```
   npm run socket-server
   ```

2. In a separate terminal, run the test script:
   ```
   node src/app/game/connect-four/test.js
   ```

The test script simulates two players creating a room, joining it, making moves, and resetting the game.

## Game Rules

1. Players take turns dropping colored discs into columns
2. The disc will fall to the lowest available position in the selected column
3. The first player to connect four discs in a row (horizontally, vertically, or diagonally) wins
4. If the board fills up without a winner, the game is a tie

## Implementation Details

- The game board is represented as a 6x7 grid of cells
- Real-time multiplayer is handled via Socket.io events
- The AI opponent uses a simple strategy algorithm:
  1. Try to win if possible
  2. Block the player's winning move if needed
  3. Prefer the center column
  4. Make a random valid move

## Technical Stack

- Next.js and React for frontend
- Socket.io for real-time communication
- Framer Motion for animations
- Tailwind CSS for styling
- APTOS blockchain integration for tournaments 