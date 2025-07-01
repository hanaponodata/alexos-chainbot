import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  User, 
  Bot, 
  Sparkles, 
  Brain, 
  Wrench, 
  Palette, 
  Shield,
  Code,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MoreVertical,
  Settings,
  Plus
} from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import { usePersistentMemory } from '../../hooks/usePersistentMemory';

interface ChatMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'code' | 'action' | 'system';
  metadata?: any;
  isTyping?: boolean;
}

interface AgentPresence {
  agentId: string;
  isOnline: boolean;
  isTyping: boolean;
  currentTask?: string;
  lastSeen: Date;
}

interface CollaborativeSession {
  id: string;
  name: string;
  agents: string[];
  messages: ChatMessage[];
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export const MultiAgentChat: React.FC = () => {
  const [activeSession, setActiveSession] = useState<CollaborativeSession | null>(null);
  const [sessions, setSessions] = useState<CollaborativeSession[]>([]);
  const [message, setMessage] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [agentPresence, setAgentPresence] = useState<Record<string, AgentPresence>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { agents, executeAgentAction } = useAgentStore();
  const { addContext, searchMemory } = usePersistentMemory();

  // Initialize agent presence
  useEffect(() => {
    const presence: Record<string, AgentPresence> = {};
    agents.forEach(agent => {
      presence[agent.id] = {
        agentId: agent.id,
        isOnline: agent.isActive,
        isTyping: false,
        lastSeen: agent.lastActive
      };
    });
    setAgentPresence(presence);
  }, [agents]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const createNewSession = () => {
    const newSession: CollaborativeSession = {
      id: `session_${Date.now()}`,
      name: `Collaboration ${sessions.length + 1}`,
      agents: selectedAgents,
      messages: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSession(newSession);
    setShowAgentSelector(false);
    setSelectedAgents([]);
  };

  const addMessage = async (content: string, agentId: string, type: ChatMessage['type'] = 'text') => {
    if (!activeSession) return;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      agentId,
      content,
      timestamp: new Date(),
      type
    };

    // Update session with new message
    const updatedSession = {
      ...activeSession,
      messages: [...activeSession.messages, newMessage],
      updatedAt: new Date()
    };

    setActiveSession(updatedSession);
    setSessions(prev => prev.map(s => 
      s.id === activeSession.id ? updatedSession : s
    ));

    // Add to memory
    addContext({
      type: 'conversation',
      title: `Multi-Agent Chat: ${content.substring(0, 50)}...`,
      content: {
        sessionId: activeSession.id,
        agentId,
        message: content,
        type,
        participants: activeSession.agents
      },
      metadata: {
        contextType: 'multi_agent_chat',
        sessionId: activeSession.id,
        agentId
      },
      tags: ['multi-agent', 'collaboration', 'chat'],
      priority: 7
    });

    // Trigger agent responses if it's a user message
    if (agentId === 'user') {
      await triggerAgentResponses(content);
    }
  };

  const triggerAgentResponses = async (userMessage: string) => {
    if (!activeSession) return;

    // Simulate agent thinking and responses
    for (const agentId of activeSession.agents) {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) continue;

      // Set typing indicator
      setAgentPresence(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], isTyping: true }
      }));

      // Simulate thinking time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Generate agent response based on role
      let response = '';
      switch (agent.role) {
        case 'DevOps Engineer':
          response = `🛠️ **Harry**: I can help with deployment and infrastructure. For "${userMessage}", I'd recommend checking the build pipeline first. Should I run a diagnostic?`;
          break;
        case 'UI/UX Designer & Frontend Developer':
          response = `🎨 **Laka**: From a design perspective, "${userMessage}" suggests we should focus on user experience. I can help improve the UI/UX flow.`;
          break;
        case 'Full-Stack Developer':
          response = `🤖 **DevBot**: I can assist with code generation and refactoring. For "${userMessage}", I can help implement the solution or review existing code.`;
          break;
        case 'Security & Compliance Officer':
          response = `🛡️ **GuardBot**: Security is crucial. For "${userMessage}", I'll ensure we follow best practices and compliance requirements.`;
          break;
        default:
          response = `I understand you're asking about "${userMessage}". How can I help?`;
      }

      // Add agent response
      await addMessage(response, agentId, 'text');

      // Clear typing indicator
      setAgentPresence(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], isTyping: false }
      }));
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !activeSession) return;

    await addMessage(message, 'user');
    setMessage('');
  };

  const getAgentIcon = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return <User className="w-4 h-4" />;

    switch (agent.role) {
      case 'DevOps Engineer':
        return <Wrench className="w-4 h-4 text-blue-400" />;
      case 'UI/UX Designer & Frontend Developer':
        return <Palette className="w-4 h-4 text-purple-400" />;
      case 'Full-Stack Developer':
        return <Code className="w-4 h-4 text-green-400" />;
      case 'Security & Compliance Officer':
        return <Shield className="w-4 h-4 text-red-400" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const getAgentColor = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return 'text-gray-400';

    switch (agent.role) {
      case 'DevOps Engineer':
        return 'text-blue-400';
      case 'UI/UX Designer & Frontend Developer':
        return 'text-purple-400';
      case 'Full-Stack Developer':
        return 'text-green-400';
      case 'Security & Compliance Officer':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getAgentName = (agentId: string) => {
    if (agentId === 'user') return 'You';
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  };

  return (
    <div className="bg-[#1a1a1e] border border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 bg-[#18181b] border-b border-gray-800 px-4">
        <div className="flex items-center space-x-3">
          <Users className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Multi-Agent Chat</h2>
          {activeSession && (
            <span className="text-sm text-gray-400">
              ({activeSession.agents.length} agents)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAgentSelector(true)}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-white">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sessions Sidebar */}
        <div className="w-64 border-r border-gray-800 bg-[#18181b] flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-sm font-medium text-white mb-2">Active Sessions</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSession(session)}
                className={`p-3 cursor-pointer border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                  activeSession?.id === session.id ? 'bg-blue-600/20 border-blue-600/50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-white">{session.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    session.status === 'active' ? 'bg-green-600/20 text-green-400' :
                    session.status === 'paused' ? 'bg-yellow-600/20 text-yellow-400' :
                    'bg-gray-600/20 text-gray-400'
                  }`}>
                    {session.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {session.agents.length} agents • {session.messages.length} messages
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {session.updatedAt.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeSession ? (
            <>
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeSession.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.agentId === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${msg.agentId === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className={`flex items-start space-x-2 ${msg.agentId === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          msg.agentId === 'user' ? 'bg-blue-600' : 'bg-gray-700'
                        }`}>
                          {msg.agentId === 'user' ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            getAgentIcon(msg.agentId)
                          )}
                        </div>
                        
                        <div className={`flex-1 ${msg.agentId === 'user' ? 'text-right' : ''}`}>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-sm font-medium ${msg.agentId === 'user' ? 'text-blue-400' : getAgentColor(msg.agentId)}`}>
                              {getAgentName(msg.agentId)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {msg.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <div className={`p-3 rounded-lg ${
                            msg.agentId === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-800 text-gray-100'
                          }`}>
                            {msg.type === 'code' ? (
                              <pre className="text-sm font-mono whitespace-pre-wrap">
                                <code>{msg.content}</code>
                              </pre>
                            ) : (
                              <div className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.content }} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicators */}
                {Object.entries(agentPresence)
                  .filter(([agentId, presence]) => 
                    activeSession.agents.includes(agentId) && presence.isTyping
                  )
                  .map(([agentId, presence]) => (
                    <div key={agentId} className="flex justify-start">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          {getAgentIcon(agentId)}
                        </div>
                        <div className="bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-800 p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Active Session</h3>
                <p className="text-gray-400 mb-4">Start a new collaboration session to begin chatting with agents</p>
                <button
                  onClick={() => setShowAgentSelector(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Create New Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Agent Presence Sidebar */}
        <div className="w-48 border-l border-gray-800 bg-[#18181b] flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-sm font-medium text-white mb-2">Agent Status</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {agents.map((agent) => (
              <div key={agent.id} className="mb-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-white">{agent.name}</span>
                </div>
                <div className="text-xs text-gray-400 ml-4">
                  {agent.role}
                </div>
                {agentPresence[agent.id]?.isTyping && (
                  <div className="text-xs text-blue-400 ml-4">
                    typing...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Selector Modal */}
      {showAgentSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1e] border border-gray-800 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Create Collaboration Session</h3>
              <button
                onClick={() => setShowAgentSelector(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Agents to Collaborate
                </label>
                <div className="space-y-2">
                  {agents.map((agent) => (
                    <label key={agent.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAgents(prev => [...prev, agent.id]);
                          } else {
                            setSelectedAgents(prev => prev.filter(id => id !== agent.id));
                          }
                        }}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2">
                        {getAgentIcon(agent.id)}
                        <span className="text-sm text-white">{agent.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowAgentSelector(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewSession}
                  disabled={selectedAgents.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 