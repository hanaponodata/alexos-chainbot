import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  GitMerge, 
  Plus, 
  Minus, 
  FileText, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Download,
  Upload,
  History,
  Settings,
  Eye,
  Code
} from 'lucide-react';

interface GitPanelProps {
  // Props for future use
}

interface GitFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'staged';
  diff?: string;
}

interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: string[];
}

export const GitPanel: React.FC<GitPanelProps> = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'branches' | 'diff'>('status');
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [branches, setBranches] = useState(['main', 'develop', 'feature/ai-integration']);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Mock Git data
  const [gitStatus, setGitStatus] = useState<GitFile[]>([
    {
      path: 'src/App.tsx',
      status: 'modified',
      diff: `@@ -1,5 +1,6 @@
 import React, { useState, useCallback } from 'react';
-import { MessageSquare, Code, ShieldCheck, Brain, Users } from 'lucide-react';
+import { MessageSquare, Code, ShieldCheck, Brain, Users, Package, Search } from 'lucide-react';
 import ChatGPTStyleChat from './components/ChatGPTStyleChat';
 import CodeEditorRoot from './components/CodeEditor/CodeEditorRoot';
+import { PluginManager } from './components/PluginManager/PluginManager';
+import { usePluginStore } from './stores/pluginStore';`
    },
    {
      path: 'src/components/CodeEditor/CodeEditorRoot.tsx',
      status: 'modified'
    },
    {
      path: 'src/components/Plugins/TerminalPanel.tsx',
      status: 'added'
    },
    {
      path: 'src/stores/pluginStore.ts',
      status: 'added'
    }
  ]);

  const [gitHistory, setGitHistory] = useState<GitCommit[]>([
    {
      hash: 'a1b2c3d',
      author: 'Alex',
      date: '2024-01-15 14:30',
      message: 'feat: add plugin system and terminal panel',
      files: ['src/stores/pluginStore.ts', 'src/components/Plugins/TerminalPanel.tsx']
    },
    {
      hash: 'e4f5g6h',
      author: 'Alex',
      date: '2024-01-15 13:45',
      message: 'fix: resolve Monaco editor duplicate key warnings',
      files: ['src/components/CodeEditor/CodeEditorRoot.tsx']
    },
    {
      hash: 'i7j8k9l',
      author: 'Alex',
      date: '2024-01-15 12:20',
      message: 'feat: integrate persistent chat panel',
      files: ['src/components/PersistentChat.tsx', 'src/App.tsx']
    }
  ]);

  const handleStageFile = (filePath: string) => {
    setGitStatus(prev => prev.map(file => 
      file.path === filePath 
        ? { ...file, status: file.status === 'staged' ? 'modified' : 'staged' }
        : file
    ));
  };

  const handleStageAll = () => {
    setGitStatus(prev => prev.map(file => ({ ...file, status: 'staged' })));
  };

  const handleUnstageAll = () => {
    setGitStatus(prev => prev.map(file => 
      file.status === 'staged' 
        ? { ...file, status: file.path.includes('TerminalPanel') ? 'added' : 'modified' }
        : file
    ));
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !gitStatus.some(f => f.status === 'staged')) {
      return;
    }

    setIsLoading(true);
    
    // Mock commit process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newCommit: GitCommit = {
      hash: Math.random().toString(36).substr(2, 7),
      author: 'Alex',
      date: new Date().toISOString().replace('T', ' ').substr(0, 16),
      message: commitMessage,
      files: gitStatus.filter(f => f.status === 'staged').map(f => f.path)
    };

    setGitHistory(prev => [newCommit, ...prev]);
    setGitStatus(prev => prev.filter(f => f.status !== 'staged'));
    setCommitMessage('');
    setIsLoading(false);
  };

  const handlePush = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    // Mock push success
  };

  const handlePull = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    // Mock pull success
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'modified': return <FileText className="w-4 h-4 text-yellow-400" />;
      case 'added': return <Plus className="w-4 h-4 text-green-400" />;
      case 'deleted': return <Minus className="w-4 h-4 text-red-400" />;
      case 'untracked': return <FileText className="w-4 h-4 text-gray-400" />;
      case 'staged': return <CheckCircle className="w-4 h-4 text-green-400" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'modified': return 'text-yellow-400';
      case 'added': return 'text-green-400';
      case 'deleted': return 'text-red-400';
      case 'untracked': return 'text-gray-400';
      case 'staged': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-[#1a1a1e] border border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-10 bg-[#18181b] border-b border-gray-800 px-3">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-white font-medium">Git</span>
          <span className="text-xs text-gray-400">({currentBranch})</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeTab === 'status' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeTab === 'branches' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Branches
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeTab === 'diff' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Diff
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'status' && (
          <div className="h-full flex flex-col">
            {/* Git Status */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {gitStatus.map((file) => (
                  <div
                    key={file.path}
                    className={`flex items-center justify-between p-2 rounded border ${
                      file.status === 'staged' 
                        ? 'border-green-600 bg-green-600/10' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(file.status)}
                      <span className={`text-sm ${getStatusColor(file.status)}`}>
                        {file.path}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStageFile(file.path)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          file.status === 'staged'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {file.status === 'staged' ? 'Unstage' : 'Stage'}
                      </button>
                      {file.diff && (
                        <button
                          onClick={() => {
                            setSelectedFile(file.path);
                            setActiveTab('diff');
                          }}
                          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commit Section */}
            <div className="border-t border-gray-800 p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleStageAll}
                      className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                    >
                      Stage All
                    </button>
                    <button
                      onClick={handleUnstageAll}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Unstage All
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handlePull}
                      disabled={isLoading}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                    >
                      <Download className="w-3 h-3" />
                      <span>Pull</span>
                    </button>
                    <button
                      onClick={handlePush}
                      disabled={isLoading}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Push</span>
                    </button>
                  </div>
                </div>
                
                <div>
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Enter commit message..."
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    rows={3}
                  />
                </div>
                
                <button
                  onClick={handleCommit}
                  disabled={!commitMessage.trim() || !gitStatus.some(f => f.status === 'staged') || isLoading}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <GitCommit className="w-4 h-4" />
                  )}
                  <span>Commit</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="h-full overflow-y-auto p-3">
            <div className="space-y-3">
              {gitHistory.map((commit) => (
                <div key={commit.hash} className="bg-gray-800/50 border border-gray-700 rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-white">{commit.message}</h4>
                      <p className="text-xs text-gray-400">
                        {commit.author} • {commit.date} • {commit.hash}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button className="p-1 text-gray-400 hover:text-white">
                        <Eye className="w-3 h-3" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-white">
                        <Code className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {commit.files.length} file(s) changed
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="h-full overflow-y-auto p-3">
            <div className="space-y-2">
              {branches.map((branch) => (
                <div
                  key={branch}
                  className={`flex items-center justify-between p-2 rounded border ${
                    branch === currentBranch 
                      ? 'border-blue-600 bg-blue-600/10' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-blue-400" />
                    <span className={`text-sm ${branch === currentBranch ? 'text-blue-400' : 'text-white'}`}>
                      {branch}
                    </span>
                    {branch === currentBranch && (
                      <span className="text-xs text-blue-400">(current)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded">
                      Checkout
                    </button>
                    <button className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded">
                      Merge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="h-full overflow-y-auto p-3">
            {selectedFile ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">Diff: {selectedFile}</h4>
                  <button
                    onClick={() => setActiveTab('status')}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <pre className="text-xs font-mono bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                  <code className="text-green-400">
                    {gitStatus.find(f => f.path === selectedFile)?.diff || 'No diff available'}
                  </code>
                </pre>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <Eye className="w-8 h-8 mx-auto mb-2" />
                <p>Select a file to view its diff</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 