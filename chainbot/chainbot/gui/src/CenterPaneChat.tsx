import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Message {
  id: number;
  content: string;
  sender: string;
  timestamp: string;
  type: 'user' | 'agent' | 'system';
}

interface WorkflowStep {
  id: number;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface Agent {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface Props {
  selectedSessionId: number | null;
}

const CenterPaneChat: React.FC<Props> = ({ selectedSessionId }) => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (selectedSessionId) {
      // TODO: Fetch messages, workflow steps, and agents for the selected session
      // For now, show placeholder data
      setMessages([
        { id: 1, content: 'Hello! I\'m ready to help you build workflows.', sender: 'ChainBot', timestamp: new Date().toISOString(), type: 'agent' },
      ]);
      setWorkflowSteps([
        { id: 1, name: 'Initialize session', type: 'system', status: 'completed' },
      ]);
      setAgents([
        { id: 1, name: 'ChainBot Assistant', type: 'assistant', status: 'active' },
      ]);
    }
  }, [selectedSessionId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSessionId) return;

    const message: Message = {
      id: Date.now(),
      content: newMessage,
      sender: user?.username || 'User',
      timestamp: new Date().toISOString(),
      type: 'user',
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // TODO: Send to backend, get response, update workflow steps
    // For now, simulate a response
    setTimeout(() => {
      const response: Message = {
        id: Date.now() + 1,
        content: `I received: "${newMessage}". This could become a workflow step.`,
        sender: 'ChainBot',
        timestamp: new Date().toISOString(),
        type: 'agent',
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  if (!selectedSessionId) {
    return (
      <div style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>
        Select a workspace to start chatting and building workflows.
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <h2>Chat & Workflow Canvas</h2>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9em', color: '#666' }}>
          <span>Active Agents: {agents.length}</span>
          <span>Workflow Steps: {workflowSteps.length}</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
        {messages.map(message => (
          <div
            key={message.id}
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              background: message.type === 'user' ? '#f0f4ff' : '#f8f9fa',
              borderRadius: 8,
              borderLeft: `4px solid ${message.type === 'user' ? '#232946' : '#28a745'}`,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              {message.sender}
            </div>
            <div>{message.content}</div>
            <div style={{ fontSize: '0.8em', color: '#888', marginTop: '0.5rem' }}>
              {new Date(message.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: '0.75rem', border: '1px solid #ddd', borderRadius: 6 }}
        />
        <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#232946', color: '#fff', border: 'none', borderRadius: 6 }}>
          Send
        </button>
      </form>
    </div>
  );
};

export default CenterPaneChat; 