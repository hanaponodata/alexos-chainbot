const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

// Dynamically read version from package.json
const packageJson = require(path.join(__dirname, '../package.json'));
const dynamicVersion = packageJson.version || '1.0.0';

// MacOS Distribution Configuration
const MACOS_CONFIG = {
  // App metadata
  appName: 'ChainBot GUI',
  appVersion: dynamicVersion,
  appDescription: 'AI Agent Orchestration Platform',
  appIdentifier: 'com.alexos.chainbot-gui',
  appCategory: 'public.app-category.developer-tools',
  
  // Code signing
  codeSigning: {
    identity: process.env.MACOS_IDENTITY || 'Developer ID Application: Alex OS (XXXXXXXXXX)',
    entitlements: path.join(__dirname, 'entitlements.mac.plist'),
    hardenedRuntime: true,
    gatekeeperAssess: false,
    timestamp: true
  },
  
  // Notarization
  notarization: {
    enabled: process.env.NOTARIZE === 'true',
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
    ascProvider: process.env.APPLE_ASC_PROVIDER
  },
  
  // Distribution channels
  channels: {
    stable: {
      url: 'https://releases.alexos.com/chainbot-gui/stable',
      updateUrl: 'https://releases.alexos.com/chainbot-gui/stable/updates.json'
    },
    beta: {
      url: 'https://releases.alexos.com/chainbot-gui/beta',
      updateUrl: 'https://releases.alexos.com/chainbot-gui/beta/updates.json'
    },
    dev: {
      url: 'https://releases.alexos.com/chainbot-gui/dev',
      updateUrl: 'https://releases.alexos.com/chainbot-gui/dev/updates.json'
    }
  },
  
  // Build configuration
  build: {
    appId: 'com.alexos.chainbot-gui',
    productName: 'ChainBot GUI',
    copyright: 'Copyright \u00a9 2024 Alex OS',
    directories: {
      output: 'dist',
      buildResources: 'build'
    },
    files: [
      'dist/**/*',
      'node_modules/**/*',
      'package.json'
    ],
    mac: {
      target: [
        {
          target: 'dmg',
          arch: ['x64', 'arm64']
        },
        {
          target: 'zip',
          arch: ['x64', 'arm64']
        }
      ],
      category: 'public.app-category.developer-tools',
      hardenedRuntime: true,
      gatekeeperAssess: false,
      entitlements: 'entitlements.mac.plist',
      entitlementsInherit: 'entitlements.mac.plist',
      icon: 'build/icon.icns',
      darkModeSupport: true,
      type: 'distribution'
    },
    dmg: {
      title: 'ChainBot GUI Installer',
      icon: 'build/icon.icns',
      background: 'build/background.png',
      window: {
        width: 540,
        height: 380
      },
      contents: [
        {
          x: 130,
          y: 220
        },
        {
          x: 410,
          y: 220,
          type: 'link',
          path: '/Applications'
        }
      ]
    },
    publish: [
      {
        provider: 'github',
        owner: 'alexos',
        repo: 'chainbot-gui-releases',
        private: false,
        releaseType: 'release'
      }
    ]
  }
};

// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Update checking
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  // Send to renderer process
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log('Download progress:', progressObj);
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

