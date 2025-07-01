import React, { useState, useEffect } from 'react';
import { Settings, Key, TestTube, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { chatService } from '../services/chatService';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const ChatSettings: React.FC<ChatSettingsProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedApiKey = chatService.getApiKey();
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setTestMessage('Please enter an API key first');
      setTestResult('error');
      return;
    }

    setIsTesting(true);
    setTestResult('idle');
    setTestMessage('Testing API key...');

    try {
      // For now, just check if the key has the right format
      const isValid = apiKey.startsWith('sk-') && apiKey.length > 20;
      if (isValid) {
        setTestResult('success');
        setTestMessage('API key format is valid! ✅');
      } else {
        setTestResult('error');
        setTestMessage('Invalid API key format. Please check and try again.');
      }
    } catch (error) {
      setTestResult('error');
      setTestMessage(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      chatService.setApiKey(apiKey);
      onSave?.();
    } catch (error) {
      console.error('Failed to save API key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      chatService.clearConversationHistory();
      setTestResult('success');
      setTestMessage('Chat history cleared successfully! ✅');
    }
  };

  const handleExportHistory = () => {
    const conversationData = chatService.exportConversation();
    const blob = new Blob([conversationData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainbot-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setTestResult('success');
    setTestMessage('Chat history exported successfully! ✅');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setApiKey(content.trim());
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Chat Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API Key Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Key className="w-4 h-4 mr-2" />
              ChatGPT API Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Key'}
                </button>
                <button
                  onClick={handleTestApiKey}
                  disabled={isTesting}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {isTesting ? 'Testing...' : 'Test Key'}
                </button>
              </div>

              {/* Test Result */}
              {testMessage && (
                <div className={`p-3 rounded-md flex items-center ${
                  testResult === 'success' ? 'bg-green-50 text-green-800' :
                  testResult === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}>
                  {testResult === 'success' ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : testResult === 'error' ? (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  <span className="text-sm">{testMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat History Management */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Chat History
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={handleClearHistory}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Clear All History
              </button>
              
              <button
                onClick={handleExportHistory}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Export History
              </button>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import History
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSettings; 