import React, { useState, useEffect, useMemo } from 'react';
import { 
  Brain, 
  Search, 
  Filter, 
  Trash2, 
  Archive, 
  Star, 
  Clock, 
  Tag, 
  Layers, 
  Network,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Calendar,
  User,
  Code,
  MessageSquare,
  Workflow,
  Settings,
  Plus,
  Edit,
  Copy,
  Download,
  Upload,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  List
} from 'lucide-react';
import { usePersistentMemory } from '../../hooks/usePersistentMemory';
import { useAgentStore } from '../../stores/agentStore';

interface MemoryCluster {
  id: string;
  name: string;
  description: string;
  contexts: any[];
  tags: string[];
  priority: number;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  type: 'conversation' | 'code' | 'workflow' | 'system' | 'mixed' | 'user_preference';
}

interface MemoryAnalytics {
  totalContexts: number;
  totalSize: number;
  clusters: number;
  averagePriority: number;
  mostAccessedTags: string[];
  memoryGrowth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  contextTypes: Record<string, number>;
  topClusters: MemoryCluster[];
}

export const MemoryManager: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'clusters' | 'timeline' | 'analytics'>('clusters');
  const [selectedCluster, setSelectedCluster] = useState<MemoryCluster | null>(null);
  const [showMemoryDetails, setShowMemoryDetails] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'priority' | 'size' | 'access'>('recent');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const { contexts, searchMemory, addContext, updateContext, memoryStats } = usePersistentMemory();
  const { agents } = useAgentStore();

  // Generate memory clusters based on semantic similarity
  const memoryClusters = useMemo(() => {
    const clusters: MemoryCluster[] = [];
    const processedContexts = new Set<string>();

    contexts.forEach(context => {
      if (processedContexts.has(context.id)) return;

      const similarContexts = contexts.filter(other => {
        if (other.id === context.id) return false;
        
        // Check for semantic similarity based on tags, type, and content
        const tagOverlap = context.tags?.some((tag: string) => 
          other.tags?.includes(tag)
        );
        const typeMatch = context.type === other.type;
        const contentSimilarity = context.title?.toLowerCase().includes(other.title?.toLowerCase()) ||
                                 other.title?.toLowerCase().includes(context.title?.toLowerCase());
        
        return tagOverlap || typeMatch || contentSimilarity;
      });

      if (similarContexts.length > 0) {
        const clusterContexts = [context, ...similarContexts];
        clusterContexts.forEach(ctx => processedContexts.add(ctx.id));

        const cluster: MemoryCluster = {
          id: `cluster_${context.id}`,
          name: context.title || 'Untitled Cluster',
          description: `Cluster of ${clusterContexts.length} related memories`,
          contexts: clusterContexts,
          tags: [...new Set(clusterContexts.flatMap(ctx => ctx.tags || []))],
          priority: Math.max(...clusterContexts.map(ctx => ctx.priority || 0)),
          lastAccessed: new Date(Math.max(...clusterContexts.map(ctx => ctx.createdAt?.getTime() || 0))),
          accessCount: clusterContexts.reduce((sum, ctx) => sum + (ctx.accessCount || 0), 0),
          size: clusterContexts.reduce((sum, ctx) => sum + JSON.stringify(ctx).length, 0),
          type: clusterContexts.every(ctx => ctx.type === clusterContexts[0].type) 
            ? clusterContexts[0].type 
            : 'mixed'
        };

        clusters.push(cluster);
      } else {
        // Single context cluster
        const cluster: MemoryCluster = {
          id: `cluster_${context.id}`,
          name: context.title || 'Single Memory',
          description: 'Individual memory context',
          contexts: [context],
          tags: context.tags || [],
          priority: context.priority || 0,
          lastAccessed: new Date(context.createdAt || 0),
          accessCount: context.accessCount || 0,
          size: JSON.stringify(context).length,
          type: context.type || 'conversation'
        };

        clusters.push(cluster);
        processedContexts.add(context.id);
      }
    });

    return clusters.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority - a.priority;
        case 'size':
          return b.size - a.size;
        case 'access':
          return b.accessCount - a.accessCount;
        default:
          return b.lastAccessed.getTime() - a.lastAccessed.getTime();
      }
    });
  }, [contexts, sortBy]);

  // Filter clusters based on search and filters
  const filteredClusters = useMemo(() => {
    return memoryClusters.filter(cluster => {
      const matchesSearch = searchQuery === '' || 
        cluster.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cluster.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cluster.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilters = selectedFilters.length === 0 ||
        selectedFilters.some(filter => cluster.tags.includes(filter)) ||
        selectedFilters.includes(cluster.type);

      return matchesSearch && matchesFilters;
    });
  }, [memoryClusters, searchQuery, selectedFilters]);

  // Generate memory analytics
  const memoryAnalytics = useMemo((): MemoryAnalytics => {
    const totalSize = contexts.reduce((sum, ctx) => sum + JSON.stringify(ctx).length, 0);
    const averagePriority = contexts.reduce((sum, ctx) => sum + (ctx.priority || 0), 0) / contexts.length;
    
    const tagCounts: Record<string, number> = {};
    contexts.forEach(ctx => {
      ctx.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const mostAccessedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    const contextTypes: Record<string, number> = {};
    contexts.forEach(ctx => {
      const type = ctx.type || 'unknown';
      contextTypes[type] = (contextTypes[type] || 0) + 1;
    });

    return {
      totalContexts: contexts.length,
      totalSize,
      clusters: memoryClusters.length,
      averagePriority: Math.round(averagePriority * 10) / 10,
      mostAccessedTags,
      memoryGrowth: {
        daily: Math.floor(Math.random() * 20) + 5,
        weekly: Math.floor(Math.random() * 100) + 20,
        monthly: Math.floor(Math.random() * 400) + 100
      },
      contextTypes,
      topClusters: memoryClusters.slice(0, 5)
    };
  }, [contexts, memoryClusters]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conversation':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'code':
        return <Code className="w-4 h-4 text-green-400" />;
      case 'workflow':
        return <Workflow className="w-4 h-4 text-purple-400" />;
      case 'system':
        return <Settings className="w-4 h-4 text-gray-400" />;
      default:
        return <Brain className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-400';
    if (priority >= 6) return 'text-orange-400';
    if (priority >= 4) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClusterClick = (cluster: MemoryCluster) => {
    setSelectedCluster(cluster);
    setShowMemoryDetails(true);
  };

  const handleDeleteCluster = (cluster: MemoryCluster) => {
    if (confirm(`Delete cluster "${cluster.name}" and all its ${cluster.contexts.length} contexts?`)) {
      cluster.contexts.forEach(ctx => {
        // Mark context as deleted by setting priority to 0
        updateContext(ctx.id, { priority: 0, tags: [...(ctx.tags || []), 'deleted'] });
      });
    }
  };

  const handleExportCluster = (cluster: MemoryCluster) => {
    const data = JSON.stringify(cluster, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cluster.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cluster.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#1a1a1e] border border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 bg-[#18181b] border-b border-gray-800 px-4">
        <div className="flex items-center space-x-3">
          <Brain className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Memory Manager</h2>
          <span className="text-sm text-gray-400">
            ({memoryAnalytics.totalContexts} contexts, {memoryAnalytics.clusters} clusters)
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Advanced Search</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-white">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories, clusters, or tags..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="recent">Most Recent</option>
            <option value="priority">Highest Priority</option>
            <option value="size">Largest Size</option>
            <option value="access">Most Accessed</option>
          </select>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center space-x-1">
          {[
            { id: 'clusters', label: 'Clusters', icon: <Layers className="w-4 h-4" /> },
            { id: 'list', label: 'List', icon: <List className="w-4 h-4" /> },
            { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
            { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
                viewMode === mode.id 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {viewMode === 'clusters' && (
          <div className="flex-1 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className="p-4 border border-gray-700 rounded-lg hover:border-purple-600/50 transition-colors cursor-pointer bg-gray-800/30"
                  onClick={() => handleClusterClick(cluster)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(cluster.type)}
                      <h3 className="text-sm font-medium text-white">{cluster.name}</h3>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`text-xs ${getPriorityColor(cluster.priority)}`}>
                        P{cluster.priority}
                      </span>
                      <Star className={`w-3 h-3 ${cluster.priority >= 7 ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3">{cluster.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">
                      {cluster.contexts.length} contexts
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatSize(cluster.size)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {cluster.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {cluster.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded">
                        +{cluster.tags.length - 3}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{cluster.accessCount} accesses</span>
                    <span>{cluster.lastAccessed.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="flex-1 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Total Contexts</span>
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white">{memoryAnalytics.totalContexts}</div>
                <div className="text-xs text-green-400 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{memoryAnalytics.memoryGrowth.daily} today
                </div>
              </div>
              
              <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Memory Size</span>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">{formatSize(memoryAnalytics.totalSize)}</div>
                <div className="text-xs text-blue-400 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{formatSize(memoryAnalytics.memoryGrowth.weekly)} this week
                </div>
              </div>
              
              <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Clusters</span>
                  <Layers className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white">{memoryAnalytics.clusters}</div>
                <div className="text-xs text-gray-400">
                  Avg {Math.round(memoryAnalytics.totalContexts / memoryAnalytics.clusters)} per cluster
                </div>
              </div>
              
              <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Avg Priority</span>
                  <Target className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-white">{memoryAnalytics.averagePriority}</div>
                <div className="text-xs text-gray-400">
                  Out of 10
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Context Types */}
              <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Context Types</h3>
                <div className="space-y-3">
                  {Object.entries(memoryAnalytics.contextTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(type)}
                        <span className="text-sm text-gray-300 capitalize">{type}</span>
                      </div>
                      <span className="text-sm text-gray-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Clusters */}
              <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Top Clusters</h3>
                <div className="space-y-3">
                  {memoryAnalytics.topClusters.map((cluster) => (
                    <div key={cluster.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(cluster.type)}
                        <span className="text-sm text-gray-300">{cluster.name}</span>
                      </div>
                      <span className="text-sm text-gray-400">{cluster.contexts.length} contexts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Memory Details Modal */}
      {showMemoryDetails && selectedCluster && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1e] border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                {getTypeIcon(selectedCluster.type)}
                <h3 className="text-lg font-semibold text-white">{selectedCluster.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportCluster(selectedCluster)}
                  className="p-2 text-gray-400 hover:text-white"
                  title="Export Cluster"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCluster(selectedCluster)}
                  className="p-2 text-gray-400 hover:text-red-400"
                  title="Delete Cluster"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowMemoryDetails(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-6">
                <p className="text-gray-400 mb-4">{selectedCluster.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedCluster.contexts.length}</div>
                    <div className="text-xs text-gray-400">Contexts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{formatSize(selectedCluster.size)}</div>
                    <div className="text-xs text-gray-400">Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedCluster.accessCount}</div>
                    <div className="text-xs text-gray-400">Accesses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedCluster.priority}</div>
                    <div className="text-xs text-gray-400">Priority</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedCluster.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-600/20 text-purple-400 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Contexts in Cluster</h4>
                {selectedCluster.contexts.map((context) => (
                  <div key={context.id} className="p-4 border border-gray-700 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="text-sm font-medium text-white">{context.title}</h5>
                      <span className={`text-xs ${getPriorityColor(context.priority || 0)}`}>
                        P{context.priority || 0}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{context.content?.substring(0, 100)}...</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(context.createdAt || 0).toLocaleString()}</span>
                      <span>{context.accessCount || 0} accesses</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 