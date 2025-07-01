import React, { useState, useCallback } from 'react';
import { MessageSquare, Code, Brain, Package, Search, Settings, Keyboard, Bot, Zap, Wrench, Users, ChevronRight, ChevronLeft } from 'lucide-react';
import { usePersistentMemory } from './hooks/usePersistentMemory';
import { PluginManager } from './components/PluginManager/PluginManager';
import { usePluginStore } from './stores/pluginStore';
import { MemoryManager } from './components/MemoryManager/MemoryManager';
import { AnalyticsProvider } from './contexts/AnalyticsContext';
import { ModelProvider } from './contexts/ModelContext';
import { PluginProvider, usePlugins } from './contexts/PluginContext';
import { WorkflowProvider } from './contexts/WorkflowContext';
import { SuggestionsProvider } from './contexts/SuggestionsContext';
import { PreferencesProvider, usePreferences } from './contexts/PreferencesContext';
import { useKeyboardShortcuts, type KeyboardShortcut } from './hooks/useKeyboardShortcuts';
import PreferencesPanel from './components/PreferencesPanel/PreferencesPanel';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp/KeyboardShortcutsHelp';
import CommandPaletteRoot from './components/CommandPalette/CommandPaletteRoot';

// New Agent Workspace Components
import ChatWorkspace from './components/workspaces/ChatWorkspace';
import DevBotWorkspace from './components/workspaces/DevBotWorkspace';
import ChainBotWorkspace from './components/workspaces/ChainBotWorkspace';
import HarryWorkspace from './components/workspaces/HarryWorkspace';
import SandboxWorkspace from './components/workspaces/SandboxWorkspace';

// New navigation structure
const NAVIGATION_TABS = [
  { 
    id: 'chat', 
    label: 'Chat', 
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Simple ChatGPT-style interface with model selection'
  },
  { 
    id: 'devbot', 
    label: 'DevBot', 
    icon: <Code className="w-5 h-5" />,
    description: 'Animated coding assistant with code editor'
  },
  { 
    id: 'chainbot', 
    label: 'ChainBot', 
    icon: <Brain className="w-5 h-5" />,
    description: 'Visual workflow builder with animated guidance'
  },
  { 
    id: 'harry', 
    label: 'Harry the Handyman', 
    icon: <Wrench className="w-5 h-5" />,
    description: 'Advanced coding and project management assistant'
  },
  { 
    id: 'sandbox', 
    label: 'Sandbox', 
    icon: <Zap className="w-5 h-5" />,
    description: 'Graphical AI agent chaining and experimentation'
  },
];

type Screen = 'chat' | 'devbot' | 'chainbot' | 'harry' | 'sandbox';

