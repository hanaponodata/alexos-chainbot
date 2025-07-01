import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Plus, 
  MoreVertical, 
  Download, 
  Settings, 
  User,
  Bot,
  Copy,
  Check,
  Trash2,
  Edit3,
  RotateCcw,
  Square,
  Search,
  Archive,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  FileText,
  Image as ImageIcon,
  Code,
  Smile,
  FileCode
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import './ChatGPTStyleChat.css';

// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'context';
  content: string;
  timestamp: Date;
  agent?: string;
  isEditing?: boolean;
  isGenerating?: boolean;
  context?: {
    filePath: string;
    fileName: string;
    lineNumber: number;
    selectedText: string;
    language: string;
    fullContent: string;
  };
}

interface ChatContext {
  filePath: string;
  fileName: string;
  lineNumber: number;
  selectedText: string;
  fullContent: string;
  language: string;
}

interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
}

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  description: string;
  capabilities: string[];
}

interface ChatGPTStyleChatProps {
  context?: ChatContext;
  onContextReceived?: (context: ChatContext) => void;
}

// Utility functions
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

const formatTimestamp = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

// Components
const TypingIndicator: React.FC = () => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3 p-4"
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <Bot className="w-4 h-4 text-white" />
    </div>
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  </motion.div>
);

