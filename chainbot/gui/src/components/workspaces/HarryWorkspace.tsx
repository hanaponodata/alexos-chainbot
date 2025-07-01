import React, { useState, useRef, useEffect } from 'react';
import { Wrench, Hammer, Settings, Bot, Send, CheckCircle, Clock, AlertTriangle, Play, Save, GitBranch, Terminal } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused' | 'error';
  progress: number;
  lastUpdated: Date;
  description: string;
}

interface HarryMessage {
  id: string;
  type: 'greeting' | 'advice' | 'review' | 'task' | 'warning';
  content: string;
  timestamp: Date;
  action?: string;
  code?: string;
}

interface HarryWorkspaceProps {
  GlobalControls: React.ComponentType;
}

const HarryWorkspace: React.FC<HarryWorkspaceProps> = ({ GlobalControls }) => {
  const [messages, setMessages] = useState<HarryMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'projects' | 'tasks'>('chat');
  const [avatarState, setAvatarState] = useState<'idle' | 'thinking' | 'working' | 'reviewing'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sample projects
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'API Refactoring',
      status: 'active',
      progress: 75,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      description: 'Refactoring the backend API for better performance'
    },
    {
      id: '2',
      name: 'Frontend Optimization',
      status: 'active',
      progress: 45,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      description: 'Optimizing React components and state management'
    },
    {
      id: '3',
      name: 'Database Migration',
      status: 'paused',
      progress: 20,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      description: 'Migrating from SQLite to PostgreSQL'
    }
  ]);

  useEffect(() => {
    // Initial greeting
    const greeting: HarryMessage = {
      id: 'greeting',
      type: 'greeting',
      content: "Hi there! I'm Harry the Handyman, your project management and coding assistant. I can help you review code, manage projects, fix bugs, and keep everything running smoothly. What can I help you with today?",
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: HarryMessage = {
      id: Date.now().toString(),
      type: 'task',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setAvatarState('thinking');

    // Simulate Harry's response
    setTimeout(() => {
      const botResponse: HarryMessage = {
        id: (Date.now() + 1).toString(),
        type: 'advice',
        content: "I see what you're working on! Let me review that and provide some suggestions. I'll also check if there are any potential issues or improvements we can make.",
        timestamp: new Date(),
        action: 'review_code'
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
      setAvatarState('reviewing');
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { 
      icon: <CheckCircle className="w-4 h-4" />, 
      label: 'Review Code', 
      action: () => console.log('Review code'),
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      icon: <AlertTriangle className="w-4 h-4" />, 
      label: 'Fix Bugs', 
      action: () => console.log('Fix bugs'),
      color: 'bg-red-600 hover:bg-red-700'
    },
    { 
      icon: <Play className="w-4 h-4" />, 
      label: 'Deploy', 
      action: () => console.log('Deploy'),
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      icon: <GitBranch className="w-4 h-4" />, 
      label: 'Git Status', 
      action: () => console.log('Git status'),
      color: 'bg-purple-600 hover:bg-purple-700'
    },
  ];

  // Harry Avatar Component
  const HarryAvatar = () => (
    <div className="relative">
      <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center transition-all duration-300 ${
        avatarState === 'thinking' ? 'animate-pulse' : 
        avatarState === 'working' ? 'animate-bounce' : ''
      }`}>
        <Wrench className="w-8 h-8 text-white" />
      </div>
      
      {/* Status indicator */}
      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${
        avatarState === 'idle' ? 'bg-gray-500' :
        avatarState === 'thinking' ? 'bg-yellow-500 animate-pulse' :
        avatarState === 'working' ? 'bg-green-500' :
        'bg-orange-500'
      }`} />
      
      {/* Working animation */}
      {avatarState === 'working' && (
        <div className="absolute -top-2 -right-2">
          <Hammer className="w-4 h-4 text-yellow-400 animate-pulse" />
        </div>
      )}
    </div>
  );

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'paused':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'border-green-500 bg-green-500/10';
      case 'completed':
        return 'border-blue-500 bg-blue-500/10';
      case 'paused':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'error':
        return 'border-red-500 bg-red-500/10';
    }
  };

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Harry Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#23232a] bg-[#101014]">
          <div className="flex items-center space-x-4">
            <HarryAvatar />
            <div>
              <h1 className="text-xl font-semibold text-white">Harry the Handyman</h1>
              <p className="text-sm text-gray-400">Project management & advanced coding assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`flex items-center space-x-2 px-3 py-2 ${action.color} text-white rounded-lg transition-colors`}
                title={action.label}
              >
                {action.icon}
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
            <GlobalControls />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#23232a] bg-[#18181b]">
          {[
            { id: 'chat', label: 'Chat with Harry', icon: <Bot className="w-4 h-4" /> },
            { id: 'projects', label: 'Active Projects', icon: <Settings className="w-4 h-4" /> },
            { id: 'tasks', label: 'Tasks & Reviews', icon: <CheckCircle className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-orange-500 bg-[#101014]'
                  : 'text-gray-400 hover:text-white hover:bg-[#23232a]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex min-h-0">
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div key={message.id} className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                        <Wrench className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-[#18181b] border border-[#23232a] rounded-lg p-3">
                          <div className="text-sm text-gray-200">{message.content}</div>
                          {message.code && (
                            <pre className="mt-2 p-2 bg-[#0a0a0a] rounded text-xs text-green-400 overflow-x-auto">
                              <code>{message.code}</code>
                            </pre>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-[#18181b] border border-[#23232a] rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-[#23232a] bg-[#101014]">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask Harry for help with coding, project management, or debugging..."
                      className="w-full p-3 pr-12 bg-[#18181b] border border-[#23232a] rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-orange-500 transition-colors"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping}
                    className="flex-shrink-0 p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="flex-1 p-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-4">Active Projects</h2>
                {projects.map(project => (
                  <div
                    key={project.id}
                    className={`p-4 border rounded-lg ${getStatusColor(project.status)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(project.status)}
                        <h3 className="text-lg font-medium text-white">{project.name}</h3>
                      </div>
                      <span className="text-sm text-gray-400">
                        {project.lastUpdated.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-3">{project.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                          View
                        </button>
                        <button className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors">
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="flex-1 p-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-4">Tasks & Reviews</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#18181b] border border-[#23232a] rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-3">Code Reviews</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-[#23232a] rounded">
                        <span className="text-sm text-gray-300">API Refactoring</span>
                        <span className="text-xs text-yellow-500">Pending</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[#23232a] rounded">
                        <span className="text-sm text-gray-300">Frontend Components</span>
                        <span className="text-xs text-green-500">Complete</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#18181b] border border-[#23232a] rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-3">Bug Fixes</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-[#23232a] rounded">
                        <span className="text-sm text-gray-300">Memory Leak</span>
                        <span className="text-xs text-red-500">High Priority</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[#23232a] rounded">
                        <span className="text-sm text-gray-300">UI Responsiveness</span>
                        <span className="text-xs text-blue-500">In Progress</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HarryWorkspace; 