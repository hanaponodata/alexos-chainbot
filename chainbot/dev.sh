#!/bin/bash

# ChainBot Unified Development Script
# This script starts the complete ChainBot development environment

set -e

echo "🚀 Starting ChainBot Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "requirements.txt" ] || [ ! -d "gui" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the chainbot root directory"
    exit 1
fi

# Function to cleanup processes on exit
cleanup() {
    print_status "Cleaning up processes..."
    if [ ! -z "$GUI_PID" ]; then
        kill $GUI_PID 2>/dev/null || true
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$ELECTRON_PID" ]; then
        kill $ELECTRON_PID 2>/dev/null || true
    fi
    print_success "Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check dependencies
print_status "Checking dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed"
    exit 1
fi

print_success "Dependencies check passed"

# Install dependencies if needed
print_status "Checking and installing dependencies..."

# Install GUI dependencies
if [ ! -d "gui/node_modules" ]; then
    print_status "Installing GUI dependencies..."
    cd gui && npm install && cd ..
fi

# Install Electron dependencies
if [ ! -d "electron/node_modules" ]; then
    print_status "Installing Electron dependencies..."
    cd electron && npm install && cd ..
fi

# Install Backend dependencies
if [ ! -d "backend/venv" ]; then
    print_status "Setting up Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r ../requirements.txt
    cd ..
fi

print_success "Dependencies ready"

# Start Backend
print_status "Starting FastAPI backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start GUI
print_status "Starting React development server..."
cd gui
npm run dev &
GUI_PID=$!
cd ..

# Wait for GUI to start
sleep 5

# Start Electron
print_status "Starting Electron desktop app..."
cd electron
npm start &
ELECTRON_PID=$!
cd ..

print_success "ChainBot development environment started!"
print_status "Backend: http://localhost:8000"
print_status "GUI: http://localhost:5173 (or next available port)"
print_status "Electron: Native desktop app"
print_status ""
print_status "Press Ctrl+C to stop all services"

# Wait for user to stop
wait 