import React from 'react';
import type { AgentConnection } from '../types/agent';

interface ConnectionLineProps {
  connection: AgentConnection;
  sourcePosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
  isSelected: boolean;
  onClick: (connection: AgentConnection) => void;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  sourcePosition,
  targetPosition,
  isSelected,
  onClick
}) => {
  const getConnectionColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'stroke-green-500';
      case 'inactive':
        return 'stroke-gray-400';
      case 'error':
        return 'stroke-red-500';
      default:
        return 'stroke-gray-400';
    }
  };

  const getConnectionTypeStyle = (type: string) => {
    switch (type) {
      case 'data':
        return 'stroke-dasharray-5,5';
      case 'control':
        return 'stroke-2';
      case 'dependency':
        return 'stroke-dasharray-10,5';
      default:
        return '';
    }
  };

  // Calculate line path
  const dx = targetPosition.x - sourcePosition.x;
  const dy = targetPosition.y - sourcePosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Create a curved path
  const midX = sourcePosition.x + dx * 0.5;
  const midY = sourcePosition.y + dy * 0.5;
  const offset = Math.min(distance * 0.2, 50);
  
  const path = `M ${sourcePosition.x} ${sourcePosition.y} Q ${midX} ${midY - offset} ${targetPosition.x} ${targetPosition.y}`;

  return (
    <g
      className="cursor-pointer"
      onClick={() => onClick(connection)}
    >
      {/* Connection line */}
      <path
        d={path}
        fill="none"
        className={`${getConnectionColor(connection.status)} ${getConnectionTypeStyle(connection.type)} ${
          isSelected ? 'stroke-2' : 'stroke-1'
        }`}
        strokeWidth={isSelected ? 3 : 2}
      />
      
      {/* Arrow head */}
      <defs>
        <marker
          id={`arrowhead-${connection.source_id}-${connection.target_id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={connection.status === 'active' ? '#10b981' : connection.status === 'error' ? '#ef4444' : '#9ca3af'}
          />
        </marker>
      </defs>
      
      {/* Connection label */}
      <text
        x={midX}
        y={midY - offset - 10}
        className="text-xs fill-gray-600 pointer-events-none"
        textAnchor="middle"
      >
        {connection.type}
      </text>
      
      {/* Status indicator */}
      <circle
        cx={midX}
        cy={midY - offset}
        r="3"
        className={`fill-current ${getConnectionColor(connection.status)}`}
      />
    </g>
  );
};

export default ConnectionLine; 