import React, { useState, useEffect } from 'react';

interface WatchtowerStatus {
  status: string;
  version?: string;
  uptime?: string;
  targets?: number;
  alerts?: number;
}

interface WatchtowerTarget {
  id: string;
  name: string;
  url: string;
  health: string;
  lastCheck: string;
}

interface WatchtowerAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  target?: string;
}

const WatchtowerManager: React.FC = () => {
  const [watchtowerStatus, setWatchtowerStatus] = useState<WatchtowerStatus | null>(null);
  const [targets, setTargets] = useState<WatchtowerTarget[]>([]);
  const [alerts, setAlerts] = useState<WatchtowerAlert[]>([]);
  const [logs, setLogs] = useState<string>('');
  const [config, setConfig] = useState<string>('');
  const [metrics, setMetrics] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [dashboardUrl, setDashboardUrl] = useState<string>('');
  const [isDashboardLoaded, setIsDashboardLoaded] = useState(false);

  // Check if running in Electron
  const isElectron = window.electronAPI !== undefined;

  useEffect(() => {
    if (isElectron) {
      loadWatchtowerData();
      getDashboardUrl();
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(loadWatchtowerData, 30000);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isElectron]);

  const loadWatchtowerData = async () => {
    if (!isElectron) return;

    setLoading(true);
    setError('');

    try {
      // Load status
      const statusResult = await window.electronAPI!.watchtowerStatus();
      if (statusResult.success && statusResult.status) {
        setWatchtowerStatus({ status: statusResult.status });
      }

      // Load targets
      const targetsResult = await window.electronAPI!.watchtowerTargets();
      if (targetsResult.success && targetsResult.targets) {
        try {
          const targetsData = JSON.parse(targetsResult.targets);
          setTargets(targetsData);
        } catch (e) {
          console.log('Targets not in JSON format, treating as raw data');
        }
      }

      // Load alerts
      const alertsResult = await window.electronAPI!.watchtowerAlerts();
      if (alertsResult.success && alertsResult.alerts) {
        try {
          const alertsData = JSON.parse(alertsResult.alerts);
          setAlerts(alertsData);
        } catch (e) {
          console.log('Alerts not in JSON format, treating as raw data');
        }
      }

      // Load logs
      const logsResult = await window.electronAPI!.watchtowerLogs(50);
      if (logsResult.success) {
        setLogs(logsResult.logs || '');
      }

      // Load config
      const configResult = await window.electronAPI!.watchtowerConfig();
      if (configResult.success) {
        setConfig(configResult.config || '');
      }

      // Load metrics
      const metricsResult = await window.electronAPI!.watchtowerMetrics();
      if (metricsResult.success) {
        setMetrics(metricsResult.metrics || '');
      }

    } catch (error) {
      setError('Failed to load Watchtower data');
      console.error('Watchtower data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDashboardUrl = async () => {
    if (!isElectron) return;

    try {
      const result = await window.electronAPI!.watchtowerDashboardUrl();
      if (result.success && result.url) {
        setDashboardUrl(result.url);
      }
    } catch (error) {
      console.error('Failed to get dashboard URL:', error);
    }
  };

  const handleWatchtowerAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!isElectron) return;

    setLoading(true);
    setError('');

    try {
      let result;
      switch (action) {
        case 'start':
          result = await window.electronAPI!.watchtowerStart();
          break;
        case 'stop':
          result = await window.electronAPI!.watchtowerStop();
          break;
        case 'restart':
          result = await window.electronAPI!.watchtowerRestart();
          break;
      }

      if (result.success) {
        // Reload data after action
        setTimeout(loadWatchtowerData, 2000);
      } else {
        setError(`Failed to ${action} Watchtower: ${result.error}`);
      }
    } catch (error) {
      setError(`Failed to ${action} Watchtower`);
      console.error(`Watchtower ${action} error:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async () => {
    if (!isElectron) return;

    setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI!.watchtowerUpdateConfig(config);
      if (result.success) {
        alert('Watchtower configuration updated successfully');
        // Restart Watchtower to apply new config
        await handleWatchtowerAction('restart');
      } else {
        setError(`Failed to update config: ${result.error}`);
      }
    } catch (error) {
      setError('Failed to update Watchtower configuration');
      console.error('Config update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDashboard = async () => {
    if (!isElectron) return;

    try {
      const result = await window.electronAPI!.watchtowerDashboardUrl();
      if (result.success) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      setError('Failed to open Watchtower dashboard');
    }
  };

  const testConnection = async () => {
    if (!isElectron) return;

    setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI!.watchtowerTestConnection();
      if (result.success) {
        alert(`Watchtower connection test successful. HTTP Status: ${result.result}`);
      } else {
        setError(`Connection test failed: ${result.error}`);
      }
    } catch (error) {
      setError('Failed to test Watchtower connection');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('active') || status.includes('running')) return '#4ade80';
    if (status.includes('inactive') || status.includes('stopped')) return '#6b7280';
    if (status.includes('error') || status.includes('failed')) return '#ef4444';
    return '#fbbf24';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'error': return '#f97316';
      case 'warning': return '#fbbf24';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (!isElectron) {
    return (
      <div className="watchtower-manager">
        <div className="error-message">
          Watchtower management is only available in the desktop application.
        </div>
      </div>
    );
  }

  return (
    <div className="watchtower-manager">
      <div className="watchtower-header">
        <h2>Watchtower Management</h2>
        <div className="watchtower-actions">
          <button 
            onClick={() => handleWatchtowerAction('start')}
            disabled={loading}
            className="action-btn start-btn"
          >
            Start
          </button>
          <button 
            onClick={() => handleWatchtowerAction('stop')}
            disabled={loading}
            className="action-btn stop-btn"
          >
            Stop
          </button>
          <button 
            onClick={() => handleWatchtowerAction('restart')}
            disabled={loading}
            className="action-btn restart-btn"
          >
            Restart
          </button>
          <button 
            onClick={openDashboard}
            className="action-btn dashboard-btn"
          >
            Open Dashboard
          </button>
          <button 
            onClick={testConnection}
            disabled={loading}
            className="action-btn test-btn"
          >
            Test Connection
          </button>
          <button 
            onClick={loadWatchtowerData}
            disabled={loading}
            className="action-btn refresh-btn"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="watchtower-tabs">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'targets' ? 'active' : ''}`}
          onClick={() => setActiveTab('targets')}
        >
          Targets
        </button>
        <button 
          className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Logs
        </button>
        <button 
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
        <button 
          className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Metrics
        </button>
      </div>

      <div className="watchtower-content">
        {loading && (
          <div className="loading">
            Loading Watchtower data...
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="dashboard-header">
              <h3>Watchtower Dashboard</h3>
              <div className="dashboard-controls">
                <button 
                  onClick={() => setIsDashboardLoaded(false)}
                  className="refresh-dashboard-btn"
                >
                  Reload Dashboard
                </button>
              </div>
            </div>
            <div className="dashboard-container">
              {dashboardUrl ? (
                <iframe
                  src={dashboardUrl}
                  title="Watchtower Dashboard"
                  className="dashboard-iframe"
                  onLoad={() => setIsDashboardLoaded(true)}
                  onError={() => setError('Failed to load Watchtower dashboard')}
                />
              ) : (
                <div className="dashboard-placeholder">
                  <p>Watchtower dashboard URL not available</p>
                  <button onClick={getDashboardUrl} className="retry-btn">
                    Retry
                  </button>
                </div>
              )}
              {!isDashboardLoaded && dashboardUrl && (
                <div className="dashboard-loading">
                  Loading Watchtower dashboard...
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="status-card">
              <h3>Status</h3>
              {watchtowerStatus && (
                <div className="status-info">
                  <div className="status-indicator" style={{ backgroundColor: getStatusColor(watchtowerStatus.status) }}></div>
                  <span>{watchtowerStatus.status}</span>
                </div>
              )}
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h4>Targets</h4>
                <span className="stat-value">{targets.length}</span>
              </div>
              <div className="stat-card">
                <h4>Alerts</h4>
                <span className="stat-value">{alerts.length}</span>
              </div>
              <div className="stat-card">
                <h4>Health</h4>
                <span className="stat-value">
                  {targets.filter(t => t.health === 'healthy').length}/{targets.length}
                </span>
              </div>
            </div>

            <div className="recent-alerts">
              <h3>Recent Alerts</h3>
              <div className="alerts-list">
                {alerts.slice(0, 5).map((alert, index) => (
                  <div key={index} className="alert-item">
                    <div 
                      className="alert-severity" 
                      style={{ backgroundColor: getSeverityColor(alert.severity) }}
                    ></div>
                    <div className="alert-content">
                      <div className="alert-message">{alert.message}</div>
                      <div className="alert-timestamp">{alert.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'targets' && (
          <div className="targets-tab">
            <h3>Monitored Targets</h3>
            <div className="targets-list">
              {targets.map((target, index) => (
                <div key={index} className="target-item">
                  <div className="target-header">
                    <h4>{target.name}</h4>
                    <span className={`health-status ${target.health}`}>
                      {target.health}
                    </span>
                  </div>
                  <div className="target-details">
                    <div>URL: {target.url}</div>
                    <div>Last Check: {target.lastCheck}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="alerts-tab">
            <h3>All Alerts</h3>
            <div className="alerts-list">
              {alerts.map((alert, index) => (
                <div key={index} className="alert-item">
                  <div 
                    className="alert-severity" 
                    style={{ backgroundColor: getSeverityColor(alert.severity) }}
                  ></div>
                  <div className="alert-content">
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-meta">
                      <span className="alert-timestamp">{alert.timestamp}</span>
                      {alert.target && <span className="alert-target">Target: {alert.target}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-tab">
            <h3>Watchtower Logs</h3>
            <div className="logs-container">
              <pre className="logs-content">{logs}</pre>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="config-tab">
            <h3>Configuration</h3>
            <div className="config-editor">
              <textarea
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                placeholder="Watchtower configuration (YAML format)"
                rows={20}
              />
              <button 
                onClick={handleConfigUpdate}
                disabled={loading}
                className="save-config-btn"
              >
                Save Configuration
              </button>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="metrics-tab">
            <h3>Metrics</h3>
            <div className="metrics-container">
              <pre className="metrics-content">{metrics}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchtowerManager; 