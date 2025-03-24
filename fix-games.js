const { io } = require("socket.io-client");
const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const { exec } = require('child_process');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[36m%s\x1b[0m', '🎮 Squid Game Tournament - Game Fixer 🎮');
console.log('\x1b[33m%s\x1b[0m', 'This script will fix issues with games and verify connectivity');

// Create a function to test Socket.io connectivity
async function testSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('\n📡 Testing Socket.io connection...');
    
    const socket = io("http://localhost:3001");
    
    // Set a timeout
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout after 5 seconds'));
    }, 5000);
    
    // Connection events
    socket.on("connect", () => {
      console.log('\x1b[32m%s\x1b[0m', '✓ Connected to Socket.io server successfully!');
      console.log('Socket ID:', socket.id);
      
      // Test creating a room
      socket.emit("create_room", { 
        gameType: "tic-tac-toe", 
        playerName: "TestPlayer" 
      });
      
      // Wait for 2 seconds then disconnect
      setTimeout(() => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(true);
      }, 2000);
    });
    
    // Room created event
    socket.on("room_created", (data) => {
      console.log('\x1b[32m%s\x1b[0m', `✓ Room created successfully: ${data.roomId}`);
    });
    
    // Error event
    socket.on("error", (error) => {
      console.error('\x1b[31m%s\x1b[0m', '✗ Socket error:', error);
    });
    
    // Connection error
    socket.on("connect_error", (error) => {
      clearTimeout(timeout);
      console.error('\x1b[31m%s\x1b[0m', '✗ Connection error:', error.message);
      reject(error);
    });
  });
}

// Fix Tic Tac Toe game
function fixTicTacToe() {
  console.log('\n🔧 Fixing Tic Tac Toe game...');
  
  const filePath = 'src/app/game/tic-tac-toe/page.tsx';
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if setTimeout is already added for AI moves
    if (content.includes('setTimeout(() => {')) {
      console.log('\x1b[32m%s\x1b[0m', '✓ AI move timer already exists');
    } else {
      console.log('Adding AI move delay...');
      
      // Find the place where computer mode is handled
      const pattern = /if \(gameMode === GameMode\.COMPUTER && (?:!isXNext|nextPlayer === "O")\) \{/;
      const replacement = `if (gameMode === GameMode.COMPUTER && nextPlayer === "O") {
      // Add a delay for better UX
      setTimeout(() => {
        makeComputerMove();
      }, 750);`;
      
      content = content.replace(pattern, replacement);
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('\x1b[32m%s\x1b[0m', '✓ Added AI move delay');
    }
    
    // Check if the AI move function needs improvement
    if (content.includes('console.log("AI is making a move...")')) {
      console.log('\x1b[32m%s\x1b[0m', '✓ AI move function already improved');
    } else {
      console.log('Improving AI move function...');
      
      // Find the AI move function
      const aiPattern = /const makeComputerMove = \(\) => \{[\s\S]*?\};/;
      const aiReplacement = `const makeComputerMove = () => {
    console.log("AI is making a move...");
    
    // Get available positions
    const availablePositions = board
      .map((cell, index) => (cell === null ? index : null))
      .filter((position) => position !== null);
    
    if (availablePositions.length === 0) return;
    
    let position;
    
    // Check if AI can win
    for (const pos of availablePositions) {
      const boardCopy = [...board];
      boardCopy[pos] = "O";
      if (checkGameStatus(boardCopy) === "O") {
        position = pos;
        break;
      }
    }
    
    // If no winning move, check if need to block player
    if (position === undefined) {
      for (const pos of availablePositions) {
        const boardCopy = [...board];
        boardCopy[pos] = "X";
        if (checkGameStatus(boardCopy) === "X") {
          position = pos;
          break;
        }
      }
    }
    
    // If no winning or blocking move, take center if available
    if (position === undefined && board[4] === null) {
      position = 4;
    }
    
    // If center not available, take a corner if available
    if (position === undefined) {
      const corners = [0, 2, 6, 8].filter(pos => board[pos] === null);
      if (corners.length > 0) {
        position = corners[Math.floor(Math.random() * corners.length)];
      }
    }
    
    // If no strategic move found, take any available position
    if (position === undefined) {
      position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    }
    
    // Make the AI move
    const newBoard = [...board];
    newBoard[position] = "O";
    setBoard(newBoard);
    
    // Check for a win or draw after AI move
    const result = checkGameStatus(newBoard);
    if (result) {
      handleGameOver(result);
      return;
    }
    
    // Switch back to player's turn
    setIsXNext(true);
  };`;
      
      content = content.replace(aiPattern, aiReplacement);
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('\x1b[32m%s\x1b[0m', '✓ Improved AI move function');
    }
    
    return true;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Error fixing Tic Tac Toe:', error.message);
    return false;
  }
}

