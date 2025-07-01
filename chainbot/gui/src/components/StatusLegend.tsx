import React from 'react';
import type { AgentStatus } from '../types/agent';

interface StatusLegendProps {
  isVisible: boolean;
  onToggle: () => void;
}

const StatusLegend: React.FC<StatusLegendProps> = ({ isVisible, onToggle }) => {
  const statusItems: { status: AgentStatus; label: string; color: string }[] = [
    { status: 'running', label: 'Running', color: 'bg-green-500' },
    { status: 'stopped', label: 'Stopped', color: 'bg-red-500' },
    { status: 'busy', label: 'Busy', color: 'bg-yellow-500' },
    { status: 'error', label: 'Error', color: 'bg-red-600' },
    { status: 'starting', label: 'Starting', color: 'bg-blue-500' },
    { status: 'idle', label: 'Idle', color: 'bg-gray-500' }
  ];

  const connectionTypes = [
    { type: 'data', label: 'Data Flow', style: 'border-dashed border-gray-400' },
    { type: 'control', label: 'Control Flow', style: 'border-solid border-gray-400' },
    { type: 'dependency', label: 'Dependency', style: 'border-dotted border-gray-400' }
  ];

  const connectionStatuses = [
    { status: 'active', label: 'Active', color: 'bg-green-500' },
    { status: 'inactive', label: 'Inactive', color: 'bg-gray-400' },
    { status: 'error', label: 'Error', color: 'bg-red-500' }
  ];

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Legend</h4>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      {/* Agent Status */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 mb-2">Agent Status</h5>
        <div className="space-y-1">
          {statusItems.map((item) => (
            <div key={item.status} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Types */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 mb-2">Connection Types</h5>
        <div className="space-y-1">
          {connectionTypes.map((item) => (
            <div key={item.type} className="flex items-center space-x-2">
              <div className={`w-6 h-0.5 ${item.style}`} />
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Status */}
      <div>
        <h5 className="text-xs font-medium text-gray-700 mb-2">Connection Status</h5>
        <div className="space-y-1">
          {connectionStatuses.map((item) => (
            <div key={item.status} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusLegend; 