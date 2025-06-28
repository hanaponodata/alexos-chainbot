const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Watchtower APIs
  watchtowerStatus: () => ipcRenderer.invoke('watchtower-status'),
  watchtowerStart: () => ipcRenderer.invoke('watchtower-start'),
  watchtowerStop: () => ipcRenderer.invoke('watchtower-stop'),
  watchtowerRestart: () => ipcRenderer.invoke('watchtower-restart'),
  watchtowerTargets: () => ipcRenderer.invoke('watchtower-targets'),
  watchtowerAlerts: () => ipcRenderer.invoke('watchtower-alerts'),
  watchtowerLogs: (lines) => ipcRenderer.invoke('watchtower-logs', lines),
  watchtowerConfig: () => ipcRenderer.invoke('watchtower-config'),
  watchtowerUpdateConfig: (config) => ipcRenderer.invoke('watchtower-update-config', config),
  watchtowerMetrics: () => ipcRenderer.invoke('watchtower-metrics'),
  watchtowerTestConnection: () => ipcRenderer.invoke('watchtower-test-connection'),
  watchtowerDashboardUrl: () => ipcRenderer.invoke('watchtower-dashboard-url'),

  // Pi OS APIs
  piStatus: () => ipcRenderer.invoke('pi-status'),
  piStart: () => ipcRenderer.invoke('pi-start'),
  piStop: () => ipcRenderer.invoke('pi-stop'),
  piRestart: () => ipcRenderer.invoke('pi-restart'),
  piLogs: (lines) => ipcRenderer.invoke('pi-logs', lines),

  // ALEX OS APIs
  alexStatus: () => ipcRenderer.invoke('alex-status'),
  alexStart: () => ipcRenderer.invoke('alex-start'),
  alexStop: () => ipcRenderer.invoke('alex-stop'),
  alexRestart: () => ipcRenderer.invoke('alex-restart'),
  alexLogs: (lines) => ipcRenderer.invoke('alex-logs', lines),

  // Workflow Deployment APIs
  deployWorkflow: (workflowData) => ipcRenderer.invoke('deploy-workflow', workflowData),
  getDeployedWorkflows: () => ipcRenderer.invoke('get-deployed-workflows'),

  // System Info APIs
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // File Operation APIs
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (defaultPath) => ipcRenderer.invoke('save-file-dialog', defaultPath),

  // ChainBot Backend APIs
  chainbotAPI: {
    // Auth
    login: (credentials) => fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(res => res.json()),

    register: (userData) => fetch('http://localhost:8000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }).then(res => res.json()),

    // Workflows
    getWorkflows: (token) => fetch('http://localhost:8000/api/workflows', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()),

    createWorkflow: (workflow, token) => fetch('http://localhost:8000/api/workflows', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(workflow)
    }).then(res => res.json()),

    executeWorkflow: (workflowId, token) => fetch(`http://localhost:8000/api/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()),

    // Agents
    getAgents: (token) => fetch('http://localhost:8000/api/agents', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()),

    spawnAgent: (agentData, token) => fetch('http://localhost:8000/api/agents/spawn', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(agentData)
    }).then(res => res.json()),

    executeAgentTask: (agentId, task, token) => fetch(`http://localhost:8000/api/agents/${agentId}/execute`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(task)
    }).then(res => res.json()),

    // Entanglements
    getEntanglements: (token) => fetch('http://localhost:8000/api/entanglements', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()),

    createEntanglement: (entanglementData, token) => fetch('http://localhost:8000/api/entanglements', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(entanglementData)
    }).then(res => res.json()),

    // Sessions
    getSessions: (token) => fetch('http://localhost:8000/api/sessions', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()),

    createSession: (sessionData, token) => fetch('http://localhost:8000/api/sessions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(sessionData)
    }).then(res => res.json()),

    // Audit Logs
    getAuditLogs: (token, params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return fetch(`http://localhost:8000/api/audit-logs?${queryString}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json());
    },

    // Sample Data
    createSampleData: (token) => fetch('http://localhost:8000/api/sample-data', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json())
  },

  // WebSocket connection for real-time updates
  connectWebSocket: (token) => {
    const ws = new WebSocket(`ws://localhost:8000/ws?token=${token}`);
    return ws;
  }
});

// Type definitions for TypeScript
window.electronAPI = window.electronAPI || {};

// Add type definitions to help with development
if (typeof window !== 'undefined') {
  window.electronAPITypes = {
    // Watchtower
    watchtowerStatus: '() => Promise<{success: boolean, status: string, version?: string}>',
    watchtowerStart: '() => Promise<{success: boolean, error?: string}>',
    watchtowerStop: '() => Promise<{success: boolean, error?: string}>',
    watchtowerRestart: '() => Promise<{success: boolean, error?: string}>',
    watchtowerTargets: '() => Promise<{success: boolean, targets: string}>',
    watchtowerAlerts: '() => Promise<{success: boolean, alerts: string}>',
    watchtowerLogs: '(lines: number) => Promise<{success: boolean, logs: string}>',
    watchtowerConfig: '() => Promise<{success: boolean, config: string}>',
    watchtowerUpdateConfig: '(config: string) => Promise<{success: boolean, error?: string}>',
    watchtowerMetrics: '() => Promise<{success: boolean, metrics: string}>',
    watchtowerTestConnection: '() => Promise<{success: boolean, result?: number, error?: string}>',
    watchtowerDashboardUrl: '() => Promise<{success: boolean, url: string}>',

    // Pi OS
    piStatus: '() => Promise<{success: boolean, status: string}>',
    piStart: '() => Promise<{success: boolean}>',
    piStop: '() => Promise<{success: boolean}>',
    piRestart: '() => Promise<{success: boolean}>',
    piLogs: '(lines: number) => Promise<{success: boolean, logs: string}>',

    // ALEX OS
    alexStatus: '() => Promise<{success: boolean, status: string}>',
    alexStart: '() => Promise<{success: boolean}>',
    alexStop: '() => Promise<{success: boolean}>',
    alexRestart: '() => Promise<{success: boolean}>',
    alexLogs: '(lines: number) => Promise<{success: boolean, logs: string}>',

    // Workflow Deployment
    deployWorkflow: '(workflowData: any) => Promise<{success: boolean, message?: string}>',
    getDeployedWorkflows: '() => Promise<{success: boolean, workflows: any[]}>',

    // System Info
    getSystemInfo: '() => Promise<{platform: string, arch: string, hostname: string, userInfo: any, totalMemory: number, freeMemory: number, cpus: number}>',

    // File Operations
    openFileDialog: '() => Promise<{canceled: boolean, filePaths: string[]}>',
    saveFileDialog: '(defaultPath: string) => Promise<{canceled: boolean, filePath?: string}>'
  };
}

// Expose a versions object to the renderer process
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
});

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
}); 