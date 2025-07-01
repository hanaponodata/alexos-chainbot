import React, { useState } from 'react';
import { 
  Package, 
  Settings, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Search, 
  Filter,
  Grid,
  List,
  Plus,
  RefreshCw,
  Info,
  Code,
  Palette,
  Workflow,
  Monitor,
  Store,
  Star
} from 'lucide-react';
import { usePluginStore, type Plugin } from '../../stores/pluginStore';
import PluginMarketplace from '../PluginMarketplace/PluginMarketplace';
import type { MarketplacePlugin } from '../PluginMarketplace/PluginMarketplace';
import { PluginErrorBoundary } from '../PluginMarketplace/PluginErrorBoundary';
import { PluginLogViewer } from './PluginLogViewer';

interface PluginManagerProps {
  onClose: () => void;
}

export const PluginManager: React.FC<PluginManagerProps> = ({ onClose }) => {
  const { 
    plugins, 
    registerPlugin, 
    unregisterPlugin, 
    enablePlugin, 
    disablePlugin,
    updatePluginConfig 
  } = usePluginStore();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'panel' | 'tool' | 'workflow' | 'theme' | 'integration'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [logViewerPlugin, setLogViewerPlugin] = useState<string | null>(null);

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || plugin.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'enabled' && plugin.enabled) ||
                         (filterStatus === 'disabled' && !plugin.enabled);
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleInstallFromMarketplace = (marketplacePlugin: MarketplacePlugin) => {
    registerPlugin({
      name: marketplacePlugin.name,
      version: marketplacePlugin.version,
      description: marketplacePlugin.description,
      author: marketplacePlugin.author,
      enabled: true,
      type: marketplacePlugin.type,
      entryPoint: marketplacePlugin.entryPoint,
      config: {},
      dependencies: marketplacePlugin.dependencies,
      permissions: marketplacePlugin.permissions
    });
  };

  const handleUpdatePlugin = (plugin: Plugin) => {
    // Mock update functionality
    console.log('Updating plugin:', plugin.name);
    setShowUpdateModal(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'panel': return <Monitor className="w-4 h-4" />;
      case 'tool': return <Code className="w-4 h-4" />;
      case 'workflow': return <Workflow className="w-4 h-4" />;
      case 'theme': return <Palette className="w-4 h-4" />;
      case 'integration': return <Package className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'panel': return 'text-blue-400';
      case 'tool': return 'text-green-400';
      case 'workflow': return 'text-purple-400';
      case 'theme': return 'text-orange-400';
      case 'integration': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'text-green-400' : 'text-gray-400';
  };

  const installedPluginIds = plugins.map(p => p.name.toLowerCase().replace(/\s+/g, '-'));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#1a1a1e] border border-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Plugin Manager</h2>
              <span className="text-sm text-gray-400">({plugins.length} installed)</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMarketplace(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                <Store className="w-4 h-4" />
                <span>Marketplace</span>
              </button>
              <button
                onClick={() => setShowInstallModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Install Plugin</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search installed plugins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Types</option>
                <option value="panel">Panels</option>
                <option value="tool">Tools</option>
                <option value="workflow">Workflows</option>
                <option value="theme">Themes</option>
                <option value="integration">Integrations</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Status</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-400'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Plugin List */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredPlugins.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No plugins found</h3>
                <p className="text-gray-400 mb-4">
                  {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by installing plugins from the marketplace'
                  }
                </p>
                {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
                  <button
                    onClick={() => setShowMarketplace(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Browse Marketplace
                  </button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredPlugins.map((plugin) => (
                  <PluginErrorBoundary pluginName={plugin.name}>
                    <div
                      key={plugin.name}
                      className={`bg-gray-800/30 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors ${
                        viewMode === 'list' ? 'flex items-center justify-between' : ''
                      }`}
                    >
                      {viewMode === 'grid' ? (
                        <>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg bg-gray-700 ${getTypeColor(plugin.type)}`}>
                                {getTypeIcon(plugin.type)}
                              </div>
                              <div>
                                <h3 className="text-white font-medium">{plugin.name}</h3>
                                <p className="text-sm text-gray-400">v{plugin.version}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${plugin.enabled ? 'bg-green-400' : 'bg-gray-400'}`} />
                            </div>
                          </div>
                          
                          <p className="text-gray-300 text-sm mb-4 line-clamp-2">{plugin.description}</p>
                          
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-400">by {plugin.author}</span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setSelectedPlugin(plugin)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowUpdateModal(true)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => plugin.enabled ? disablePlugin(plugin.name) : enablePlugin(plugin.name)}
                              className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                                plugin.enabled
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {plugin.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => unregisterPlugin(plugin.name)}
                              className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-lg bg-gray-700 ${getTypeColor(plugin.type)}`}>
                              {getTypeIcon(plugin.type)}
                            </div>
                            <div>
                              <h3 className="text-white font-medium">{plugin.name}</h3>
                              <p className="text-sm text-gray-400">v{plugin.version} • {plugin.author}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className={`flex items-center space-x-1 ${getStatusColor(plugin.enabled)}`}>
                              <div className={`w-2 h-2 rounded-full ${plugin.enabled ? 'bg-green-400' : 'bg-gray-400'}`} />
                              <span className="text-sm">{plugin.enabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setSelectedPlugin(plugin)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Settings"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowUpdateModal(true)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Update"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => plugin.enabled ? disablePlugin(plugin.name) : enablePlugin(plugin.name)}
                                className={`px-3 py-1 rounded text-sm transition-colors ${
                                  plugin.enabled
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                              >
                                {plugin.enabled ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => unregisterPlugin(plugin.name)}
                                className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                title="Uninstall"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      <button
                        onClick={() => setLogViewerPlugin(plugin.name)}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                        title="View Logs"
                      >
                        📝
                      </button>
                    </div>
                  </PluginErrorBoundary>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plugin Marketplace */}
      <PluginMarketplace
        isOpen={showMarketplace}
        onClose={() => setShowMarketplace(false)}
        onInstall={handleInstallFromMarketplace}
        installedPlugins={installedPluginIds}
      />

      {/* Plugin Settings Modal */}
      {selectedPlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#1a1a1e] border border-gray-800 rounded-lg shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Plugin Settings: {selectedPlugin.name}</h3>
              <button
                onClick={() => setSelectedPlugin(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Plugin Configuration</label>
                  <textarea
                    value={JSON.stringify(selectedPlugin.config, null, 2)}
                    onChange={(e) => {
                      try {
                        const newConfig = JSON.parse(e.target.value);
                        updatePluginConfig(selectedPlugin.name, newConfig);
                      } catch (error) {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="w-full h-32 bg-gray-800/50 border border-gray-700 rounded text-white p-3 font-mono text-sm"
                    placeholder="Plugin configuration (JSON)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Dependencies</label>
                  <div className="bg-gray-800/50 border border-gray-700 rounded p-3">
                    {selectedPlugin.dependencies.length > 0 ? (
                      <ul className="space-y-1">
                        {selectedPlugin.dependencies.map((dep) => (
                          <li key={dep} className="text-gray-300 text-sm">• {dep}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 text-sm">No dependencies</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlugin.permissions.map((perm) => (
                      <span key={perm} className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#1a1a1e] border border-gray-800 rounded-lg shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Update Plugin</h3>
              <p className="text-gray-300 mb-6">
                Check for updates and install the latest version of your plugins.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                >
                  Check for Updates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plugin Log Viewer Modal */}
      {logViewerPlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#18181b] border border-gray-800 rounded-lg shadow-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Plugin Logs: {logViewerPlugin}</h3>
              <button
                onClick={() => setLogViewerPlugin(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <PluginLogViewer pluginName={logViewerPlugin} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 