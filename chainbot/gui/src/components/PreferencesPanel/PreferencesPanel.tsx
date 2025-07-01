import React, { useState } from 'react';
import { Settings, Palette, Keyboard, Layout, MessageSquare, Code, Bell, Shield, Zap, Download, Upload, RotateCcw } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext';

interface PreferencesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PreferencesPanel: React.FC<PreferencesPanelProps> = ({ isOpen, onClose }) => {
  const { preferences, updatePreference, resetToDefault, exportPreferences, importPreferences } = usePreferences();
  const [activeTab, setActiveTab] = useState('appearance');
  const [importError, setImportError] = useState<string | null>(null);

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'keyboard', label: 'Keyboard', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'layout', label: 'Layout', icon: <Layout className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat & AI', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'editor', label: 'Code Editor', icon: <Code className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Zap className="w-4 h-4" /> },
  ];

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        importPreferences(content);
        setImportError(null);
      } catch (error) {
        setImportError('Invalid preferences file format');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const dataStr = exportPreferences();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chainbot-preferences.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#18181b] rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#23232a]">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold px-2"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-[#101014] border-r border-[#23232a] p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#23232a]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Appearance</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => updatePreference('theme', e.target.value)}
                      className="w-full bg-[#23232a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Accent Color</label>
                    <div className="flex space-x-2">
                      {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map((color) => (
                        <button
                          key={color}
                          onClick={() => updatePreference('accentColor', color)}
                          className={`w-8 h-8 rounded-full border-2 ${
                            preferences.accentColor === color ? 'border-white' : 'border-gray-600'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Font Size</label>
                    <select
                      value={preferences.fontSize}
                      onChange={(e) => updatePreference('fontSize', e.target.value)}
                      className="w-full bg-[#23232a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="compactMode"
                      checked={preferences.compactMode}
                      onChange={(e) => updatePreference('compactMode', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="compactMode" className="text-sm text-gray-300">
                      Compact Mode
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keyboard' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="keyboardShortcutsEnabled"
                      checked={preferences.keyboardShortcutsEnabled}
                      onChange={(e) => updatePreference('keyboardShortcutsEnabled', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="keyboardShortcutsEnabled" className="text-sm text-gray-300">
                      Enable Keyboard Shortcuts
                    </label>
                  </div>

                  <div className="bg-[#101014] rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Default Shortcuts</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Command Palette</span>
                        <kbd className="px-2 py-1 bg-[#23232a] rounded text-xs">Ctrl+K</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Save</span>
                        <kbd className="px-2 py-1 bg-[#23232a] rounded text-xs">Ctrl+S</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">New Chat</span>
                        <kbd className="px-2 py-1 bg-[#23232a] rounded text-xs">Ctrl+N</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Toggle Sidebar</span>
                        <kbd className="px-2 py-1 bg-[#23232a] rounded text-xs">Ctrl+B</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'layout' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Layout</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Panel Layout</label>
                    <select
                      value={preferences.panelLayout}
                      onChange={(e) => updatePreference('panelLayout', e.target.value)}
                      className="w-full bg-[#23232a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white"
                    >
                      <option value="default">Default</option>
                      <option value="compact">Compact</option>
                      <option value="expanded">Expanded</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sidebarCollapsed"
                      checked={preferences.sidebarCollapsed}
                      onChange={(e) => updatePreference('sidebarCollapsed', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="sidebarCollapsed" className="text-sm text-gray-300">
                      Collapse Sidebar by Default
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoSave"
                      checked={preferences.autoSave}
                      onChange={(e) => updatePreference('autoSave', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="autoSave" className="text-sm text-gray-300">
                      Auto-save
                    </label>
                  </div>

                  {preferences.autoSave && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Auto-save Interval (seconds)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={preferences.autoSaveInterval}
                        onChange={(e) => updatePreference('autoSaveInterval', parseInt(e.target.value))}
                        className="w-full bg-[#23232a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Chat & AI</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Model</label>
                    <select
                      value={preferences.defaultModel}
                      onChange={(e) => updatePreference('defaultModel', e.target.value)}
                      className="w-full bg-[#23232a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3">Claude-3</option>
                      <option value="gemini-pro">Gemini Pro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Tokens</label>
                    <input
                      type="number"
                      min="100"
                      max="8000"
                      value={preferences.maxTokens}
                      onChange={(e) => updatePreference('maxTokens', parseInt(e.target.value))}
                      className="w-full bg-[#23232a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Temperature</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={preferences.temperature}
                      onChange={(e) => updatePreference('temperature', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Focused (0)</span>
                      <span>Balanced (1)</span>
                      <span>Creative (2)</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoScroll"
                      checked={preferences.autoScroll}
                      onChange={(e) => updatePreference('autoScroll', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="autoScroll" className="text-sm text-gray-300">
                      Auto-scroll to new messages
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="showTimestamps"
                      checked={preferences.showTimestamps}
                      onChange={(e) => updatePreference('showTimestamps', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="showTimestamps" className="text-sm text-gray-300">
                      Show timestamps
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Code Editor</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Editor Theme</label>
                    <select
                      value={preferences.editorTheme}
                      onChange={(e) => updatePreference('editorTheme', e.target.value)}
                      className="w-full bg-[#23232a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white"
                    >
                      <option value="vs-dark">VS Dark</option>
                      <option value="vs-light">VS Light</option>
                      <option value="hc-black">High Contrast Black</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="showLineNumbers"
                      checked={preferences.showLineNumbers}
                      onChange={(e) => updatePreference('showLineNumbers', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="showLineNumbers" className="text-sm text-gray-300">
                      Show line numbers
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="wordWrap"
                      checked={preferences.wordWrap}
                      onChange={(e) => updatePreference('wordWrap', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="wordWrap" className="text-sm text-gray-300">
                      Word wrap
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tab Size</label>
                    <input
                      type="number"
                      min="2"
                      max="8"
                      value={preferences.tabSize}
                      onChange={(e) => updatePreference('tabSize', parseInt(e.target.value))}
                      className="w-full bg-[#23232a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="insertSpaces"
                      checked={preferences.insertSpaces}
                      onChange={(e) => updatePreference('insertSpaces', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="insertSpaces" className="text-sm text-gray-300">
                      Insert spaces instead of tabs
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="notificationsEnabled"
                      checked={preferences.notificationsEnabled}
                      onChange={(e) => updatePreference('notificationsEnabled', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="notificationsEnabled" className="text-sm text-gray-300">
                      Enable notifications
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="soundEnabled"
                      checked={preferences.soundEnabled}
                      onChange={(e) => updatePreference('soundEnabled', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="soundEnabled" className="text-sm text-gray-300">
                      Enable sound notifications
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="desktopNotifications"
                      checked={preferences.desktopNotifications}
                      onChange={(e) => updatePreference('desktopNotifications', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="desktopNotifications" className="text-sm text-gray-300">
                      Desktop notifications
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Privacy & Data</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="analyticsEnabled"
                      checked={preferences.analyticsEnabled}
                      onChange={(e) => updatePreference('analyticsEnabled', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="analyticsEnabled" className="text-sm text-gray-300">
                      Enable analytics
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="telemetryEnabled"
                      checked={preferences.telemetryEnabled}
                      onChange={(e) => updatePreference('telemetryEnabled', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="telemetryEnabled" className="text-sm text-gray-300">
                      Enable telemetry
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoUpdate"
                      checked={preferences.autoUpdate}
                      onChange={(e) => updatePreference('autoUpdate', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="autoUpdate" className="text-sm text-gray-300">
                      Auto-update
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Performance</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="hardwareAcceleration"
                      checked={preferences.hardwareAcceleration}
                      onChange={(e) => updatePreference('hardwareAcceleration', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="hardwareAcceleration" className="text-sm text-gray-300">
                      Hardware acceleration
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="lowPowerMode"
                      checked={preferences.lowPowerMode}
                      onChange={(e) => updatePreference('lowPowerMode', e.target.checked)}
                      className="rounded border-gray-600 bg-[#23232a] text-blue-500"
                    />
                    <label htmlFor="lowPowerMode" className="text-sm text-gray-300">
                      Low power mode
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#23232a] bg-[#101014]">
          <div className="flex space-x-2">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <label className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={resetToDefault}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Default</span>
            </button>
          </div>
          
          {importError && (
            <div className="text-red-400 text-sm">{importError}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreferencesPanel; 