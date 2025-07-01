import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Copy,
  Download,
  Upload,
  Settings,
  Sparkles,
  History,
  Command,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  timestamp: Date;
  status: 'success' | 'error' | 'running';
  duration?: number;
}

interface TerminalProps {
  className?: string;
  onCommand?: (command: string) => Promise<string>;
}

const Terminal: React.FC<TerminalProps> = ({
  className = '',
  onCommand
}) => {
  const [commands, setCommands] = useState<TerminalCommand[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [commands]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    const commandId = Date.now().toString();
    const newCommand: TerminalCommand = {
      id: commandId,
      command: cmd,
      output: '',
      timestamp: new Date(),
      status: 'running'
    };

    setCommands(prev => [...prev, newCommand]);
    setCommandHistory(prev => [...prev, cmd]);
    setCurrentCommand('');
    setIsRunning(true);

    try {
      let output = '';
      if (onCommand) {
        output = await onCommand(cmd);
      } else {
        // Mock command execution
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        output = `Command executed: ${cmd}\nStatus: Success\nTimestamp: ${new Date().toISOString()}`;
      }

      setCommands(prev => prev.map(c => 
        c.id === commandId 
          ? { ...c, output, status: 'success', duration: Date.now() - c.timestamp.getTime() }
          : c
      ));
    } catch (error) {
      setCommands(prev => prev.map(c => 
        c.id === commandId 
          ? { ...c, output: `Error: ${error}`, status: 'error', duration: Date.now() - c.timestamp.getTime() }
          : c
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(currentCommand);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    }
  };

  const clearTerminal = () => {
    setCommands([]);
  };

  const copyOutput = async () => {
    const output = commands.map(c => `$ ${c.command}\n${c.output}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(output);
    } catch (err) {
      console.error('Failed to copy output:', err);
    }
  };

  const getCommandSuggestions = async () => {
    try {
      const response = await fetch('/api/terminal/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: currentCommand,
          history: commandHistory.slice(-10)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setCurrentCommand(suggestion);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const getStatusIcon = (status: TerminalCommand['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    return `${duration}ms`;
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Terminal Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <TerminalIcon className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="font-semibold text-white">Terminal</h2>
            <p className="text-sm text-gray-400">Execute commands with AI assistance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            icon={<History className="w-4 h-4" />}
          >
            History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={getCommandSuggestions}
            icon={<Sparkles className="w-4 h-4" />}
          >
            AI Help
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyOutput}
            icon={<Copy className="w-4 h-4" />}
          >
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminal}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Clear
          </Button>
        </div>
      </motion.div>

      {/* Terminal Content */}
      <div className="flex-1 flex">
        {/* Main Terminal */}
        <div className="flex-1 flex flex-col">
          {/* Output Area */}
          <div 
            ref={outputRef}
            className="flex-1 bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-t-lg p-4 overflow-y-auto font-mono text-sm"
          >
            <AnimatePresence>
              {commands.map((cmd, index) => (
                <motion.div
                  key={cmd.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-4"
                >
                  {/* Command */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-400">$</span>
                    <span className="text-white">{cmd.command}</span>
                    {getStatusIcon(cmd.status)}
                    {cmd.duration && (
                      <span className="text-xs text-gray-500 ml-auto">
                        {formatDuration(cmd.duration)}
                      </span>
                    )}
                  </div>

                  {/* Output */}
                  {cmd.output && (
                    <div className="ml-4 p-3 bg-gray-800/50 rounded border-l-2 border-emerald-400/50">
                      <pre className="text-gray-300 whitespace-pre-wrap">{cmd.output}</pre>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Welcome Message */}
            {commands.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-400 text-center py-8"
              >
                <TerminalIcon className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
                <p>Welcome to ChainBot Terminal</p>
                <p className="text-sm">Type a command to get started</p>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-gray-800/30 backdrop-blur-sm border-t border-white/10 rounded-b-lg">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <span className="text-emerald-400 font-mono">$</span>
              <input
                ref={inputRef}
                type="text"
                value={currentCommand}
                onChange={(e) => setCurrentCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm"
                disabled={isRunning}
              />
              <Button
                type="submit"
                disabled={!currentCommand.trim() || isRunning}
                loading={isRunning}
                icon={<Play className="w-4 h-4" />}
              >
                Run
              </Button>
            </form>

            {/* Command Suggestions */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-3 space-y-2"
                >
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        variant="glass"
                        onClick={() => applySuggestion(suggestion)}
                        className="cursor-pointer hover:bg-white/10 transition-colors p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Command className="w-3 h-3 text-emerald-400" />
                          <span className="text-sm text-gray-300 font-mono">{suggestion}</span>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-80 bg-white/5 backdrop-blur-md border-l border-white/10 p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Command History
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {commandHistory.slice().reverse().map((cmd, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      variant="glass"
                      onClick={() => {
                        setCurrentCommand(cmd);
                        setShowHistory(false);
                        inputRef.current?.focus();
                      }}
                      className="cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white font-mono">{cmd}</span>
                          <Clock className="w-3 h-3 text-gray-500" />
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Terminal; 