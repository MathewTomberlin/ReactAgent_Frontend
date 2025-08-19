#!/bin/bash

echo "========================================"
echo "Starting React Frontend (Network Mode)"
echo "========================================"
echo ""

# Check if we're on Windows (Git Bash)
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    echo "Detected Windows environment (Git Bash)"
    echo "Note: If you encounter issues, try using Git Bash or WSL"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies"
        exit 1
    fi
fi

# Get local IP address
echo "Getting local IP address..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash)
    LOCAL_IP=$(ipconfig | grep "IPv4 Address" | head -1 | sed 's/.*: //' | tr -d ' ')
else
    # Linux/Mac
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

echo "Local IP address: $LOCAL_IP"
echo ""

# Check if port 5173 is already in use
echo "Checking if port 5173 is already in use..."
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "WARNING: Port 5173 is already in use"
    echo "This might be another instance of the frontend"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " choice
    if [[ ! "$choice" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

echo ""
echo "Starting React development server in NETWORK MODE..."
echo ""
echo "Frontend will be available at:"
echo "  Local:  http://localhost:5173"
echo "  Network: http://$LOCAL_IP:5173"
echo ""
echo "Backend should be running at:"
echo "  Local:  http://localhost:8080"
echo "  Network: http://$LOCAL_IP:8080"
echo ""
echo "For mobile testing:"
echo "  1. Make sure your phone is on the same WiFi network"
echo "  2. Open browser on your phone"
echo "  3. Navigate to: http://$LOCAL_IP:5173"
echo "  4. The frontend should automatically detect the correct backend URL"
echo ""
echo "SECURITY NOTE: This makes the frontend accessible to other devices"
echo "on your network. Only use for development/testing on trusted networks."
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server with network access
npm run dev -- --host
