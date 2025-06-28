#!/bin/bash

# ChainBot Desktop Development Script
echo "🚀 Starting ChainBot Desktop in development mode..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Start the GUI development server
print_status "Starting GUI development server..."
cd ../gui
npm run dev &
GUI_PID=$!

# Wait a moment for the server to start
sleep 3

# Start Electron
print_status "Starting Electron app..."
cd ../electron
npm start

# Cleanup
print_status "Cleaning up..."
kill $GUI_PID 2>/dev/null
print_success "Development session ended" 