// IPC handlers for update management
ipcMain.handle('check-for-updates', async (event, channel = 'stable') => {
  try {
    // Set update URL based on channel
    const channelConfig = MACOS_CONFIG.channels[channel];
    if (channelConfig) {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: channelConfig.updateUrl
      });
    }
    
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: result?.updateInfo || null
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('download-update', async (event, url) => {
  try {
    const result = await autoUpdater.downloadUpdate();
    return {
      success: true,
      progress: 100
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('install-update', async (event) => {
  try {
    autoUpdater.quitAndInstall();
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

// Code signing verification
ipcMain.handle('verify-signature', async (event, filePath) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const { stdout } = await execAsync(`codesign -dv --verbose=4 "${filePath}"`);
    return {
      success: true,
      signature: stdout
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Notarization status check
ipcMain.handle('check-notarization', async (event, filePath) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const { stdout } = await execAsync(`spctl --assess --type exec "${filePath}"`);
    return {
      success: true,
      notarized: stdout.includes('accepted')
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// App Store submission helpers
ipcMain.handle('prepare-app-store', async (event) => {
  try {
    // Generate App Store metadata
    const metadata = {
      name: MACOS_CONFIG.appName,
      version: MACOS_CONFIG.appVersion,
      description: MACOS_CONFIG.appDescription,
      category: MACOS_CONFIG.appCategory,
      keywords: ['AI', 'Agent', 'Orchestration', 'Development'],
      screenshots: [
        'screenshots/main.png',
        'screenshots/chat.png',
        'screenshots/workflows.png'
      ],
      icon: 'build/icon.icns'
    };
    
    // Save metadata
    fs.writeFileSync(
      path.join(__dirname, 'app-store-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    return {
      success: true,
      metadata
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Distribution utilities
class MacOSDistributor {
  constructor() {
    this.config = MACOS_CONFIG;
  }
  
  // Generate entitlements file
  generateEntitlements() {
    const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.device.usb</key>
    <true/>
    <key>com.apple.security.device.serial</key>
    <true/>
</dict>
</plist>`;
    
    fs.writeFileSync(
      path.join(__dirname, 'entitlements.mac.plist'),
      entitlements
    );
  }
  
  // Generate Info.plist
  generateInfoPlist() {
    const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${this.config.appName}</string>
    <key>CFBundleDisplayName</key>
    <string>${this.config.appName}</string>
    <key>CFBundleIdentifier</key>
    <string>${this.config.appIdentifier}</string>
    <key>CFBundleVersion</key>
    <string>${this.config.appVersion}</string>
    <key>CFBundleShortVersionString</key>
    <string>${this.config.appVersion}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>ChainBot GUI</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleDocumentTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeName</key>
            <string>ChainBot GUI Workflow</string>
            <key>CFBundleTypeExtensions</key>
            <array>
                <string>cbot</string>
            </array>
            <key>CFBundleTypeRole</key>
            <string>Editor</string>
            <key>LSHandlerRank</key>
            <string>Owner</string>
        </dict>
    </array>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
    <key>LSMinimumSystemVersion</key>
    <string>10.15.0</string>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>`;
    
    fs.writeFileSync(
      path.join(__dirname, 'Info.plist'),
      infoPlist
    );
  }
  
  // Generate update manifest
  generateUpdateManifest(channel = 'stable') {
    const manifest = {
      version: this.config.appVersion,
      files: [
        {
          url: `${this.config.channels[channel].url}/ChainBot-GUI-${this.config.appVersion}-mac.zip`,
          sha512: '', // Will be calculated
          size: 0 // Will be calculated
        }
      ],
      path: `ChainBot-GUI-${this.config.appVersion}-mac.zip`,
      sha512: '', // Will be calculated
      releaseDate: new Date().toISOString()
    };
    
    return manifest;
  }
  
  // Calculate file checksum
  calculateChecksum(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha512');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }
  
  // Sign application
  async signApplication(appPath) {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      await execAsync(`codesign --force --sign "${this.config.codeSigning.identity}" --entitlements "${this.config.codeSigning.entitlements}" --timestamp "${appPath}"`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Notarize application
  async notarizeApplication(appPath) {
    if (!this.config.notarization.enabled) {
      return { success: true, skipped: true };
    }
    
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      await execAsync(`xcrun altool --notarize-app --primary-bundle-id "${this.config.appIdentifier}" --username "${this.config.notarization.appleId}" --password "${this.config.notarization.appleIdPassword}" --file "${appPath}"`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export distributor
module.exports = {
  MacOSDistributor,
  MACOS_CONFIG
}; 