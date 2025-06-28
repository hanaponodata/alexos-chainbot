import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import './WorkflowBuilder.css';

interface WorkflowNode {
  id: string;
  type: 'ai_agent' | 'condition' | 'transform' | 'api_call' | 'user_input' | 'output';
  position: { x: number; y: number };
  data: {
    name: string;
    agent_id?: string;
    message?: string;
    condition?: string;
    transform_type?: string;
    url?: string;
    method?: string;
    prompt?: string;
    output_format?: string;
    [key: string]: any;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  created_at: string;
  status: string;
}

interface Agent {
  agent_id: string;
  name: string;
  type: string;
  status: string;
  capabilities: Array<{
    name: string;
    description: string;
    input_types: string[];
    output_types: string[];
  }>;
}

const WorkflowBuilder: React.FC = () => {
  const { user, token } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any[]>([]);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  // Load workflows and agents on component mount
  useEffect(() => {
    if (token) {
      loadWorkflows();
      loadAgents();
    }
  }, [token]);

  const loadWorkflows = async () => {
    try {
      const response = await fetch(`${API_BASE}/workflows`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch(`${API_BASE}/workflows/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const createNewWorkflow = () => {
    const newWorkflow: Workflow = {
      id: `workflow_${Date.now()}`,
      name: 'New Workflow',
      description: '',
      nodes: [],
      edges: [],
      created_at: new Date().toISOString(),
      status: 'draft'
    };
    
    setSelectedWorkflow(newWorkflow);
    setNodes([]);
    setEdges([]);
    setWorkflowName('New Workflow');
    setWorkflowDescription('');
  };

  const saveWorkflow = async () => {
    if (!selectedWorkflow || !token) return;

    try {
      const workflowData = {
        name: workflowName,
        description: workflowDescription,
        nodes: nodes,
        edges: edges
      };

      const response = await fetch(`${API_BASE}/workflows/visual`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedWorkflow({
          ...selectedWorkflow,
          id: result.workflow_id,
          name: workflowName,
          description: workflowDescription,
          nodes: nodes,
          edges: edges
        });
        
        // Refresh workflows list
        loadWorkflows();
        
        alert('Workflow saved successfully!');
      } else {
        throw new Error('Failed to save workflow');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const executeWorkflow = async () => {
    if (!selectedWorkflow || !token) return;

    setIsExecuting(true);
    setExecutionResults([]);

    try {
      const executionData = {
        input_data: {
          user_input: "Execute workflow",
          parameters: {}
        }
      };

      const response = await fetch(`${API_BASE}/workflows/${selectedWorkflow.id}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(executionData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Workflow execution started:', result);
        
        // In a real implementation, you would poll for execution status
        // or use WebSocket to get real-time updates
        setTimeout(() => {
          setIsExecuting(false);
          setExecutionResults([
            { node_id: 'node1', status: 'completed', result: 'Sample result' }
          ]);
        }, 2000);
      } else {
        throw new Error('Failed to execute workflow');
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      setIsExecuting(false);
      alert('Failed to execute workflow');
    }
  };

  const addNode = (type: WorkflowNode['type'], position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      position,
      data: {
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        ...getDefaultNodeData(type)
      }
    };

    setNodes(prev => [...prev, newNode]);
  };

  const getDefaultNodeData = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'ai_agent':
        return { agent_id: '', message: 'Hello, how can I help?' };
      case 'condition':
        return { condition: 'input contains "error"' };
      case 'transform':
        return { transform_type: 'text', operation: 'uppercase' };
      case 'api_call':
        return { url: 'https://api.example.com', method: 'GET' };
      case 'user_input':
        return { prompt: 'Please provide input:' };
      case 'output':
        return { output_format: 'text' };
      default:
        return {};
    }
  };

  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setEdges(prev => prev.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
  };

  const addEdge = (sourceId: string, targetId: string) => {
    const newEdge: WorkflowEdge = {
      id: `edge_${Date.now()}`,
      source: sourceId,
      target: targetId
    };

    setEdges(prev => [...prev, newEdge]);
  };

  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
  };

