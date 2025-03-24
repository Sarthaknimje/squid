#!/bin/bash

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
