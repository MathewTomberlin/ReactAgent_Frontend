#!/bin/bash

echo "Starting React Frontend Development Server..."
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

echo "Starting development server..."
echo "Frontend will be available at: http://localhost:5173"
echo "Make sure your backend is running at: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
