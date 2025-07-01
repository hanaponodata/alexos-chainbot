import React from 'react';
import { usePersistentMemory } from '../hooks/usePersistentMemory';
import { Brain, MessageSquare, Clock, Activity, Trash2, Download, Upload } from 'lucide-react';

export const MemoryDashboard: React.FC = () => {
  const { 
    memoryStats, 
    sessions, 
    contexts, 
    cleanupMemory, 
    exportSessionData,
    importSessionData 
  } = usePersistentMemory();

  const handleExportAll = () => {
    const allData = {
      sessions,
      contexts,
      stats: memoryStats,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainbot-memory-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.sessions) {
          data.sessions.forEach((session: any) => {
            importSessionData({ session });
          });
        }
        alert('Memory data imported successfully!');
      } catch (error) {
        console.error('Failed to import memory data:', error);
        alert('Failed to import memory data');
      }
    };
    reader.readAsText(file);
  };

  const handleCleanup = () => {
    if (confirm('This will remove old and unused memory contexts. Continue?')) {
      cleanupMemory();
      alert('Memory cleanup completed!');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Memory Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportAll}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export All</span>
          </button>
          <label className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors cursor-pointer">
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
            onClick={handleCleanup}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Cleanup</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Total Contexts</p>
              <p className="text-2xl font-bold text-white">{memoryStats.totalContexts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-sm text-gray-400">Total Sessions</p>
              <p className="text-2xl font-bold text-white">{memoryStats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-yellow-400" />
            <div>
              <p className="text-sm text-gray-400">Active Contexts</p>
              <p className="text-2xl font-bold text-white">{memoryStats.activeContexts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Memory Usage</p>
              <p className="text-2xl font-bold text-white">{memoryStats.memoryUsage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Sessions</h2>
        <div className="space-y-2">
          {sessions.slice(0, 5).map(session => (
            <div key={session.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div>
                <p className="text-white font-medium">{session.title}</p>
                <p className="text-sm text-gray-400">
                  {session.messages.length} messages • {session.metadata.sessionType}
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {new Date(session.metadata.lastActivity).toLocaleDateString()}
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-gray-400 text-center py-4">No sessions yet</p>
          )}
        </div>
      </div>

      {/* Recent Contexts */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Contexts</h2>
        <div className="space-y-2">
          {contexts.slice(0, 5).map(context => (
            <div key={context.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div>
                <p className="text-white font-medium">{context.title}</p>
                <p className="text-sm text-gray-400">
                  {context.type} • Priority: {context.priority} • Access: {context.accessCount}
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {new Date(context.lastAccessed).toLocaleDateString()}
              </div>
            </div>
          ))}
          {contexts.length === 0 && (
            <p className="text-gray-400 text-center py-4">No contexts yet</p>
          )}
        </div>
      </div>
    </div>
  );
};
