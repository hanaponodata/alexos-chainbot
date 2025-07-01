import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Trash2, Download, Upload, MessageCircle, Bot, User } from 'lucide-react';
import { chatService } from '../services/chatService';
import type { ChatMessage } from '../services/chatService';
import ChatSettings from './ChatSettings';

interface EnhancedChatProps {
  className?: string;
}

const EnhancedChat: React.FC<EnhancedChatProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation history on mount
  useEffect(() => {
    chatService.loadConversationHistory();
    const history = chatService.getConversationHistory();
    setMessages(history);
    
    // Check API key status
    const apiKey = chatService.getApiKey();
    if (apiKey) {
      setApiKeyStatus('valid');
    } else {
      setApiKeyStatus('none');
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Add user message immediately
      const userMessage = chatService.addMessage('user', messageText);
      setMessages(prev => [...prev, userMessage]);

      // Send to ChainBot backend
      const response = await chatService.sendMessage(messageText);
      
      if (response.success && response.message) {
        // Add assistant response
        setMessages(prev => [...prev, response.message!]);
      } else {
        // Add error message
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: response.response || 'Failed to get response',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear all messages?')) {
      chatService.clearConversationHistory();
      setMessages([]);
    }
  };

  const handleExportChat = () => {
    const conversationData = chatService.exportConversation();
    const blob = new Blob([conversationData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainbot-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportChat = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const success = chatService.importConversation(e.target?.result as string);
        if (success) {
          const history = chatService.getConversationHistory();
          setMessages(history);
        } else {
          alert('Failed to import chat history. Invalid file format.');
        }
      } catch (error) {
        alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const isError = message.content.startsWith('Error:');

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-500 text-white ml-2' : 'bg-gray-500 text-white mr-2'
          }`}>
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>

          {/* Message Content */}
          <div className={`rounded-lg px-4 py-2 ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : isError 
                ? 'bg-red-100 text-red-800 border border-red-200' 
                : 'bg-gray-100 text-gray-800'
          }`}>
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
            <div className={`text-xs mt-1 ${
              isUser ? 'text-blue-100' : isError ? 'text-red-600' : 'text-gray-500'
            }`}>
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">AI Chat</h2>
          {apiKeyStatus === 'valid' && (
            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
              Connected
            </span>
          )}
          {apiKeyStatus === 'none' && (
            <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              No API Key
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearChat}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportChat}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md"
            title="Export Chat"
          >
            <Download className="w-4 h-4" />
          </button>
          <label className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer" title="Import Chat">
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept=".json"
              onChange={handleImportChat}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Welcome to ChainBot Chat!</p>
            <p className="text-sm text-center max-w-md">
              {apiKeyStatus === 'none' 
                ? 'Configure your ChatGPT API key in settings to start chatting with AI.'
                : 'Start a conversation by typing a message below.'
              }
            </p>
            {apiKeyStatus === 'none' && (
              <button
                onClick={() => setShowSettings(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Configure API Key
              </button>
            )}
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500 text-white mr-2 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={apiKeyStatus === 'none' ? 'Configure API key to start chatting...' : 'Type your message...'}
            disabled={isLoading || apiKeyStatus === 'none'}
            className="flex-1 resize-none border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || apiKeyStatus === 'none'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {apiKeyStatus === 'none' && (
          <p className="text-xs text-gray-500 mt-2">
            💡 <button 
              onClick={() => setShowSettings(true)}
              className="text-blue-600 hover:underline"
            >
              Click here to configure your ChatGPT API key
            </button>
          </p>
        )}
      </div>

      {/* Settings Modal */}
      <ChatSettings 
        isOpen={showSettings} 
        onClose={() => {
          setShowSettings(false);
          // Refresh API key status
          const apiKey = chatService.getApiKey();
          setApiKeyStatus(apiKey ? 'valid' : 'none');
        }} 
      />
    </div>
  );
};

export default EnhancedChat; 