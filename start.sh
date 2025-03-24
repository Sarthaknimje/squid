#!/bin/bash

# Set colors for output
GREEN="\033[0;32m"
BLUE="\033[0;34m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m" # No Color

# Print header
echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BLUE}     SQUID GAME TOURNAMENT PLATFORM STARTER     ${NC}"
echo -e "${BLUE}===============================================${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed or not in PATH${NC}"
    echo -e "Please install Node.js from https://nodejs.org/\n"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js is installed ($(node -v))"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm is installed ($(npm -v))"

# Ensure dependencies are installed
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Dependencies installed successfully"
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi

# Check if port 3001 is already in use
PORT_CHECK=$(lsof -i:3001 -t)
if [ -n "$PORT_CHECK" ]; then
    echo -e "\n${YELLOW}Port 3001 is already in use by process(es): $PORT_CHECK${NC}"
    read -p "Do you want to kill the process(es) and continue? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Killing process(es)...${NC}"
        kill $PORT_CHECK 2>/dev/null || kill -9 $PORT_CHECK 2>/dev/null
        sleep 2
        
        # Check again to make sure port is free
        if [ -n "$(lsof -i:3001 -t)" ]; then
            echo -e "${RED}Failed to free up port 3001. Please close the applications using this port manually.${NC}"
            exit 1
        else
            echo -e "${GREEN}✓${NC} Port 3001 is now available"
        fi
    else
        echo -e "${RED}Cannot continue. Socket.io server requires port 3001.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Port 3001 is available"
fi

# Start Socket.io server in the background
echo -e "\n${YELLOW}Starting Socket.io server...${NC}"
npm run socket-server &
SOCKET_PID=$!

# Check if Socket.io server started successfully
sleep 2
if ps -p $SOCKET_PID > /dev/null; then
    echo -e "${GREEN}✓${NC} Socket.io server started successfully (PID: $SOCKET_PID)"
else
    echo -e "${RED}Failed to start Socket.io server${NC}"
    exit 1
fi

# Start Next.js development server
echo -e "\n${YELLOW}Starting Next.js development server...${NC}"
echo -e "${GREEN}✓${NC} Once started, open ${BLUE}http://localhost:3000${NC} in your browser\n"

# Start Next.js server and route its output
npm run dev

# When the user presses Ctrl+C, kill the Socket.io server too
trap "kill $SOCKET_PID 2>/dev/null" EXIT

# If we got here, it means the Next.js server was stopped
echo -e "\n${YELLOW}Stopping all servers...${NC}"
kill $SOCKET_PID 2>/dev/null
echo -e "${GREEN}✓${NC} All servers stopped" 