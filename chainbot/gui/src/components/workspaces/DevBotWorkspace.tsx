import React, { useState, useRef, useEffect } from 'react';
import { Code, Play, Save, FileText, Terminal, Bot, Send, Sparkles, Zap } from 'lucide-react';
import CodeEditorRoot from '../CodeEditor/CodeEditorRoot';
import FileTreeRoot from '../FileTree/FileTreeRoot';

interface DevBotMessage {
  id: string;
  type: 'greeting' | 'suggestion' | 'code' | 'explanation';
  content: string;
  timestamp: Date;
  code?: string;
  language?: string;
}

interface DevBotWorkspaceProps {
  GlobalControls: React.ComponentType;
}

const DevBotWorkspace: React.FC<DevBotWorkspaceProps> = ({ GlobalControls }) => {
  const [messages, setMessages] = useState<DevBotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // DevBot avatar animation states
  const [avatarState, setAvatarState] = useState<'idle' | 'thinking' | 'coding' | 'explaining'>('idle');

  useEffect(() => {
    // Initial greeting
    const greeting: DevBotMessage = {
      id: 'greeting',
      type: 'greeting',
      content: "Hi! I'm DevBot, your coding assistant. I can help you write, debug, and optimize code. What would you like to work on today?",
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: DevBotMessage = {
      id: Date.now().toString(),
      type: 'explanation',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setAvatarState('thinking');

    // Simulate DevBot response
    setTimeout(() => {
      const botResponse: DevBotMessage = {
        id: (Date.now() + 1).toString(),
        type: 'suggestion',
        content: "I understand you want to work on that! Let me help you with some code suggestions and best practices.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
      setAvatarState('coding');
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { icon: <Code className="w-4 h-4" />, label: 'Review Code', action: () => console.log('Review code') },
    { icon: <Play className="w-4 h-4" />, label: 'Run Tests', action: () => console.log('Run tests') },
    { icon: <Save className="w-4 h-4" />, label: 'Save All', action: () => console.log('Save all') },
    { icon: <Terminal className="w-4 h-4" />, label: 'Debug', action: () => console.log('Debug') },
  ];

  // DevBot Avatar Component
  const DevBotAvatar = () => (
    <div className="relative">
      <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center transition-all duration-300 ${
        avatarState === 'thinking' ? 'animate-pulse' : 
        avatarState === 'coding' ? 'animate-bounce' : ''
      }`}>
        <Bot className="w-8 h-8 text-white" />
      </div>
      
      {/* Status indicator */}
      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${
        avatarState === 'idle' ? 'bg-gray-500' :
        avatarState === 'thinking' ? 'bg-yellow-500 animate-pulse' :
        avatarState === 'coding' ? 'bg-green-500' :
        'bg-blue-500'
      }`} />
      
      {/* Thinking animation */}
      {avatarState === 'thinking' && (
        <div className="absolute -top-2 -right-2 flex space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      {/* Left Panel - File Tree */}
      <div className="w-64 border-r border-[#23232a] bg-[#101014]">
        <FileTreeRoot />
      </div>

      {/* Main Content - Code Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* DevBot Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#23232a] bg-[#101014]">
          <div className="flex items-center space-x-4">
            <DevBotAvatar />
            <div>
              <h1 className="text-xl font-semibold text-white">DevBot</h1>
              <p className="text-sm text-gray-400">Your animated coding assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="flex items-center space-x-2 px-3 py-2 bg-[#18181b] border border-[#23232a] rounded-lg text-white hover:bg-[#23232a] transition-colors"
                title={action.label}
              >
                {action.icon}
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
            <GlobalControls />
          </div>
        </div>

        {/* Code Editor Area */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1">
            <CodeEditorRoot />
          </div>
          
          {/* DevBot Chat Panel */}
          {showChat && (
            <div className="w-80 border-l border-[#23232a] bg-[#101014] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-[#23232a] bg-[#18181b]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">DevBot Chat</h3>
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div key={message.id} className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
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
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
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
              <div className="p-4 border-t border-[#23232a]">
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask DevBot for help..."
                      className="w-full p-2 bg-[#18181b] border border-[#23232a] rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping}
                    className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Chat Button */}
        {!showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
            title="Open DevBot Chat"
          >
            <Bot className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DevBotWorkspace; 