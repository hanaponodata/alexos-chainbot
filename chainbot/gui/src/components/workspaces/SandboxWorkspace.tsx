import React, { useState, useRef, useEffect } from 'react';
import { Zap, Bot, Plus, Play, Save, Trash2, MessageSquare, Brain, Code, Wrench, Sparkles, ArrowRight, Settings } from 'lucide-react';

interface Agent {
  id: string;
  type: 'chat' | 'code' | 'brain' | 'tool' | 'custom';
  name: string;
  description: string;
  position: { x: number; y: number };
  connections: string[];
  color: string;
  icon: React.ReactNode;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  type: 'data' | 'control' | 'message';
}

interface SandboxWorkspaceProps {
  GlobalControls: React.ComponentType;
}

const SandboxWorkspace: React.FC<SandboxWorkspaceProps> = ({ GlobalControls }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Available agent types
  const agentTypes = [
    {
      type: 'chat' as const,
      name: 'Chat Agent',
      description: 'Conversational AI agent',
      color: 'from-blue-500 to-cyan-500',
      icon: <MessageSquare className="w-6 h-6" />
    },
    {
      type: 'code' as const,
      name: 'Code Agent',
      description: 'Programming and development assistant',
      color: 'from-green-500 to-emerald-500',
      icon: <Code className="w-6 h-6" />
    },
    {
      type: 'brain' as const,
      name: 'Brain Agent',
      description: 'AI reasoning and analysis',
      color: 'from-purple-500 to-pink-500',
      icon: <Brain className="w-6 h-6" />
    },
    {
      type: 'tool' as const,
      name: 'Tool Agent',
      description: 'Utility and automation tools',
      color: 'from-orange-500 to-red-500',
      icon: <Wrench className="w-6 h-6" />
    }
  ];

  const addAgent = (type: Agent['type']) => {
    const agentType = agentTypes.find(t => t.type === type);
    if (!agentType) return;

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      type,
      name: `${agentType.name} ${agents.filter(a => a.type === type).length + 1}`,
      description: agentType.description,
      position: { x: Math.random() * 600 + 100, y: Math.random() * 400 + 100 },
      connections: [],
      color: agentType.color,
      icon: agentType.icon
    };

    setAgents(prev => [...prev, newAgent]);
  };

  const removeAgent = (agentId: string) => {
    setAgents(prev => prev.filter(a => a.id !== agentId));
    setConnections(prev => prev.filter(c => c.from !== agentId && c.to !== agentId));
  };

  const connectAgents = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    
    const existingConnection = connections.find(c => c.from === fromId && c.to === toId);
    if (existingConnection) return;

    const newConnection: Connection = {
      id: `conn-${Date.now()}`,
      from: fromId,
      to: toId,
      type: 'data'
    };

    setConnections(prev => [...prev, newConnection]);
  };

  const runWorkflow = () => {
    if (agents.length === 0) return;
    
    setIsRunning(true);
    // Simulate workflow execution
    setTimeout(() => {
      setIsRunning(false);
      console.log('Workflow completed!');
    }, 3000);
  };

  const saveWorkflow = () => {
    const workflow = { agents, connections };
    console.log('Saving workflow:', workflow);
    // In a real implementation, this would save to backend
  };

  const clearCanvas = () => {
    setAgents([]);
    setConnections([]);
    setSelectedAgent(null);
  };

  // Agent Component
  const AgentNode = ({ agent }: { agent: Agent }) => (
    <div
      className={`absolute bg-gradient-to-br ${agent.color} rounded-lg p-4 shadow-lg cursor-move border-2 ${
        selectedAgent === agent.id ? 'border-white' : 'border-transparent'
      } transition-all duration-200 hover:scale-105`}
      style={{
        left: agent.position.x,
        top: agent.position.y,
        minWidth: '160px'
      }}
      onClick={() => setSelectedAgent(agent.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="text-white">
            {agent.icon}
          </div>
          <span className="text-white font-medium text-sm">{agent.name}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeAgent(agent.id);
          }}
          className="text-white/70 hover:text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <p className="text-white/80 text-xs">{agent.description}</p>
      
      {/* Connection points */}
      <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-800 cursor-pointer hover:bg-gray-100 transition-colors" />
      <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-800 cursor-pointer hover:bg-gray-100 transition-colors" />
    </div>
  );

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sandbox Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#23232a] bg-[#101014]">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Sandbox</h1>
              <p className="text-sm text-gray-400">Graphical AI agent chaining & experimentation</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAgentPanel(!showAgentPanel)}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add Agent</span>
            </button>
            <button
              onClick={runWorkflow}
              disabled={agents.length === 0 || isRunning}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              <span className="text-sm">{isRunning ? 'Running...' : 'Run'}</span>
            </button>
            <button
              onClick={saveWorkflow}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">Save</span>
            </button>
            <button
              onClick={clearCanvas}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Clear</span>
            </button>
            <GlobalControls />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full bg-[#0a0a0a] relative"
            style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.02) 0%, transparent 50%)
              `
            }}
          >
            {/* Grid background */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="sandbox-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#sandbox-grid)" />
              </svg>
            </div>

            {/* Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connections.map(connection => {
                const fromAgent = agents.find(a => a.id === connection.from);
                const toAgent = agents.find(a => a.id === connection.to);
                if (!fromAgent || !toAgent) return null;

                const fromX = fromAgent.position.x + 160; // Agent width
                const fromY = fromAgent.position.y + 40; // Agent height / 2
                const toX = toAgent.position.x;
                const toY = toAgent.position.y + 40;

                return (
                  <g key={connection.id}>
                    <defs>
                      <marker
                        id={`arrow-${connection.id}`}
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
                      </marker>
                    </defs>
                    <path
                      d={`M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${fromY - 20} ${toX} ${toY}`}
                      stroke="#60a5fa"
                      strokeWidth="2"
                      fill="none"
                      markerEnd={`url(#arrow-${connection.id})`}
                      className="animate-pulse"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Agents */}
            {agents.map(agent => (
              <AgentNode key={agent.id} agent={agent} />
            ))}

            {/* Empty State */}
            {agents.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mb-6 animate-pulse">
                  <Zap className="w-16 h-16 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to the Sandbox!</h2>
                <p className="text-gray-400 mb-8 max-w-md text-lg">
                  Build your own AI agent chains by dragging and connecting different types of agents. 
                  Create powerful workflows and experiment with AI combinations!
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {agentTypes.map(type => (
                    <button
                      key={type.type}
                      onClick={() => addAgent(type.type)}
                      className={`flex items-center space-x-3 p-4 bg-gradient-to-br ${type.color} rounded-lg text-white hover:scale-105 transition-transform`}
                    >
                      {type.icon}
                      <div className="text-left">
                        <div className="font-medium">{type.name}</div>
                        <div className="text-xs opacity-80">{type.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Running Animation */}
            {isRunning && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-[#18181b] border border-[#23232a] rounded-lg p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mx-auto mb-4 animate-spin">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white font-medium mb-2">Running Workflow</h3>
                  <p className="text-gray-400 text-sm">Executing your AI agent chain...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent Panel */}
      {showAgentPanel && (
        <div className="w-80 border-l border-[#23232a] bg-[#101014] flex flex-col">
          <div className="p-4 border-b border-[#23232a] bg-[#18181b]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add Agents</h3>
              <button
                onClick={() => setShowAgentPanel(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {agentTypes.map(type => (
                <button
                  key={type.type}
                  onClick={() => addAgent(type.type)}
                  className={`w-full p-4 bg-gradient-to-br ${type.color} rounded-lg text-white hover:scale-105 transition-transform text-left`}
                >
                  <div className="flex items-center space-x-3">
                    {type.icon}
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm opacity-80">{type.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-[#18181b] border border-[#23232a] rounded-lg">
              <h4 className="text-white font-medium mb-2">Tips</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Drag agents to position them</li>
                <li>• Click connection points to link agents</li>
                <li>• Use different agent types for variety</li>
                <li>• Experiment with different chains</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SandboxWorkspace; 