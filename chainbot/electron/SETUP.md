# ChainBot Desktop Setup Guide

This guide will help you set up and run the ChainBot desktop application on macOS.

## Prerequisites

- macOS 10.15 or later
- Node.js 18+ and npm
- Python 3.8+ (for backend)
- PostgreSQL (for backend)
- SSH key pair for Pi authentication

## Quick Start

### 1. Install Dependencies

```bash
# Install Electron dependencies
cd electron
npm install

# Install GUI dependencies
cd ../gui
npm install

# Install Backend dependencies
cd ../backend
pip install -r ../requirements.txt
```

### 2. Start Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Start Desktop App

```bash
cd electron
./dev.sh
```

## Development Workflow

### Option 1: Using the dev script (Recommended)
```bash
cd electron
./dev.sh
```

This script will:
- Start the GUI development server
- Wait for it to be ready
- Launch the Electron app
- Clean up processes when you exit

### Option 2: Manual development
```bash
# Terminal 1: Start GUI
cd gui
npm run dev

# Terminal 2: Start Electron
cd electron
npm start
```

### Option 3: Using npm dev script
```bash
cd electron
npm run dev
```

## Building for Distribution

### Build macOS App
```bash
cd electron
./build.sh
```

This will:
- Build the React frontend
- Package it with Electron
- Create a macOS app bundle
- Generate a DMG installer

### Build Output
- `dist/ChainBot.app` - Native macOS application
- `dist/ChainBot-*.dmg` - Installer package

## Pi Integration Setup

### 1. Generate SSH Key
```bash
ssh-keygen -t rsa -b 4096 -C "chainbot@mac"
```

### 2. Copy to Pi
```bash
ssh-copy-id pi@your-pi-ip
```

### 3. Test Connection
```bash
ssh pi@your-pi-ip
```

### 4. Configure in App
- Open ChainBot Desktop
- Connect to Pi using the status bar
- Configure Pi settings in the app

## Features

### Core Features
- **Workflow Builder**: Visual workflow creation
- **Agent Management**: Spawn and manage AI agents
- **Real-time Chat**: Interactive chat interface
- **Session Management**: Organize work into sessions

### Pi Integration
- **SSH Connection**: Secure connection to Raspberry Pi
- **ALEX OS Control**: Start/stop ALEX OS services
- **Watchtower Management**: Full Watchtower monitoring
- **Service Status**: Real-time status monitoring

### Watchtower Features
- **Service Control**: Start/stop/restart Watchtower
- **Configuration**: Edit YAML configuration
- **Log Monitoring**: View real-time logs
- **Alert Management**: Monitor system alerts
- **Metrics**: View Prometheus metrics
- **Target Management**: Monitor endpoints

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - The app will automatically try ports 5173, 5174, 5175
   - Check if another process is using these ports

2. **Pi Connection Failed**
   - Verify Pi IP address
   - Check SSH key permissions (should be 600)
   - Ensure Pi is accessible on network

3. **Build Errors**
   - Ensure all dependencies are installed
   - Check Node.js version compatibility
   - Verify Xcode command line tools are installed

4. **Watchtower Commands Fail**
   - Verify sudo permissions on Pi
   - Check Watchtower installation
   - Review system logs on Pi

### Debug Mode
```bash
# Enable debug logging
DEBUG=chainbot:* ./dev.sh
```

### Manual Testing
```bash
# Test Pi connection
cd electron
node -e "
const { PiIntegration } = require('./main.js');
const pi = new PiIntegration();
pi.connectToPi().then(() => console.log('Connected')).catch(console.error);
"
```

## File Structure

```
electron/
├── main.js              # Main Electron process
├── preload.js           # Preload script for security
├── package.json         # Dependencies and build config
├── entitlements.mac.plist # macOS security entitlements
├── dev.sh              # Development script
├── build.sh            # Build script
└── assets/             # App assets (icons, etc.)

gui/
├── src/
│   ├── App.tsx         # Main app component
│   ├── WatchtowerManager.tsx # Watchtower interface
│   ├── WorkflowBuilder.tsx   # Workflow builder
│   ├── AgentManager.tsx      # Agent management
│   └── ...            # Other components
└── package.json        # Frontend dependencies

backend/
├── app/
│   ├── main.py         # FastAPI application
│   ├── api/            # API endpoints
│   ├── services/       # Business logic
│   └── models/         # Database models
└── requirements.txt    # Python dependencies
```

## Security Features

- **Code Signing**: Application is code-signed for macOS
- **Hardened Runtime**: Uses macOS hardened runtime
- **Sandboxing**: Limited file system access
- **Encrypted Communication**: SSH for Pi communication
- **Context Isolation**: Secure renderer process

## Next Steps

1. **Customize Configuration**: Update Pi settings and Watchtower config
2. **Add Icons**: Replace placeholder icons with proper app icons
3. **Code Signing**: Sign the app for distribution
4. **Testing**: Test all features with your Pi setup
5. **Deployment**: Distribute the app to users

## Support

For issues and questions:
- Check the troubleshooting section
- Review the main README.md
- Create an issue in the repository 