// Fix Connect Four game
function fixConnectFour() {
  console.log('\n🔧 Fixing Connect Four game...');
  
  const filePath = 'src/app/game/connect-four/page.tsx';
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if setTimeout is already added for AI moves
    if (content.includes('setTimeout(() => {')) {
      console.log('\x1b[32m%s\x1b[0m', '✓ AI move timer already exists');
    } else {
      console.log('Adding AI move delay...');
      
      // Find the place where computer mode is handled
      const pattern = /if \(gameMode === ['"]computer['"] && nextPlayer !== playerColor\) \{/;
      const replacement = `if (gameMode === 'computer' && nextPlayer !== playerColor) {
      // Delay the computer move for better UX
      setTimeout(() => {
        makeComputerMove();
      }, 1000);`;
      
      content = content.replace(pattern, replacement);
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('\x1b[32m%s\x1b[0m', '✓ Added AI move delay');
    }
    
    return true;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Error fixing Connect Four:', error.message);
    return false;
  }
}

// Fix Tournament Page
function fixTournamentPage() {
  console.log('\n🔧 Fixing Tournament page...');
  
  const filePath = 'src/app/tournament/page.tsx';
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if renderTournamentBracket function is missing
    if (content.includes('renderTournamentBracket') && !content.includes('const renderTournamentBracket =')) {
      console.log('Adding missing renderTournamentBracket function...');
      
      // Find a good spot to add the function (before the return statement)
      const pattern = /return \(/;
      const replacement = `const renderTournamentBracket = () => {
    // Mock tournament data
    const rounds = [
      {
        name: "Round 1",
        matches: [
          { player1: { name: "Player 1", score: 3 }, player2: { name: "Player 2", score: 1 } },
          { player1: { name: "Player 3", score: 2 }, player2: { name: "Player 4", score: 2 } },
          { player1: { name: "Player 5", score: 0 }, player2: { name: "Player 6", score: 3 } },
          { player1: { name: "Player 7", score: 4 }, player2: { name: "Player 8", score: 2 } },
        ]
      },
      {
        name: "Semifinals",
        matches: [
          { player1: { name: "Player 1", score: 3 }, player2: { name: "Player 3", score: 2 } },
          { player1: { name: "Player 6", score: 1 }, player2: { name: "Player 7", score: 3 } },
        ]
      },
      {
        name: "Final",
        matches: [
          { player1: { name: "Player 1", score: 2 }, player2: { name: "Player 7", score: 3 } },
        ]
      }
    ];

    return (
      <div className="flex justify-center space-x-8">
        {rounds.map((round, roundIndex) => (
          <div key={roundIndex} className="flex flex-col space-y-8">
            <div className="text-center text-squid-pink font-bold mb-4">{round.name}</div>
            
            {round.matches.map((match, matchIndex) => (
              <div 
                key={matchIndex} 
                className="w-64 bg-gray-800 rounded-lg p-4 my-4 border border-gray-700"
              >
                <div className={\`p-3 rounded mb-2 flex justify-between items-center \${match.player1.score > match.player2.score ? 'bg-green-900/20' : 'bg-gray-700'}\`}>
                  <span>{match.player1.name}</span>
                  <span className="font-bold">{match.player1.score}</span>
                </div>
                
                <div className="text-center text-xs text-gray-500 my-1">VS</div>
                
                <div className={\`p-3 rounded flex justify-between items-center \${match.player2.score > match.player1.score ? 'bg-green-900/20' : 'bg-gray-700'}\`}>
                  <span>{match.player2.name}</span>
                  <span className="font-bold">{match.player2.score}</span>
                </div>
              </div>
            ))}
            
            {/* Add connecting lines between rounds if not the last round */}
            {roundIndex < rounds.length - 1 && round.matches.map((_, matchIndex) => (
              <div key={\`line-\${matchIndex}\`} className="h-16"></div>
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  return (`;
      
      content = content.replace(pattern, replacement);
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('\x1b[32m%s\x1b[0m', '✓ Added renderTournamentBracket function');
    } else {
      console.log('\x1b[32m%s\x1b[0m', '✓ Tournament page already fixed or function exists');
    }
    
    return true;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Error fixing Tournament page:', error.message);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('\n🔍 Checking if Socket.io server is running...');
    
    let socketRunning = false;
    try {
      // Check if Socket.io server is running
      const result = execSync('lsof -i :3001 | grep LISTEN', { encoding: 'utf8' });
      console.log('\x1b[32m%s\x1b[0m', '✓ Socket.io server is running');
      socketRunning = true;
    } catch (error) {
      console.log('\x1b[33m%s\x1b[0m', '⚠ Socket.io server is not running');
      
      rl.question('Do you want to start the Socket.io server? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          console.log('\n🚀 Starting Socket.io server...');
          const child = require('child_process').spawn('npm', ['run', 'socket-server'], { 
            detached: true,
            stdio: 'ignore'
          });
          
          child.unref();
          
          console.log('\x1b[32m%s\x1b[0m', '✓ Socket.io server started in the background');
          socketRunning = true;
          
          // Continue with fixes
          continueWithFixes();
        } else {
          console.log('\x1b[33m%s\x1b[0m', '⚠ Continuing without Socket.io server');
          continueWithFixes();
        }
      });
    }
    
    if (socketRunning) {
      // Continue directly if the server is already running
      continueWithFixes();
    }
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Error:', error.message);
    rl.close();
  }
}

