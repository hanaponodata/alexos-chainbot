import React, { useState, useEffect } from 'react';
import { usePersistentMemory } from '../hooks/usePersistentMemory';
import { 
  Brain, 
  Download, 
  Upload, 
  Search,
  Zap,
  MessageSquare
} from 'lucide-react';

interface PersistentChatProps {
  onSessionHandoff?: (sessionData: any) => void;
}

export const PersistentChat: React.FC<PersistentChatProps> = ({ onSessionHandoff }) => {
  const {
    contexts,
    searchMemory,
    memoryStats,
    exportSessionData,
    importSessionData
  } = usePersistentMemory();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedContext, setSelectedContext] = useState<any>(null);

  // Search memory
  const handleSearch = () => {
    if (searchQuery.trim()) {
      const results = searchMemory(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  // Export session data
  const handleExport = () => {
    const sessionData = exportSessionData('default');
    if (onSessionHandoff) {
      onSessionHandoff(sessionData);
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(JSON.stringify(sessionData, null, 2));
      alert('Session data copied to clipboard!');
    }
  };

  // Import session data
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const sessionData = JSON.parse(e.target?.result as string);
          importSessionData(sessionData);
          alert('Session data imported successfully!');
        } catch (error) {
          alert('Failed to import session data');
        }
      };
      reader.readAsText(file);
    }
  };

  console.log("PersistentChat rendered");
  return (
    // Docked: fixed width, no flex-1
    <div className="flex flex-col min-h-0" style={{ position: 'static', zIndex: 'auto', border: '4px solid red', background: '#ffeedd', width: 420, minWidth: 320, maxWidth: 520 }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#18181b]">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-semibold text-white">Persistent Memory</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <label className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Memory Stats */}
      <div className="p-4 bg-gray-800/50 border-b border-[#18181b]">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{memoryStats.totalContexts}</div>
            <div className="text-sm text-gray-400">Total Contexts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{memoryStats.totalSessions}</div>
            <div className="text-sm text-gray-400">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{memoryStats.activeContexts}</div>
            <div className="text-sm text-gray-400">Active Contexts</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-[#18181b]">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search memory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Context List */}
        <div className="w-1/2 border-r border-[#18181b] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Memory Contexts</h2>
            <div className="space-y-2">
              {contexts.map((context) => (
                <div
                  key={context.id}
                  onClick={() => setSelectedContext(context)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedContext?.id === context.id
                      ? 'bg-blue-600/20 border border-blue-500'
                      : 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">{context.title}</h3>
                    <span className="text-xs text-gray-400">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">{context.content}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {context.tags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-700/50 text-gray-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Context Details */}
        <div className="w-1/2 p-4 overflow-y-auto">
          {selectedContext ? (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Context Details</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-white mb-2">Title</h3>
                  <p className="text-gray-300">{selectedContext.title}</p>
                </div>
                <div>
                  <h3 className="font-medium text-white mb-2">Content</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedContext.content}</p>
                </div>
                <div>
                  <h3 className="font-medium text-white mb-2">Metadata</h3>
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <pre className="text-sm text-gray-300 overflow-x-auto">
                      {JSON.stringify(selectedContext.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-white mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedContext.tags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-sm bg-blue-600/20 text-blue-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-8">
              <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Select a context to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