const AppContent: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('chat');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showPluginManager, setShowPluginManager] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { memoryStats } = usePersistentMemory();
  const { activePanels } = usePluginStore();
  const { plugins, enabled } = usePlugins();
  const { preferences } = usePreferences();

  // Initialize sidebar collapsed state from preferences
  React.useEffect(() => {
    setSidebarCollapsed(preferences.sidebarCollapsed);
  }, [preferences.sidebarCollapsed]);

  // Enhanced keyboard shortcuts for new navigation
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      action: () => setShowCommandPalette(true),
      description: 'Open Command Palette',
      category: 'navigation'
    },
    {
      key: 'Escape',
      action: () => {
        setShowCommandPalette(false);
        setShowPluginManager(false);
        setShowPreferences(false);
        setShowKeyboardHelp(false);
      },
      description: 'Close modals',
      category: 'navigation'
    },
    {
      key: 'b',
      ctrlKey: true,
      action: () => setSidebarCollapsed(!sidebarCollapsed),
      description: 'Toggle Sidebar',
      category: 'navigation'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => setActiveScreen('chat'),
      description: 'New Chat',
      category: 'actions'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        console.log('Save triggered');
      },
      description: 'Save',
      category: 'actions'
    },
    {
      key: '1',
      ctrlKey: true,
      action: () => setActiveScreen('chat'),
      description: 'Switch to Chat',
      category: 'navigation'
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => setActiveScreen('devbot'),
      description: 'Switch to DevBot',
      category: 'navigation'
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => setActiveScreen('chainbot'),
      description: 'Switch to ChainBot',
      category: 'navigation'
    },
    {
      key: '4',
      ctrlKey: true,
      action: () => setActiveScreen('harry'),
      description: 'Switch to Harry',
      category: 'navigation'
    },
    {
      key: '5',
      ctrlKey: true,
      action: () => setActiveScreen('sandbox'),
      description: 'Switch to Sandbox',
      category: 'navigation'
    },
    {
      key: ',',
      ctrlKey: true,
      action: () => setShowPreferences(true),
      description: 'Open Preferences',
      category: 'system'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => setShowPluginManager(true),
      description: 'Open Plugin Manager',
      category: 'tools'
    },
    {
      key: 'F1',
      action: () => setShowPreferences(true),
      description: 'Open Preferences',
      category: 'system'
    },
    {
      key: 'F2',
      action: () => setShowPluginManager(true),
      description: 'Open Plugin Manager',
      category: 'tools'
    },
    {
      key: '?',
      ctrlKey: true,
      action: () => setShowKeyboardHelp(true),
      description: 'Show Keyboard Shortcuts',
      category: 'system'
    }
  ];

  useKeyboardShortcuts({
    shortcuts,
    enabled: preferences.keyboardShortcutsEnabled
  });

  const handleCloseCommandPalette = useCallback(() => setShowCommandPalette(false), []);

  const handleSessionHandoff = useCallback((sessionData: any) => {
    console.log('Session handoff requested:', sessionData);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(sessionData, null, 2));
      alert('Session data copied to clipboard!');
    }
  }, []);

  // Global controls component to be used in each workspace
  const GlobalControls = () => (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setShowPreferences(true)}
        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white hover:bg-[#23232a] rounded transition-colors"
        title="Preferences (Ctrl+,)"
      >
        <Settings className="w-4 h-4" />
      </button>
      <button
        onClick={() => setShowKeyboardHelp(true)}
        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white hover:bg-[#23232a] rounded transition-colors"
        title="Keyboard Shortcuts (Ctrl+?)"
      >
        <Keyboard className="w-4 h-4" />
      </button>
      <button
        onClick={() => setShowPluginManager(true)}
        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white hover:bg-[#23232a] rounded transition-colors"
        title="Plugin Manager (Ctrl+P)"
      >
        <Package className="w-4 h-4" />
      </button>
      <button
        onClick={() => setShowCommandPalette(true)}
        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white hover:bg-[#23232a] rounded transition-colors"
        title="Command Palette (Ctrl+K)"
      >
        <Search className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="h-screen min-h-screen flex bg-black overflow-x-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col items-center py-4 border-r border-[#2a2b32] h-full transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-20'}`} style={{ background: '#202123' }}>
        <nav className="flex flex-col gap-2 w-full mt-2">
          {NAVIGATION_TABS.map(item => (
            <button
              key={item.id}
              className={`flex flex-col items-center justify-center w-12 h-12 mx-auto rounded-lg transition-colors duration-150 relative ${activeScreen === item.id ? 'chatgpt-sidebar-active text-white' : 'text-gray-400 hover:bg-[#2a2b32]'}`}
              onClick={() => setActiveScreen(item.id as Screen)}
              aria-label={item.label}
              title={item.description}
            >
              {item.icon}
            </button>
          ))}
          {/* Agents button replaces Tools/Plugin button */}
          <button
            className="flex flex-col items-center justify-center w-12 h-12 mx-auto rounded-lg transition-colors duration-150 relative text-gray-400 hover:bg-[#2a2b32] mt-4"
            aria-label="Agents"
            title="Manage Agents"
            // onClick handler for agents modal or navigation
          >
            <Users className="w-6 h-6" />
          </button>
        </nav>
        {/* Collapse/Expand button at the bottom */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mt-auto mb-2 p-2 rounded hover:bg-[#2a2b32] text-gray-400"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-h-0 p-0 bg-[#101014] overflow-x-hidden">
        {/* Workspace Content */}
        {activeScreen === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatWorkspace GlobalControls={GlobalControls} />
          </div>
        )}
        {activeScreen === 'devbot' && (
          <div className="flex-1 flex flex-col min-h-0">
            <DevBotWorkspace GlobalControls={GlobalControls} />
          </div>
        )}
        {activeScreen === 'chainbot' && (
          <div className="flex-1 flex flex-col min-h-0">
            <ChainBotWorkspace GlobalControls={GlobalControls} />
          </div>
        )}
        {activeScreen === 'harry' && (
          <div className="flex-1 flex flex-col min-h-0">
            <HarryWorkspace GlobalControls={GlobalControls} />
          </div>
        )}
        {activeScreen === 'sandbox' && (
          <div className="flex-1 flex flex-col min-h-0">
            <SandboxWorkspace GlobalControls={GlobalControls} />
          </div>
        )}

        {/* Plugin Panels (enabled) */}
        {plugins.filter(p => enabled[p.id] && p.renderPanel).map(p => (
          <div key={p.id} className="border-t border-gray-800 bg-[#18181b]">
            {p.renderPanel && p.renderPanel()}
          </div>
        ))}
      </main>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div onClick={handleCloseCommandPalette}>
          <CommandPaletteRoot />
        </div>
      )}

      {/* Plugin Manager Modal */}
      {showPluginManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#18181b] rounded-lg shadow-2xl max-w-2xl w-full relative">
            <button
              onClick={() => setShowPluginManager(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold px-2"
              title="Close"
            >
              ×
            </button>
            <PluginManager onClose={() => setShowPluginManager(false)} />
          </div>
        </div>
      )}

      {/* Preferences Panel */}
      <PreferencesPanel 
        isOpen={showPreferences} 
        onClose={() => setShowPreferences(false)} 
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        shortcuts={shortcuts}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <PreferencesProvider>
      <AnalyticsProvider>
        <ModelProvider>
          <PluginProvider>
            <WorkflowProvider>
              <SuggestionsProvider>
                <AppContent />
              </SuggestionsProvider>
            </WorkflowProvider>
          </PluginProvider>
        </ModelProvider>
      </AnalyticsProvider>
    </PreferencesProvider>
  );
};

export default App;

<style>{`
  .chatgpt-overlay {
    background-color: rgba(52, 53, 65, 0.92) !important;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.18);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .chatgpt-sidebar-active {
    background-color: rgba(52, 53, 65, 0.92) !important;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.18);
    /* No blur for sidebar button */
  }
`}</style>
