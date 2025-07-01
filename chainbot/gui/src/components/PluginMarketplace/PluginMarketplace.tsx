import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Star, 
  Download, 
  Eye, 
  Heart, 
  Share2, 
  Filter,
  Search,
  Grid,
  List,
  TrendingUp,
  Clock,
  Award,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  GitBranch,
  Users,
  Calendar,
  Tag
} from 'lucide-react';

export interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  longDescription: string;
  author: string;
  authorAvatar?: string;
  type: 'panel' | 'tool' | 'workflow' | 'theme' | 'integration';
  entryPoint: string;
  dependencies: string[];
  permissions: string[];
  downloads: number;
  rating: number;
  reviewCount: number;
  category: string;
  tags: string[];
  price: 'free' | 'premium' | 'subscription';
  lastUpdated: string;
  compatibility: string[];
  size: string;
  license: string;
  repository?: string;
  documentation?: string;
  screenshots: string[];
  featured: boolean;
  verified: boolean;
  trending: boolean;
  reviews: PluginReview[];
}

export interface PluginReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
  verified: boolean;
}

interface PluginMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: (plugin: MarketplacePlugin) => void;
  installedPlugins: string[];
}

const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({
  isOpen,
  onClose,
  onInstall,
  installedPlugins
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest' | 'trending'>('popular');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Enhanced mock marketplace data
  const mockMarketplace: MarketplacePlugin[] = [
    {
      id: 'terminal-panel',
      name: 'Terminal Panel Pro',
      version: '2.1.0',
      description: 'Advanced integrated terminal with syntax highlighting and command history',
      longDescription: 'A powerful terminal panel that integrates seamlessly with your development workflow. Features include syntax highlighting, command history, multiple sessions, and custom themes.',
      author: 'ChainBot Team',
      authorAvatar: 'https://via.placeholder.com/32',
      type: 'panel',
      entryPoint: 'terminal-panel',
      dependencies: [],
      permissions: ['terminal', 'file-system', 'network'],
      downloads: 12500,
      rating: 4.8,
      reviewCount: 342,
      category: 'Development',
      tags: ['terminal', 'cli', 'development', 'productivity'],
      price: 'free',
      lastUpdated: '2024-01-15',
      compatibility: ['v1.0+', 'macOS', 'Windows', 'Linux'],
      size: '2.4 MB',
      license: 'MIT',
      repository: 'https://github.com/chainbot/terminal-panel',
      documentation: 'https://docs.chainbot.dev/plugins/terminal',
      screenshots: [
        'https://via.placeholder.com/400x250/1a1a1e/ffffff?text=Terminal+Screenshot+1',
        'https://via.placeholder.com/400x250/1a1a1e/ffffff?text=Terminal+Screenshot+2'
      ],
      featured: true,
      verified: true,
      trending: true,
      reviews: [
        {
          id: '1',
          author: 'DevUser123',
          rating: 5,
          comment: 'Excellent terminal integration! The syntax highlighting and command history make development much more efficient.',
          date: '2024-01-10',
          helpful: 24,
          verified: true
        },
        {
          id: '2',
          author: 'CodeMaster',
          rating: 4,
          comment: 'Great plugin, but could use more customization options for themes.',
          date: '2024-01-08',
          helpful: 12,
          verified: true
        }
      ]
    },
    {
      id: 'git-integration',
      name: 'Git Integration Suite',
      version: '3.0.0',
      description: 'Complete Git workflow integration with visual diff viewer and branch management',
      longDescription: 'Comprehensive Git integration that brings all your version control needs into one place. Features visual diff viewing, branch management, commit history, and merge conflict resolution.',
      author: 'ChainBot Team',
      authorAvatar: 'https://via.placeholder.com/32',
      type: 'panel',
      entryPoint: 'git-panel',
      dependencies: ['terminal-panel'],
      permissions: ['git', 'file-system', 'network'],
      downloads: 8900,
      rating: 4.9,
      reviewCount: 567,
      category: 'Version Control',
      tags: ['git', 'version-control', 'diff', 'merge'],
      price: 'free',
      lastUpdated: '2024-01-12',
      compatibility: ['v1.0+', 'macOS', 'Windows', 'Linux'],
      size: '4.2 MB',
      license: 'MIT',
      repository: 'https://github.com/chainbot/git-integration',
      documentation: 'https://docs.chainbot.dev/plugins/git',
      screenshots: [
        'https://via.placeholder.com/400x250/1a1a1e/ffffff?text=Git+Screenshot+1',
        'https://via.placeholder.com/400x250/1a1a1e/ffffff?text=Git+Screenshot+2'
      ],
      featured: true,
      verified: true,
      trending: false,
      reviews: [
        {
          id: '3',
          author: 'GitGuru',
          rating: 5,
          comment: 'This is exactly what I needed! The visual diff viewer is incredible and the branch management is intuitive.',
          date: '2024-01-14',
          helpful: 45,
          verified: true
        }
      ]
    },
    {
      id: 'ai-code-review',
      name: 'AI Code Review Assistant',
      version: '1.5.0',
      description: 'AI-powered code review with intelligent suggestions and best practices',
      longDescription: 'Leverage the power of AI to review your code automatically. Get intelligent suggestions for improvements, security vulnerabilities, and best practices.',
      author: 'AI Labs',
      authorAvatar: 'https://via.placeholder.com/32',
      type: 'workflow',
      entryPoint: 'ai-review',
      dependencies: [],
      permissions: ['code-analysis', 'ai'],
      downloads: 21000,
      rating: 4.7,
      reviewCount: 892,
      category: 'AI & ML',
      tags: ['ai', 'code-review', 'security', 'best-practices'],
      price: 'premium',
      lastUpdated: '2024-01-10',
      compatibility: ['v1.0+', 'macOS', 'Windows', 'Linux'],
      size: '8.1 MB',
      license: 'Commercial',
      repository: 'https://github.com/ailabs/ai-code-review',
      documentation: 'https://docs.ailabs.dev/code-review',
      screenshots: [
        'https://via.placeholder.com/400x250/1a1a1e/ffffff?text=AI+Review+Screenshot+1'
      ],
      featured: true,
      verified: true,
      trending: true,
      reviews: [
        {
          id: '4',
          author: 'SeniorDev',
          rating: 5,
          comment: 'This plugin has caught so many potential issues in our codebase. The AI suggestions are surprisingly accurate!',
          date: '2024-01-13',
          helpful: 67,
          verified: true
        }
      ]
    },
    {
      id: 'dark-theme-pro',
      name: 'Dark Theme Pro',
      version: '1.2.0',
      description: 'Premium dark theme with advanced customization and syntax highlighting',
      longDescription: 'A beautifully crafted dark theme with extensive customization options. Features advanced syntax highlighting, custom color schemes, and smooth transitions.',
      author: 'Theme Studio',
      authorAvatar: 'https://via.placeholder.com/32',
      type: 'theme',
      entryPoint: 'dark-pro-theme',
      dependencies: [],
      permissions: ['ui'],
      downloads: 5670,
      rating: 4.6,
      reviewCount: 234,
      category: 'Themes',
      tags: ['theme', 'dark', 'customization', 'syntax-highlighting'],
      price: 'premium',
      lastUpdated: '2024-01-08',
      compatibility: ['v1.0+', 'macOS', 'Windows', 'Linux'],
      size: '1.8 MB',
      license: 'Commercial',
      repository: 'https://github.com/themestudio/dark-pro',
      documentation: 'https://docs.themestudio.dev/dark-pro',
      screenshots: [
        'https://via.placeholder.com/400x250/1a1a1e/ffffff?text=Dark+Theme+Screenshot+1'
      ],
      featured: false,
      verified: true,
      trending: false,
      reviews: [
        {
          id: '5',
          author: 'DesignerDev',
          rating: 4,
          comment: 'Beautiful theme with great customization options. The syntax highlighting is perfect for my workflow.',
          date: '2024-01-11',
          helpful: 18,
          verified: true
        }
      ]
    },
    {
      id: 'database-explorer',
      name: 'Database Explorer',
      version: '1.0.0',
      description: 'Visual database management with query builder and data visualization',
      longDescription: 'Connect to and manage your databases directly from ChainBot. Features include visual query builder, data visualization, and schema management.',
      author: 'DataTools Inc',
      authorAvatar: 'https://via.placeholder.com/32',
      type: 'panel',
      entryPoint: 'database-explorer',
      dependencies: [],
      permissions: ['database', 'network'],
      downloads: 3400,
      rating: 4.5,
      reviewCount: 156,
      category: 'Database',
      tags: ['database', 'sql', 'query-builder', 'data-visualization'],
      price: 'free',
      lastUpdated: '2024-01-05',
      compatibility: ['v1.0+', 'macOS', 'Windows', 'Linux'],
      size: '5.6 MB',
      license: 'MIT',
      repository: 'https://github.com/datatools/database-explorer',
      documentation: 'https://docs.datatools.dev/database-explorer',
      screenshots: [
        'https://via.placeholder.com/400x250/1a1a1e/ffffff?text=Database+Screenshot+1'
      ],
      featured: false,
      verified: true,
      trending: false,
      reviews: [
        {
          id: '6',
          author: 'DataEngineer',
          rating: 4,
          comment: 'Great tool for database management. The query builder is intuitive and the visualizations are helpful.',
          date: '2024-01-09',
          helpful: 23,
          verified: true
        }
      ]
    }
  ];

  const categories = [
    { id: 'all', label: 'All Categories', count: mockMarketplace.length },
    { id: 'Development', label: 'Development', count: mockMarketplace.filter(p => p.category === 'Development').length },
    { id: 'Version Control', label: 'Version Control', count: mockMarketplace.filter(p => p.category === 'Version Control').length },
    { id: 'AI & ML', label: 'AI & ML', count: mockMarketplace.filter(p => p.category === 'AI & ML').length },
    { id: 'Themes', label: 'Themes', count: mockMarketplace.filter(p => p.category === 'Themes').length },
    { id: 'Database', label: 'Database', count: mockMarketplace.filter(p => p.category === 'Database').length }
  ];

  const types = [
    { id: 'all', label: 'All Types', count: mockMarketplace.length },
    { id: 'panel', label: 'Panels', count: mockMarketplace.filter(p => p.type === 'panel').length },
    { id: 'tool', label: 'Tools', count: mockMarketplace.filter(p => p.type === 'tool').length },
    { id: 'workflow', label: 'Workflows', count: mockMarketplace.filter(p => p.type === 'workflow').length },
    { id: 'theme', label: 'Themes', count: mockMarketplace.filter(p => p.type === 'theme').length },
    { id: 'integration', label: 'Integrations', count: mockMarketplace.filter(p => p.type === 'integration').length }
  ];

  const filteredPlugins = mockMarketplace.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
    const matchesType = selectedType === 'all' || plugin.type === selectedType;
    const matchesPrice = priceFilter === 'all' || plugin.price === priceFilter;
    return matchesSearch && matchesCategory && matchesType && matchesPrice;
  });

  const sortedPlugins = [...filteredPlugins].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.downloads - a.downloads;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      case 'trending':
        return (b.trending ? 1 : 0) - (a.trending ? 1 : 0);
      default:
        return 0;
    }
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
      />
    ));
  };

  const formatDownloads = (downloads: number) => {
    if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`;
    if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}K`;
    return downloads.toString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'panel': return <Package className="w-4 h-4" />;
      case 'tool': return <Info className="w-4 h-4" />;
      case 'workflow': return <GitBranch className="w-4 h-4" />;
      case 'theme': return <Eye className="w-4 h-4" />;
      case 'integration': return <Share2 className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'panel': return 'text-blue-400';
      case 'tool': return 'text-green-400';
      case 'workflow': return 'text-purple-400';
      case 'theme': return 'text-orange-400';
      case 'integration': return 'text-pink-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#18181b] rounded-lg shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#23232a]">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">Plugin Marketplace</h2>
            <div className="flex items-center space-x-2 ml-4">
              <span className="text-sm text-gray-400">Discover and install plugins to enhance your workflow</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold px-2"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-[#23232a] bg-[#101014]">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search plugins, tags, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#23232a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-[#23232a] border border-[#3a3a3a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
              <option value="trending">Trending</option>
            </select>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as any)}
              className="px-3 py-2 bg-[#23232a] border border-[#3a3a3a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Prices</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#23232a] text-gray-400 hover:text-white'
                  }`}
                >
                  {category.label} ({category.count})
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              {types.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    selectedType === type.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#23232a] text-gray-400 hover:text-white'
                  }`}
                >
                  {type.label} ({type.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Plugin List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {sortedPlugins.length} plugin{sortedPlugins.length !== 1 ? 's' : ''} found
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-[#23232a] text-gray-400'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-[#23232a] text-gray-400'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedPlugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="bg-[#101014] rounded-lg border border-[#23232a] hover:border-[#3a3a3a] transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedPlugin(plugin);
                      setShowDetails(true);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`p-2 rounded-lg bg-[#23232a] ${getTypeColor(plugin.type)}`}>
                            {getTypeIcon(plugin.type)}
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{plugin.name}</h4>
                            <p className="text-sm text-gray-400">v{plugin.version}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {plugin.featured && <Award className="w-4 h-4 text-yellow-400" />}
                          {plugin.verified && <Shield className="w-4 h-4 text-green-400" />}
                          {plugin.trending && <TrendingUp className="w-4 h-4 text-orange-400" />}
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-3 line-clamp-2">{plugin.description}</p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-1">
                          {renderStars(plugin.rating)}
                          <span className="text-sm text-gray-400 ml-1">({plugin.reviewCount})</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Download className="w-3 h-3" />
                          <span>{formatDownloads(plugin.downloads)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            plugin.price === 'free' ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'
                          }`}>
                            {plugin.price === 'free' ? 'Free' : 'Premium'}
                          </span>
                          <span className="text-xs text-gray-400">{plugin.size}</span>
                        </div>
                        {installedPlugins.includes(plugin.id) && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedPlugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="bg-[#101014] rounded-lg border border-[#23232a] hover:border-[#3a3a3a] transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedPlugin(plugin);
                      setShowDetails(true);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg bg-[#23232a] ${getTypeColor(plugin.type)}`}>
                            {getTypeIcon(plugin.type)}
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{plugin.name}</h4>
                            <p className="text-sm text-gray-400">v{plugin.version} • {plugin.author}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            {renderStars(plugin.rating)}
                            <span className="text-sm text-gray-400">({plugin.reviewCount})</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Download className="w-3 h-3" />
                            <span>{formatDownloads(plugin.downloads)}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            plugin.price === 'free' ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'
                          }`}>
                            {plugin.price === 'free' ? 'Free' : 'Premium'}
                          </span>
                          {installedPlugins.includes(plugin.id) && (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mt-2">{plugin.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plugin Details Sidebar */}
          {showDetails && selectedPlugin && (
            <div className="w-96 bg-[#101014] border-l border-[#23232a] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg bg-[#23232a] ${getTypeColor(selectedPlugin.type)}`}>
                      {getTypeIcon(selectedPlugin.type)}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{selectedPlugin.name}</h3>
                      <p className="text-gray-400">by {selectedPlugin.author}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Version:</span>
                    <span className="text-white">{selectedPlugin.version}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {renderStars(selectedPlugin.rating)}
                    <span className="text-sm text-gray-400 ml-2">
                      {selectedPlugin.rating} ({selectedPlugin.reviewCount} reviews)
                    </span>
                  </div>

                  <p className="text-gray-300">{selectedPlugin.longDescription}</p>

                  <div className="flex flex-wrap gap-2">
                    {selectedPlugin.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-[#23232a] text-gray-300 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-white font-medium">Details</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Size:</span>
                        <span className="text-white">{selectedPlugin.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">License:</span>
                        <span className="text-white">{selectedPlugin.license}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Updated:</span>
                        <span className="text-white">{new Date(selectedPlugin.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {selectedPlugin.dependencies.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-2">Dependencies</h4>
                      <div className="space-y-1">
                        {selectedPlugin.dependencies.map((dep) => (
                          <div key={dep} className="text-sm text-gray-400">• {dep}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-white font-medium mb-2">Permissions</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlugin.permissions.map((perm) => (
                        <span key={perm} className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-white font-medium">Recent Reviews</h4>
                    <div className="space-y-3">
                      {selectedPlugin.reviews.slice(0, 3).map((review) => (
                        <div key={review.id} className="bg-[#23232a] rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-sm font-medium">{review.author}</span>
                            <div className="flex items-center space-x-1">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">{review.comment}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {new Date(review.date).toLocaleDateString()}
                            </span>
                            {review.verified && (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {!installedPlugins.includes(selectedPlugin.id) ? (
                      <button
                        onClick={() => onInstall(selectedPlugin)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        Install Plugin
                      </button>
                    ) : (
                      <button
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg cursor-not-allowed"
                        disabled
                      >
                        Installed
                      </button>
                    )}
                    <button className="bg-[#23232a] hover:bg-[#3a3a3a] text-white py-2 px-4 rounded-lg transition-colors">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedPlugin.repository && (
                    <a
                      href={selectedPlugin.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 bg-[#23232a] hover:bg-[#3a3a3a] text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Repository</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PluginMarketplace; 