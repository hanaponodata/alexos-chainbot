import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Play, Square, Trash2, Download, Upload, Settings, Maximize2, Minimize2 } from 'lucide-react';

interface TerminalPanelProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

interface TerminalSession {
  id: string;
  name: string;
  active: boolean;
  history: string[];
  currentCommand: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ 
  onClose, 
  onMinimize, 
  onMaximize 
}) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: '1',
      name: 'Terminal 1',
      active: true,
      history: ['Welcome to ChainBot Terminal!', 'Type "help" for available commands.'],
      currentCommand: ''
    }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState('1');
  const [isMaximized, setIsMaximized] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Mock command execution
  const executeCommand = async (command: string) => {
    if (!currentSession) return;

    const newHistory = [...currentSession.history, `$ ${command}`];
    
    // Mock command responses
    let response = '';
    switch (command.toLowerCase()) {
      case 'help':
        response = `Available commands:
- ls: List files
- pwd: Show current directory
- npm run dev: Start development server
- git status: Show git status
- clear: Clear terminal
- help: Show this help`;
        break;
      case 'ls':
        response = `src/
├── components/
├── stores/
├── hooks/
└── App.tsx
package.json
README.md`;
        break;
      case 'pwd':
        response = '/Users/alex/Documents/alexos/alexos-chainbot/chainbot/gui';
        break;
      case 'npm run dev':
        response = `> gui@0.0.0 dev
> vite

  VITE v5.4.19  ready in 133 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://10.42.69.147:5173/`;
        break;
      case 'git status':
        response = `On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   src/App.tsx
        modified:   src/components/CodeEditor/CodeEditorRoot.tsx

no changes added to commit (use "git add" and/or "git commit -a")`;
        break;
      case 'clear':
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, history: [], currentCommand: '' }
            : s
        ));
        return;
      default:
        response = `Command not found: ${command}. Type "help" for available commands.`;
    }

    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { 
            ...s, 
            history: [...newHistory, response],
            currentCommand: ''
          }
        : s
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSession?.currentCommand.trim()) {
      executeCommand(currentSession.currentCommand.trim());
    }
  };

  const addSession = () => {
    const newId = (sessions.length + 1).toString();
    const newSession: TerminalSession = {
      id: newId,
      name: `Terminal ${newId}`,
      active: false,
      history: ['New terminal session created.'],
      currentCommand: ''
    };
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newId);
  };

  const removeSession = (sessionId: string) => {
    if (sessions.length > 1) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(sessions[0].id);
      }
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    onMaximize?.();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentSessionId]);

  return (
    <div className={`bg-[#0a0a0a] border border-gray-800 flex flex-col ${isMaximized ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between h-8 bg-[#1a1a1a] border-b border-gray-800 px-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm text-white font-medium">Terminal</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Session Tabs */}
          <div className="flex items-center space-x-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={`flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors ${
                  currentSessionId === session.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>{session.name}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSession(session.id);
                    }}
                    className="ml-1 text-gray-500 hover:text-red-400"
                  >
                    ×
                  </button>
                )}
              </button>
            ))}
            <button
              onClick={addSession}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white"
              title="New Terminal"
            >
              +
            </button>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={handleMaximize}
              className="p-1 text-gray-400 hover:text-white"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="p-1 text-gray-400 hover:text-white"
                title="Minimize"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-red-400 hover:text-red-300"
                title="Close"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Terminal Output */}
        <div 
          ref={terminalRef}
          className="flex-1 p-3 overflow-y-auto font-mono text-sm"
          style={{ backgroundColor: '#0a0a0a', color: '#00ff00' }}
        >
          {currentSession?.history.map((line, index) => (
            <div key={index} className="mb-1">
              {line}
            </div>
          ))}
          {currentSession && (
            <form onSubmit={handleSubmit} className="flex items-center">
              <span className="text-green-400 mr-2">$</span>
              <input
                ref={inputRef}
                type="text"
                value={currentSession.currentCommand}
                onChange={(e) => setSessions(prev => prev.map(s => 
                  s.id === currentSessionId 
                    ? { ...s, currentCommand: e.target.value }
                    : s
                ))}
                className="flex-1 bg-transparent outline-none text-green-400 caret-green-400"
                placeholder="Enter command..."
                autoFocus
              />
            </form>
          )}
        </div>

        {/* Terminal Toolbar */}
        <div className="flex items-center justify-between h-8 bg-[#1a1a1a] border-t border-gray-800 px-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => currentSession && executeCommand('clear')}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
            <button
              onClick={() => currentSession && executeCommand('npm run dev')}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
            >
              <Play className="w-3 h-3" />
              <span>Dev Server</span>
            </button>
            <button
              onClick={() => currentSession && executeCommand('git status')}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
            >
              <span>Git Status</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>ChainBot Terminal v1.0.0</span>
            <button
              className="p-1 text-gray-400 hover:text-white"
              title="Terminal Settings"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 