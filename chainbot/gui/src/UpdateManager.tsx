import React, { useState, useEffect } from 'react';
import { 
  Download, 
  RefreshCw, 
  AlertCircle, 
  XCircle,
  Settings,
  Package
} from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
  size: string;
  checksum: string;
  isMandatory: boolean;
  channel: 'stable' | 'beta' | 'dev';
}

interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  installing: boolean;
  error: string | null;
  progress: number;
  currentVersion: string;
  latestVersion: string | null;
  updateInfo: UpdateInfo | null;
}

interface UpdateManagerProps {
  onUpdateAvailable?: (updateInfo: UpdateInfo) => void;
  onUpdateComplete?: () => void;
}

const UpdateManager: React.FC<UpdateManagerProps> = ({
  onUpdateAvailable,
  onUpdateComplete
}) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloading: false,
    installing: false,
    error: null,
    progress: 0,
    currentVersion: '1.0.0',
    latestVersion: null,
    updateInfo: null
  });

  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [updateChannel, setUpdateChannel] = useState<'stable' | 'beta' | 'dev'>('stable');
  const [checkInterval, setCheckInterval] = useState(24 * 60 * 60 * 1000); // 24 hours

  // Check if running in Electron
  const isElectron = window.electronAPI !== undefined;

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('update-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAutoUpdateEnabled(settings.autoUpdateEnabled ?? true);
        setUpdateChannel(settings.updateChannel ?? 'stable');
        setCheckInterval(settings.checkInterval ?? 24 * 60 * 60 * 1000);
      } catch (error) {
        console.error('Failed to load update settings:', error);
      }
    }

    // Auto-check for updates
    if (autoUpdateEnabled) {
      checkForUpdates();
    }

    // Set up periodic checks
    const interval = setInterval(() => {
      if (autoUpdateEnabled) {
        checkForUpdates();
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [autoUpdateEnabled, checkInterval]);

  const checkForUpdates = async () => {
    if (!isElectron) {
      console.log('Update checking not available in browser');
      return;
    }

    setUpdateStatus(prev => ({ ...prev, checking: true, error: null }));

    try {
      const result = await window.electronAPI!.checkForUpdates(updateChannel);
      
      if (result.success) {
        const updateInfo = result.updateInfo;
        const hasUpdate = updateInfo && updateInfo.version !== updateStatus.currentVersion;
        
        setUpdateStatus(prev => ({
          ...prev,
          checking: false,
          available: hasUpdate,
          latestVersion: updateInfo?.version || null,
          updateInfo: updateInfo || null
        }));

        if (hasUpdate && updateInfo) {
          onUpdateAvailable?.(updateInfo);
          setShowUpdateDialog(true);
        }
      } else {
        setUpdateStatus(prev => ({
          ...prev,
          checking: false,
          error: result.error || 'Failed to check for updates'
        }));
      }
    } catch (error) {
      setUpdateStatus(prev => ({
        ...prev,
        checking: false,
        error: error instanceof Error ? error.message : 'Update check failed'
      }));
    }
  };

  const downloadUpdate = async () => {
    if (!updateStatus.updateInfo || !isElectron) return;

    setUpdateStatus(prev => ({ ...prev, downloading: true, error: null }));

    try {
      const result = await window.electronAPI!.downloadUpdate(updateStatus.updateInfo.downloadUrl);
      
      if (result.success) {
        setUpdateStatus(prev => ({
          ...prev,
          downloading: false,
          progress: 100
        }));
        
        // Auto-install if enabled
        if (autoUpdateEnabled) {
          installUpdate();
        }
      } else {
        setUpdateStatus(prev => ({
          ...prev,
          downloading: false,
          error: result.error || 'Download failed'
        }));
      }
    } catch (error) {
      setUpdateStatus(prev => ({
        ...prev,
        downloading: false,
        error: error instanceof Error ? error.message : 'Download failed'
      }));
    }
  };

  const installUpdate = async () => {
    if (!isElectron) return;

    setUpdateStatus(prev => ({ ...prev, installing: true, error: null }));

    try {
      const result = await window.electronAPI!.installUpdate();
      
      if (result.success) {
        setUpdateStatus(prev => ({
          ...prev,
          installing: false
        }));
        
        onUpdateComplete?.();
        
        // Restart the application
        setTimeout(() => {
          window.electronAPI!.restartApp();
        }, 2000);
      } else {
        setUpdateStatus(prev => ({
          ...prev,
          installing: false,
          error: result.error || 'Installation failed'
        }));
      }
    } catch (error) {
      setUpdateStatus(prev => ({
        ...prev,
        installing: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      }));
    }
  };

  const saveSettings = () => {
    const settings = {
      autoUpdateEnabled,
      updateChannel,
      checkInterval
    };
    localStorage.setItem('update-settings', JSON.stringify(settings));
  };

  const getUpdateChannelColor = (channel: string) => {
    switch (channel) {
      case 'stable': return 'text-green-600 bg-green-100';
      case 'beta': return 'text-yellow-600 bg-yellow-100';
      case 'dev': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="update-manager">
      {/* Update Status Bar */}
      <div className="update-status-bar bg-gray-50 border-b border-gray-200 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">
              v{updateStatus.currentVersion}
            </span>
          </div>

          {updateStatus.checking && (
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600">Checking for updates...</span>
            </div>
          )}

          {updateStatus.available && (
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-600">
                Update available: v{updateStatus.latestVersion}
              </span>
              <button
                onClick={() => setShowUpdateDialog(true)}
                className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Update Now
              </button>
            </div>
          )}

          {updateStatus.downloading && (
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-600">
                Downloading... {updateStatus.progress}%
              </span>
            </div>
          )}

          {updateStatus.installing && (
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-green-500 animate-spin" />
              <span className="text-sm text-green-600">Installing update...</span>
            </div>
          )}

          {updateStatus.error && (
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">{updateStatus.error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={checkForUpdates}
            disabled={updateStatus.checking || updateStatus.downloading || updateStatus.installing}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Check for updates"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowUpdateDialog(true)}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="Update settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Update Dialog */}
      {showUpdateDialog && (
        <div className="update-dialog fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Software Updates</h2>
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Update Available */}
            {updateStatus.available && updateStatus.updateInfo && (
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-blue-500" />
                    <h3 className="font-medium text-blue-900">Update Available</h3>
                  </div>
                  <p className="text-blue-700">
                    A new version ({updateStatus.updateInfo.version}) is available for download.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Version:</span>
                    <span className="text-sm text-gray-600">{updateStatus.currentVersion}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Latest Version:</span>
                    <span className="text-sm text-gray-600">{updateStatus.updateInfo.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Release Date:</span>
                    <span className="text-sm text-gray-600">
                      {new Date(updateStatus.updateInfo.releaseDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Download Size:</span>
                    <span className="text-sm text-gray-600">
                      {formatFileSize(updateStatus.updateInfo.size)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Channel:</span>
                    <span className={`text-xs px-2 py-1 rounded ${getUpdateChannelColor(updateStatus.updateInfo.channel)}`}>
                      {updateStatus.updateInfo.channel.toUpperCase()}
                    </span>
                  </div>
                </div>

                {updateStatus.updateInfo.releaseNotes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Release Notes:</h4>
                    <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 max-h-32 overflow-y-auto">
                      {updateStatus.updateInfo.releaseNotes}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowUpdateDialog(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Later
                  </button>
                  <button
                    onClick={downloadUpdate}
                    disabled={updateStatus.downloading || updateStatus.installing}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateStatus.downloading ? 'Downloading...' : 'Download & Install'}
                  </button>
                </div>
              </div>
            )}

            {/* Update Settings */}
            <div className="border-t pt-4">
              <h3 className="text-md font-medium mb-4">Update Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Auto-update</label>
                    <p className="text-xs text-gray-500">Automatically check for and install updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoUpdateEnabled}
                      onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium">Update Channel</label>
                  <select
                    value={updateChannel}
                    onChange={(e) => setUpdateChannel(e.target.value as any)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="stable">Stable</option>
                    <option value="beta">Beta</option>
                    <option value="dev">Development</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {updateChannel === 'stable' && 'Recommended for most users'}
                    {updateChannel === 'beta' && 'New features, may have bugs'}
                    {updateChannel === 'dev' && 'Latest development builds'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Check Interval</label>
                  <select
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={6 * 60 * 60 * 1000}>Every 6 hours</option>
                    <option value={12 * 60 * 60 * 1000}>Every 12 hours</option>
                    <option value={24 * 60 * 60 * 1000}>Daily</option>
                    <option value={7 * 24 * 60 * 60 * 1000}>Weekly</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUpdateDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    saveSettings();
                    setShowUpdateDialog(false);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateManager; 