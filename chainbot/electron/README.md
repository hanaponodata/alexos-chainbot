# ChainBot Desktop - Native macOS Application

ChainBot Desktop is a native macOS application built with Electron that provides a desktop interface for the ChainBot AI agent orchestration platform, with direct integration to Raspberry Pi and ALEX OS.

## Features

- **Native macOS UI**: Full native macOS application with proper menu bar, dock integration, and system notifications
- **Pi Integration**: Direct SSH connection to Raspberry Pi for remote management
- **ALEX OS Control**: Start, stop, and monitor ALEX OS services on the Pi
- **Workflow Deployment**: Deploy ChainBot workflows directly to ALEX OS
- **Real-time Monitoring**: Live status monitoring of Pi and ALEX OS services
- **Secure Communication**: Encrypted SSH connections with key-based authentication

## Prerequisites

- macOS 10.15 or later
- Node.js 18+ and npm
- SSH key pair for Pi authentication
- Raspberry Pi running ALEX OS

## Setup

1. **Install Dependencies**
   ```bash
   cd electron
   npm install
   ```

2. **Configure Pi Connection**
   - Update Pi configuration in the app settings
   - Ensure SSH key is properly configured
   - Test connection to Pi

3. **Build the Application**
   ```bash
   # Development mode
   npm run dev
   
   # Build for distribution
   npm run build-mac
   ```

## Development

### Running in Development Mode
```bash
# Start the React development server
cd ../gui && npm run dev

# In another terminal, start Electron
cd electron && npm run dev
```

### Building for Distribution
```bash
# Build for macOS (Intel + Apple Silicon)
npm run build-mac

# Build for all platforms
npm run build
```

The built application will be available in the `dist` folder.

## Pi Integration

### SSH Configuration
The app uses SSH for secure communication with the Raspberry Pi:

1. **Generate SSH Key** (if not already done):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "chainbot@mac"
   ```

2. **Copy Public Key to Pi**:
   ```bash
   ssh-copy-id pi@your-pi-ip
   ```

3. **Configure in App**:
   - Host: Pi IP address
   - Port: SSH port (default: 22)
   - Username: Pi username (default: pi)
   - Key Path: Path to private key

### ALEX OS Integration
The app can control ALEX OS services on the Pi:

- **Start ALEX OS**: `sudo systemctl start alexos`
- **Stop ALEX OS**: `sudo systemctl stop alexos`
- **Check Status**: `sudo systemctl status alexos`

## Workflow Deployment

Workflows created in ChainBot can be deployed directly to ALEX OS:

1. **Create Workflow**: Use the workflow builder in the app
2. **Test Locally**: Execute workflow in ChainBot backend
3. **Deploy to Pi**: Click "Export to ALEX OS" to deploy
4. **Monitor Execution**: View real-time logs and status

## Security Features

- **Code Signing**: Application is code-signed for macOS security
- **Hardened Runtime**: Uses macOS hardened runtime for additional security
- **Sandboxing**: Limited file system access for security
- **Encrypted Communication**: All Pi communication is encrypted via SSH

## Troubleshooting

### Common Issues

1. **Pi Connection Failed**
   - Verify Pi IP address and SSH port
   - Check SSH key permissions (should be 600)
   - Ensure Pi is accessible on network

2. **ALEX OS Commands Fail**
   - Verify sudo permissions on Pi
   - Check ALEX OS service installation
   - Review system logs on Pi

3. **Build Errors**
   - Ensure all dependencies are installed
   - Check Node.js version compatibility
   - Verify Xcode command line tools are installed

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=chainbot:* npm run dev
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   macOS App     │    │   ChainBot      │    │   Raspberry Pi  │
│   (Electron)    │◄──►│   Backend       │◄──►│   (ALEX OS)     │
│                 │    │   (FastAPI)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   PostgreSQL    │    │   SSH/System    │
│   Components    │    │   Database      │    │   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 