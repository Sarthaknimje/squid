# Squid Game Tournament - Running Instructions

## Quick Start Guide

Follow these steps to run the Squid Game Tournament platform without errors:

### 1. Kill any existing processes using port 3001

```bash
# Find processes using port 3001
lsof -i :3001 | grep LISTEN

# Kill the process (replace PID with the actual process ID)
kill <PID>

# If that doesn't work, force kill
kill -9 <PID>
```

### 2. Start the application using the start script

```bash
# Make sure the script is executable
chmod +x start.sh

# Run the script
./start.sh
```

The script will:
- Check for Node.js and npm
- Install dependencies if needed
- Check if port 3001 is available and help you free it if not
- Start the Socket.io server
- Start the Next.js development server

### 3. Manual startup (if needed)

If you need to start the servers manually:

```bash
# Start the Socket.io server in one terminal
npm run socket-server

# Start the Next.js dev server in another terminal
npm run dev
```

Then visit: http://localhost:3000

## Troubleshooting Common Issues

### "agentSurvived is not defined" error

This error has been fixed by properly initializing the state variables in the game page. If you still see it:
- Clear your browser cache
- Restart both servers
- Make sure you're using the latest code

### Socket connection issues

If games don't connect to the Socket.io server:

1. Check if the Socket.io server is running:
```bash
lsof -i :3001 | grep LISTEN
```

2. Restart the Socket.io server if needed:
```bash
kill <PID>
npm run socket-server
```

3. Make sure your browser allows WebSocket connections

### Wallet connection issues

If the wallet doesn't connect properly:

1. Make sure you have an APTOS wallet extension installed
2. Check the browser console for errors
3. If you're in a development environment, the mock wallet should work automatically

## Available Game URLs

- Game Selection: http://localhost:3000/game
- Tic Tac Toe: http://localhost:3000/game/tic-tac-toe
- Connect Four: http://localhost:3000/game/connect-four
- Dots and Boxes: http://localhost:3000/game/dots-and-boxes
- Hangman: http://localhost:3000/game/hangman

## Testing Socket.io Integration

For Connect Four, you can run the test script:
```bash
node src/app/game/connect-four/test.js
```

This will simulate Socket.io connections and verify the server is working correctly. 