  const handleNodeMouseDown = (node: WorkflowNode, event: React.MouseEvent) => {
    setSelectedNode(node);
    setIsDragging(true);
    const rect = event.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging && selectedNode) {
      const newPosition = {
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y
      };
      updateNode(selectedNode.id, { position: newPosition });
    }
  }, [isDragging, selectedNode, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setSelectedNode(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const renderNode = (node: WorkflowNode) => {
    const nodeClass = `workflow-node ${node.type} ${selectedNode?.id === node.id ? 'selected' : ''}`;
    
    return (
      <div
        key={node.id}
        className={nodeClass}
        style={{
          left: node.position.x,
          top: node.position.y
        }}
        onMouseDown={(e) => handleNodeMouseDown(node, e)}
        onDoubleClick={() => setShowNodeEditor(true)}
      >
        <div className="node-header">
          <span className="node-type">{node.type}</span>
          <button 
            className="delete-node-btn"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node.id);
            }}
          >
            ×
          </button>
        </div>
        <div className="node-content">
          <div className="node-name">{node.data.name}</div>
          {node.type === 'ai_agent' && (
            <div className="node-details">
              Agent: {agents.find(a => a.agent_id === node.data.agent_id)?.name || 'Not selected'}
            </div>
          )}
          {node.type === 'condition' && (
            <div className="node-details">
              Condition: {node.data.condition}
            </div>
          )}
        </div>
        <div className="node-ports">
          <div className="input-port" data-node-id={node.id}></div>
          <div className="output-port" data-node-id={node.id}></div>
        </div>
      </div>
    );
  };

  const renderEdge = (edge: WorkflowEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;

    const startX = sourceNode.position.x + 150; // Node width
    const startY = sourceNode.position.y + 25;  // Node height / 2
    const endX = targetNode.position.x;
    const endY = targetNode.position.y + 25;

    return (
      <svg
        key={edge.id}
        className="workflow-edge"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#666"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>
      </svg>
    );
  };

  return (
    <div className="workflow-builder">
      <div className="workflow-sidebar">
        <div className="sidebar-section">
          <h3>Workflows</h3>
          <button className="btn btn-primary" onClick={createNewWorkflow}>
            New Workflow
          </button>
          <div className="workflow-list">
            {workflows.map(workflow => (
              <div
                key={workflow.id}
                className={`workflow-item ${selectedWorkflow?.id === workflow.id ? 'selected' : ''}`}
                onClick={() => setSelectedWorkflow(workflow)}
              >
                <div className="workflow-name">{workflow.name}</div>
                <div className="workflow-status">{workflow.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Node Types</h3>
          <div className="node-types">
            <div
              className="node-type-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('nodeType', 'ai_agent');
              }}
            >
              AI Agent
            </div>
            <div
              className="node-type-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('nodeType', 'condition');
              }}
            >
              Condition
            </div>
            <div
              className="node-type-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('nodeType', 'transform');
              }}
            >
              Transform
            </div>
            <div
              className="node-type-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('nodeType', 'api_call');
              }}
            >
              API Call
            </div>
            <div
              className="node-type-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('nodeType', 'user_input');
              }}
            >
              User Input
            </div>
            <div
              className="node-type-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('nodeType', 'output');
              }}
            >
              Output
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>AI Agents</h3>
          <div className="agent-list">
            {agents.map(agent => (
              <div key={agent.agent_id} className="agent-item">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-type">{agent.type}</div>
                <div className="agent-status">{agent.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="workflow-main">
        <div className="workflow-toolbar">
          <div className="workflow-info">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Workflow Name"
              className="workflow-name-input"
            />
            <textarea
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder="Workflow Description"
              className="workflow-description-input"
            />
          </div>
          <div className="workflow-actions">
            <button className="btn btn-secondary" onClick={saveWorkflow}>
              Save Workflow
            </button>
            <button 
              className="btn btn-primary" 
              onClick={executeWorkflow}
              disabled={isExecuting}
            >
              {isExecuting ? 'Executing...' : 'Execute Workflow'}
            </button>
          </div>
        </div>

        <div 
          className="workflow-canvas"
          onDrop={(e) => {
            e.preventDefault();
            const nodeType = e.dataTransfer.getData('nodeType') as WorkflowNode['type'];
            const rect = e.currentTarget.getBoundingClientRect();
            const position = {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
            };
            addNode(nodeType, position);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          {edges.map(renderEdge)}
          {nodes.map(renderNode)}
        </div>

        {executionResults.length > 0 && (
          <div className="execution-results">
            <h3>Execution Results</h3>
            {executionResults.map((result, index) => (
              <div key={index} className="execution-result">
                <div className="result-node">Node: {result.node_id}</div>
                <div className="result-status">Status: {result.status}</div>
                <div className="result-content">Result: {result.result}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNodeEditor && selectedNode && (
        <div className="node-editor-overlay">
          <div className="node-editor">
            <h3>Edit Node: {selectedNode.data.name}</h3>
            <div className="editor-content">
              <label>
                Name:
                <input
                  type="text"
                  value={selectedNode.data.name}
                  onChange={(e) => updateNode(selectedNode.id, {
                    data: { ...selectedNode.data, name: e.target.value }
                  })}
                />
              </label>

              {selectedNode.type === 'ai_agent' && (
                <label>
                  Agent:
                  <select
                    value={selectedNode.data.agent_id}
                    onChange={(e) => updateNode(selectedNode.id, {
                      data: { ...selectedNode.data, agent_id: e.target.value }
                    })}
                  >
                    <option value="">Select an agent</option>
                    {agents.map(agent => (
                      <option key={agent.agent_id} value={agent.agent_id}>
                        {agent.name} ({agent.type})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selectedNode.type === 'ai_agent' && (
                <label>
                  Message:
                  <textarea
                    value={selectedNode.data.message}
                    onChange={(e) => updateNode(selectedNode.id, {
                      data: { ...selectedNode.data, message: e.target.value }
                    })}
                  />
                </label>
              )}

              {selectedNode.type === 'condition' && (
                <label>
                  Condition:
                  <input
                    type="text"
                    value={selectedNode.data.condition}
                    onChange={(e) => updateNode(selectedNode.id, {
                      data: { ...selectedNode.data, condition: e.target.value }
                    })}
                  />
                </label>
              )}

              {selectedNode.type === 'api_call' && (
                <>
                  <label>
                    URL:
                    <input
                      type="text"
                      value={selectedNode.data.url}
                      onChange={(e) => updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, url: e.target.value }
                      })}
                    />
                  </label>
                  <label>
                    Method:
                    <select
                      value={selectedNode.data.method}
                      onChange={(e) => updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, method: e.target.value }
                      })}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </label>
                </>
              )}
            </div>
            <div className="editor-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setShowNodeEditor(false)}
              >
                Save
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowNodeEditor(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowBuilder; 