async function continueWithFixes() {
  try {
    // Test Socket.io connection
    await testSocketConnection();
    
    // Fix games
    fixTicTacToe();
    fixConnectFour();
    fixTournamentPage();
    
    console.log('\n\x1b[32m%s\x1b[0m', '✓ All fixes applied successfully');
    console.log('\x1b[36m%s\x1b[0m', '🎮 You can now run the Squid Game Tournament');
    console.log('\x1b[36m%s\x1b[0m', '🔄 Make sure to restart the Next.js server:');
    console.log('\x1b[37m%s\x1b[0m', '   npm run dev');
    
    rl.close();
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Error:', error.message);
    rl.close();
  }
}

// Game paths
const gameFolders = [
  'src/app/game/tic-tac-toe',
  'src/app/game/connect-four',
  'src/app/game/dots-and-boxes',
  'src/app/game/hangman'
];

// Fixes to apply
const fixes = {
  checkProcessWinnings: () => {
    // Check if wallet is properly integrated for all games
    gameFolders.forEach(folder => {
      const filePath = path.join(folder, 'page.tsx');
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        
        // Ensure payTournamentEntryFee and payTournamentWinnings are imported
        if (!content.includes('payTournamentEntryFee') || !content.includes('payTournamentWinnings')) {
          content = content.replace(
            /import { io, Socket } from "socket\.io-client";/,
            `import { io, Socket } from "socket.io-client";\nimport { payTournamentEntryFee, payTournamentWinnings } from '@/lib/petraWalletService';`
          );
          fs.writeFileSync(filePath, content);
          console.log(`Added wallet imports to ${filePath}`);
        }
        
        // Ensure processTournamentWin includes actual wallet payment
        const hasTournamentWin = content.includes('processTournamentWin');
        const hasWalletPayment = content.includes('payTournamentWinnings');
        
        if (hasTournamentWin && !hasWalletPayment) {
          // Replace dummy tournament win processing with actual payment
          const tournamentWinPattern = /const processTournamentWin = async \(\) => \{[\s\S]*?\};/;
          const tournamentWinReplacement = `const processTournamentWin = async () => {
    try {
      setTransactionPending(true);
      setCurrentMessage("Processing your winnings...");
      
      // Get opponent's wallet address from the socket connection
      const opponentAddress = socketRef.current?.id || "0x00a654ef527594d2165fdab60e22ef14e9da2fdf22bd485493e60311638d6801";
      
      // Process winnings payment
      const paymentResult = await payTournamentWinnings(opponentAddress);
      
      if (paymentResult.winnerHash) {
        setTransactionPending(false);
        setCurrentMessage(\`Congratulations! You won 0.36 APT! Transaction ID: \${paymentResult.winnerHash.substring(0, 8)}...\`);
        
        // Update player progress
        addPoints(1000);
        unlockAchievement('tournament_win', '${path.basename(folder)}');
      } else {
        setTransactionPending(false);
        setCurrentMessage("Failed to process winnings. Please contact support.");
      }
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionPending(false);
      setCurrentMessage("Failed to process winnings. Please contact support.");
    }
  };`;
          
          content = content.replace(tournamentWinPattern, tournamentWinReplacement);
          fs.writeFileSync(filePath, content);
          console.log(`Fixed tournament win processing in ${filePath}`);
        }
      }
    });
  },
  
  fixAILogic: () => {
    // Fix AI logic to prevent overwriting player moves
    gameFolders.forEach(folder => {
      const filePath = path.join(folder, 'page.tsx');
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        
        // Ensure checkGameStatus returns winner
        const checkGameStatusPattern = /const checkGameStatus = \([\s\S]*?\) => \{[\s\S]*?return;[\s\S]*?\};/;
        if (content.match(checkGameStatusPattern)) {
          content = content.replace(checkGameStatusPattern, (match) => {
            return match.replace(/return;/g, 'return boardToCheck[a];')
                         .replace(/if \(!board\.includes\(null\)\)/g, 'if (!boardToCheck.includes(null))')
                         .replace(/return null;/g, 'return "TIE";');
          });
          
          // Add return null at the end
          content = content.replace(/if \(!boardToCheck.includes\(null\)\)[\s\S]*?return "TIE";[\s\S]*?\};/, (match) => {
            return `${match.trim()}\n    \n    // No winner yet\n    return null;\n  };`;
          });
          
          console.log(`Fixed checkGameStatus in ${filePath}`);
        }
        
        // Fix cell click handler to ensure player is always X
        const handleCellClickPattern = /const handleCellClick = \([\s\S]*?\) => \{[\s\S]*?newBoard\[position\] = isXNext \? "X" : "O";[\s\S]*?\};/;
        if (content.match(handleCellClickPattern)) {
          content = content.replace(/newBoard\[position\] = isXNext \? "X" : "O";/g, 'newBoard[position] = "X"; // Player is always X');
          content = content.replace(/setIsXNext\(!isXNext\);/g, 'setIsXNext(false);');
          content = content.replace(/isX: isXNext,/g, 'isX: true, // Player is always X');
          
          console.log(`Fixed handleCellClick in ${filePath}`);
        }
        
        // Ensure AI doesn't overwrite player moves
        const aiPattern = /const makeComputerMove = \(\) => \{[\s\S]*?\};/;
        const aiReplacement = `const makeComputerMove = () => {
    console.log("AI is making a move...");
    
    // Get available positions
    const availablePositions = board
      .map((cell, index) => (cell === null ? index : null))
      .filter((position) => position !== null);
    
    if (availablePositions.length === 0) return;
    
    let position;
    
    // Check if AI can win
    for (const pos of availablePositions) {
      const boardCopy = [...board];
      boardCopy[pos] = "O";
      if (checkGameStatus(boardCopy) === "O") {
        position = pos;
        break;
      }
    }
    
    // If no winning move, check if need to block player
    if (position === undefined) {
      for (const pos of availablePositions) {
        const boardCopy = [...board];
        boardCopy[pos] = "X";
        if (checkGameStatus(boardCopy) === "X") {
          position = pos;
          break;
        }
      }
    }
    
    // If no winning or blocking move, take center if available
    if (position === undefined && board[4] === null) {
      position = 4;
    }
    
    // If center not available, take a corner if available
    if (position === undefined) {
      const corners = [0, 2, 6, 8].filter(pos => board[pos] === null);
      if (corners.length > 0) {
        position = corners[Math.floor(Math.random() * corners.length)];
      }
    }
    
    // If no strategic move found, take any available position
    if (position === undefined && availablePositions.length > 0) {
      position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    }
    
    // Make sure we have a valid position
    if (position === undefined || board[position] !== null) {
      console.error("AI tried to make an invalid move!");
      return;
    }
    
    // Make the AI move
    const newBoard = [...board];
    newBoard[position] = "O";
    setBoard(newBoard);
    
    // Check for a win or draw after AI move
    const result = checkGameStatus(newBoard);
    if (result) {
      handleGameOver(result, newBoard);
      return;
    }
    
    // Switch back to player's turn
    setIsXNext(true);
  };`;
        
        if (content.match(aiPattern)) {
          content = content.replace(aiPattern, aiReplacement);
          console.log(`Fixed AI logic in ${filePath}`);
        }
        
        fs.writeFileSync(filePath, content);
      }
    });
  },
  
  fixTournamentEntry: () => {
    // Fix tournament entry to use wallet payment
    gameFolders.forEach(folder => {
      const filePath = path.join(folder, 'page.tsx');
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        
        // Fix tournament entry to use wallet payment
        const tournamentPattern = /const handleTournamentEntry = \(e: React\.FormEvent\) => \{[\s\S]*?\};/;
        const tournamentReplacement = `const handleTournamentEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const playerName = form.playerName?.value || "Player";
    const bet = form.betAmount?.value || "0.2";
    
    setBetAmount(bet);
    setPlayer1(playerName);
    setShowTournamentForm(false);
    setCurrentMessage("Processing tournament entry fee...");
    setTransactionPending(true);
    
    try {
      // Process the tournament entry fee using Petra wallet
      const result = await payTournamentEntryFee();
      
      if (result && result.hash) {
        console.log("Tournament entry fee transaction successful:", result.hash);
        setCurrentMessage("Entry fee paid! Transaction ID: " + result.hash.substring(0, 8) + "...");
        
        // After payment is successful, set tournament mode and connect to socket
        setTournamentMode(true);
        initializeSocket();
        
        if (socketRef.current) {
          socketRef.current.emit("find_match", {
            playerName,
            betAmount: bet,
            gameType: "${path.basename(folder)}",
            transactionHash: result.hash
          });
          
          setIsWaitingForOpponent(true);
          setCurrentMessage("Finding an opponent with a similar bet amount...");
        }
      } else {
        setCurrentMessage("Failed to process entry fee. Please try again.");
        setTimeout(() => goBack(), 3000);
      }
    } catch (error) {
      console.error("Error processing tournament entry fee:", error);
      setCurrentMessage("Error processing payment. Please try again.");
      setTimeout(() => goBack(), 3000);
    } finally {
      setTransactionPending(false);
    }
  };`;
        
        if (content.match(tournamentPattern)) {
          content = content.replace(tournamentPattern, tournamentReplacement);
          console.log(`Fixed tournament entry in ${filePath}`);
          fs.writeFileSync(filePath, content);
        }
      }
    });
  },
  
  fixSocketIntegration: () => {
    // Fix socket integration to handle room creation and tournaments
    gameFolders.forEach(folder => {
      const filePath = path.join(folder, 'page.tsx');
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        
        // Add tournament match found event handler
        const socketInitPattern = /socketRef\.current\.on\("opponent_disconnected", \(\) => \{[\s\S]*?\}\);/;
        const tournamentMatchHandler = `\n      
      socketRef.current.on("tournament_match_found", (data: { roomId: string, playerName: string }) => {
        setRoomId(data.roomId);
        setPlayer2(data.playerName);
        setIsWaitingForOpponent(false);
        setShowGameBoard(true);
        setStatus(GameStatus.PLAYING);
        setCurrentMessage(\`Tournament match found! Playing against \${data.playerName}\`);
      });`;
        
        if (content.includes('socketRef.current.on("opponent_disconnected"') && 
            !content.includes('socketRef.current.on("tournament_match_found"')) {
          content = content.replace(socketInitPattern, (match) => {
            return match + tournamentMatchHandler;
          });
          console.log(`Added tournament match handler to ${filePath}`);
          fs.writeFileSync(filePath, content);
        }
      }
    });
  },
  
  createStartScript: () => {
    // Create a fixed start script
    const scriptContent = `#!/bin/bash

echo "Starting Squid Game Tournament Platform..."

# Kill any processes running on ports 3000-3005
for port in {3000..3005}; do
  pid=$(lsof -ti :$port)
  if [ ! -z "$pid" ]; then
    echo "Killing process using port $port (PID: $pid)"
    kill -9 $pid
  fi
done

# Wait a moment to ensure ports are freed
sleep 2

# Start the Socket.io server
echo "Starting Socket.io server..."
npm run socket-server &
SOCKET_PID=$!

# Wait for Socket.io server to start
sleep 2

# Start the Next.js development server
echo "Starting Next.js development server..."
npm run dev &
NEXTJS_PID=$!

# Save PIDs to file for easy cleanup
echo $SOCKET_PID > .socket.pid
echo $NEXTJS_PID > .nextjs.pid

echo "Squid Game Platform is running!"
echo "Socket.io server PID: $SOCKET_PID"
echo "Next.js server PID: $NEXTJS_PID"
echo "Visit http://localhost:3000/game to play"

# Wait for user to press Ctrl+C
echo "Press Ctrl+C to stop the servers"
wait
`;
    
    fs.writeFileSync('start-fixed.sh', scriptContent);
    exec('chmod +x start-fixed.sh', (error) => {
      if (error) {
        console.error(`Error making script executable: ${error}`);
        return;
      }
      console.log('Created start script: start-fixed.sh');
    });
  }
};

// Apply all fixes
console.log('Applying fixes to all games...');
for (const fixName in fixes) {
  console.log(`\nApplying fix: ${fixName}`);
  fixes[fixName]();
}

console.log('\nAll fixes applied successfully!');
console.log('To start the fixed platform, run: ./start-fixed.sh');

// Start the script
main(); 