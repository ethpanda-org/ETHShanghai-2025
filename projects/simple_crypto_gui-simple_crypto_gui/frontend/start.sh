#!/bin/bash

# Color definitions
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${GREEN}=== Web Wallet Startup Script ===${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed!${NC}"
    echo -e "${YELLOW}Please install Node.js version 14 or higher before running this script.${NC}"
    echo -e "${YELLOW}You can download it from https://nodejs.org/${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed!${NC}"
    echo -e "${YELLOW}npm usually comes with Node.js installation. Please ensure your Node.js installation is complete.${NC}"
    exit 1
fi

# Display Node.js and npm versions
echo -e "${GREEN}Node.js version:${NC}"
node --version
echo -e "${GREEN}npm version:${NC}"
npm --version

echo -e "\n${GREEN}Installing dependencies...${NC}"

# Install dependencies
if npm install; then
    echo -e "\n${GREEN}Dependencies installed successfully!${NC}"
    
    echo -e "\n${GREEN}Starting development server...${NC}"
    # Start development server
    npm run dev
else
    echo -e "\n${RED}Failed to install dependencies!${NC}"
    echo -e "${YELLOW}Please check your network connection or npm configuration and try again.${NC}"
    exit 1
fi