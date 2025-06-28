import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Agent {
  id: number;
  name: string;
  type: string;
  status: string;
  config: Record<string, any>;
  session_id: number;
}

interface AgentType {
  type: string;
  name: string;
  capabilities: string[];
  description: string;
}

interface SpawnAgentRequest {
  agent_type: string;
  name: string;
  config: Record<string, any>;
  session_id: number;
}

const AgentManager: React.FC<{ sessionId: number }> = ({ sessionId }) => {
  const { token } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentTypes, setAgentTypes] = useState<AgentType[]>([]);
  const [showSpawnForm, setShowSpawnForm] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [spawnForm, setSpawnForm] = useState<SpawnAgentRequest>({
    agent_type: '',
    name: '',
    config: {},
    session_id: sessionId
  });
  const [taskForm, setTaskForm] = useState({ task: '', context: {} });
  const [executingTask, setExecutingTask] = useState<number | null>(null);

  useEffect(() => {
    fetchAgents();
    fetchAgentTypes();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/agents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const fetchAgentTypes = async () => {
    try {
      const response = await fetch('/agents/types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAgentTypes(data);
      }
    } catch (error) {
      console.error('Failed to fetch agent types:', error);
    }
  };

  const spawnAgent = async () => {
    try {
      const response = await fetch('/agents/spawn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(spawnForm)
      });

      if (response.ok) {
        const newAgent = await response.json();
        setAgents(prev => [...prev, newAgent]);
        setShowSpawnForm(false);
        setSpawnForm({
          agent_type: '',
          name: '',
          config: {},
          session_id: sessionId
        });
        alert('Agent spawned successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to spawn agent: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error spawning agent:', error);
      alert('Error spawning agent');
    }
  };

  const executeTask = async (agentId: number) => {
    if (!taskForm.task.trim()) {
      alert('Please enter a task');
      return;
    }

    setExecutingTask(agentId);
    try {
      const response = await fetch(`/agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(taskForm)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Task executed successfully!\nResult: ${JSON.stringify(result.result, null, 2)}`);
        setTaskForm({ task: '', context: {} });
      } else {
        const error = await response.json();
        alert(`Failed to execute task: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error executing task:', error);
      alert('Error executing task');
    } finally {
      setExecutingTask(null);
    }
  };

  const terminateAgent = async (agentId: number) => {
    if (!confirm('Are you sure you want to terminate this agent?')) {
      return;
    }

    try {
      const response = await fetch(`/agents/${agentId}/terminate`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
        alert('Agent terminated successfully!');
      } else {
        alert('Failed to terminate agent');
      }
    } catch (error) {
      console.error('Error terminating agent:', error);
      alert('Error terminating agent');
    }
  };

  const getAgentTypeConfig = (agentType: string) => {
    const type = agentTypes.find(t => t.type === agentType);
    if (!type) return {};

    const configs: Record<string, any> = {};
    
    switch (agentType) {
      case 'assistant':
        configs.personality = 'helpful';
        break;
      case 'data_processor':
        configs.processing_type = 'general';
        break;
      case 'api':
        configs.base_url = '';
        configs.api_key = '';
        break;
      case 'workflow':
        configs.workflow_engine = null;
        break;
    }

    return configs;
  };

  const handleAgentTypeChange = (agentType: string) => {
    setSpawnForm(prev => ({
      ...prev,
      agent_type: agentType,
      config: getAgentTypeConfig(agentType)
    }));
  };

  const updateSpawnConfig = (key: string, value: any) => {
    setSpawnForm(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }));
  };

  const renderSpawnForm = () => {
    if (!showSpawnForm) return null;

    const selectedType = agentTypes.find(t => t.type === spawnForm.agent_type);

    return (
      <div className="spawn-form-overlay">
        <div className="spawn-form">
          <h3>Spawn New Agent</h3>
          
          <div className="form-group">
            <label>Agent Type:</label>
            <select
              value={spawnForm.agent_type}
              onChange={(e) => handleAgentTypeChange(e.target.value)}
            >
              <option value="">Select agent type</option>
              {agentTypes.map(type => (
                <option key={type.type} value={type.type}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {selectedType && (
            <div className="agent-type-info">
              <h4>{selectedType.name}</h4>
              <p>{selectedType.description}</p>
              <div className="capabilities">
                <strong>Capabilities:</strong>
                <ul>
                  {selectedType.capabilities.map(cap => (
                    <li key={cap}>{cap}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={spawnForm.name}
              onChange={(e) => setSpawnForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter agent name"
            />
          </div>

          {spawnForm.agent_type === 'assistant' && (
            <div className="form-group">
              <label>Personality:</label>
              <select
                value={spawnForm.config.personality || 'helpful'}
                onChange={(e) => updateSpawnConfig('personality', e.target.value)}
              >
                <option value="helpful">Helpful</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          )}

          {spawnForm.agent_type === 'data_processor' && (
            <div className="form-group">
              <label>Processing Type:</label>
              <select
                value={spawnForm.config.processing_type || 'general'}
                onChange={(e) => updateSpawnConfig('processing_type', e.target.value)}
              >
                <option value="general">General</option>
                <option value="analytics">Analytics</option>
                <option value="reporting">Reporting</option>
                <option value="transformation">Data Transformation</option>
              </select>
            </div>
          )}

          {spawnForm.agent_type === 'api' && (
            <>
              <div className="form-group">
                <label>Base URL:</label>
                <input
                  type="text"
                  value={spawnForm.config.base_url || ''}
                  onChange={(e) => updateSpawnConfig('base_url', e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>
              <div className="form-group">
                <label>API Key:</label>
                <input
                  type="password"
                  value={spawnForm.config.api_key || ''}
                  onChange={(e) => updateSpawnConfig('api_key', e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button onClick={() => setShowSpawnForm(false)}>Cancel</button>
            <button 
              onClick={spawnAgent}
              disabled={!spawnForm.agent_type || !spawnForm.name}
              className="btn-primary"
            >
              Spawn Agent
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAgentCard = (agent: Agent) => {
    const isExecuting = executingTask === agent.id;
    
    return (
      <div key={agent.id} className="agent-card">
        <div className="agent-header">
          <h4>{agent.name}</h4>
          <span className={`status ${agent.status}`}>{agent.status}</span>
        </div>
        
        <div className="agent-details">
          <p><strong>Type:</strong> {agent.type}</p>
          <p><strong>ID:</strong> {agent.id}</p>
        </div>

        <div className="agent-actions">
          <button
            onClick={() => setSelectedAgent(agent)}
            className="btn-secondary"
          >
            View Details
          </button>
          
          <button
            onClick={() => terminateAgent(agent.id)}
            className="btn-danger"
          >
            Terminate
          </button>
        </div>

        <div className="task-execution">
          <h5>Execute Task</h5>
          <textarea
            value={taskForm.task}
            onChange={(e) => setTaskForm(prev => ({ ...prev, task: e.target.value }))}
            placeholder="Enter task for this agent..."
            rows={2}
          />
          <button
            onClick={() => executeTask(agent.id)}
            disabled={isExecuting || !taskForm.task.trim()}
            className="btn-primary"
          >
            {isExecuting ? 'Executing...' : 'Execute Task'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="agent-manager">
      <div className="agent-manager-header">
        <h2>Agent Management</h2>
        <button 
          onClick={() => setShowSpawnForm(true)}
          className="btn-primary"
        >
          Spawn New Agent
        </button>
      </div>

      <div className="agents-grid">
        {agents.length === 0 ? (
          <div className="no-agents">
            <p>No agents available. Spawn your first agent to get started!</p>
          </div>
        ) : (
          agents.map(renderAgentCard)
        )}
      </div>

      {renderSpawnForm()}

      {selectedAgent && (
        <div className="agent-details-modal">
          <div className="modal-content">
            <h3>Agent Details: {selectedAgent.name}</h3>
            <div className="agent-info">
              <p><strong>ID:</strong> {selectedAgent.id}</p>
              <p><strong>Type:</strong> {selectedAgent.type}</p>
              <p><strong>Status:</strong> {selectedAgent.status}</p>
              <p><strong>Session ID:</strong> {selectedAgent.session_id}</p>
              <p><strong>Configuration:</strong></p>
              <pre>{JSON.stringify(selectedAgent.config, null, 2)}</pre>
            </div>
            <button onClick={() => setSelectedAgent(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentManager; 