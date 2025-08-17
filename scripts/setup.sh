#!/bin/bash

# Frontend Setup Script
# This script sets up the frontend development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Frontend Setup Script${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js first.${NC}"
    echo "Download from: https://nodejs.org/"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}Warning: Node.js version $(node --version) detected.${NC}"
    echo -e "${YELLOW}Recommended: Node.js 18 or higher for best compatibility.${NC}"
    echo ""
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install npm first.${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

echo -e "${BLUE}Installing dependencies...${NC}"
npm install

echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
echo ""

echo -e "${BLUE}Setting up environment...${NC}"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Creating .env.local file...${NC}"
    cat > .env.local << EOF
# Local development API configuration
VITE_API_BASE=http://localhost:8080
EOF
    echo -e "${GREEN}✅ Created .env.local${NC}"
else
    echo -e "${GREEN}✅ .env.local already exists${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Frontend setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Start the backend: cd ../backend && uvicorn main:app --reload --host 0.0.0.0 --port 8080"
echo "2. Start the frontend: ./test-frontend.sh"
echo "3. Open your browser to: http://localhost:5173"
echo ""
echo -e "${BLUE}Available scripts:${NC}"
echo "  ./test-frontend.sh - Start development server"
echo "  ./deploy.sh staging - Deploy to staging"
echo "  ./deploy.sh production - Deploy to production"
echo ""
echo "Press Enter to continue..."
read
