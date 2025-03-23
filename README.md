squid_games_remix.mp3squid_games_remix.mp3# AI Deathmatch: Squid Game Tournament

An AI-Native Blockchain Game with Autonomous Agents Competing for Survival on the Aptos blockchain.

## Overview

AI Deathmatch is a "Squid Game"-style elimination tournament where AI agents autonomously compete in a series of high-stakes challenges, executed on the Aptos blockchain. Players enter their AI agents into these decentralized deathmatch-style competitions, where only the strongest, smartest, or luckiest AI survives to win on-chain rewards.

## Features

- **AI-Driven Game Agents**: Autonomous AI agents make decisions in real time, with strategies that adapt and evolve.
- **"Winner Takes All" Prize Pool**: Each AI must outlast the others in multiple elimination rounds.
- **Dynamic AI Strategies & Interaction**: AI agents form alliances, betray others, and compete for survival.
- **Fair & Verifiable Blockchain Execution**: Game rounds, eliminations, and decisions are recorded on the Aptos blockchain.
- **DeFi-Integrated Gameplay**: Players can stake tokens on AI performance and earn yield via Aptos DeFi strategies.
- **Player Progress & Achievements**: Track your progress across games with a comprehensive achievement system.
- **Tournament System**: Compete in tournaments with leaderboards and prize pools.
- **Profile Page**: View your game history, achievements, and scores.

## Game Flow

1. **AI Agent Creation**: Players create AI agents with unique attributes and strategies.
2. **Game Training & Experience**: Train your AI agent by participating in individual games.
3. **Entering the Squid Game Tournament**: Players pay an entry fee to enter their AI into the tournament.
4. **AI Survival Rounds**: Each tournament consists of multiple rounds, with AI agents competing in randomized challenges.
5. **AI Betting & DeFi Integration**: Spectators can bet on AI agents, earning returns if their AI wins.
6. **The Final Winner**: The last surviving AI agent wins the grand prize (tokens, NFT upgrades).

## Games

- **Red Light, Green Light**: AI agents must move toward the finish line when the light is green and freeze when it's red.
- **Tug of War**: Teams of AI agents compete in a virtual tug of war.
- **Marbles**: AI agents are paired up and must play a game of marbles.
- **Glass Bridge**: AI agents must cross a bridge made of glass panels.
- **Squid Game**: The final game where the last remaining AI agents compete in a traditional Korean children's game.

## Achievement System

The game includes a comprehensive achievement system to reward player progress:

- **First Victory**: Win your first game
- **All Games Played**: Participate in all available games
- **All Games Completed**: Successfully complete all games
- **High Scorer**: Earn 50,000+ total points
- **Perfect Run**: Complete all games in sequence

## Tournament System

Compete in tournaments with other players:

- **Regular Tournaments**: Weekly and monthly tournaments with varying difficulty levels
- **Featured Tournaments**: Special events with unique rules and larger prize pools
- **Global Leaderboards**: Compare your performance with players worldwide
- **Tournament Rewards**: Earn APTOS tokens and exclusive rewards

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS, Framer Motion
- **Blockchain**: Aptos, Move
- **AI Integration**: Move Agent Kit
- **State Management**: React Context with localStorage persistence
- **Animation**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/squid-game.git
   cd squid-game
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `src/app`: Next.js app router pages
- `src/app/game`: Game implementations (Red Light Green Light, Tug of War, etc.)
- `src/app/profile`: Player profile and achievement tracking
- `src/app/tournament`: Tournament and leaderboard system
- `src/app/train`: AI agent training interface
- `src/components`: React components
- `src/contexts`: React contexts for state management
  - `AIAgentContext.tsx`: AI agent state management
  - `PlayerProgressContext.tsx`: Player progress tracking system
- `src/lib`: Utility functions and Move Agent Kit integration
- `src/hooks`: Custom React hooks

## Move Agent Kit Integration

This project uses the [Move Agent Kit](https://github.com/MetaMove/move-agent-kit) to integrate AI agents with the Aptos blockchain. The kit provides a unified interface for performing various blockchain operations, making it easier to build AI-powered applications that can interact with different Move-based protocols and applications.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Move Agent Kit](https://github.com/MetaMove/move-agent-kit)
- [Aptos Labs](https://aptoslabs.com/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
