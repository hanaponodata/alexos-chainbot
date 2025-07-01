import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Grid,
  Trash2,
  ZoomIn,
  ZoomOut,
  Layers
} from 'lucide-react';

interface AgentToolbarProps {
  onAddAgent: () => void;
  onDeleteSelected: () => void;
  onRefresh: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleGrid: () => void;
  onToggleLayers: () => void;
  onFilterChange: (filter: string) => void;
  onSearchChange: (search: string) => void;
  selectedCount: number;
  isGridVisible: boolean;
  isLayersVisible: boolean;
}

const AgentToolbar: React.FC<AgentToolbarProps> = ({
  onAddAgent,
  onDeleteSelected,
  onRefresh,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleGrid,
  onToggleLayers,
  onFilterChange,
  onSearchChange,
  selectedCount,
  isGridVisible,
  isLayersVisible
}) => {
  return (
    <div className="bg-white border-b border-gray-200 p-3">
      <div className="flex items-center justify-between">
        {/* Left side - Main actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddAgent}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Agent
          </button>
          
          <button
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              selectedCount > 0
                ? 'text-white bg-red-600 hover:bg-red-700'
                : 'text-gray-400 bg-gray-100 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete ({selectedCount})
          </button>
          
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Center - Search and filter */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents..."
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              onChange={(e) => onFilterChange(e.target.value)}
              className="pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">All Types</option>
              <option value="llm">LLM Agents</option>
              <option value="tool">Tool Agents</option>
              <option value="workflow">Workflow Agents</option>
              <option value="monitor">Monitor Agents</option>
            </select>
          </div>
        </div>

        {/* Right side - View controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={onZoomOut}
              className="p-2 text-gray-600 hover:bg-gray-100 border-r border-gray-300"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={onResetZoom}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 border-r border-gray-300"
            >
              100%
            </button>
            <button
              onClick={onZoomIn}
              className="p-2 text-gray-600 hover:bg-gray-100"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={onToggleGrid}
            className={`p-2 rounded-md ${
              isGridVisible
                ? 'text-blue-600 bg-blue-100'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          
          <button
            onClick={onToggleLayers}
            className={`p-2 rounded-md ${
              isLayersVisible
                ? 'text-blue-600 bg-blue-100'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentToolbar; 