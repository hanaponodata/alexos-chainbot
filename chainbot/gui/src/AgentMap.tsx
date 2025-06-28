import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { AgentNode } from './components/AgentNode';
import { ConnectionLine } from './components/ConnectionLine';
import { AgentDetails } from './components/AgentDetails';
import { AgentToolbar } from './components/AgentToolbar';
import { StatusLegend } from './components/StatusLegend';
import { useAgentMap } from '../hooks/useAgentMap';
import { Agent, AgentStatus, AgentConnection } from '../types/agent';
import { WebSocketMessage } from '../types/websocket';
import './AgentMap.css';

interface AgentMapProps {
  className?: string;
}

export const AgentMap: React.FC<AgentMapProps> = ({ className = '' }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [draggedAgent, setDraggedAgent] = useState<Agent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [layout, setLayout] = useState<'auto' | 'manual' | 'grid'>('auto');
  const [showDetails, setShowDetails] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { sendMessage, lastMessage } = useWebSocket('/ws/agent-map');
  const { getAgentMapData, spawnAgent, killAgent, updateAgentPosition } = useAgentMap();

  // Initialize agent map data
  useEffect(() => {
    const initializeMap = async () => {
      try {
        const mapData = await getAgentMapData();
        setAgents(mapData.agents);
        setConnections(mapData.connections);
        setLayout(mapData.layout);
      } catch (error) {
        console.error('Failed to initialize agent map:', error);
      }
    };

    initializeMap();
  }, [getAgentMapData]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const message: WebSocketMessage = JSON.parse(lastMessage);
      
      switch (message.type) {
        case 'agent_status_update':
          handleAgentStatusUpdate(message.data);
          break;
        case 'agent_spawn':
          handleAgentSpawn(message.data);
          break;
        case 'agent_kill':
          handleAgentKill(message.data);
          break;
        case 'agent_map_update':
          handleAgentMapUpdate(message.data);
          break;
        default:
          break;
      }
    }
  }, [lastMessage]);

  const handleAgentStatusUpdate = (data: any) => {
    setAgents(prev => prev.map(agent => 
      agent.id === data.agent_id 
        ? { ...agent, status: data.status, last_activity: data.last_activity }
        : agent
    ));
  };

  const handleAgentSpawn = (data: any) => {
    const newAgent: Agent = {
      id: data.agent_id,
      name: data.name || `Agent-${data.agent_id}`,
      type: data.agent_type,
      status: 'starting' as AgentStatus,
      position: data.position || { x: Math.random() * 500, y: Math.random() * 300 },
      connections: [],
      last_activity: new Date().toISOString(),
      config: data.config || {},
      capabilities: data.capabilities || []
    };
    
    setAgents(prev => [...prev, newAgent]);
  };

  const handleAgentKill = (data: any) => {
    setAgents(prev => prev.filter(agent => agent.id !== data.agent_id));
    setConnections(prev => prev.filter(conn => 
      conn.source_id !== data.agent_id && conn.target_id !== data.agent_id
    ));
  };

  const handleAgentMapUpdate = (data: any) => {
    setAgents(data.agents);
    setConnections(data.connections);
    setLayout(data.layout);
  };

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, agent: Agent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDraggedAgent(agent);
      setSelectedAgent(agent);
    } else if (e.button === 2) { // Right click
      e.preventDefault();
      setSelectedAgent(agent);
      setShowDetails(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && draggedAgent && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      
      const updatedAgent = { ...draggedAgent, position: { x, y } };
      setAgents(prev => prev.map(agent => 
        agent.id === draggedAgent.id ? updatedAgent : agent
      ));
    }
  }, [isDragging, draggedAgent, pan, zoom]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && draggedAgent) {
      updateAgentPosition(draggedAgent.id, draggedAgent.position);
    }
    setIsDragging(false);
    setDraggedAgent(null);
  }, [isDragging, draggedAgent, updateAgentPosition]);

  // Zoom and pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    setZoom(newZoom);
  }, [zoom]);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle click or Ctrl+left click
      setIsDragging(true);
    }
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && !draggedAgent && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPan(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  }, [isDragging, draggedAgent]);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, agent: Agent) => {
    e.preventDefault();
    setSelectedAgent(agent);
    setShowToolbar(true);
  }, []);

  // Agent actions
  const handleSpawnAgent = async (agentType: string) => {
    try {
      await spawnAgent(agentType);
    } catch (error) {
      console.error('Failed to spawn agent:', error);
    }
  };

  const handleKillAgent = async (agentId: string) => {
    try {
      await killAgent(agentId);
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
        setShowDetails(false);
      }
    } catch (error) {
      console.error('Failed to kill agent:', error);
    }
  };

  const handleRestartAgent = async (agentId: string) => {
    try {
      await killAgent(agentId);
      // Re-spawn the agent
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        await spawnAgent(agent.type);
      }
    } catch (error) {
      console.error('Failed to restart agent:', error);
    }
  };

  // Layout handlers
  const handleAutoLayout = () => {
    setLayout('auto');
    // Trigger auto-layout algorithm
    const autoLayoutAgents = agents.map((agent, index) => ({
      ...agent,
      position: {
        x: (index % 5) * 150 + 100,
        y: Math.floor(index / 5) * 150 + 100
      }
    }));
    setAgents(autoLayoutAgents);
  };

  const handleGridLayout = () => {
    setLayout('grid');
    const gridSize = Math.ceil(Math.sqrt(agents.length));
    const gridLayoutAgents = agents.map((agent, index) => ({
      ...agent,
      position: {
        x: (index % gridSize) * 200 + 100,
        y: Math.floor(index / gridSize) * 200 + 100
      }
    }));
    setAgents(gridLayoutAgents);
  };

  return (
    <div className={`agent-map ${className}`}>
      {/* Header */}
      <div className="agent-map-header">
        <h2>Agent Map</h2>
        <div className="agent-map-controls">
          <button 
            className={`layout-btn ${layout === 'auto' ? 'active' : ''}`}
            onClick={handleAutoLayout}
          >
            Auto Layout
          </button>
          <button 
            className={`layout-btn ${layout === 'grid' ? 'active' : ''}`}
            onClick={handleGridLayout}
          >
            Grid Layout
          </button>
          <button 
            className="spawn-btn"
            onClick={() => handleSpawnAgent('general_assistant')}
          >
            Spawn Agent
          </button>
          <button 
            className="legend-toggle"
            onClick={() => setShowLegend(!showLegend)}
          >
            {showLegend ? 'Hide' : 'Show'} Legend
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="agent-map-canvas"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handlePanStart}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div 
          className="agent-map-content"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Connection lines */}
          {connections.map((connection) => (
            <ConnectionLine
              key={`${connection.source_id}-${connection.target_id}`}
              source={agents.find(a => a.id === connection.source_id)?.position}
              target={agents.find(a => a.id === connection.target_id)?.position}
              type={connection.type}
              status={connection.status}
            />
          ))}

          {/* Agent nodes */}
          {agents.map((agent) => (
            <AgentNode
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent?.id === agent.id}
              isDragging={draggedAgent?.id === agent.id}
              onMouseDown={(e) => handleMouseDown(e, agent)}
              onContextMenu={(e) => handleContextMenu(e, agent)}
              onClick={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="agent-map-sidebar">
        {showLegend && (
          <StatusLegend />
        )}
        
        {selectedAgent && showDetails && (
          <AgentDetails
            agent={selectedAgent}
            onClose={() => setShowDetails(false)}
            onKill={() => handleKillAgent(selectedAgent.id)}
            onRestart={() => handleRestartAgent(selectedAgent.id)}
          />
        )}
      </div>

      {/* Toolbar */}
      {showToolbar && selectedAgent && (
        <AgentToolbar
          agent={selectedAgent}
          onClose={() => setShowToolbar(false)}
          onKill={() => handleKillAgent(selectedAgent.id)}
          onRestart={() => handleRestartAgent(selectedAgent.id)}
          onEdit={() => {
            setShowDetails(true);
            setShowToolbar(false);
          }}
        />
      )}

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}>
          +
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}>
          -
        </button>
        <button onClick={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}>
          Reset
        </button>
      </div>

      {/* Status bar */}
      <div className="agent-map-status">
        <span>Agents: {agents.length}</span>
        <span>Connections: {connections.length}</span>
        <span>Layout: {layout}</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}; 