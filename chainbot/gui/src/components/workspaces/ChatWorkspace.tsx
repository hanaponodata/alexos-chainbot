import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Users } from 'lucide-react';

// Up arrow SVG for send button
const UpArrow = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="none" {...props}>
    <path d="M10 16V4M10 4L4 10M10 4l6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Example agent icon (can be swapped per agent)
const AgentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="none" {...props}>
    <circle cx="10" cy="7" r="4" fill="#6366f1" />
    <rect x="4" y="13" width="12" height="5" rx="2.5" fill="#6366f1" />
  </svg>
);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentType?: string; // for future agent icon switching
}

interface Model {
  id: string;
  name: string;
  provider: 'openai' | 'local' | 'anthropic';
  description: string;
}

interface ChatWorkspaceProps {
  GlobalControls: React.ComponentType;
}

const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({ GlobalControls }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model>({
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: 'Most capable model for complex tasks'
  });
  const [showModelSelector, setShowModelSelector] = useState(false);
  // Removed inputRows state as it's no longer needed with the new inline design
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const lastMessageWasUserRef = useRef(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [windowFocused, setWindowFocused] = useState(true);
  const [pseudoFocus, setPseudoFocus] = useState(true);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);

  // Available models
  const availableModels: Model[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      description: 'Most capable model for complex tasks'
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      description: 'Fast and efficient for most tasks'
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      description: 'Anthropic\'s most powerful model'
    },
    {
      id: 'llama-3-8b',
      name: 'Llama 3 8B',
      provider: 'local',
      description: 'Local model for privacy'
    },
    {
      id: 'mistral-7b',
      name: 'Mistral 7B',
      provider: 'local',
      description: 'Fast local model'
    }
  ];

  // 1. Add agent state and default agent list
  const defaultAgents = [
    { id: 'chainbot', name: 'ChainBot', icon: <AgentIcon /> },
    { id: 'devbot', name: 'DevBot', icon: <AgentIcon /> },
    { id: 'harry', name: 'Harry', icon: <AgentIcon /> },
  ];
  const [agents] = useState(defaultAgents);
  const [selectedAgent, setSelectedAgent] = useState(defaultAgents[0]);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    wasAtBottomRef.current = atBottom;
  }, [atBottom]);

  useEffect(() => {
    // Determine if the last message is from the user
    lastMessageWasUserRef.current = messages.length > 0 && messages[messages.length - 1].role === 'user';
    if ((lastMessageWasUserRef.current || wasAtBottomRef.current) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    // Use a 40px threshold for atBottom
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    // Clean up
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-expand textarea is now handled inline in the onInput event

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm using ${selectedModel.name} to help you. This is a simulated response. In the real implementation, this would be an actual API call to ${selectedModel.provider}.`,
        timestamp: new Date(),
        agentType: 'default'
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const greetings = [
    "What's on the agenda today?",
    "How can I help you today?",
    "What would you like to talk about?",
    "What can I do for you?",
    "How can I assist you?",
    "What's up?",
    "What are we working on today?",
    "Ready when you are!",
    "How can ChainBot help?"
  ];
  const [greeting, setGreeting] = useState(greetings[0]);

  useEffect(() => {
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    // Window focus/blur listeners
    const handleFocus = () => setWindowFocused(true);
    const handleBlur = () => setWindowFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Global keydown forwarding
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (
        windowFocused &&
        !inputFocused &&
        pseudoFocus &&
        textareaRef.current &&
        document.activeElement !== textareaRef.current &&
        !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
        e.key.length === 1 // only printable characters
      ) {
        e.preventDefault();
        textareaRef.current.focus();
        // Insert the character
        const val = textareaRef.current.value;
        const start = textareaRef.current.selectionStart || 0;
        const end = textareaRef.current.selectionEnd || 0;
        textareaRef.current.value = val.slice(0, start) + e.key + val.slice(end);
        setInputValue(textareaRef.current.value);
        // Move cursor
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);

    // Pseudo-focus logic
    const handleDocumentClick = (e: MouseEvent) => {
      if (inputBarRef.current && inputBarRef.current.contains(e.target as Node)) {
        setPseudoFocus(true);
      } else {
        setPseudoFocus(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleGlobalKeydown);
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [windowFocused, inputFocused, pseudoFocus]);

  useEffect(() => {
    if (prevMessagesLength.current === 0 && messages.length === 1 && textareaRef.current) {
      textareaRef.current.focus();
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  return (
    <main className="flex-1 flex flex-col h-full" style={{ minWidth: 0 }}>
      {/* Header */}
      <header className="flex items-center h-[56px] pl-24 pr-6" style={{ 
        background: 'transparent', 
        fontWeight: 600, 
        fontSize: '16px', 
        letterSpacing: '-0.5px', 
        fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 10
      }}>
        <div className="relative">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center text-white text-xl font-semibold focus:outline-none bg-transparent hover:text-blue-400 transition-colors"
            style={{ minHeight: '2.5rem', fontWeight: 500, fontSize: '18px', letterSpacing: '-0.5px' }}
          >
            <span>{selectedModel.name}</span>
            <ChevronDown className="w-5 h-5 ml-2 text-gray-400" />
          </button>
          {showModelSelector && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-[#202123] border border-[#40414f] rounded-lg shadow-xl z-50">
              <div className="p-2">
                {availableModels.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model);
                      setShowModelSelector(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedModel.id === model.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-[#343541]'}`}
                  >
                    <div className="font-medium text-lg">{model.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{model.description}</div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">{model.provider}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <GlobalControls />
        </div>
      </header>
      {/* Chat Area */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center" style={{ background: '#232324', minHeight: 0 }}>
          <div className="flex flex-col items-center w-full max-w-[820px] px-4">
            <div className="mb-8 text-2xl font-bold text-white text-center" style={{fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', letterSpacing: '-0.5px'}}>
              {greeting}
            </div>
            {/* Input Bar Centered */}
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full max-w-[820px]">
                <div className="gradient-line" style={{height: '2px', width: '100%', marginBottom: '3px'}}></div>
                <div className="relative flex flex-col chatgpt-overlay" ref={inputBarRef}>
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onFocus={() => { setInputFocused(true); setPseudoFocus(true); }}
                    onBlur={() => setInputFocused(false)}
                    placeholder="Ask ChainBot anything"
                    className="w-full resize-none focus:outline-none focus:ring-0 text-left transition-all bg-transparent"
                    style={{ 
                      minHeight: '72px', 
                      maxHeight: '240px', 
                      fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      lineHeight: '28px', 
                      color: '#ececf1', 
                      background: 'transparent', 
                      border: 'none', 
                      boxShadow: 'none', 
                      paddingTop: '14px', 
                      paddingBottom: '14px', 
                      paddingLeft: '24px', 
                      paddingRight: '24px', 
                      margin: 0, 
                      verticalAlign: 'top', 
                      overflow: 'hidden',
                      outline: 'none'
                    }}
                    onInput={e => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '72px';
                      target.style.height = Math.min(target.scrollHeight, 240) + 'px';
                    }}
                  />
                  {/* Blinking cursor for placeholder */}
                  {!inputValue && !inputFocused && windowFocused && pseudoFocus && (
                    <span style={{
                      position: 'absolute',
                      left: '40px', // aligns with placeholder text
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#ececf1',
                      zIndex: 2
                    }} className="blinking-cursor">|</span>
                  )}
                  <div className="flex flex-row items-end justify-between w-full px-2 pb-2" style={{minHeight: '32px'}}>
                    <div className="flex flex-row items-end gap-2">
                      <button
                        className="flex items-center justify-center rounded-full hover:bg-[#343541] transition-colors"
                        style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', padding: 0, color: '#ececf1' }}
                        aria-label="Add"
                        title="Add"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 6V18" stroke="#ececf1" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M6 12H18" stroke="#ececf1" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        className="flex items-center font-medium hover:bg-[#343541] rounded-lg px-2 py-1 transition-colors"
                        style={{ 
                          fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', 
                          fontSize: '14px', 
                          fontWeight: 500, 
                          color: '#ececf1', 
                          background: 'none', 
                          border: 'none', 
                          padding: '4px 8px', 
                          cursor: 'pointer', 
                          userSelect: 'none', 
                          height: '32px', 
                          lineHeight: '24px' 
                        }}
                        onClick={() => setShowAgentSelector(true)}
                        title="Select Agent"
                      >
                        <Users className="w-4 h-4 mr-1" /> Agents
                      </button>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className={`ml-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors ${inputValue.trim() && !isLoading ? 'bg-[#ececf1] hover:bg-[#ececf1] cursor-pointer' : 'bg-[#343541] cursor-not-allowed'}`}
                      aria-label="Send message"
                      style={{ border: 'none', boxShadow: 'none', padding: 0 }}
                    >
                      <UpArrow className="w-7 h-7" style={{ color: inputValue.trim() && !isLoading ? '#0a0a0a' : '#c5c5d2' }} />
                    </button>
                  </div>
                </div>
                <style>{`
                  textarea::placeholder {
                    font-size: 18px !important;
                    font-weight: 700 !important;
                    color: #ececf1 !important;
                    font-family: Inter, Segoe UI, system-ui, sans-serif !important;
                    line-height: 28px !important;
                  }
                  .blinking-cursor {
                    display: inline-block;
                    width: 1ch;
                    height: 1.2em;
                    background: none;
                    color: #ececf1;
                    font-weight: 700;
                    font-size: 18px;
                    animation: blink 1s steps(1) infinite;
                    vertical-align: middle;
                  }
                  @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                  }
                  .chatgpt-overlay {
                    background-color: rgba(52, 53, 64, 0.9) !important;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.25);
                  }
                  .sidebar-btn-active {
                    background-color: rgba(52, 53, 64, 0.9) !important;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.25);
                  }
                `}</style>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end px-0 py-0" style={{ overflow: 'hidden', background: '#232324' }}>
          <div className="flex-1 overflow-y-auto px-0 flex flex-col items-center pb-8" style={{ minHeight: 0, background: '#232324' }} ref={chatScrollRef}>
            <div className={`w-full max-w-[820px] flex flex-col gap-4${atBottom ? ' pt-8' : ''}`}>
              {messages.map(message => (
                message.role === 'user' ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="rounded-2xl px-5 py-3 text-base max-w-xl shadow-none whitespace-pre-wrap text-left chatgpt-overlay" style={{ borderRadius: '16px', fontSize: '16px', fontWeight: 700, color: '#ececf1', marginBottom: '2px', wordBreak: 'break-word', overflowWrap: 'break-word', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', background: '#444654' }}>
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start w-full justify-center">
                    <div className="text-[#ececf1] text-base w-full max-w-[820px] px-0 py-1" style={{ fontSize: '16px', fontWeight: 700, marginBottom: '2px', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', background: '#232324', borderRadius: '16px', padding: '12px 12px' }}>
                      {message.content}
                    </div>
                  </div>
                )
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Input Bar (ChatGPT style: textarea on top, controls on bottom row) */}
          <div className="w-full flex flex-col items-center mb-8">
            <div className="relative w-full max-w-[820px]">
              {/* Gradient line above input bar */}
              <div className="gradient-line" style={{height: '2px', width: '100%', marginBottom: '3px'}}></div>
              {/* Container with textarea on top, controls on bottom */}
              <div className="relative flex flex-col shadow-[0_2px_8px_0_rgba(0,0,0,0.08)]" style={{ 
                borderRadius: '28px', 
                boxSizing: 'border-box', 
                fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', 
                boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)', 
                background: '#40414F', 
                position: 'relative', 
                padding: 0,
                minHeight: '72px',
                marginTop: '0'
              }}>
                {/* Expanding textarea on top */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onFocus={() => { setInputFocused(true); setPseudoFocus(true); }}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Ask ChainBot anything"
                  className="w-full resize-none focus:outline-none focus:ring-0 text-left transition-all bg-transparent"
                  style={{ 
                    minHeight: '72px', 
                    maxHeight: '240px', 
                    fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', 
                    fontSize: '18px', 
                    fontWeight: 700, 
                    lineHeight: '28px', 
                    color: '#ececf1', 
                    background: 'transparent', 
                    border: 'none', 
                    boxShadow: 'none', 
                    paddingTop: '14px', 
                    paddingBottom: '14px', 
                    paddingLeft: '24px', 
                    paddingRight: '24px', 
                    margin: 0, 
                    verticalAlign: 'top', 
                    overflow: 'hidden',
                    outline: 'none'
                  }}
                  onInput={e => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '72px';
                    target.style.height = Math.min(target.scrollHeight, 240) + 'px';
                  }}
                />
                
                {/* Controls row on bottom */}
                <div className="flex flex-row items-end justify-between w-full px-2 pb-2" style={{minHeight: '32px'}}>
                  <div className="flex flex-row items-end gap-2">
                    {/* Plus button */}
                    <button
                      className="flex items-center justify-center rounded-full hover:bg-[#343541] transition-colors"
                      style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', padding: 0, color: '#ececf1' }}
                      aria-label="Add"
                      title="Add"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 6V18" stroke="#ececf1" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M6 12H18" stroke="#ececf1" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {/* Agents selector */}
                    <button
                      className="flex items-center font-medium hover:bg-[#343541] rounded-lg px-2 py-1 transition-colors"
                      style={{ 
                        fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        color: '#ececf1', 
                        background: 'none', 
                        border: 'none', 
                        padding: '4px 8px', 
                        cursor: 'pointer', 
                        userSelect: 'none', 
                        height: '32px', 
                        lineHeight: '24px' 
                      }}
                      onClick={() => setShowAgentSelector(true)}
                      title="Select Agent"
                    >
                      <Users className="w-4 h-4 mr-1" /> Agents
                    </button>
                  </div>
                  
                  {/* Send button on right */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className={`ml-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors ${inputValue.trim() && !isLoading ? 'bg-[#ececf1] hover:bg-[#ececf1] cursor-pointer' : 'bg-[#343541] cursor-not-allowed'}`}
                    aria-label="Send message"
                    style={{ border: 'none', boxShadow: 'none', padding: 0 }}
                  >
                    <UpArrow className="w-7 h-7" style={{ color: inputValue.trim() && !isLoading ? '#0a0a0a' : '#c5c5d2' }} />
                  </button>
                </div>
              </div>
              
              {/* Placeholder styles */}
              <style>{`
                textarea::placeholder {
                  font-size: 18px !important;
                  font-weight: 700 !important;
                  color: #ececf1 !important;
                  font-family: Inter, Segoe UI, system-ui, sans-serif !important;
                  line-height: 28px !important;
                }
              `}</style>
            </div>
          </div>
        </div>
      )}
      {showAgentSelector && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#202123] rounded-lg shadow-2xl p-6 min-w-[300px]">
            <div className="text-lg font-semibold text-white mb-4">Select an Agent</div>
            <div className="flex flex-col gap-2">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgent(agent);
                    setShowAgentSelector(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${selectedAgent.id === agent.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-[#343541]'}`}
                >
                  <AgentIcon className="w-5 h-5 mr-2" />
                  {agent.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ChatWorkspace;