import React from 'react';
import { usePlugins } from '../contexts/PluginContext';

const PluginManager: React.FC = () => {
  const { plugins, enabled, togglePlugin } = usePlugins();

  return (
    <div className="p-8 text-white max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Plugin Manager</h1>
      <ul className="space-y-4">
        {plugins
          .sort((a, b) => Number(enabled[b.id]) - Number(enabled[a.id]))
          .map(plugin => (
            <li key={plugin.id} className="flex items-start gap-4 bg-[#18181b] rounded-lg p-4 border border-gray-800">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-lg">{plugin.name}</span>
                  {enabled[plugin.id] && (
                    <span className="text-xs bg-green-700 text-white px-2 py-0.5 rounded">Enabled</span>
                  )}
                </div>
                <div className="text-gray-400 text-sm mb-2">{plugin.description}</div>
              </div>
              <button
                onClick={() => togglePlugin(plugin.id)}
                className={`px-3 py-1 rounded transition-colors text-sm font-semibold ${enabled[plugin.id] ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                aria-pressed={enabled[plugin.id]}
                aria-label={enabled[plugin.id] ? `Disable ${plugin.name}` : `Enable ${plugin.name}`}
              >
                {enabled[plugin.id] ? 'Disable' : 'Enable'}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default PluginManager; 