#!/bin/bash
set -e

# ChainBot GUI MacOS DMG Build Script
# This script builds, signs, notarizes, and packages a DMG installer for ChainBot GUI.
# Usage: ./scripts/build-macos-dmg.sh

# 1. Build the frontend
npm install
npm run build

# 2. Package the Electron app (creates dist/ChainBot-*.dmg and .zip)
npm run electron:build

# 3. Sign the app (requires Apple Developer ID Application certificate)
echo "Signing the app..."
npm run electron:sign

# 4. Notarize the app (requires Apple Developer credentials)
echo "Notarizing the app..."
npm run electron:notarize

# 5. Output location
echo "\n✅ DMG build complete! Find your installer in:"
echo "$(pwd)/dist/"
ls -lh dist/*.dmg || echo "No DMG found. Check build logs for errors." 