const MessageBubble: React.FC<{
  message: ChatMessage;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onCopy?: (content: string) => Promise<boolean>;
  onRegenerate?: () => void;
  onStop?: () => void;
}> = ({ message, onEdit, onDelete, onCopy, onRegenerate, onStop }) => {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    if (onCopy) {
      const success = await onCopy(message.content);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message.id, message.content);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group relative ${isUser ? 'flex justify-end' : 'flex justify-start'} mb-6`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Message Content */}
        <div className={`relative px-0 py-0 w-full ${isUser ? 'bg-transparent text-white' : 'bg-transparent text-gray-100'}`}>
          {/* Message Actions */}
          {showActions && (
            <div className={`absolute top-2 ${isUser ? 'left-2' : 'right-2'} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
              {onCopy && (
                <button
                  onClick={handleCopy}
                  className="p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Copy message"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
              {isUser && onEdit && (
                <button
                  onClick={handleEdit}
                  className="p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Edit message"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              {!isUser && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
              {message.isGenerating && onStop && (
                <button
                  onClick={onStop}
                  className="p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Stop generating"
                >
                  <Square className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

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
                      <div className="relative group/code my-4">
                        <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                        <button
                          onClick={async () => {
                            await copyToClipboard(String(children));
                          }}
                          className="absolute top-2 right-2 p-1 rounded bg-gray-800 border border-gray-600 opacity-0 group-hover/code:opacity-100 transition-opacity"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border border-gray-700 rounded-lg">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-2 bg-gray-800 border-b border-gray-700 text-left">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 border-b border-gray-700">
                      {children}
                    </td>
                  )
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>

          {/* Timestamp */}
          <div className={`text-xs text-gray-400 mt-2 ${isUser ? 'text-right' : 'text-left'}`}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
      <hr className="border-gray-800 my-0" />
    </motion.div>
  );
};

const Sidebar: React.FC<{
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onCreateSession: () => void;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, name: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}> = ({ 
  sessions, 
  activeSession, 
  onCreateSession, 
  onSelectSession, 
  onDeleteSession, 
  onRenameSession,
  isCollapsed,
  onToggleCollapse
}) => {
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleRename = (session: ChatSession) => {
    setEditingSession(session.id);
    setEditName(session.name);
  };

  const handleSaveRename = () => {
    if (editingSession && editName.trim()) {
      onRenameSession(editingSession, editName.trim());
      setEditingSession(null);
      setEditName('');
    }
  };

  const handleCancelRename = () => {
    setEditingSession(null);
    setEditName('');
  };

  return (
    <div className={`bg-gray-900 border-r border-gray-700 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onCreateSession}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-600 hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group relative mb-1 rounded-lg transition-colors ${
                activeSession?.id === session.id ? 'bg-gray-800' : 'hover:bg-gray-800'
              }`}
            >
              {editingSession === session.id ? (
                <div className="p-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    onBlur={handleSaveRename}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => onSelectSession(session)}
                  className="w-full flex items-center gap-3 p-2 text-left"
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{session.name}</div>
                        <div className="text-xs text-gray-400">{formatDate(session.updatedAt)}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(session);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Header: React.FC<{
  session: ChatSession | null;
  onRenameSession: (name: string) => void;
  onExportChat: () => void;
  onOpenSettings: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}> = ({ session, onRenameSession, onExportChat, onOpenSettings, isSidebarCollapsed, onToggleSidebar }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const handleRename = () => {
    if (session) {
      setEditName(session.name);
      setIsEditing(true);
    }
  };

  const handleSaveRename = () => {
    if (editName.trim()) {
      onRenameSession(editName.trim());
      setIsEditing(false);
    }
  };

  const handleCancelRename = () => {
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1 rounded hover:bg-gray-800 transition-colors"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename();
              if (e.key === 'Escape') handleCancelRename();
            }}
            onBlur={handleSaveRename}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
            autoFocus
          />
        ) : (
          <button
            onClick={handleRename}
            className="text-lg font-medium hover:bg-gray-800 px-2 py-1 rounded transition-colors"
          >
            {session?.name || 'New Chat'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExportChat}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Export chat"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
};

const ChatInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder?: string;
}> = ({ value, onChange, onSend, isLoading, placeholder = "Message ChainBot..." }) => {
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      onSend();
    }
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  return (
    <div className="border-t border-gray-700 p-4">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:outline-none focus:border-blue-500 transition-colors"
          rows={1}
          style={{ minHeight: '44px', maxHeight: '200px' }}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Context Message Component
const ContextMessage: React.FC<{ context: ChatContext }> = ({ context }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
          <FileCode className="w-4 h-4 text-white" />
        </div>
        
        <div className="relative px-0 py-0 w-full bg-transparent text-gray-100">
          <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileCode className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">{context.fileName}</span>
              <span className="text-xs text-gray-500">Line {context.lineNumber}</span>
            </div>
            
            {context.selectedText && (
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1">Selected Code:</div>
                <pre className="bg-[#0d1117] border border-[#30363d] rounded p-3 text-sm overflow-x-auto">
                  <code className={`language-${context.language}`}>
                    {context.selectedText}
                  </code>
                </pre>
              </div>
            )}
            
            {isExpanded && context.fullContent && (
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1">Full File:</div>
                <pre className="bg-[#0d1117] border border-[#30363d] rounded p-3 text-sm overflow-x-auto max-h-40">
                  <code className={`language-${context.language}`}>
                    {context.fullContent}
                  </code>
                </pre>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {isExpanded ? 'Show Less' : 'Show Full File'}
              </button>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{context.language.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Main Component
const ChatGPTStyleChat: React.FC<ChatGPTStyleChatProps> = ({ context, onContextReceived }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with demo data
  useEffect(() => {
    const demoSession: ChatSession = {
      id: 'demo-1',
      name: 'General Chat',
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: `Hello! I'm **ChainBot** 🤖, your AI assistant. I'm here to help you with coding, workflows, monitoring, and more!

Here's what I can do:
• **Code Generation** - Write, review, and debug code
• **Workflow Automation** - Build complex automation pipelines  
• **System Monitoring** - Keep track of your infrastructure
• **Context Awareness** - Remember our conversation history

What would you like to work on today?`,
          timestamp: new Date(Date.now() - 300000),
          agent: 'ChainBot'
        }
      ],
      createdAt: new Date(Date.now() - 300000),
      updatedAt: new Date(Date.now() - 300000)
    };

    setSessions([demoSession]);
    setActiveSession(demoSession);
    setMessages(demoSession.messages);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    setActiveSession(newSession);
    setMessages([]);
  };

  const selectSession = (session: ChatSession) => {
    setActiveSession(session);
    setMessages(session.messages);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSession?.id === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        setActiveSession(remainingSessions[0]);
        setMessages(remainingSessions[0].messages);
      } else {
        createNewSession();
      }
    }
  };

  const renameSession = (sessionId: string, name: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, name, updatedAt: new Date() } : s
    ));
    if (activeSession?.id === sessionId) {
      setActiveSession(prev => prev ? { ...prev, name, updatedAt: new Date() } : null);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setIsGenerating(true);

    // Update session
    if (activeSession) {
      const updatedSession = { ...activeSession, messages: newMessages, updatedAt: new Date() };
      setActiveSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I understand you said: "${inputValue}"

This is a simulated response from ChainBot. In a real implementation, this would be generated by the AI model based on the conversation context and your specific request.

Here's a code example to demonstrate the markdown rendering:

\`\`\`typescript
interface ChatResponse {
  message: string;
  timestamp: Date;
  agent: string;
}

const generateResponse = (input: string): ChatResponse => {
  return {
    message: \`Processed: \${input}\`,
    timestamp: new Date(),
    agent: 'ChainBot'
  };
};
\`\`\`

The response includes:
- **Markdown formatting** with bold, italic, and lists
- **Code blocks** with syntax highlighting
- **Context awareness** of the conversation
- **Proper timestamps** and message threading

Would you like me to explain any part of this response or help you with something specific?`,
        timestamp: new Date(),
        agent: 'ChainBot'
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      setIsGenerating(false);

      // Update session
      if (activeSession) {
        const updatedSession = { ...activeSession, messages: finalMessages, updatedAt: new Date() };
        setActiveSession(updatedSession);
        setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = async (content: string) => {
    return await copyToClipboard(content);
  };

  const handleEditMessage = (id: string, content: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, content, isEditing: false } : msg
    ));
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const handleRegenerateResponse = () => {
    // Remove last assistant message and regenerate
    const userMessages = messages.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      setMessages(prev => prev.filter(msg => msg.role === 'user' || msg.id !== lastUserMessage.id));
      setInputValue(lastUserMessage.content);
      // Trigger regeneration
      setTimeout(() => {
        setInputValue('');
        sendMessage();
      }, 100);
    }
  };

  const handleStopGeneration = () => {
    setIsGenerating(false);
    setIsLoading(false);
  };

  const handleExportChat = () => {
    const chatContent = messages.map(msg => 
      `${msg.role === 'user' ? 'You' : 'ChainBot'}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSession?.name || 'chat'}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenSettings = () => {
    // TODO: Implement settings modal
    console.log('Open settings');
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Handle incoming context
  useEffect(() => {
    if (context && onContextReceived) {
      // Add context as a special message
      const contextMessage: ChatMessage = {
        id: `context-${Date.now()}`,
        role: 'context',
        content: `Code context from ${context.fileName}`,
        timestamp: new Date(),
        context: {
          filePath: context.filePath,
          fileName: context.fileName,
          lineNumber: context.lineNumber,
          selectedText: context.selectedText,
          language: context.language,
          fullContent: context.fullContent
        }
      };
      
      if (activeSession) {
        const updatedSession = {
          ...activeSession,
          messages: [...activeSession.messages, contextMessage],
          updatedAt: new Date()
        };
        setSessions(sessions.map(s => s.id === activeSession.id ? updatedSession : s));
        setActiveSession(updatedSession);
      }
      
      // Auto-send a helpful message
      const autoMessage: ChatMessage = {
        id: `auto-${Date.now()}`,
        role: 'user',
        content: context.selectedText 
          ? `Can you help me with this code? I'm working on line ${context.lineNumber} of ${context.fileName}.`
          : `I'm working on ${context.fileName}. Can you help me with this file?`,
        timestamp: new Date()
      };
      
      if (activeSession) {
        const updatedSession = {
          ...activeSession,
          messages: [...activeSession.messages, contextMessage, autoMessage],
          updatedAt: new Date()
        };
        setSessions(sessions.map(s => s.id === activeSession.id ? updatedSession : s));
        setActiveSession(updatedSession);
        
        // Auto-send the message
        setTimeout(() => {
          sendMessage();
        }, 500);
      }
    }
  }, [context]);

  const handleRenameSessionWrapper = (name: string) => {
    if (activeSession) {
      renameSession(activeSession.id, name);
    }
  };

  return (
    <div className="flex h-full bg-[#0d1117] text-white">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSession={activeSession}
        onCreateSession={createNewSession}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          session={activeSession}
          onRenameSession={handleRenameSessionWrapper}
          onExportChat={handleExportChat}
          onOpenSettings={handleOpenSettings}
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6" ref={messagesEndRef}>
          <AnimatePresence>
            {activeSession?.messages.map((message) => (
              <div key={message.id}>
                {message.role === 'context' && message.context ? (
                  <ContextMessage context={message.context} />
                ) : (
                  <MessageBubble
                    message={message}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onCopy={handleCopyMessage}
                    onRegenerate={handleRegenerateResponse}
                    onStop={handleStopGeneration}
                  />
                )}
              </div>
            ))}
          </AnimatePresence>
          
          {isGenerating && <TypingIndicator />}
        </div>

        {/* Input */}
        <div className="border-t border-[#30363d] p-4">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={sendMessage}
            isLoading={isGenerating}
            placeholder={activeSession ? "Message ChainBot..." : "Start a new conversation..."}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatGPTStyleChat; 