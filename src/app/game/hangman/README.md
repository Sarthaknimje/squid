# Hangman Game

## Game Overview
Hangman is a classic word-guessing game implemented as a multiplayer web game for the Squid Game Hackathon project. This implementation uses Next.js, React, and Socket.io to provide a rich, interactive gaming experience with the Squid Game aesthetic.

## Features
- **Multiple Difficulty Levels**: Easy, Medium, and Hard modes
- **Word Categories**: Animals, Countries, Fruits, Technology, and Sports
- **Multiple Game Modes**:
  - Play vs Computer (AI opponent)
  - Local Multiplayer (take turns guessing letters)
  - Online Tournament (compete for APTOS tokens)
  - Private Room (create or join a room to play with friends)
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Multiplayer**: Powered by Socket.io
- **APTOS Wallet Integration**: For tournament play and rewards
- **Player Progress Tracking**: Track wins, losses, and achievements

## Running the Game
To play Hangman, follow these steps:

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
http://localhost:3000/game/hangman
```

## Game Rules
Hangman is a word-guessing game where players try to guess a hidden word by suggesting letters. Each incorrect guess brings the player one step closer to losing.

### Gameplay
1. A word is randomly selected from the chosen category
2. Players take turns guessing one letter at a time
3. Correct guesses reveal all instances of that letter in the word
4. Incorrect guesses progress the hangman drawing
5. Win by guessing all letters before the hangman drawing is complete
6. Lose if the hangman drawing is completed before the word is guessed

### Difficulty Levels
- **Easy**: 8 guesses allowed, shorter words
- **Medium**: 6 guesses allowed, average length words
- **Hard**: 4 guesses allowed, longer words

## Implementation Details
- **Word Selection**: Words are categorized and filtered by difficulty
- **AI Opponent**: Uses frequency-based letter guessing strategies that vary by difficulty
- **Real-time Multiplayer**: Uses Socket.io events to synchronize game state between players
- **Drawing**: SVG-based progressive drawing of the hangman figure

## Technical Stack
- Next.js 14 (App Router)
- React
- Socket.io for real-time communication
- Framer Motion for animations
- Tailwind CSS for styling
- APTOS blockchain integration for tournaments 