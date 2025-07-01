import React from 'react';
import { usePluginLogs } from '../../contexts/PluginLogContext';

interface PluginLogViewerProps {
  pluginName: string;
}

const levelColors: Record<string, string> = {
  log: 'text-gray-300',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

export const PluginLogViewer: React.FC<PluginLogViewerProps> = ({ pluginName }) => {
  const { logs, clearLogs } = usePluginLogs();
  const pluginLogs = logs.filter(l => l.plugin === pluginName);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-4 max-h-64 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white font-semibold">Logs for {pluginName}</h4>
        <button
          onClick={() => clearLogs(pluginName)}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
        >
          Clear
        </button>
      </div>
      {pluginLogs.length === 0 ? (
        <div className="text-gray-500 text-sm">No logs yet.</div>
      ) : (
        <ul className="space-y-1 text-xs font-mono">
          {pluginLogs.map((log, idx) => (
            <li key={idx} className={levelColors[log.level] || 'text-gray-300'}>
              <span className="text-gray-500">[{log.timestamp.toLocaleTimeString()}]</span> <span className="font-bold">[{log.level.toUpperCase()}]</span> {log.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}; 