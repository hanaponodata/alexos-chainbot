import React from 'react';
import type { Agent, AgentStatus } from '../types/agent';

interface AgentNodeProps {
  agent: Agent;
  position: { x: number; y: number };
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, agent: Agent) => void;
  onContextMenu: (e: React.MouseEvent, agent: Agent) => void;
  onDoubleClick: (agent: Agent) => void;
}

const AgentNode: React.FC<AgentNodeProps> = ({
  agent,
  position,
  isSelected,
  onMouseDown,
  onContextMenu,
  onDoubleClick
}) => {
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-red-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-600';
      case 'starting':
        return 'bg-blue-500';
      case 'idle':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      case 'busy':
        return 'Busy';
      case 'error':
        return 'Error';
      case 'starting':
        return 'Starting';
      case 'idle':
        return 'Idle';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className={`absolute cursor-pointer select-none ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)'
      }}
      onMouseDown={(e) => onMouseDown(e, agent)}
      onContextMenu={(e) => onContextMenu(e, agent)}
      onDoubleClick={() => onDoubleClick(agent)}
    >
      {/* Node body */}
      <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg p-3 min-w-[120px]">
        {/* Status indicator */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
            <span className="text-xs text-gray-600">{getStatusText(agent.status)}</span>
          </div>
          <span className="text-xs text-gray-500">#{agent.id}</span>
        </div>

        {/* Agent name */}
        <div className="font-medium text-sm text-gray-900 mb-1 truncate">
          {agent.name}
        </div>

        {/* Agent type */}
        <div className="text-xs text-gray-500 mb-2">
          {agent.type}
        </div>

        {/* Agent info */}
        <div className="text-xs text-gray-600 space-y-1">
          <div>Connections: {agent.connections.length}</div>
          <div>Capabilities: {agent.capabilities.length}</div>
          <div>Last Activity: {new Date(agent.last_activity).toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Connection points */}
      <div className="absolute top-1/2 left-0 w-2 h-2 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-2 h-2 bg-blue-500 rounded-full transform translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-blue-500 rounded-full transform -translate-x-1/2 translate-y-1/2" />
    </div>
  );
};

export default AgentNode; 