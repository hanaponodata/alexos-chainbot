import React, { useState } from 'react';
import { usePersistentMemory } from '../hooks/usePersistentMemory';
import { 
  Share2, 
  Download, 
  Upload, 
  Copy, 
  CheckCircle,
  AlertCircle,
  Brain,
  History
} from 'lucide-react';

interface SessionHandoffProps {
  sessionData?: any;
  onImport?: (sessionData: any) => void;
  onExport?: () => any;
  onClose?: () => void;
}

export const SessionHandoff: React.FC<SessionHandoffProps> = ({
  sessionData,
  onImport,
  onExport,
  onClose
}) => {
  const { exportSessionData, importSessionData } = usePersistentMemory();
  const [handoffCode, setHandoffCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');

  // Generate handoff code from session data
  const generateHandoffCode = () => {
    if (sessionData) {
      const compressed = btoa(JSON.stringify(sessionData));
      setHandoffCode(compressed);
    }
  };

  // Import from handoff code
  const importFromCode = () => {
    if (!handoffCode.trim()) return;

    setImportStatus('importing');
    try {
      const decoded = JSON.parse(atob(handoffCode));
      const success = importSessionData(decoded);
      
      if (success) {
        setImportStatus('success');
        if (onImport) {
          onImport(decoded);
        }
        setTimeout(() => setImportStatus('idle'), 2000);
      } else {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to import from handoff code:', error);
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  // Copy handoff code to clipboard
  const copyToClipboard = () => {
    if (handoffCode) {
      navigator.clipboard.writeText(handoffCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Export current session
  const handleExport = () => {
    if (onExport) {
      const data = onExport();
      if (data) {
        const compressed = btoa(JSON.stringify(data));
        setHandoffCode(compressed);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Share2 className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-200">Session Handoff</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200"
            >
              ×
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Export Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Download className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-medium text-gray-200">Export Session</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Generate a handoff code to transfer this session to another chat window or device.
              </p>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Generate Handoff Code
                </button>
                <button
                  onClick={generateHandoffCode}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Use Provided Data
                </button>
              </div>

              {handoffCode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Handoff Code:</label>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={handoffCode}
                    readOnly
                    className="w-full h-24 p-3 bg-gray-800 border border-gray-600 rounded-md text-xs font-mono text-gray-200 resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Import Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Upload className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-medium text-gray-200">Import Session</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Paste a handoff code to import a session from another chat window or device.
              </p>
              
              <textarea
                value={handoffCode}
                onChange={(e) => setHandoffCode(e.target.value)}
                placeholder="Paste handoff code here..."
                className="w-full h-24 p-3 bg-gray-800 border border-gray-600 rounded-md text-sm text-gray-200 placeholder-gray-400 resize-none"
              />
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={importFromCode}
                  disabled={!handoffCode.trim() || importStatus === 'importing'}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  {importStatus === 'importing' ? 'Importing...' : 'Import Session'}
                </button>
                
                {importStatus === 'success' && (
                  <div className="flex items-center space-x-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Success!</span>
                  </div>
                )}
                
                {importStatus === 'error' && (
                  <div className="flex items-center space-x-1 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Import failed</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Session Info */}
          {sessionData && (
            <div className="p-4 bg-gray-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Brain className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-medium text-gray-200">Session Information</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Session ID:</span>
                  <div className="text-gray-200 font-mono">{sessionData.sessionId?.slice(-8)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Messages:</span>
                  <div className="text-gray-200">{sessionData.conversation?.messages?.length || 0}</div>
                </div>
                <div>
                  <span className="text-gray-400">Contexts:</span>
                  <div className="text-gray-200">{sessionData.contexts?.length || 0}</div>
                </div>
                <div>
                  <span className="text-gray-400">Export Date:</span>
                  <div className="text-gray-200">{new Date(sessionData.exportDate).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 