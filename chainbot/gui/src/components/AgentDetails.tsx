import React from 'react';
import type { Agent, AgentStatus } from '../types/agent';
import { 
  X, 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Activity, 
  Zap,
  Clock,
  Tag,
  Bot,
  Code,
  Database,
  Globe,
  Shield,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface AgentDetailsProps {
  agent: Agent | null;
  isVisible: boolean;
  onClose: () => void;
  onStart: (agentId: string) => void;
  onStop: (agentId: string) => void;
  onPause: (agentId: string) => void;
  onConfigure: (agent: Agent) => void;
}

const AgentDetails: React.FC<AgentDetailsProps> = ({
  agent,
  isVisible,
  onClose,
  onStart,
  onStop,
  onPause,
  onConfigure
}) => {
  if (!agent || !isVisible) return null;

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'stopped':
        return 'text-red-600 bg-red-100';
      case 'busy':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-700 bg-red-100';
      case 'starting':
        return 'text-blue-600 bg-blue-100';
      case 'idle':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return <Activity className="w-4 h-4" />;
      case 'stopped':
        return <Square className="w-4 h-4" />;
      case 'busy':
        return <Zap className="w-4 h-4" />;
      case 'error':
        return <X className="w-4 h-4" />;
      case 'starting':
        return <Play className="w-4 h-4" />;
      case 'idle':
        return <Clock className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Agent Details</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Name</label>
              <p className="text-sm text-gray-900 font-medium">{agent.name}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">ID</label>
              <p className="text-sm text-gray-900 font-mono">{agent.id}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Type</label>
              <p className="text-sm text-gray-900">{agent.type}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                {getStatusIcon(agent.status)}
                <span className="ml-1">{agent.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {agent.description && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Description</h4>
            <p className="text-sm text-gray-600">{agent.description}</p>
          </div>
        )}

        {/* Capabilities */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Capabilities</h4>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((capability, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                <Tag className="w-3 h-3 mr-1" />
                {capability}
              </span>
            ))}
          </div>
        </div>

        {/* Connections */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Connections</h4>
          <div className="space-y-2">
            {agent.connections.length > 0 ? (
              agent.connections.map((connectionId, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                >
                  <span className="text-sm text-gray-700 font-mono">{connectionId}</span>
                  <span className="text-xs text-gray-500">Connected</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No connections</p>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Timestamps</h4>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500">Last Activity</label>
              <p className="text-sm text-gray-900">
                {new Date(agent.last_activity).toLocaleString()}
              </p>
            </div>
            {agent.created_at && (
              <div>
                <label className="text-xs text-gray-500">Created</label>
                <p className="text-sm text-gray-900">
                  {new Date(agent.created_at).toLocaleString()}
                </p>
              </div>
            )}
            {agent.updated_at && (
              <div>
                <label className="text-xs text-gray-500">Updated</label>
                <p className="text-sm text-gray-900">
                  {new Date(agent.updated_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Actions</h4>
          <div className="flex flex-wrap gap-2">
            {agent.status === 'stopped' && (
              <button
                onClick={() => onStart(agent.id)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start
              </button>
            )}
            {agent.status === 'running' && (
              <>
                <button
                  onClick={() => onPause(agent.id)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </button>
                <button
                  onClick={() => onStop(agent.id)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </button>
              </>
            )}
            <button
              onClick={() => onConfigure(agent)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDetails; 