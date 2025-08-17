#!/bin/bash

# Frontend Debug Script
# This script helps diagnose issues with the frontend setup

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Frontend Debug Script${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the frontend directory.${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

echo -e "${BLUE}Checking environment...${NC}"
echo ""

# Check Node.js version
echo -e "${YELLOW}Node.js version:${NC}"
node --version
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Node.js not found or not working${NC}"
else
    echo -e "${GREEN}✅ Node.js is working${NC}"
fi
echo ""

# Check npm version
echo -e "${YELLOW}npm version:${NC}"
npm --version
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm not found or not working${NC}"
else
    echo -e "${GREEN}✅ npm is working${NC}"
fi
echo ""

# Check package.json
echo -e "${YELLOW}Package.json contents:${NC}"
cat package.json
echo ""

# Check if package-lock.json exists
if [ -f "package-lock.json" ]; then
    echo -e "${GREEN}✅ package-lock.json exists${NC}"
    echo -e "${YELLOW}Package-lock.json size: $(ls -lh package-lock.json | awk '{print $5}')${NC}"
else
    echo -e "${RED}❌ package-lock.json missing${NC}"
fi
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules exists${NC}"
    echo -e "${YELLOW}node_modules size: $(du -sh node_modules | awk '{print $1}')${NC}"
else
    echo -e "${RED}❌ node_modules missing${NC}"
fi
echo ""

# Try npm ci with verbose output
echo -e "${BLUE}Trying npm ci with verbose output...${NC}"
echo -e "${YELLOW}Note: On Windows, permission errors are normal and can be ignored.${NC}"
echo ""

# Capture npm ci output and check for permission errors
npm_output=$(npm ci --verbose 2>&1)
npm_exit_code=$?

if echo "$npm_output" | grep -q "EPERM\|operation not permitted"; then
    echo -e "${YELLOW}⚠️  npm ci had permission issues (normal on Windows)${NC}"
    echo -e "${YELLOW}This is expected behavior on Windows and can be ignored.${NC}"
    echo ""
    echo -e "${YELLOW}Trying npm install instead...${NC}"
    if npm install; then
        echo -e "${GREEN}✅ npm install succeeded${NC}"
    else
        echo -e "${RED}❌ npm install also failed${NC}"
    fi
elif [ $npm_exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ npm ci succeeded${NC}"
else
    echo -e "${RED}❌ npm ci failed${NC}"
    echo -e "${YELLOW}Error output:${NC}"
    echo "$npm_output"
    echo ""
    echo -e "${YELLOW}Trying npm install instead...${NC}"
    if npm install; then
        echo -e "${GREEN}✅ npm install succeeded${NC}"
    else
        echo -e "${RED}❌ npm install also failed${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Debug information complete.${NC}"
echo ""
echo "Press Enter to continue..."
read
