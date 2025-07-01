import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Plus, 
  Download, 
  Trash2, 
  Settings,
  Bot,
  Sparkles,
  Clock,
  Users
} from 'lucide-react';
import ChatMessage from './ui/ChatMessage';
import ChatInput from './ui/ChatInput';
import Button from './ui/Button';
import Card from './ui/Card';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface Agent {
  id: string;
  name: string;
  avatar: string;
  status: string;
  description: string;
  capabilities: string[];
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('agent-1');
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    loadAgents();
    loadSessions();
    createNewSession();
    
    // Add demo messages
    const demoMessages: Message[] = [
      {
        id: 'demo-1',
        role: 'assistant',
        content: `Hello! I'm **Laka** 🦄, your AI assistant. I'm here to help you with coding, workflows, monitoring, and more!

Here's what I can do:
• **Code Generation** - Write, review, and debug code
• **Workflow Automation** - Build complex automation pipelines  
• **System Monitoring** - Keep track of your infrastructure
• **Context Awareness** - Remember our conversation history

What would you like to work on today?`,
        timestamp: new Date(Date.now() - 300000),
        agent: 'Laka'
      },
      {
        id: 'demo-2',
        role: 'user',
        content: 'Can you help me create a simple React component?',
        timestamp: new Date(Date.now() - 240000)
      },
      {
        id: 'demo-3',
        role: 'assistant',
        content: `Absolutely! Here's a beautiful glassmorphic React component:

\`\`\`tsx
import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={\`relative rounded-2xl px-6 py-4 backdrop-blur-md border shadow-lg
        bg-white/10 border-white/20 text-white \${className}\`}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {children}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent rounded-2xl pointer-events-none" />
    </motion.div>
  );
};

export default GlassCard;
\`\`\`

This component features:
• **Glassmorphic design** with backdrop blur
• **Smooth animations** with Framer Motion
• **Hover effects** with scale and lift
• **TypeScript support** for type safety

Would you like me to explain any part of it or help you customize it further?`,
        timestamp: new Date(Date.now() - 180000),
        agent: 'Laka'
      }
    ];
    
    setMessages(demoMessages);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      setAgents(data.agents);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadSessions = async () => {
    // Mock sessions for now
    const mockSessions: ChatSession[] = [
      {
        id: 'session-1',
        name: 'General Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    setSessions(mockSessions);
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          agentId: selectedAgent
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        agent: data.agent
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update session
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          messages: [...currentSession.messages, userMessage, assistantMessage],
          updatedAt: new Date()
        };
        setCurrentSession(updatedSession);
        setSessions(prev => 
          prev.map(session => 
            session.id === currentSession.id ? updatedSession : session
          )
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        agent: 'System'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileAttachment = (file: File) => {
    console.log('File attached:', file);
    // Handle file attachment logic here
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
  };

  const exportChat = () => {
    const chatData = {
      session: currentSession,
      messages,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  return (
    <div className="flex h-full min-h-0 overflow-x-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-80 bg-white/5 backdrop-blur-md border-r border-white/10 p-4 flex flex-col h-full min-h-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Chat Sessions</h2>
              <Button
                onClick={createNewSession}
                size="sm"
                icon={<Plus className="w-4 h-4" />}
              >
                New
              </Button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    variant={currentSession?.id === session.id ? 'elevated' : 'default'}
                    onClick={() => {
                      setCurrentSession(session);
                      setMessages(session.messages);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{session.name}</h3>
                        <p className="text-sm text-gray-400">
                          {session.messages.length} messages
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {session.updatedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Agent Selection */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Active Agent</h3>
              {selectedAgentData && (
                <Card variant="glass" className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{selectedAgentData.avatar}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{selectedAgentData.name}</h4>
                      <p className="text-xs text-gray-400">{selectedAgentData.status}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-h-0">
        {/* Chat Header */}
        <motion.header
          className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              icon={<MessageSquare className="w-4 h-4" />}
            >
              {showSidebar ? 'Hide' : 'Show'} Sidebar
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {currentSession?.name || 'New Chat'}
              </h1>
              <p className="text-sm text-gray-400">
                {messages.length} messages • {selectedAgentData?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportChat}
              icon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Settings className="w-4 h-4" />}
            >
              Settings
            </Button>
          </div>
        </motion.header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-0">
          <AnimatePresence>
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                agent={message.agent}
                isLast={index === messages.length - 1}
                isTyping={false}
              />
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <ChatMessage
                id="typing"
                role="assistant"
                content=""
                timestamp={new Date()}
                agent={selectedAgentData?.name}
                isLast={true}
                isTyping={true}
              />
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-md">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={sendMessage}
            isLoading={isLoading}
            onAttachment={handleFileAttachment}
            onEmoji={handleEmojiSelect}
            placeholder={`Message ${selectedAgentData?.name || 'ChainBot'}...`}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 