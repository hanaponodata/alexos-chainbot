import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { mockFileTree } from '../../mocks/mockFileTree';
import { useEditorStore } from '../../stores/editorStore';
import { usePersistentMemory } from '../../hooks/usePersistentMemory';
import { useAgentStore } from '../../stores/agentStore';
import { 
  FileText, 
  Command, 
  Sparkles, 
  Search, 
  Code, 
  MessageSquare, 
  Zap,
  Brain,
  Settings,
  Palette,
  Users,
  Shield,
  Wrench,
  Palette as PaletteIcon,
  Package,
  Download
} from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileQuickOpen extends FileNode {
  path: string;
}

function flattenFiles(nodes: FileNode[], parentPath = ''): FileQuickOpen[] {
  let result: FileQuickOpen[] = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      result.push({ ...node, path: parentPath ? `${parentPath}/${node.name}` : node.name });
    } else if (node.type === 'folder' && node.children) {
      result = result.concat(flattenFiles(node.children, parentPath ? `${parentPath}/${node.name}` : node.name));
    }
  }
  return result;
}

const mockCommands = [
  { id: 'save-all', label: 'Save All Files', icon: FileText, category: 'file' },
  { id: 'close-all', label: 'Close All Tabs', icon: FileText, category: 'file' },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', icon: Settings, category: 'view' },
  { id: 'new-file', label: 'New File', icon: FileText, category: 'file' },
  { id: 'new-folder', label: 'New Folder', icon: FileText, category: 'file' },
  { id: 'ai-chat', label: 'Start AI Chat', icon: MessageSquare, category: 'ai' },
  { id: 'ai-generate', label: 'Generate Code with AI', icon: Sparkles, category: 'ai' },
  { id: 'ai-refactor', label: 'Refactor Current Code', icon: Code, category: 'ai' },
  { id: 'ai-explain', label: 'Explain Selected Code', icon: Brain, category: 'ai' },
  { id: 'ai-optimize', label: 'Optimize Performance', icon: Zap, category: 'ai' },
  { id: 'search-memory', label: 'Search Memory', icon: Search, category: 'ai' },
  { id: 'memory-dashboard', label: 'Open Memory Dashboard', icon: Brain, category: 'ai' },
  { id: 'change-theme', label: 'Change Theme', icon: PaletteIcon, category: 'preferences' },
  { id: 'harry-deploy', label: 'Harry: Deploy Application', icon: Wrench, category: 'agent' },
  { id: 'harry-build', label: 'Harry: Build Project', icon: Wrench, category: 'agent' },
  { id: 'harry-test', label: 'Harry: Run Tests', icon: Wrench, category: 'agent' },
  { id: 'laka-design', label: 'Laka: Apply Design System', icon: PaletteIcon, category: 'agent' },
  { id: 'laka-theme', label: 'Laka: Change Theme', icon: PaletteIcon, category: 'agent' },
  { id: 'laka-ui', label: 'Laka: Improve UI', icon: PaletteIcon, category: 'agent' },
  { id: 'devbot-generate', label: 'DevBot: Generate Code', icon: Code, category: 'agent' },
  { id: 'devbot-refactor', label: 'DevBot: Refactor Code', icon: Code, category: 'agent' },
  { id: 'devbot-docs', label: 'DevBot: Generate Docs', icon: Code, category: 'agent' },
  { id: 'guardbot-audit', label: 'GuardBot: Security Audit', icon: Shield, category: 'agent' },
  { id: 'guardbot-review', label: 'GuardBot: Code Review', icon: Shield, category: 'agent' },
  { id: 'agents-panel', label: 'Open Agent Control Panel', icon: Users, category: 'agent' },
  { id: 'self-build', label: 'Start Self-Build Workflow', icon: Zap, category: 'agent' },
  { id: 'plugin-manager', label: 'Open Plugin Manager', icon: Package, category: 'plugins' },
  { id: 'install-plugin', label: 'Install Plugin', icon: Download, category: 'plugins' },
  { id: 'manage-plugins', label: 'Manage Plugins', icon: Settings, category: 'plugins' },
];

