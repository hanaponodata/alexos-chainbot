import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  Save, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Upload,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AutoSaveState {
  id: string;
  content: string;
  timestamp: Date;
  type: 'manual' | 'auto' | 'recovery';
  metadata?: {
    fileId?: string;
    sessionId?: string;
    agentId?: string;
    version?: number;
  };
}

interface AutoSaveProps {
  content: string;
  fileId?: string;
  sessionId?: string;
  agentId?: string;
  onContentChange: (content: string) => void;
  onSave: () => Promise<void>;
  autoSaveInterval?: number; // in milliseconds
  maxHistorySize?: number;
  enabled?: boolean;
}

const AutoSave: React.FC<AutoSaveProps> = ({
  content,
  fileId,
  sessionId,
  agentId,
  onContentChange,
  onSave,
  autoSaveInterval = 30000, // 30 seconds
  maxHistorySize = 50
}) => {
  const { user } = useAuth();
  const [saveHistory, setSaveHistory] = useState<AutoSaveState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [lastSavedContent, setLastSavedContent] = useState(content);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef(content);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000';

  // Update content ref when content changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Load save history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(`autosave-history-${fileId || 'default'}`);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setSaveHistory(parsed.history || []);
        setCurrentIndex(parsed.currentIndex || -1);
        setLastSavedContent(parsed.lastSavedContent || content);
      } catch (error) {
        console.error('Failed to load save history:', error);
      }
    }
  }, [fileId, content]);

  // Save history to localStorage when it changes
  useEffect(() => {
    const historyData = {
      history: saveHistory,
      currentIndex,
      lastSavedContent,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(`autosave-history-${fileId || 'default'}`, JSON.stringify(historyData));
  }, [saveHistory, currentIndex, lastSavedContent, fileId]);

  // Auto-save timer
  useEffect(() => {
    if (autoSaveInterval > 0) {
      autoSaveTimerRef.current = setInterval(() => {
        if (contentRef.current !== lastSavedContent) {
          performAutoSave();
        }
      }, autoSaveInterval);

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [autoSaveInterval, lastSavedContent]);

  // Manual save function
  const performManualSave = async () => {
    if (saveStatus === 'saving') return;

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      await onSave();
      
      const saveState: AutoSaveState = {
        id: `save-${Date.now()}`,
        content: contentRef.current,
        timestamp: new Date(),
        type: 'manual',
        metadata: {
          fileId,
          sessionId,
          agentId,
          version: saveHistory.length + 1
        }
      };

      addToHistory(saveState);
      setLastSavedContent(contentRef.current);
      setLastSaveTime(new Date());
      setSaveStatus('success');

      // Clear success status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Save failed');
      console.error('Manual save failed:', error);
    }
  };

  // Auto-save function
  const performAutoSave = async () => {
    if (saveStatus === 'saving' || contentRef.current === lastSavedContent) return;

    setIsAutoSaving(true);

    try {
      await onSave();
      
      const saveState: AutoSaveState = {
        id: `autosave-${Date.now()}`,
        content: contentRef.current,
        timestamp: new Date(),
        type: 'auto',
        metadata: {
          fileId,
          sessionId,
          agentId,
          version: saveHistory.length + 1
        }
      };

      addToHistory(saveState);
      setLastSavedContent(contentRef.current);
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Don't show error for auto-save failures
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Add save state to history
  const addToHistory = (saveState: AutoSaveState) => {
    setSaveHistory(prev => {
      const newHistory = [...prev, saveState];
      
      // Trim history if it exceeds max size
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize);
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  };

  // Undo function
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const previousState = saveHistory[newIndex];
      
      if (previousState) {
        onContentChange(previousState.content);
        setCurrentIndex(newIndex);
      }
    }
  }, [currentIndex, saveHistory, onContentChange]);

  // Redo function
  const redo = useCallback(() => {
    if (currentIndex < saveHistory.length - 1) {
      const newIndex = currentIndex + 1;
      const nextState = saveHistory[newIndex];
      
      if (nextState) {
        onContentChange(nextState.content);
        setCurrentIndex(newIndex);
      }
    }
  }, [currentIndex, saveHistory, onContentChange]);

  // Export save history
  const exportHistory = () => {
    const historyData = {
      fileId,
      sessionId,
      agentId,
      history: saveHistory,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(historyData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autosave-history-${fileId || 'default'}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import save history
  const importHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        setSaveHistory(importedData.history || []);
        setCurrentIndex(importedData.history?.length - 1 || -1);
        console.log('Save history imported successfully');
      } catch (error) {
        console.error('Failed to import save history:', error);
        setErrorMessage('Failed to import save history');
      }
    };
    reader.readAsText(file);
  };

  // Recovery function
  const recoverFromHistory = (saveState: AutoSaveState) => {
    onContentChange(saveState.content);
    
    // Add recovery state to history
    const recoveryState: AutoSaveState = {
      id: `recovery-${Date.now()}`,
      content: saveState.content,
      timestamp: new Date(),
      type: 'recovery',
      metadata: {
        fileId,
        sessionId,
        agentId,
        version: saveHistory.length + 1
      }
    };

    addToHistory(recoveryState);
  };

  // Check if content has unsaved changes
  const hasUnsavedChanges = content !== lastSavedContent;

  // Check if undo/redo are available
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < saveHistory.length - 1;

  return (
    <div className="autosave-container">
      {/* Auto-save Status Bar */}
      <div className="autosave-status bg-gray-50 border-b border-gray-200 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Save Status */}
          <div className="flex items-center space-x-2">
            {saveStatus === 'saving' && (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-600">Saving...</span>
              </>
            )}
            {saveStatus === 'success' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Save failed</span>
              </>
            )}
            {saveStatus === 'idle' && hasUnsavedChanges && (
              <>
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-600">Unsaved changes</span>
              </>
            )}
          </div>

          {/* Last Save Time */}
          {lastSaveTime && (
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                Last saved: {lastSaveTime.toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <div className="flex items-center space-x-1">
              <div className="animate-pulse bg-blue-500 rounded-full h-2 w-2"></div>
              <span className="text-xs text-blue-600">Auto-saving...</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Manual Save */}
          <button
            onClick={performManualSave}
            disabled={saveStatus === 'saving' || !hasUnsavedChanges}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Export/Import */}
          <button
            onClick={exportHistory}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="Export history"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <label className="p-1 text-gray-600 hover:text-gray-800 cursor-pointer" title="Import history">
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept=".json"
              onChange={importHistory}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 p-2">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Save History Panel */}
      <div className="save-history-panel bg-gray-50 border-t border-gray-200 p-4">
        <h3 className="text-sm font-medium mb-3">Save History</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {saveHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No save history available</p>
          ) : (
            saveHistory.map((saveState, index) => (
              <div
                key={saveState.id}
                className={`save-history-item p-2 rounded cursor-pointer ${
                  index === currentIndex 
                    ? 'bg-blue-100 border border-blue-300' 
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => recoverFromHistory(saveState)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium">
                      {saveState.type === 'manual' ? 'Manual' : 
                       saveState.type === 'auto' ? 'Auto' : 'Recovery'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {saveState.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    v{saveState.metadata?.version}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {saveState.content.length} characters
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AutoSave; 