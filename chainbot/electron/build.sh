#!/bin/bash

# ChainBot Desktop Build Script for macOS
# This script builds the ChainBot desktop application for macOS

set -e

echo "🚀 Building ChainBot Desktop for macOS..."

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

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS only"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js version: $(node --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the electron directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing Electron dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Build the React frontend
print_status "Building React frontend..."
cd ../gui

# Install GUI dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing GUI dependencies..."
    npm install
fi

# Build the production version
npm run build
print_success "React frontend built"

# Go back to electron directory
cd ../electron

# Build the Electron app
print_status "Building Electron application..."
npm run build-mac

print_success "Build completed successfully!"
print_status "The application is available in the dist/ folder"

# Check if the app was created
if [ -d "dist/mac" ]; then
    print_success "macOS application created:"
    ls -la dist/mac/
    
    # Check for DMG file
    if [ -f "dist/ChainBot-*.dmg" ]; then
        print_success "DMG installer created:"
        ls -la dist/ChainBot-*.dmg
    fi
else
    print_warning "No macOS build found in dist/mac/"
fi

print_status "Build process completed!"
print_status "You can now distribute the ChainBot.app or ChainBot.dmg file" 