const CommandPaletteRoot: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'files' | 'commands' | 'ai' | 'agents'>('files');
  const inputRef = useRef<HTMLInputElement>(null);
  const { openTabs, openFile, setActiveTab } = useEditorStore();
  const { searchMemory, memoryStats } = usePersistentMemory();
  const { executeAgentAction, agents } = useAgentStore();
  const files = flattenFiles(mockFileTree as FileNode[]);
  const fuseFiles = new Fuse(files, { keys: ['name', 'path'], threshold: 0.3 });
  const fuseCommands = new Fuse(mockCommands, { keys: ['label'], threshold: 0.3 });

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        setMode('files');
        setQuery('');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        setMode('commands');
        setQuery('');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        setMode('ai');
        setQuery('');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        setMode('agents');
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getResults = () => {
    if (mode === 'files') {
      return query.trim() ? fuseFiles.search(query.trim()).map(r => r.item) : files;
    } else if (mode === 'commands') {
      return query.trim() ? fuseCommands.search(query.trim()).map(r => r.item) : mockCommands;
    } else if (mode === 'ai') {
      // AI mode shows AI-specific commands and memory search results
      const aiCommands = mockCommands.filter(cmd => cmd.category === 'ai');
      const memoryResults = query.trim() ? searchMemory(query.trim()) : [];
      return {
        commands: query.trim() ? aiCommands.filter(cmd => 
          cmd.label.toLowerCase().includes(query.toLowerCase())
        ) : aiCommands,
        memory: memoryResults
      };
    } else if (mode === 'agents') {
      // Agent mode shows agent-specific commands
      const agentCommands = mockCommands.filter(cmd => cmd.category === 'agent');
      return query.trim() ? agentCommands.filter(cmd => 
        cmd.label.toLowerCase().includes(query.toLowerCase())
      ) : agentCommands;
    }
    return [];
  };

  const isFile = (item: any): item is FileQuickOpen => 'type' in item && (item.type === 'file') && 'path' in item;
  const isCommand = (item: any): item is { id: string; label: string; icon: any; category: string } => 'label' in item;
  const isAIResult = (item: any): item is { commands: any[]; memory: any[] } => 'commands' in item && 'memory' in item;

  const handleSelect = (item: any) => {
    if (isFile(item)) {
      const existing = openTabs.find(tab => tab.path === `/${item.id}`);
      if (existing) {
        setActiveTab(existing.id);
      } else {
        openFile({ id: item.id, name: item.name, path: `/${item.id}`, isDirty: false });
      }
      onClose?.();
    } else if (isCommand(item)) {
      handleCommand(item.id);
      onClose?.();
    }
  };

  const handleCommand = async (commandId: string) => {
    switch (commandId) {
      case 'ai-chat':
        // Navigate to chat tab
        window.location.hash = '#chat';
        break;
      case 'ai-generate':
        // Open code generation panel
        alert('Opening AI Code Generation Panel...');
        break;
      case 'ai-refactor':
        // Trigger refactor action
        alert('AI Refactor: Select code and right-click for refactor options');
        break;
      case 'ai-explain':
        // Trigger explain action
        alert('AI Explain: Select code and right-click for explain options');
        break;
      case 'ai-optimize':
        // Trigger optimize action
        alert('AI Optimize: Select code and right-click for optimize options');
        break;
      case 'search-memory':
        // Navigate to memory tab
        window.location.hash = '#memory';
        break;
      case 'memory-dashboard':
        // Navigate to memory dashboard
        window.location.hash = '#memory';
        break;
      // Agent commands
      case 'harry-deploy':
        await executeAgentAction('harry', {
          type: 'deploy',
          action: 'Deploy Application',
          description: 'Deploy the current application to production'
        });
        break;
      case 'harry-build':
        await executeAgentAction('harry', {
          type: 'deploy',
          action: 'Build Project',
          description: 'Build the current project'
        });
        break;
      case 'harry-test':
        await executeAgentAction('harry', {
          type: 'deploy',
          action: 'Run Tests',
          description: 'Run all tests in the project'
        });
        break;
      case 'laka-design':
        await executeAgentAction('laka', {
          type: 'design',
          action: 'Apply Design System',
          description: 'Apply the design system to the application'
        });
        break;
      case 'laka-theme':
        await executeAgentAction('laka', {
          type: 'design',
          action: 'Change Theme',
          description: 'Change the application theme'
        });
        break;
      case 'laka-ui':
        await executeAgentAction('laka', {
          type: 'design',
          action: 'Improve UI',
          description: 'Improve the user interface'
        });
        break;
      case 'devbot-generate':
        await executeAgentAction('devbot', {
          type: 'code',
          action: 'Generate Code',
          description: 'Generate code based on current context'
        });
        break;
      case 'devbot-refactor':
        await executeAgentAction('devbot', {
          type: 'code',
          action: 'Refactor Code',
          description: 'Refactor the current code'
        });
        break;
      case 'devbot-docs':
        await executeAgentAction('devbot', {
          type: 'documentation',
          action: 'Generate Documentation',
          description: 'Generate documentation for the project'
        });
        break;
      case 'guardbot-audit':
        await executeAgentAction('guardbot', {
          type: 'security',
          action: 'Security Audit',
          description: 'Perform a security audit'
        });
        break;
      case 'guardbot-review':
        await executeAgentAction('guardbot', {
          type: 'review',
          action: 'Code Review',
          description: 'Review the current code'
        });
        break;
      case 'agents-panel':
        // Navigate to agents tab
        window.location.hash = '#agents';
        break;
      case 'self-build':
        // Trigger self-build workflow
        alert('Starting Self-Build Workflow... This will orchestrate all agents to build and deploy the application.');
        break;
      default:
        alert(`Command: ${commandId} (mocked)`);
    }
  };

  const results = getResults();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50" onClick={onClose}>
      <div className="bg-glass rounded-xl shadow-xl p-4 min-w-[500px] max-w-2xl max-h-[600px] text-gray-300" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              className="flex-1 bg-transparent border-b border-gray-700 text-lg px-2 py-2 outline-none"
              placeholder={
                mode === 'files' ? 'Quick Open (Ctrl+P)' :
                mode === 'commands' ? 'Command Palette (Ctrl+K)' :
                mode === 'ai' ? 'AI Assistant (Ctrl+I)' :
                'Agents (Ctrl+J)'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          
          {/* Mode Toggle */}
          <div className="flex items-center space-x-1 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setMode('files')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                mode === 'files' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setMode('commands')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                mode === 'commands' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Commands
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                mode === 'ai' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              AI
            </button>
            <button
              onClick={() => setMode('agents')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                mode === 'agents' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Agents
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {mode === 'ai' && isAIResult(results) ? (
            <div className="space-y-4">
              {/* AI Commands */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center space-x-1">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Commands</span>
                </h3>
                {results.commands?.map((command: any, i: number) => (
                  <div
                    key={command.id}
                    className="px-3 py-2 rounded hover:bg-[#23232a] cursor-pointer flex items-center gap-2"
                    onClick={() => handleSelect(command)}
                  >
                    <command.icon className="w-4 h-4 text-blue-400" />
                    <span className="text-green-300">{command.label}</span>
                  </div>
                ))}
              </div>

              {/* Memory Results */}
              {results.memory && results.memory.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center space-x-1">
                    <Brain className="w-4 h-4" />
                    <span>Memory Search Results</span>
                  </h3>
                  {results.memory.map((result: any, i: number) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded hover:bg-[#23232a] cursor-pointer"
                    >
                      <div className="text-blue-300 font-medium">{result.context.title}</div>
                      <div className="text-xs text-gray-400">Relevance: {result.relevance}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : mode === 'agents' && Array.isArray(results) ? (
            <div className="space-y-4">
              {/* Agent Commands */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>Agent Commands</span>
                </h3>
                {results.map((command: any, i: number) => (
                  <div
                    key={command.id}
                    className="px-3 py-2 rounded hover:bg-[#23232a] cursor-pointer flex items-center gap-2"
                    onClick={() => handleSelect(command)}
                  >
                    <command.icon className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300">{command.label}</span>
                  </div>
                ))}
              </div>

              {/* Active Agents Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>Active Agents</span>
                </h3>
                {agents.filter(a => a.isActive).map((agent) => (
                  <div
                    key={agent.id}
                    className="px-3 py-2 rounded bg-gray-800/30 flex items-center gap-2"
                  >
                    <span className="text-lg">{agent.avatar}</span>
                    <div>
                      <div className="text-white font-medium">{agent.name}</div>
                      <div className="text-xs text-gray-400">{agent.role}</div>
                    </div>
                    <div className="ml-auto">
                      <div className="flex items-center space-x-1 text-xs text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Active</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : Array.isArray(results) ? (
            <>
              {results.length === 0 && <div className="text-gray-500 px-2 py-2">No results</div>}
              {results.map((item, i) => (
                <div
                  key={isFile(item) ? item.id : item.id}
                  className="px-3 py-2 rounded hover:bg-[#23232a] cursor-pointer flex items-center gap-2"
                  onClick={() => handleSelect(item)}
                >
                  {isFile(item) ? (
                    <>
                      <FileText className="w-4 h-4 text-blue-300" />
                      <span className="text-blue-300 font-mono text-sm">{item.path || item.name}</span>
                    </>
                  ) : isCommand(item) ? (
                    <>
                      <item.icon className="w-4 h-4 text-green-400" />
                      <span className="text-green-300">{item.label}</span>
                    </>
                  ) : null}
                </div>
              ))}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-700/50 text-xs text-gray-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>Ctrl+P: Files</span>
              <span>Ctrl+K: Commands</span>
              <span>Ctrl+I: AI</span>
              <span>Ctrl+J: Agents</span>
            </div>
            {mode === 'ai' && (
              <div className="flex items-center space-x-2">
                <Brain className="w-3 h-3" />
                <span>{memoryStats.totalContexts} contexts in memory</span>
              </div>
            )}
            {mode === 'agents' && (
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3" />
                <span>{agents.filter(a => a.isActive).length} agents active</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPaletteRoot;
