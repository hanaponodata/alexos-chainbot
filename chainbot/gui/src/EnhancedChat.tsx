import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  Send, 
  Bot, 
  User, 
  Plus, 
  Download, 
  MessageSquare,
  Copy,
  Trash2,
  Sparkles,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import type { ReactNode } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
  attachments?: ChatAttachment[];
  codeBlocks?: CodeBlock[];
}

interface ChatAttachment {
  id: string;
  name: string;
  type: 'file' | 'image' | 'code';
  content?: string;
  url?: string;
}

interface CodeBlock {
  id: string;
  language: string;
  code: string;
  filename?: string;
}

interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  agents: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  avatar?: string;
  description: string;
  capabilities: string[];
}

// Helper for copy-to-clipboard
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// Modern typing indicator with shimmer effect
const TypingIndicator = () => (
  <div className="flex items-center gap-3 mt-4 animate-fade-in">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
    <span className="text-secondary font-medium">ChainBot is thinking...</span>
  </div>
);

// Modern message component
const MessageBubble: React.FC<{ message: ChatMessage; isLast: boolean }> = ({ message, isLast }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    copyToClipboard(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
      <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 agent-avatar ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
        } ${!isUser && isLast ? 'thinking' : ''}`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Message Content */}
        <div className={`glass rounded-2xl px-4 py-3 relative group ${
          isUser 
            ? 'message-bubble-user' 
            : message.role === 'system'
            ? 'message-bubble-system'
            : 'message-bubble-assistant'
        } animate-scale-in`}>
          {/* Message Header */}
          <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-tertiary font-medium">
              {isUser ? 'You' : 'ChainBot'}
            </span>
            <span className="text-xs text-muted">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Message Body */}
          <div className="prose prose-sm max-w-none">
            {message.role === 'assistant' ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code: ({ node, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return !isInline ? (
                      <div className="relative group/code">
                        <pre className="bg-tertiary border border-primary rounded-lg p-4 overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                        <button
                          onClick={() => copyToClipboard(String(children))}
                          className="absolute top-2 right-2 p-1 rounded bg-glass border border-glass-border opacity-0 group-hover/code:opacity-100 transition-opacity"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <code className="bg-tertiary px-1.5 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p className="text-primary whitespace-pre-wrap">{message.content}</p>
            )}
          </div>

          {/* Message Actions */}
          <div className={`absolute top-2 ${isUser ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            <button
              onClick={handleCopy}
              className="p-1 rounded bg-glass border border-glass-border hover:bg-glass-hover transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modern sidebar component
const Sidebar: React.FC<{
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onCreateSession: () => void;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
}> = ({ sessions, activeSession, onCreateSession, onSelectSession, onDeleteSession }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`glass border-r border-primary transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-primary">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gradient">ChainBot</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-glass-hover transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {!isCollapsed && (
          <button
            onClick={onCreateSession}
            className="w-full mb-3 btn btn-primary btn-sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        )}

        <div className="space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group relative rounded-lg p-3 cursor-pointer transition-all ${
                activeSession?.id === session.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30'
                  : 'hover:bg-glass-hover'
              }`}
              onClick={() => onSelectSession(session)}
            >
              {!isCollapsed ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="w-4 h-4 text-secondary flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{session.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-error" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted" />
                    <span className="text-xs text-muted">
                      {session.updatedAt.toLocaleDateString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-center">
                  <MessageSquare className="w-4 h-4 text-secondary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Modern input component
const ChatInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder?: string;
}> = ({ value, onChange, onSend, isLoading, placeholder = "Message ChainBot..." }) => {
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="glass border-t border-primary p-4">
      {/* Gradient line above input */}
      <div className="gradient-line" style={{backgroundColor: 'red', height: '3px'}}></div>
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="input resize-none min-h-[44px] max-h-32 py-3 pr-12"
            rows={1}
            disabled={isLoading}
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted">
            Enter to send, Shift+Enter for new line
          </div>
        </div>
        <button
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          className="btn btn-primary btn-lg hover-glow"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Add a simple thinking animation component
const ThinkingIndicator: React.FC = () => (
  <div className="flex justify-start mb-6 animate-fade-in">
    <div className="flex items-start gap-3 max-w-[85%]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="glass rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-primary font-medium">ChainBot is thinking</span>
          <span className="thinking-dots">
            <span className="dot">.</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
          </span>
        </div>
      </div>
    </div>
  </div>
);

const EnhancedChat: React.FC = () => {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showSidebar] = useState(true);
  const [showFloatingElements, setShowFloatingElements] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000';

  // Slash commands for enhanced functionality
  const slashCommands = [
    { command: '/run', description: 'Execute code or command', icon: '⚡' },
    { command: '/fix', description: 'Fix errors or issues', icon: '🔧' },
    { command: '/search', description: 'Search documentation or code', icon: '🔍' },
    { command: '/whois', description: 'Get agent information', icon: '👤' },
    { command: '/help', description: 'Show available commands', icon: '❓' },
    { command: '/clear', description: 'Clear chat history', icon: '🗑️' },
    { command: '/export', description: 'Export chat session', icon: '📤' },
    { command: '/agents', description: 'Show available agents', icon: '🤖' },
  ];

  // Handle slash commands
  const handleSlashCommand = (command: string) => {
    switch (command) {
      case '/run':
        setInputValue('Please provide the code or command you want to run:');
        break;
      case '/fix':
        setInputValue('Please describe the issue you want to fix:');
        break;
      case '/search':
        setInputValue('What would you like to search for?');
        break;
      case '/whois':
        setInputValue('Which agent would you like information about?');
        break;
      case '/help':
        setInputValue('Available commands:\n' + slashCommands.map(cmd => `${cmd.command} - ${cmd.description}`).join('\n'));
        break;
      case '/clear':
        if (activeSession) {
          const clearedSession = {
            ...activeSession,
            messages: [],
            updatedAt: new Date()
          };
          setActiveSession(clearedSession);
          setSessions(prev => prev.map(s => s.id === activeSession.id ? clearedSession : s));
        }
        break;
      case '/export':
        exportChat();
        break;
      case '/agents':
        setInputValue('Available agents:\n' + agents.map(agent => `${agent.name} - ${agent.description}`).join('\n'));
        break;
    }
    setShowSlashCommands(false);
  };

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to send message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (inputValue.trim() && !isLoading) {
          sendMessage();
        }
      }
      
      // Ctrl/Cmd + N for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewSession();
      }
      
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Escape to clear input or close modals
      if (e.key === 'Escape') {
        if (showSlashCommands) {
          setShowSlashCommands(false);
        } else if (inputValue.trim()) {
          setInputValue('');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inputValue, isLoading, showSlashCommands]);

  useEffect(() => {
    if (token) {
      loadSessions();
      loadAgents();
    }
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  useEffect(() => {
    const saved = localStorage.getItem('chainbot_sessions_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed.sessions || []);
      setActiveSession(parsed.activeSession || (parsed.sessions && parsed.sessions[0]) || null);
    } else {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        name: `Chat 1`,
        messages: [],
        agents: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setSessions([newSession]);
      setActiveSession(newSession);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chainbot_sessions_v1', JSON.stringify({
      sessions,
      activeSession
    }));
  }, [sessions, activeSession]);

  useEffect(() => {
    if (activeSession && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeSession]);

  useEffect(() => {
    if (sessions.length === 0) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        name: `Chat 1`,
        messages: [],
        agents: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setSessions([newSession]);
      setActiveSession(newSession);
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages, isStreaming, inputValue, isLoading]);

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/chat/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        if (data.sessions && data.sessions.length > 0) {
          setActiveSession(data.sessions[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
      setActiveSession(null);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch(`${API_BASE}/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      setAgents([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      name: `Chat ${sessions.length + 1}`,
      messages: [
        {
          id: '1',
          role: 'system',
          content: 'New chat session started',
          timestamp: new Date(),
          agent: 'system'
        }
      ],
      agents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSession(newSession);
    setInputValue('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSession?.id === sessionId) {
      setActiveSession(sessions.find(s => s.id !== sessionId) || null);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    let session = activeSession;
    if (!session) {
      session = {
        id: Date.now().toString(),
        name: `Chat ${sessions.length + 1}`,
        messages: [],
        agents: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setSessions(prev => [session!, ...prev]);
      setActiveSession(session);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    const updatedSession = {
      ...session,
      messages: [...session.messages, userMessage],
      updatedAt: new Date()
    };
    setActiveSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === session!.id ? updatedSession : s));
    setInputValue('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const payload = {
        model: 'llama3:latest',
        messages: [{ role: 'user', content: inputValue.trim() }],
        stream: false
      };
      console.log('Sending to backend:', `${API_BASE}/api/chat`, payload);
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Backend response:', data);
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: typeof (data.response || data.message) === 'string' ? (data.response || data.message) : '',
          timestamp: new Date()
        };
        let streamedContent = '';
        const words = (assistantMessage.content || '').split(' ');
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 50));
          streamedContent += (i > 0 ? ' ' : '') + words[i];
        }
        const finalSession = {
          ...updatedSession,
          messages: [...updatedSession.messages, { ...assistantMessage, content: streamedContent }],
          updatedAt: new Date()
        };
        setActiveSession(finalSession);
        setSessions(prev => prev.map(s => s.id === session!.id ? finalSession : s));
      } else {
        let errorMsg = 'I apologize, but I encountered an error processing your request.';
        let errorText = await response.text();
        try {
          const errJson = JSON.parse(errorText);
          errorMsg = errJson.detail || errJson.error || errorMsg;
        } catch {}
        console.error('Backend error:', errorText);
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date()
        };
        const errorSession = {
          ...updatedSession,
          messages: [...updatedSession.messages, errorMessage],
          updatedAt: new Date()
        };
        setActiveSession(errorSession);
        setSessions(prev => prev.map(s => s.id === session!.id ? errorSession : s));
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error?.message || 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      const errorSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, errorMessage],
        updatedAt: new Date()
      };
      setActiveSession(errorSession);
      setSessions(prev => prev.map(s => s.id === session!.id ? errorSession : s));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const exportChat = () => {
    if (!activeSession) return;
    
    const chatData = {
      session: activeSession,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainbot-chat-${activeSession.name}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Floating background elements
  const FloatingElements = () => (
    <>
      <div className="floating-shape" style={{ top: '10%', left: '5%', animationDelay: '0s' }}></div>
      <div className="floating-shape" style={{ top: '60%', right: '10%', animationDelay: '2s' }}></div>
      <div className="floating-shape" style={{ bottom: '20%', left: '20%', animationDelay: '4s' }}></div>
    </>
  );

  return (
    <div className="flex h-screen bg-primary overflow-hidden fixed inset-0 z-50">
      {showFloatingElements && <FloatingElements />}
      
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          sessions={sessions}
          activeSession={activeSession}
          onCreateSession={createNewSession}
          onSelectSession={setActiveSession}
          onDeleteSession={deleteSession}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="glass border-b border-primary p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gradient">ChainBot</h1>
              {activeSession && (
                <span className="text-secondary text-sm">
                  {activeSession.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={exportChat}
                disabled={!activeSession}
                className="btn btn-ghost btn-sm"
                title="Export chat (Ctrl+E)"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Show thinking animation as a chat bubble if isLoading and not yet streaming output */}
          {isLoading && (!isStreaming || !inputValue) ? (
            <>
              {activeSession && activeSession.messages.length > 0 && activeSession.messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLast={index === activeSession.messages.length - 1}
                />
              ))}
              <ThinkingIndicator />
            </>
          ) : activeSession && activeSession.messages.length > 0 ? (
            <>
              {activeSession.messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLast={index === activeSession.messages.length - 1}
                />
              ))}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gradient">Welcome to ChainBot</h2>
                <p className="text-secondary max-w-md">
                  Your AI-powered coding assistant. Type a message below to begin building amazing things together.
                </p>
                <div className="text-xs text-muted space-y-1">
                  <p>💡 Try slash commands: /help, /run, /fix, /search</p>
                  <p>⌨️ Keyboard shortcuts: Ctrl+N (new chat), Ctrl+Enter (send)</p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area with Slash Commands */}
        <div className="glass border-t border-primary p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setInputValue(value);
                  // Show slash commands when typing "/"
                  setShowSlashCommands(value.startsWith('/') && value.length === 1);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Message ChainBot... (type / for commands)"
                className={`input resize-none min-h-[44px] max-h-32 py-3 pr-12 input-focus-ring ${
                  showSlashCommands ? 'input-slash-active' : ''
                }`}
                rows={1}
                disabled={isLoading}
              />
              
              {/* Slash Commands Dropdown */}
              {showSlashCommands && (
                <div className="absolute bottom-full left-0 right-0 mb-2 slash-commands-dropdown animate-slide-in-down">
                  {slashCommands.map((cmd, index) => (
                    <button
                      key={cmd.command}
                      onClick={() => handleSlashCommand(cmd.command)}
                      className="slash-command-item focus-visible"
                    >
                      <span className="slash-command-icon">{cmd.icon}</span>
                      <span className="slash-command-text">{cmd.command}</span>
                      <span className="slash-command-description">{cmd.description}</span>
                    </button>
                  ))}
                </div>
              )}
              
              <div className="absolute bottom-2 right-2 text-xs text-muted">
                Enter to send, Shift+Enter for new line
              </div>
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`btn btn-primary btn-lg ${isLoading ? 'btn-loading' : 'btn-hover-glow'}`}
              title="Send message (Ctrl+Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChat; 