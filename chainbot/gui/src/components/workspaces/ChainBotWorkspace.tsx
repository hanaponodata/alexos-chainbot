import React, { useState, useRef, useEffect } from 'react';
import { Brain, Play, Save, Plus, Trash2, Bot, Send, Zap, ArrowRight } from 'lucide-react';

interface WorkflowStep {
  id: string;
  type: 'input' | 'process' | 'output' | 'condition' | 'loop';
  name: string;
  description: string;
  config: any;
  position: { x: number; y: number };
}

interface ChainBotMessage {
  id: string;
  type: 'greeting' | 'suggestion' | 'tutorial' | 'help';
  content: string;
  timestamp: Date;
  action?: string;
}

interface ChainBotWorkspaceProps {
  GlobalControls: React.ComponentType;
}

const ChainBotWorkspace: React.FC<ChainBotWorkspaceProps> = ({ GlobalControls }) => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [messages, setMessages] = useState<ChainBotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [avatarState, setAvatarState] = useState<'idle' | 'thinking' | 'building' | 'explaining'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial greeting
    const greeting: ChainBotMessage = {
      id: 'greeting',
      type: 'greeting',
      content: "Hi! I'm ChainBot, your workflow building assistant. I can help you create powerful automation workflows with visual tools and AI guidance. Let's build something amazing together!",
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChainBotMessage = {
      id: Date.now().toString(),
      type: 'help',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setAvatarState('thinking');

    // Simulate ChainBot response
    setTimeout(() => {
      const botResponse: ChainBotMessage = {
        id: (Date.now() + 1).toString(),
        type: 'suggestion',
        content: "Great idea! Let me help you build that workflow. I'll guide you through each step and suggest the best components to use.",
        timestamp: new Date(),
        action: 'show_tutorial'
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
      setAvatarState('building');
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const addWorkflowStep = (type: WorkflowStep['type']) => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
      description: `A ${type} step in your workflow`,
      config: {},
      position: { x: Math.random() * 400, y: Math.random() * 300 }
    };
    setWorkflowSteps(prev => [...prev, newStep]);
  };

  const quickActions = [
    { 
      icon: <Plus className="w-4 h-4" />, 
      label: 'Add Step', 
      action: () => addWorkflowStep('process'),
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      icon: <Play className="w-4 h-4" />, 
      label: 'Run Workflow', 
      action: () => console.log('Run workflow'),
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      icon: <Save className="w-4 h-4" />, 
      label: 'Save', 
      action: () => console.log('Save workflow'),
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    { 
      icon: <Trash2 className="w-4 h-4" />, 
      label: 'Clear', 
      action: () => setWorkflowSteps([]),
      color: 'bg-red-600 hover:bg-red-700'
    },
  ];

  // ChainBot Avatar Component
  const ChainBotAvatar = () => (
    <div className="relative">
      <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center transition-all duration-300 ${
        avatarState === 'thinking' ? 'animate-pulse' : 
        avatarState === 'building' ? 'animate-bounce' : ''
      }`}>
        <Brain className="w-8 h-8 text-white" />
      </div>
      
      {/* Status indicator */}
      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${
        avatarState === 'idle' ? 'bg-gray-500' :
        avatarState === 'thinking' ? 'bg-yellow-500 animate-pulse' :
        avatarState === 'building' ? 'bg-green-500' :
        'bg-purple-500'
      }`} />
      
      {/* Building animation */}
      {avatarState === 'building' && (
        <div className="absolute -top-2 -right-2">
          <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      {/* Main Workflow Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ChainBot Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#23232a] bg-[#101014]">
          <div className="flex items-center space-x-4">
            <ChainBotAvatar />
            <div>
              <h1 className="text-xl font-semibold text-white">ChainBot</h1>
              <p className="text-sm text-gray-400">Visual workflow builder with AI guidance</p>
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

        {/* Workflow Builder Area */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 relative">
            {/* Empty State */}
            {workflowSteps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-6">
                  <Brain className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-4">Build Your First Workflow!</h2>
                <p className="text-gray-400 mb-6 max-w-md">
                  ChainBot is here to help you create powerful automation workflows. 
                  Start by adding your first step or ask me for guidance.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => addWorkflowStep('input')}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Input Step</span>
                  </button>
                  <button
                    onClick={() => setShowTutorial(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Get Help</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Workflow Canvas */
              <div className="w-full h-full bg-[#0a0a0a] relative overflow-auto">
                <div className="p-8 min-w-full min-h-full">
                  {/* Grid background */}
                  <div className="absolute inset-0 opacity-5">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>
                  
                  {/* Workflow Steps */}
                  {workflowSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className="absolute bg-[#18181b] border border-[#23232a] rounded-lg p-4 shadow-lg cursor-move"
                      style={{
                        left: step.position.x,
                        top: step.position.y,
                        minWidth: '200px'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            step.type === 'input' ? 'bg-green-500' :
                            step.type === 'process' ? 'bg-blue-500' :
                            step.type === 'output' ? 'bg-purple-500' :
                            step.type === 'condition' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`} />
                          <span className="text-sm font-medium text-white">{step.name}</span>
                        </div>
                        <button
                          onClick={() => setWorkflowSteps(prev => prev.filter(s => s.id !== step.id))}
                          className="text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">{step.description}</p>
                      
                      {/* Connection point */}
                      {index < workflowSteps.length - 1 && (
                        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                          <ArrowRight className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* ChainBot Guidance Panel */}
          <div className="w-80 border-l border-[#23232a] bg-[#101014] flex flex-col">
            {/* Panel Header */}
            <div className="p-4 border-b border-[#23232a] bg-[#18181b]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">ChainBot Guidance</h3>
                <button
                  onClick={() => setShowTutorial(!showTutorial)}
                  className="text-gray-400 hover:text-white"
                >
                  {showTutorial ? '×' : '?'}
                </button>
              </div>
            </div>

            {/* Tutorial or Chat */}
            {showTutorial ? (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div className="bg-[#18181b] border border-[#23232a] rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Workflow Building Tips</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                      <li>• Start with an Input step to define your data source</li>
                      <li>• Add Process steps to transform and analyze data</li>
                      <li>• Use Condition steps for decision-making logic</li>
                      <li>• End with Output steps to save or display results</li>
                    </ul>
                  </div>
                  
                  <div className="bg-[#18181b] border border-[#23232a] rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['input', 'process', 'condition', 'output'].map(type => (
                        <button
                          key={type}
                          onClick={() => addWorkflowStep(type as WorkflowStep['type'])}
                          className="p-2 bg-[#23232a] text-white rounded text-sm hover:bg-[#2a2a2a] transition-colors"
                        >
                          Add {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Interface */
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(message => (
                    <div key={message.id} className="space-y-2">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="bg-[#18181b] border border-[#23232a] rounded-lg p-3">
                            <div className="text-sm text-gray-200">{message.content}</div>
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
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-white" />
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
                        placeholder="Ask ChainBot for workflow help..."
                        className="w-full p-2 bg-[#18181b] border border-[#23232a] rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-500 transition-colors"
                        rows={2}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isTyping}
                      className="flex-shrink-0 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChainBotWorkspace; 