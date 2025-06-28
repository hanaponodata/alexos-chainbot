const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { spawn, exec } = require('child_process');
const os = require('os');

// Initialize persistent storage
const store = new Store();

// Global reference to window object
let mainWindow;
let watchtowerProcess = null;
let watchtowerStatus = 'stopped';

// Watchtower configuration
const WATCHTOWER_CONFIG = {
  port: 8080,
  configPath: path.join(os.homedir(), '.watchtower', 'config.yml'),
  logPath: path.join(os.homedir(), '.watchtower', 'logs'),
  dataPath: path.join(os.homedir(), '.watchtower', 'data')
};

// Ensure Watchtower directories exist
function ensureWatchtowerDirectories() {
  const dirs = [
    path.dirname(WATCHTOWER_CONFIG.configPath),
    WATCHTOWER_CONFIG.logPath,
    WATCHTOWER_CONFIG.dataPath
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Check if Watchtower is installed
function isWatchtowerInstalled() {
  return new Promise((resolve) => {
    exec('which watchtower', (error) => {
      resolve(!error);
    });
  });
}

// Get Watchtower version
function getWatchtowerVersion() {
  return new Promise((resolve) => {
    exec('watchtower --version', (error, stdout) => {
      if (error) {
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// Check if Watchtower is running
function isWatchtowerRunning() {
  return new Promise((resolve) => {
    exec('pgrep -f watchtower', (error) => {
      resolve(!error);
    });
  });
}

// Get Watchtower dashboard URL
function getWatchtowerDashboardUrl() {
  return `http://localhost:${WATCHTOWER_CONFIG.port}`;
}

// Start Watchtower service
function startWatchtower() {
  return new Promise((resolve) => {
    if (watchtowerProcess) {
      resolve({ success: false, error: 'Watchtower is already running' });
      return;
    }

    ensureWatchtowerDirectories();

    // Create default config if it doesn't exist
    if (!fs.existsSync(WATCHTOWER_CONFIG.configPath)) {
      const defaultConfig = `# Watchtower Configuration
server:
  port: ${WATCHTOWER_CONFIG.port}
  host: "0.0.0.0"

logging:
  level: info
  format: json

targets:
  - name: "Example Target"
    url: "https://example.com"
    interval: 30s
    timeout: 10s

alerts:
  - type: webhook
    url: "http://localhost:8081/webhook"
`;
      fs.writeFileSync(WATCHTOWER_CONFIG.configPath, defaultConfig);
    }

    const args = [
      '--config', WATCHTOWER_CONFIG.configPath,
      '--log-level', 'info',
      '--log-format', 'json'
    ];

    watchtowerProcess = spawn('watchtower', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    watchtowerProcess.stdout.on('data', (data) => {
      console.log('Watchtower stdout:', data.toString());
    });

    watchtowerProcess.stderr.on('data', (data) => {
      console.log('Watchtower stderr:', data.toString());
    });

    watchtowerProcess.on('close', (code) => {
      console.log('Watchtower process closed with code:', code);
      watchtowerProcess = null;
      watchtowerStatus = 'stopped';
    });

    watchtowerProcess.on('error', (error) => {
      console.error('Watchtower process error:', error);
      watchtowerProcess = null;
      watchtowerStatus = 'error';
    });

    // Wait a bit to see if it starts successfully
    setTimeout(() => {
      if (watchtowerProcess && !watchtowerProcess.killed) {
        watchtowerStatus = 'running';
        resolve({ success: true });
      } else {
        resolve({ success: false, error: 'Failed to start Watchtower' });
      }
    }, 2000);
  });
}

// Stop Watchtower service
function stopWatchtower() {
  return new Promise((resolve) => {
    if (!watchtowerProcess) {
      resolve({ success: false, error: 'Watchtower is not running' });
      return;
    }

    watchtowerProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (watchtowerProcess && !watchtowerProcess.killed) {
        watchtowerProcess.kill('SIGKILL');
      }
      watchtowerProcess = null;
      watchtowerStatus = 'stopped';
      resolve({ success: true });
    }, 5000);
  });
}

// Restart Watchtower service
function restartWatchtower() {
  return new Promise(async (resolve) => {
    const stopResult = await stopWatchtower();
    if (stopResult.success) {
      setTimeout(async () => {
        const startResult = await startWatchtower();
        resolve(startResult);
      }, 2000);
    } else {
      resolve(stopResult);
    }
  });
}

// Get Watchtower status
function getWatchtowerStatus() {
  return new Promise(async (resolve) => {
    const isInstalled = await isWatchtowerInstalled();
    const isRunning = await isWatchtowerRunning();
    const version = await getWatchtowerVersion();

    if (!isInstalled) {
      resolve({ success: true, status: 'not_installed' });
      return;
    }

    if (isRunning) {
      watchtowerStatus = 'running';
      resolve({ 
        success: true, 
        status: 'running',
        version: version
      });
    } else {
      watchtowerStatus = 'stopped';
      resolve({ 
        success: true, 
        status: 'stopped',
        version: version
      });
    }
  });
}

// Get Watchtower targets
function getWatchtowerTargets() {
  return new Promise(async (resolve) => {
    try {
      const response = await fetch(`http://localhost:${WATCHTOWER_CONFIG.port}/api/v1/targets`);
      if (response.ok) {
        const targets = await response.json();
        resolve({ success: true, targets: JSON.stringify(targets) });
      } else {
        resolve({ success: true, targets: '[]' });
      }
    } catch (error) {
      resolve({ success: true, targets: '[]' });
    }
  });
}

// Get Watchtower alerts
function getWatchtowerAlerts() {
  return new Promise(async (resolve) => {
    try {
      const response = await fetch(`http://localhost:${WATCHTOWER_CONFIG.port}/api/v1/alerts`);
      if (response.ok) {
        const alerts = await response.json();
        resolve({ success: true, alerts: JSON.stringify(alerts) });
      } else {
        resolve({ success: true, alerts: '[]' });
      }
    } catch (error) {
      resolve({ success: true, alerts: '[]' });
    }
  });
}

// Get Watchtower logs
function getWatchtowerLogs(lines = 100) {
  return new Promise((resolve) => {
    const logFile = path.join(WATCHTOWER_CONFIG.logPath, 'watchtower.log');
    
    if (!fs.existsSync(logFile)) {
      resolve({ success: true, logs: 'No log file found' });
      return;
    }

    exec(`tail -n ${lines} "${logFile}"`, (error, stdout) => {
      if (error) {
        resolve({ success: true, logs: 'Failed to read logs' });
      } else {
        resolve({ success: true, logs: stdout });
      }
    });
  });
}

// Get Watchtower configuration
function getWatchtowerConfig() {
  return new Promise((resolve) => {
    if (!fs.existsSync(WATCHTOWER_CONFIG.configPath)) {
      resolve({ success: true, config: '# No configuration file found' });
      return;
    }

    fs.readFile(WATCHTOWER_CONFIG.configPath, 'utf8', (error, data) => {
      if (error) {
        resolve({ success: true, config: 'Failed to read configuration' });
      } else {
        resolve({ success: true, config: data });
      }
    });
  });
}

// Update Watchtower configuration
function updateWatchtowerConfig(config) {
  return new Promise((resolve) => {
    ensureWatchtowerDirectories();
    
    fs.writeFile(WATCHTOWER_CONFIG.configPath, config, 'utf8', (error) => {
      if (error) {
        resolve({ success: false, error: 'Failed to write configuration' });
      } else {
        resolve({ success: true });
      }
    });
  });
}

// Get Watchtower metrics
function getWatchtowerMetrics() {
  return new Promise(async (resolve) => {
    try {
      const response = await fetch(`http://localhost:${WATCHTOWER_CONFIG.port}/metrics`);
      if (response.ok) {
        const metrics = await response.text();
        resolve({ success: true, metrics });
      } else {
        resolve({ success: true, metrics: 'Metrics not available' });
      }
    } catch (error) {
      resolve({ success: true, metrics: 'Metrics not available' });
    }
  });
}

// Test Watchtower connection
function testWatchtowerConnection() {
  return new Promise(async (resolve) => {
    try {
      const response = await fetch(`http://localhost:${WATCHTOWER_CONFIG.port}/health`);
      if (response.ok) {
        resolve({ success: true, result: response.status });
      } else {
        resolve({ success: false, error: `HTTP ${response.status}` });
      }
    } catch (error) {
      resolve({ success: false, error: 'Connection failed' });
    }
  });
}

// Get Watchtower dashboard URL
function getWatchtowerDashboardUrlHandler() {
  return new Promise((resolve) => {
    resolve({ success: true, url: getWatchtowerDashboardUrl() });
  });
}

// Pi OS Control Functions
function getPiStatus() {
  return new Promise((resolve) => {
    exec('systemctl is-active pi-os', (error) => {
      resolve({ success: true, status: error ? 'inactive' : 'active' });
    });
  });
}

function startPiOS() {
  return new Promise((resolve) => {
    exec('sudo systemctl start pi-os', (error) => {
      resolve({ success: !error });
    });
  });
}

function stopPiOS() {
  return new Promise((resolve) => {
    exec('sudo systemctl stop pi-os', (error) => {
      resolve({ success: !error });
    });
  });
}

function restartPiOS() {
  return new Promise((resolve) => {
    exec('sudo systemctl restart pi-os', (error) => {
      resolve({ success: !error });
    });
  });
}

function getPiLogs(lines = 50) {
  return new Promise((resolve) => {
    exec(`journalctl -u pi-os -n ${lines} --no-pager`, (error, stdout) => {
      resolve({ success: true, logs: error ? 'Failed to get logs' : stdout });
    });
  });
}

// ALEX OS Control Functions
function getAlexStatus() {
  return new Promise((resolve) => {
    exec('systemctl is-active alex-os', (error) => {
      resolve({ success: true, status: error ? 'inactive' : 'active' });
    });
  });
}

function startAlexOS() {
  return new Promise((resolve) => {
    exec('sudo systemctl start alex-os', (error) => {
      resolve({ success: !error });
    });
  });
}

function stopAlexOS() {
  return new Promise((resolve) => {
    exec('sudo systemctl stop alex-os', (error) => {
      resolve({ success: !error });
    });
  });
}

function restartAlexOS() {
  return new Promise((resolve) => {
    exec('sudo systemctl restart alex-os', (error) => {
      resolve({ success: !error });
    });
  });
}

function getAlexLogs(lines = 50) {
  return new Promise((resolve) => {
    exec(`journalctl -u alex-os -n ${lines} --no-pager`, (error, stdout) => {
      resolve({ success: true, logs: error ? 'Failed to get logs' : stdout });
    });
  });
}

// Workflow deployment functions
function deployWorkflow(workflowData) {
  return new Promise((resolve) => {
    // This would integrate with the actual workflow deployment system
    console.log('Deploying workflow:', workflowData);
    resolve({ success: true, message: 'Workflow deployed successfully' });
  });
}

function getDeployedWorkflows() {
  return new Promise((resolve) => {
    // This would fetch from the actual deployment system
    resolve({ success: true, workflows: [] });
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset', // macOS native title bar
    show: false
  });

  // Load the app - try multiple ports for development
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  
  // Try to load from common development ports
  const tryLoad = async () => {
    const ports = [5173, 5174, 5175];
    for (const port of ports) {
      try {
        const url = `http://localhost:${port}`;
        await mainWindow.loadURL(url);
        console.log(`Loaded app from ${url}`);
        return;
      } catch (error) {
        console.log(`Failed to load from port ${port}, trying next...`);
      }
    }
    // If all ports fail, try the default
    try {
      await mainWindow.loadURL(startUrl);
    } catch (error) {
      console.error('Failed to load app:', error);
      // Show error page
      mainWindow.loadURL(`data:text/html,<html><body><h1>ChainBot Desktop</h1><p>Failed to load the application. Please ensure the development server is running.</p><p>Error: ${error.message}</p></body></html>`);
    }
  };
  
  tryLoad();

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create menu
function createMenu() {
  const template = [
    {
      label: 'ChainBot',
      submenu: [
        {
          label: 'About ChainBot',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => {
            // Open preferences window
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Preferences',
              message: 'Preferences window will be implemented'
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        { type: 'separator' },
        {
          label: 'Hide ChainBot',
          accelerator: 'Cmd+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Cmd+Alt+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit ChainBot',
          accelerator: 'Cmd+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Workflow',
          accelerator: 'Cmd+N',
          click: () => {
            mainWindow.webContents.send('new-workflow');
          }
        },
        {
          label: 'Open Workflow...',
          accelerator: 'Cmd+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Workflow Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled) {
              const filePath = result.filePaths[0];
              const content = fs.readFileSync(filePath, 'utf8');
              mainWindow.webContents.send('open-workflow', JSON.parse(content));
            }
          }
        },
        {
          label: 'Save Workflow...',
          accelerator: 'Cmd+S',
          click: () => {
            mainWindow.webContents.send('save-workflow');
          }
        },
        { type: 'separator' },
        {
          label: 'Export to ALEX OS...',
          click: () => {
            mainWindow.webContents.send('export-to-alex');
          }
        }
      ]
    },
    {
      label: 'Pi Integration',
      submenu: [
        {
          label: 'Connect to Pi',
          click: async () => {
            try {
              await getPiStatus();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Pi Connection',
                message: 'Successfully connected to Pi'
              });
            } catch (error) {
              dialog.showErrorBox('Pi Connection Error', error.message);
            }
          }
        },
        {
          label: 'Start ALEX OS',
          click: async () => {
            try {
              await startAlexOS();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'ALEX OS',
                message: 'ALEX OS started successfully'
              });
            } catch (error) {
              dialog.showErrorBox('ALEX OS Error', error.message);
            }
          }
        },
        {
          label: 'Stop ALEX OS',
          click: async () => {
            try {
              await stopAlexOS();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'ALEX OS',
                message: 'ALEX OS stopped successfully'
              });
            } catch (error) {
              dialog.showErrorBox('ALEX OS Error', error.message);
            }
          }
        },
        {
          label: 'ALEX OS Status',
          click: async () => {
            try {
              const status = await getAlexStatus();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'ALEX OS Status',
                message: status.status
              });
            } catch (error) {
              dialog.showErrorBox('ALEX OS Error', error.message);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Watchtower Status',
          click: async () => {
            try {
              const status = await getWatchtowerStatus();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Watchtower Status',
                message: status.status
              });
            } catch (error) {
              dialog.showErrorBox('Watchtower Error', error.error);
            }
          }
        },
        {
          label: 'Start Watchtower',
          click: async () => {
            try {
              const result = await startWatchtower();
              if (result.success) {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Watchtower',
                  message: 'Watchtower started successfully'
                });
              } else {
                dialog.showErrorBox('Watchtower Error', result.error);
              }
            } catch (error) {
              dialog.showErrorBox('Watchtower Error', error.message);
            }
          }
        },
        {
          label: 'Stop Watchtower',
          click: async () => {
            try {
              const result = await stopWatchtower();
              if (result.success) {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Watchtower',
                  message: 'Watchtower stopped successfully'
                });
              } else {
                dialog.showErrorBox('Watchtower Error', result.error);
              }
            } catch (error) {
              dialog.showErrorBox('Watchtower Error', error.message);
            }
          }
        },
        {
          label: 'Restart Watchtower',
          click: async () => {
            try {
              const result = await restartWatchtower();
              if (result.success) {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Watchtower',
                  message: 'Watchtower restarted successfully'
                });
              } else {
                dialog.showErrorBox('Watchtower Error', result.error);
              }
            } catch (error) {
              dialog.showErrorBox('Watchtower Error', error.message);
            }
          }
        },
        {
          label: 'Open Watchtower Dashboard',
          click: async () => {
            try {
              const url = await getWatchtowerDashboardUrl();
              shell.openExternal(url);
            } catch (error) {
              dialog.showErrorBox('Watchtower Error', error.error);
            }
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Cmd+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+Cmd+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Cmd+X', role: 'cut' },
        { label: 'Copy', accelerator: 'Cmd+C', role: 'copy' },
        { label: 'Paste', accelerator: 'Cmd+V', role: 'paste' },
        { label: 'Select All', accelerator: 'Cmd+A', role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Cmd+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'Cmd+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'Cmd+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'Cmd+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'Cmd+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'Ctrl+Cmd+F', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'Cmd+M', role: 'minimize' },
        { label: 'Close', accelerator: 'Cmd+W', role: 'close' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/chainbot/chainbot');
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://chainbot.readthedocs.io');
          }
        },
        { type: 'separator' },
        {
          label: 'About ChainBot',
          role: 'about'
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for Watchtower
ipcMain.handle('watchtower-status', getWatchtowerStatus);
ipcMain.handle('watchtower-start', startWatchtower);
ipcMain.handle('watchtower-stop', stopWatchtower);
ipcMain.handle('watchtower-restart', restartWatchtower);
ipcMain.handle('watchtower-targets', getWatchtowerTargets);
ipcMain.handle('watchtower-alerts', getWatchtowerAlerts);
ipcMain.handle('watchtower-logs', (event, lines) => getWatchtowerLogs(lines));
ipcMain.handle('watchtower-config', getWatchtowerConfig);
ipcMain.handle('watchtower-update-config', (event, config) => updateWatchtowerConfig(config));
ipcMain.handle('watchtower-metrics', getWatchtowerMetrics);
ipcMain.handle('watchtower-test-connection', testWatchtowerConnection);
ipcMain.handle('watchtower-dashboard-url', getWatchtowerDashboardUrlHandler);

// IPC Handlers for Pi OS
ipcMain.handle('pi-status', getPiStatus);
ipcMain.handle('pi-start', startPiOS);
ipcMain.handle('pi-stop', stopPiOS);
ipcMain.handle('pi-restart', restartPiOS);
ipcMain.handle('pi-logs', (event, lines) => getPiLogs(lines));

// IPC Handlers for ALEX OS
ipcMain.handle('alex-status', getAlexStatus);
ipcMain.handle('alex-start', startAlexOS);
ipcMain.handle('alex-stop', stopAlexOS);
ipcMain.handle('alex-restart', restartAlexOS);
ipcMain.handle('alex-logs', (event, lines) => getAlexLogs(lines));

// IPC Handlers for Workflow Deployment
ipcMain.handle('deploy-workflow', (event, workflowData) => deployWorkflow(workflowData));
ipcMain.handle('get-deployed-workflows', getDeployedWorkflows);

// IPC Handlers for System Info
ipcMain.handle('get-system-info', () => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    userInfo: os.userInfo(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().length
  };
});

// IPC Handlers for File Operations
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'YAML Files', extensions: ['yml', 'yaml'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('save-file-dialog', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath,
    filters: [
      { name: 'YAML Files', extensions: ['yml', 'yaml'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
}); 