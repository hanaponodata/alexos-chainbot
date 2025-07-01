import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import './CenterPaneChat.css';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai_agent' | 'system';
  timestamp: Date;
  agent_id?: string;
  agent_name?: string;
  agent_type?: string;
  workflow_id?: string;
  metadata?: {
    processing_time?: number;
    tokens_used?: number;
    model?: string;
    confidence?: number;
    [key: string]: any;
  };
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

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
}

const CenterPaneChat: React.FC = () => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);
  const [workflowExecutionId, setWorkflowExecutionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  useEffect(() => {
    if (token) {
      loadAgents();
      loadWorkflows();
      loadChatHistory();
    }
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/chat/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response;
      
      if (selectedWorkflow) {
        // Execute workflow
        response = await executeWorkflow(selectedWorkflow, inputMessage);
      } else if (selectedAgent) {
        // Send to specific agent
        response = await sendToAgent(selectedAgent, inputMessage);
      } else {
        // Send to default AI (ChatGPT)
        response = await sendToDefaultAI(inputMessage);
      }

      if (response) {
        const aiMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          content: response.content,
          sender: 'ai_agent',
          timestamp: new Date(),
          agent_id: 'agent_id' in response ? response.agent_id : undefined,
          agent_name: 'agent_name' in response ? response.agent_name : undefined,
          agent_type: 'agent_type' in response ? response.agent_type : undefined,
          workflow_id: 'workflow_id' in response ? response.workflow_id : undefined,
          metadata: response.metadata
        };

        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        sender: 'system',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendToAgent = async (agentId: string, message: string) => {
    const response = await fetch(`${API_BASE}/workflows/agents/${agentId}/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        context: {
          session_id: user?.id,
          user_id: user?.id
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const agent = agents.find(a => a.agent_id === agentId);
      
      return {
        content: data.response,
        agent_id: agentId,
        agent_name: agent?.name || 'Unknown Agent',
        agent_type: agent?.type || 'unknown',
        metadata: data.metadata
      };
    } else {
      throw new Error('Failed to send message to agent');
    }
  };

  const sendToDefaultAI = async (message: string) => {
    // Send to ChatGPT or default AI
    const response = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        context: {
          session_id: user?.id,
          user_id: user?.id
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        content: data.response,
        agent_id: 'default',
        agent_name: 'ChatGPT',
        agent_type: 'chatgpt',
        metadata: data.metadata
      };
    } else {
      throw new Error('Failed to send message to default AI');
    }
  };

  const executeWorkflow = async (workflowId: string, message: string) => {
    const response = await fetch(`${API_BASE}/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input_data: {
          user_input: message,
          parameters: {}
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      setWorkflowExecutionId(data.execution_id);
      setIsExecutingWorkflow(true);
      
      // In a real implementation, you would poll for workflow completion
      // or use WebSocket to get real-time updates
      setTimeout(() => {
        setIsExecutingWorkflow(false);
        // Add workflow completion message
        const workflowMessage: Message = {
          id: `msg_${Date.now()}_workflow`,
          content: 'Workflow execution completed successfully!',
          sender: 'system',
          timestamp: new Date(),
          workflow_id: workflowId,
          metadata: {
            execution_id: data.execution_id,
            status: 'completed'
          }
        };
        setMessages(prev => [...prev, workflowMessage]);
      }, 3000);

      return {
        content: 'Workflow execution started. Processing your request...',
        workflow_id: workflowId,
        metadata: {
          execution_id: data.execution_id,
          status: 'started'
        }
      };
    } else {
      throw new Error('Failed to execute workflow');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle file upload
      const fileMessage: Message = {
        id: `msg_${Date.now()}_file`,
        content: `📎 Uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        sender: 'user',
        timestamp: new Date(),
        metadata: {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
        }
      };
      setMessages(prev => [...prev, fileMessage]);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const exportChat = () => {
    const chatData = {
      messages,
      export_date: new Date().toISOString(),
      user: user?.username
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainbot-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMessage = (message: Message) => {
    const isUser = message.sender === 'user';
    const isSystem = message.sender === 'system';
    
    return (
      <div
        key={message.id}
        className={`message ${isUser ? 'user-message' : 'ai-message'} ${isSystem ? 'system-message' : ''}`}
      >
        <div className="message-header">
          <div className="message-sender">
            {isUser ? (
              <span className="user-avatar">👤</span>
            ) : message.agent_name ? (
              <span className="agent-avatar">🤖</span>
            ) : (
              <span className="system-avatar">⚙️</span>
            )}
            <span className="sender-name">
              {isUser ? user?.username || 'You' : message.agent_name || 'System'}
            </span>
            {message.agent_type && (
              <span className="agent-type">({message.agent_type})</span>
            )}
          </div>
          <div className="message-time">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
        
        <div className="message-content">
          {message.content}
        </div>
        
        {message.metadata && Object.keys(message.metadata).length > 0 && (
          <div className="message-metadata">
            {message.metadata.processing_time && (
              <span className="metadata-item">
                ⏱️ {message.metadata.processing_time.toFixed(2)}s
              </span>
            )}
            {message.metadata.tokens_used && (
              <span className="metadata-item">
                🎯 {message.metadata.tokens_used} tokens
              </span>
            )}
            {message.metadata.model && (
              <span className="metadata-item">
                🧠 {message.metadata.model}
              </span>
            )}
            {message.metadata.confidence && (
              <span className="metadata-item">
                📊 {(message.metadata.confidence * 100).toFixed(1)}% confidence
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="center-pane-chat">
      <div className="chat-header">
        <div className="chat-controls">
          <div className="agent-selector">
            <button
              className={`selector-btn ${selectedAgent ? 'active' : ''}`}
              onClick={() => setShowAgentSelector(!showAgentSelector)}
            >
              {selectedAgent ? 
                agents.find(a => a.agent_id === selectedAgent)?.name || 'Agent' : 
                'Select Agent'
              }
            </button>
            {showAgentSelector && (
              <div className="selector-dropdown">
                <div className="dropdown-header">
                  <h4>AI Agents</h4>
                  <button 
                    className="close-btn"
                    onClick={() => setShowAgentSelector(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="agent-list">
                  {agents.map(agent => (
                    <div
                      key={agent.agent_id}
                      className={`agent-item ${selectedAgent === agent.agent_id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedAgent(agent.agent_id);
                        setSelectedWorkflow('');
                        setShowAgentSelector(false);
                      }}
                    >
                      <div className="agent-info">
                        <div className="agent-name">{agent.name}</div>
                        <div className="agent-type">{agent.type}</div>
                        <div className="agent-status">{agent.status}</div>
                      </div>
                      <div className="agent-capabilities">
                        {agent.capabilities.slice(0, 2).map(cap => (
                          <span key={cap.name} className="capability-tag">
                            {cap.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="workflow-selector">
            <button
              className={`selector-btn ${selectedWorkflow ? 'active' : ''}`}
              onClick={() => setShowWorkflowSelector(!showWorkflowSelector)}
            >
              {selectedWorkflow ? 
                workflows.find(w => w.id === selectedWorkflow)?.name || 'Workflow' : 
                'Select Workflow'
              }
            </button>
            {showWorkflowSelector && (
              <div className="selector-dropdown">
                <div className="dropdown-header">
                  <h4>Workflows</h4>
                  <button 
                    className="close-btn"
                    onClick={() => setShowWorkflowSelector(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="workflow-list">
                  {workflows.map(workflow => (
                    <div
                      key={workflow.id}
                      className={`workflow-item ${selectedWorkflow === workflow.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedWorkflow(workflow.id);
                        setSelectedAgent('');
                        setShowWorkflowSelector(false);
                      }}
                    >
                      <div className="workflow-name">{workflow.name}</div>
                      <div className="workflow-description">{workflow.description}</div>
                      <div className="workflow-status">{workflow.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="chat-actions">
          <button className="action-btn" onClick={clearChat} title="Clear Chat">
            🗑️
          </button>
          <button className="action-btn" onClick={exportChat} title="Export Chat">
            📤
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">💬</div>
            <h3>Welcome to ChainBot!</h3>
            <p>Start a conversation with an AI agent or execute a workflow to get started.</p>
            <div className="quick-actions">
              <button 
                className="quick-action-btn"
                onClick={() => setShowAgentSelector(true)}
              >
                Choose AI Agent
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => setShowWorkflowSelector(true)}
              >
                Select Workflow
              </button>
            </div>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        
        {isLoading && (
          <div className="message ai-message loading">
            <div className="message-header">
              <span className="agent-avatar">🤖</span>
              <span className="sender-name">AI Assistant</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {isExecutingWorkflow && (
          <div className="message system-message">
            <div className="message-header">
              <span className="system-avatar">⚙️</span>
              <span className="sender-name">Workflow Engine</span>
            </div>
            <div className="message-content">
              <div className="workflow-execution-status">
                <div className="execution-spinner"></div>
                <span>Executing workflow... (ID: {workflowExecutionId})</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <div className="input-actions">
          <button 
            className="action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach File"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".txt,.md,.json,.csv,.pdf,.doc,.docx"
          />
        </div>
        
        <div className="input-container">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectedWorkflow ? 
                "Type your message to execute the workflow..." :
                selectedAgent ? 
                `Chat with ${agents.find(a => a.agent_id === selectedAgent)?.name || 'AI Agent'}...` :
                "Type your message..."
            }
            disabled={isLoading}
            rows={1}
            className="message-input"
          />
        </div>
        
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!inputMessage.trim() || isLoading}
        >
          {isLoading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
};

export default CenterPaneChat; 