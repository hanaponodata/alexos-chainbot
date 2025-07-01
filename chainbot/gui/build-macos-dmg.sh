#!/bin/bash

# ChainBot GUI MacOS DMG Builder
# Builds, signs, notarizes, and packages the DMG installer

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ChainBot GUI"
BUNDLE_ID="com.alexos.chainbot-gui"
VERSION=$(node -p "require('./package.json').version")
BUILD_DIR="dist"
DMG_NAME="${APP_NAME// /}-${VERSION}.dmg"
TEMP_DMG="temp.dmg"
MOUNT_POINT="/Volumes/${APP_NAME}"

# Ensure we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the GUI directory.${NC}"
    echo -e "${YELLOW}Expected location: /Users/alex/Documents/alexos/alexos-chainbot/chainbot/gui${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Building ChainBot GUI for MacOS...${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo -e "${BLUE}Bundle ID: ${BUNDLE_ID}${NC}"

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf ${BUILD_DIR}
rm -f ${DMG_NAME}
rm -f ${TEMP_DMG}

# Install dependencies with legacy peer deps to handle React conflicts
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --legacy-peer-deps

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npx vite build --mode production

# Check if build was successful
if [ ! -d "${BUILD_DIR}" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Create DMG
echo -e "${YELLOW}📦 Creating DMG...${NC}"

# Create temporary DMG
hdiutil create -volname "${APP_NAME}" -srcfolder ${BUILD_DIR} -ov -format UDZO ${TEMP_DMG}

# Rename to final name
mv ${TEMP_DMG} ${DMG_NAME}

echo -e "${GREEN}✅ DMG created: ${DMG_NAME}${NC}"

# Code signing (if certificates are available)
if security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo -e "${YELLOW}🔐 Code signing DMG...${NC}"
    
    # Get the first available Developer ID certificate
    CERT_ID=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | awk '{print $2}' | tr -d '"')
    
    if [ ! -z "$CERT_ID" ]; then
        codesign --force --verify --verbose --sign "$CERT_ID" ${DMG_NAME}
        echo -e "${GREEN}✅ DMG signed with certificate: ${CERT_ID}${NC}"
    else
        echo -e "${YELLOW}⚠️  No Developer ID certificate found, skipping code signing${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No Developer ID certificates found, skipping code signing${NC}"
fi

# Notarization (if Apple ID is configured)
if [ ! -z "$APPLE_ID" ] && [ ! -z "$APPLE_ID_PASSWORD" ]; then
    echo -e "${YELLOW}🍎 Notarizing DMG...${NC}"
    
    # Submit for notarization
    xcrun notarytool submit ${DMG_NAME} \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_ID_PASSWORD" \
        --team-id "$TEAM_ID" \
        --wait
    
    # Staple the notarization ticket
    xcrun stapler staple ${DMG_NAME}
    
    echo -e "${GREEN}✅ DMG notarized successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Apple ID credentials not configured, skipping notarization${NC}"
    echo -e "${BLUE}To enable notarization, set these environment variables:${NC}"
    echo -e "${BLUE}  export APPLE_ID='your-apple-id@example.com'${NC}"
    echo -e "${BLUE}  export APPLE_ID_PASSWORD='your-app-specific-password'${NC}"
    echo -e "${BLUE}  export TEAM_ID='your-team-id'${NC}"
fi

# Final verification
echo -e "${YELLOW}🔍 Verifying DMG...${NC}"
hdiutil verify ${DMG_NAME}

# Display results
echo -e "${GREEN}🎉 DMG build completed successfully!${NC}"
echo -e "${BLUE}📁 Output file: ${DMG_NAME}${NC}"
echo -e "${BLUE}📏 File size: $(du -h ${DMG_NAME} | cut -f1)${NC}"

# Optional: Open the DMG
read -p "Would you like to open the DMG? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open ${DMG_NAME}
fi

echo -e "${GREEN}✨ All done!${NC}" 