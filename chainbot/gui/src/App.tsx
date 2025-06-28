import React, { useState, useEffect } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import LeftPaneSessions from './LeftPaneSessions';
import CenterPaneChat from './CenterPaneChat';
import RightPaneLogs from './RightPaneLogs';
import WorkflowBuilder from './WorkflowBuilder';
import AgentManager from './AgentManager';
import WatchtowerManager from './WatchtowerManager';
import ChatGPTDataImporter from './ChatGPTDataImporter';

// Extend window object for Electron APIs
declare global {
  interface Window {
    electronAPI?: {
      piConnect: () => Promise<{ success: boolean; error?: string }>;
      piExecute: (command: string) => Promise<{ success: boolean; result?: string; error?: string }>;
      alexosStart: () => Promise<{ success: boolean; result?: string; error?: string }>;
      alexosStop: () => Promise<{ success: boolean; result?: string; error?: string }>;
      alexosStatus: () => Promise<{ success: boolean; status?: string; error?: string }>;
      deployWorkflow: (workflowData: any) => Promise<{ success: boolean; result?: string; error?: string }>;
      watchtowerStatus: () => Promise<{ success: boolean; status?: string; error?: string }>;
      watchtowerStart: () => Promise<{ success: boolean; result?: string; error?: string }>;
      watchtowerStop: () => Promise<{ success: boolean; result?: string; error?: string }>;
      watchtowerRestart: () => Promise<{ success: boolean; result?: string; error?: string }>;
      watchtowerLogs: (lines?: number) => Promise<{ success: boolean; logs?: string; error?: string }>;
      watchtowerConfig: () => Promise<{ success: boolean; config?: string; error?: string }>;
      watchtowerUpdateConfig: (configYaml: string) => Promise<{ success: boolean; result?: string; error?: string }>;
      watchtowerMetrics: () => Promise<{ success: boolean; metrics?: string; error?: string }>;
      watchtowerAlerts: () => Promise<{ success: boolean; alerts?: string; error?: string }>;
      watchtowerTargets: () => Promise<{ success: boolean; targets?: string; error?: string }>;
      watchtowerTestConnection: () => Promise<{ success: boolean; result?: string; error?: string }>;
      watchtowerDashboardUrl: () => Promise<{ success: boolean; url?: string; error?: string }>;
      watchtowerExecuteCommand: (command: string) => Promise<{ success: boolean; result?: string; error?: string }>;
      watchtowerVersion: () => Promise<{ success: boolean; version?: string; error?: string }>;
      watchtowerInstall: () => Promise<{ success: boolean; result?: string; error?: string }>;
      watchtowerUninstall: () => Promise<{ success: boolean; result?: string; error?: string }>;
      onNewWorkflow: (callback: () => void) => void;
      onOpenWorkflow: (callback: (workflow: any) => void) => void;
      onSaveWorkflow: (callback: () => void) => void;
      onExportToAlex: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
    platform?: {
      isMac: boolean;
      isWindows: boolean;
      isLinux: boolean;
    };
  }
}

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [piConnected, setPiConnected] = useState(false);
  const [alexosStatus, setAlexosStatus] = useState('unknown');
  const [watchtowerStatus, setWatchtowerStatus] = useState('unknown');
  const [piStatus, setPiStatus] = useState('disconnected');

  // Check if running in Electron
  const isElectron = window.electronAPI !== undefined;

  useEffect(() => {
    if (isElectron) {
      // Set up Electron event listeners
      window.electronAPI?.onNewWorkflow(() => {
        setActiveTab('workflows');
        // Trigger new workflow creation
      });

      window.electronAPI?.onOpenWorkflow(() => {
        setActiveTab('workflows');
        // Load workflow data
      });

      window.electronAPI?.onSaveWorkflow(() => {
        // Trigger workflow save
      });

      window.electronAPI?.onExportToAlex(() => {
        // Trigger export to ALEX OS
      });

      // Cleanup listeners on unmount
      return () => {
        window.electronAPI?.removeAllListeners('new-workflow');
        window.electronAPI?.removeAllListeners('open-workflow');
        window.electronAPI?.removeAllListeners('save-workflow');
        window.electronAPI?.removeAllListeners('export-to-alex');
      };
    }
  }, [isElectron]);

  const handlePiConnect = async () => {
    if (!isElectron) return;
    
    try {
      setPiStatus('connecting');
      const result = await window.electronAPI!.piConnect();
      if (result.success) {
        setPiConnected(true);
        setPiStatus('connected');
        // Check ALEX OS status
        const statusResult = await window.electronAPI!.alexosStatus();
        if (statusResult.success) {
          setAlexosStatus(statusResult.status?.includes('active') ? 'running' : 'stopped');
        }
        // Check Watchtower status
        const watchtowerResult = await window.electronAPI!.watchtowerStatus();
        if (watchtowerResult.success) {
          setWatchtowerStatus(watchtowerResult.status?.includes('active') ? 'running' : 'stopped');
        }
      } else {
        setPiStatus('error');
        console.error('Pi connection failed:', result.error);
      }
    } catch (error) {
      setPiStatus('error');
      console.error('Pi connection error:', error);
    }
  };

  const handleAlexosStart = async () => {
    if (!isElectron) return;
    
    try {
      const result = await window.electronAPI!.alexosStart();
      if (result.success) {
        setAlexosStatus('running');
      } else {
        console.error('Failed to start ALEX OS:', result.error);
      }
    } catch (error) {
      console.error('ALEX OS start error:', error);
    }
  };

  const handleAlexosStop = async () => {
    if (!isElectron) return;
    
    try {
      const result = await window.electronAPI!.alexosStop();
      if (result.success) {
        setAlexosStatus('stopped');
      } else {
        console.error('Failed to stop ALEX OS:', result.error);
      }
    } catch (error) {
      console.error('ALEX OS stop error:', error);
    }
  };

  const handleWatchtowerStart = async () => {
    if (!isElectron) return;
    
    try {
      const result = await window.electronAPI!.watchtowerStart();
      if (result.success) {
        setWatchtowerStatus('running');
      } else {
        console.error('Failed to start Watchtower:', result.error);
      }
    } catch (error) {
      console.error('Watchtower start error:', error);
    }
  };

  const handleWatchtowerStop = async () => {
    if (!isElectron) return;
    
    try {
      const result = await window.electronAPI!.watchtowerStop();
      if (result.success) {
        setWatchtowerStatus('stopped');
      } else {
        console.error('Failed to stop Watchtower:', result.error);
      }
    } catch (error) {
      console.error('Watchtower stop error:', error);
    }
  };

  const handleDeployWorkflow = async (workflowData: any) => {
    if (!isElectron) return;
    
    try {
      const result = await window.electronAPI!.deployWorkflow(workflowData);
      if (result.success) {
        console.log('Workflow deployed successfully');
      } else {
        console.error('Failed to deploy workflow:', result.error);
      }
    } catch (error) {
      console.error('Workflow deployment error:', error);
    }
  };

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>ChainBot</h1>
          <p>AI Agent Orchestration Platform</p>
          <LoginForm />
          <RegisterForm />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Pi Integration Status Bar (Electron only) */}
      {isElectron && (
        <div className="pi-status-bar">
          <div className="pi-status-item">
            <span className={`status-indicator ${piStatus}`}></span>
            <span>Pi: {piStatus}</span>
            {piStatus === 'disconnected' && (
              <button onClick={handlePiConnect} className="connect-btn">
                Connect
              </button>
            )}
          </div>
          {piConnected && (
            <>
              <div className="pi-status-item">
                <span className={`status-indicator ${alexosStatus}`}></span>
                <span>ALEX OS: {alexosStatus}</span>
                {alexosStatus === 'stopped' && (
                  <button onClick={handleAlexosStart} className="start-btn">
                    Start
                  </button>
                )}
                {alexosStatus === 'running' && (
                  <button onClick={handleAlexosStop} className="stop-btn">
                    Stop
                  </button>
                )}
              </div>
              <div className="pi-status-item">
                <span className={`status-indicator ${watchtowerStatus}`}></span>
                <span>Watchtower: {watchtowerStatus}</span>
                {watchtowerStatus === 'stopped' && (
                  <button onClick={handleWatchtowerStart} className="start-btn">
                    Start
                  </button>
                )}
                {watchtowerStatus === 'running' && (
                  <button onClick={handleWatchtowerStop} className="stop-btn">
                    Stop
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Application */}
      <div className="app-container">
        {/* Left Pane - Sessions */}
        <div className="left-pane">
          <LeftPaneSessions 
            selectedSessionId={selectedSessionId} 
            onSelectSession={setSelectedSessionId} 
          />
        </div>

        {/* Center Pane - Main Content */}
        <div className="center-pane">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button 
              className={`tab-button ${activeTab === 'workflows' ? 'active' : ''}`}
              onClick={() => setActiveTab('workflows')}
            >
              Workflows
            </button>
            <button 
              className={`tab-button ${activeTab === 'agents' ? 'active' : ''}`}
              onClick={() => setActiveTab('agents')}
            >
              Agents
            </button>
            <button 
              className={`tab-button ${activeTab === 'chatgpt-import' ? 'active' : ''}`}
              onClick={() => setActiveTab('chatgpt-import')}
            >
              ChatGPT Import
            </button>
            <button 
              className={`tab-button ${activeTab === 'watchtower' ? 'active' : ''}`}
              onClick={() => setActiveTab('watchtower')}
            >
              Watchtower
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'chat' && (
              <CenterPaneChat selectedSessionId={selectedSessionId} />
            )}
            {activeTab === 'workflows' && (
              <WorkflowBuilder 
                sessionId={selectedSessionId || 1} 
                onDeployWorkflow={handleDeployWorkflow}
              />
            )}
            {activeTab === 'agents' && (
              <AgentManager sessionId={selectedSessionId || 1} />
            )}
            {activeTab === 'chatgpt-import' && (
              <ChatGPTDataImporter />
            )}
            {activeTab === 'watchtower' && (
              <WatchtowerManager />
            )}
          </div>
        </div>

        {/* Right Pane - Logs */}
        <div className="right-pane">
          <RightPaneLogs />
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App; 