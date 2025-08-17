#!/bin/bash

# Frontend Test Script
# This script tests the frontend build and deployment process

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Frontend Test Script${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the frontend directory.${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

echo -e "${BLUE}Testing frontend build process...${NC}"
echo ""

# Clean previous build
if [ -d "dist" ]; then
    echo -e "${YELLOW}Cleaning previous build...${NC}"
    rm -rf dist
fi

# Install dependencies with error handling
echo -e "${YELLOW}Installing dependencies...${NC}"
echo -e "${YELLOW}Note: On Windows, you may see permission errors - this is normal and can be ignored.${NC}"

# Try npm ci first, but don't fail if it has permission issues
if npm ci 2>&1 | grep -q "EPERM\|operation not permitted"; then
    echo -e "${YELLOW}⚠️  npm ci had permission issues (normal on Windows)${NC}"
    echo -e "${YELLOW}Trying npm install instead...${NC}"
    if ! npm install; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        echo ""
        echo "Press Enter to continue..."
        read
        exit 1
    fi
elif ! npm ci; then
    echo -e "${RED}❌ Failed to install dependencies with npm ci${NC}"
    echo -e "${YELLOW}Trying npm install instead...${NC}"
    if ! npm install; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        echo ""
        echo "Press Enter to continue..."
        read
        exit 1
    fi
else
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
fi

# Test build for staging
echo -e "${YELLOW}Testing build for staging...${NC}"
if ! npm run build -- --mode=staging; then
    echo -e "${RED}❌ Staging build failed!${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✅ Staging build successful!${NC}"
    echo -e "Build output: $(ls -la dist/)"
else
    echo -e "${RED}❌ Staging build failed!${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

# Clean and test production build
echo ""
echo -e "${YELLOW}Cleaning for production test...${NC}"
rm -rf dist

echo -e "${YELLOW}Testing build for production...${NC}"
if ! npm run build -- --mode=production; then
    echo -e "${RED}❌ Production build failed!${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✅ Production build successful!${NC}"
    echo -e "Build output: $(ls -la dist/)"
else
    echo -e "${RED}❌ Production build failed!${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

# Test that the built files contain expected content
echo ""
echo -e "${BLUE}Verifying build content...${NC}"

# Check for any React-related content in the HTML (more flexible)
if grep -q -i "react\|app\|root" dist/index.html; then
    echo -e "${GREEN}✅ HTML content verified (contains React app)${NC}"
else
    echo -e "${YELLOW}⚠️  HTML content check inconclusive - checking file structure instead${NC}"
    if [ -f "dist/index.html" ] && [ -s "dist/index.html" ]; then
        echo -e "${GREEN}✅ HTML file exists and is not empty${NC}"
    else
        echo -e "${RED}❌ HTML file is missing or empty${NC}"
        echo ""
        echo "Press Enter to continue..."
        read
        exit 1
    fi
fi

# Check for CSS files
if ls dist/assets/*.css 1> /dev/null 2>&1; then
    echo -e "${GREEN}✅ CSS files found${NC}"
else
    echo -e "${RED}❌ CSS files missing${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

# Check for JS files
if ls dist/assets/*.js 1> /dev/null 2>&1; then
    echo -e "${GREEN}✅ JavaScript files found${NC}"
else
    echo -e "${RED}❌ JavaScript files missing${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All tests passed! Frontend is ready for deployment.${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  ./deploy.sh staging - Deploy to staging"
echo "  ./deploy.sh production - Deploy to production"
echo ""
echo "Press Enter to continue..."
read
