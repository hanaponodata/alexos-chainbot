import React, { useState, useRef, useEffect } from 'react';
import type { OnMount } from '@monaco-editor/react';
import { 
  Split as SplitIcon, 
  Lightbulb, 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  GitBranch, 
  GitCommit,
  Zap,
  Brain,
  Code,
  Search,
  Terminal
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import { mockFileContents, mockAISuggestions, mockErrorDiagnostics, mockDecorations } from '../../mocks/editorData';
import { mockGitData } from '../../mocks/gitData';
import { useEditorStore } from '../../stores/editorStore';
import { usePersistentMemory } from '../../hooks/usePersistentMemory';
import { usePluginStore } from '../../stores/pluginStore';
import ChatGPTStyleChat from '../ChatGPTStyleChat';
import { AIGhostText } from './AIGhostText';
import { CodeGenerationPanel } from './CodeGenerationPanel';
import { AICodeActions } from './AICodeActions';
import { TerminalPanel } from '../Plugins/TerminalPanel';
import { GitPanel } from '../Plugins/GitPanel';
import { useAgentStore } from '../../stores/agentStore';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import { useModel } from '../../contexts/ModelContext';

// TODO: Review all Monaco editor options for future extensibility and plugin support

const mockCommitSuggestions = [
  'feat: add AI-powered error analysis and diagnostics',
  'fix: resolve React component naming convention issues',
  'refactor: improve code structure with AI suggestions',
  'docs: update component documentation with AI insights'
];

const EditorPane: React.FC<{
  openTabs: any[];
  activeTabId: string | null;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  setTabDirty: (id: string, dirty: boolean) => void;
  onSave: (id: string) => void;
  showSaved: boolean;
  showChatPanel: boolean;
  onToggleChat: () => void;
  onSendToChat: (context: any) => void;
  chatContext: any;
  setChatContext: (context: any) => void;
  showGitPanel: boolean;
  onToggleGit: () => void;
  onShowCodeGeneration: () => void;
  onShowAIActions: (context: any) => void;
}> = ({ 
  openTabs, 
  activeTabId, 
  setActiveTab, 
  closeTab, 
  setTabDirty, 
  onSave, 
  showSaved, 
  showChatPanel, 
  onToggleChat, 
  onSendToChat, 
  chatContext, 
  setChatContext, 
  showGitPanel, 
  onToggleGit,
  onShowCodeGeneration,
  onShowAIActions
}) => {
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; line: number; selection?: string } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [currentPosition, setCurrentPosition] = useState({ line: 1, column: 1 });
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const { addContext } = usePersistentMemory();

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Add mock decorations
    editor.deltaDecorations([], mockDecorations.map((d: any) => ({ ...d, options: { ...d.options, glyphMarginHoverMessage: { value: 'Mock marker' } } })));
    
    // Right-click context menu
    editor.onContextMenu(e => {
      const selection = editor.getSelection();
      const selectedText = selection ? editor.getModel()?.getValueInRange(selection) : '';
      setContextMenu({ 
        x: e.event.browserEvent.clientX, 
        y: e.event.browserEvent.clientY, 
        line: e.target.position?.lineNumber || 1,
        selection: selectedText
      });
      e.event.preventDefault();
    });

    // Track cursor position for AI features
    editor.onDidChangeCursorPosition(e => {
      setCurrentPosition({ line: e.position.lineNumber, column: e.position.column });
    });

    // AI-powered IntelliSense
    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (model, position) => {
        const suggestions = mockAISuggestions[activeTab?.path || ''] || [];
        return {
          suggestions: suggestions.map((s: any) => ({
            ...s,
            kind: monaco.languages.CompletionItemKind[s.kind.toUpperCase() as keyof typeof monaco.languages.CompletionItemKind] || monaco.languages.CompletionItemKind.Text,
            insertTextRules: s.insertText.includes('\n') ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            }
          }))
        };
      }
    });

    // AI-powered hover provider
    monaco.languages.registerHoverProvider('typescript', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (word) {
          const suggestions = mockAISuggestions[activeTab?.path || ''] || [];
          const suggestion = suggestions.find((s: any) => s.label.toLowerCase().includes(word.word.toLowerCase()));
          if (suggestion) {
            return {
              contents: [
                { value: `**${suggestion.label}** (${suggestion.detail})` },
                { value: suggestion.documentation }
              ]
            };
          }
        }
        return null;
      }
    });

    // AI-powered hover for diagnostics and errors
    monaco.languages.registerHoverProvider('typescript', {
      provideHover: (model, position) => {
        // Check for AI diagnostics first
        const diagnostics = mockErrorDiagnostics[activeTab?.path || ''] || [];
        const diagnostic = diagnostics.find((d: any) => 
          position.lineNumber >= d.range.startLineNumber && 
          position.lineNumber <= d.range.endLineNumber &&
          position.column >= d.range.startColumn && 
          position.column <= d.range.endColumn
        );
        
        if (diagnostic) {
          return {
            contents: [
              { value: `**🤖 AI Analysis: ${diagnostic.message}**` },
              { value: `**Explanation:** ${diagnostic.aiExplanation}` },
              { value: `**Fix:** ${diagnostic.aiFix}` },
              { value: `**Code:** \`\`\`typescript\n${diagnostic.aiCode}\n\`\`\`` }
            ]
          };
        }

        // Check for AI suggestions
        const word = model.getWordAtPosition(position);
        if (word) {
          const suggestions = mockAISuggestions[activeTab?.path || ''] || [];
          const suggestion = suggestions.find((s: any) => s.label.toLowerCase().includes(word.word.toLowerCase()));
          if (suggestion) {
            return {
              contents: [
                { value: `**${suggestion.label}** (${suggestion.detail})` },
                { value: suggestion.documentation }
              ]
            };
          }
        }
        return null;
      }
    });
  };

  const handleAskAgent = () => {
    if (contextMenu && activeTab) {
      onShowAIActions({
        selectedCode: contextMenu.selection || '',
        filePath: activeTab.path,
        lineNumber: contextMenu.line
      });
    }
    setContextMenu(null);
  };

  const handleSendToChat = () => {
    if (contextMenu && activeTab) {
      const context = {
        filePath: activeTab.path,
        fileName: activeTab.name,
        lineNumber: contextMenu.line,
        selectedText: contextMenu.selection || '',
        fullContent: editorRef.current?.getValue() || '',
        language: activeTab.name.endsWith('.css') ? 'css' : 'typescript'
      };
      onSendToChat(context);
    }
    setContextMenu(null);
  };

  const handleInsertCode = (code: string, position: { line: number; column: number }) => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      const insertPosition = model.getPositionAt(model.getOffsetAt({ lineNumber: position.line, column: position.column }));
      model.pushEditOperations(
        [],
        [{ range: { startLineNumber: position.line, endLineNumber: position.line, startColumn: position.column, endColumn: position.column }, text: code }],
        () => null
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-glass border-l border-[#23232a] first:border-l-0 relative">
      {/* AI Toolbar */}
      <div className="flex items-center h-8 bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 px-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={onShowCodeGeneration}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600/50 hover:bg-blue-600 text-white rounded transition-colors"
            title="Generate Code with AI"
          >
            <Sparkles className="w-3 h-3" />
            <span>Generate</span>
          </button>
          <button
            onClick={() => onShowAIActions({
              selectedCode: editorRef.current?.getSelection() ? editorRef.current.getModel()?.getValueInRange(editorRef.current.getSelection()) : '',
              filePath: activeTab?.path || '',
              lineNumber: currentPosition.line
            })}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-600/50 hover:bg-green-600 text-white rounded transition-colors"
            title="AI Code Actions"
          >
            <Brain className="w-3 h-3" />
            <span>AI Actions</span>
          </button>
          <button
            onClick={() => onToggleChat()}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-600/50 hover:bg-purple-600 text-white rounded transition-colors"
            title="AI Chat"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center h-10 bg-[#18181b] border-b border-[#23232a]">
        {openTabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center px-4 h-full cursor-pointer border-r border-[#23232a] transition-colors ${activeTabId === tab.id ? 'bg-[#23232a] text-white' : 'text-gray-400 hover:bg-[#23232a]'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="mr-2 flex items-center">
              {tab.name}
              {tab.isDirty && <span className="ml-1 text-red-400">•</span>}
            </span>
            {activeTabId === tab.id && tab.isDirty && (
              <button
                className="ml-1 px-2 py-0.5 text-xs rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors"
                onClick={e => { e.stopPropagation(); onSave(tab.id); }}
                title="Save (Cmd/Ctrl+S)"
              >
                Save
              </button>
            )}
            <button
              className="ml-1 text-gray-500 hover:text-red-400"
              onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
              title="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <MonacoEditor
          height="100%"
          language={activeTab?.name.endsWith('.css') ? 'css' : 'typescript'}
          value={activeTab ? mockFileContents[activeTab.path] || '// Start coding here...' : ''}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            hover: { enabled: true },
            contextmenu: true,
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 20,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'all',
            selectOnLineNumbers: true,
            readOnly: false,
            cursorStyle: 'line',
            theme: 'vs-dark'
          }}
        />

        {/* AI Ghost Text Component */}
        {editorRef.current && monacoRef.current && activeTab && (
          <AIGhostText
            editor={editorRef.current}
            monaco={monacoRef.current}
            filePath={activeTab.path}
            currentLine={currentPosition.line}
            currentColumn={currentPosition.column}
          />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl py-1 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700/50">
            AI Actions for selected code
          </div>
          <button
            onClick={handleAskAgent}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800/50 flex items-center space-x-2"
          >
            <Brain className="w-4 h-4 text-blue-400" />
            <span>Ask AI Assistant</span>
          </button>
          <button
            onClick={handleSendToChat}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800/50 flex items-center space-x-2"
          >
            <MessageSquare className="w-4 h-4 text-green-400" />
            <span>Send to Chat</span>
          </button>
          <button
            onClick={() => setContextMenu(null)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800/50 flex items-center space-x-2"
          >
            <X className="w-4 h-4 text-gray-400" />
            <span>Cancel</span>
          </button>
        </div>
      )}
    </div>
  );
};

const CodeEditorRoot: React.FC = () => {
  const { openTabs, activeTabId, setActiveTab, openFile, closeTab, setTabDirty } = useEditorStore();
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [showTerminalPanel, setShowTerminalPanel] = useState(false);
  const [showCodeGeneration, setShowCodeGeneration] = useState(false);
  const [showAIActions, setShowAIActions] = useState(false);
  const [aiActionsContext, setAIActionsContext] = useState<any>(null);
  const [chatContext, setChatContext] = useState<any>(null);
  const [splits, setSplits] = useState([{ id: 0, tabId: activeTabId }]);
  const { addContext } = usePersistentMemory();
  const { activePanels } = usePluginStore();
  const { executeAgentAction } = useAgentStore();
  const { trackEvent, trackAudit } = useAnalytics();
  const { models, currentModel, setModel } = useModel();
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Add type for tab parameter
  type TabType = typeof openTabs[0];

  const handleSplit = () => {
    setSplits(prev => [...prev, { id: Date.now(), tabId: activeTabId }]);
    trackEvent('editor_split');
  };

  const handleTabOpen = (tab: TabType) => {
    setActiveTab(tab.id);
    trackEvent('tab_opened', { file: tab.name });
  };

  const handleTabClose = (tab: TabType) => {
    closeTab(tab.id);
    trackEvent('tab_closed', { file: tab.name });
  };

  const handleSave = (id: string) => {
    setTabDirty(id, false);
    // Mock save feedback
    setTimeout(() => {
      // Save feedback would go here
    }, 1000);
  };

  const handleSendToChat = (context: any) => {
    setChatContext(context);
    setShowChatOverlay(true);
    
    // Add to memory
    addContext({
      type: 'conversation',
      title: `Chat Context: ${context.fileName}`,
      content: {
        filePath: context.filePath,
        lineNumber: context.lineNumber,
        selectedText: context.selectedText,
        language: context.language
      },
      metadata: {
        contextType: 'chat_context',
        filePath: context.filePath
      },
      tags: ['chat', 'code-context'],
      priority: 6
    });
  };

  const handleShowCodeGeneration = () => {
    setShowCodeGeneration(true);
  };

  const handleShowAIActions = (context: any) => {
    setAIActionsContext(context);
    setShowAIActions(true);
  };

  const handleGitOperation = async (operation: string) => {
    // Execute Git operations through Harry (DevOps agent)
    await executeAgentAction('harry', {
      type: 'deploy',
      action: operation,
      description: `Perform Git operation: ${operation}`,
      context: {
        files: openTabs.map(tab => tab.path),
        activeFile: activeTabId ? openTabs.find(t => t.id === activeTabId)?.path : null
      }
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeTabId) handleSave(activeTabId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        handleSplit();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        handleShowCodeGeneration();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId]);

  const setActiveTabForSplit = (splitIdx: number, tabId: string) => {
    setSplits(prev => prev.map((split, idx) => 
      idx === splitIdx ? { ...split, tabId } : split
    ));
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    if (showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);

  // Track model switch
  const handleModelSwitch = (modelId: string) => {
    if (modelId !== currentModel.id) {
      trackAudit('model_switch', { from: currentModel.id, to: modelId });
      setModel(modelId);
    }
    setShowModelDropdown(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Toolbar */}
      <div className="flex items-center h-10 bg-[#18181b] border-b border-[#23232a] px-3 justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSplit}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            title="Split Editor (Ctrl+\)"
          >
            <SplitIcon className="w-3 h-3" />
            <span>Split</span>
          </button>
          <button
            onClick={() => setShowGitPanel(!showGitPanel)}
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors ${
              showGitPanel 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title="Toggle Git Panel"
          >
            <GitBranch className="w-3 h-3" />
            <span>Git</span>
          </button>
          <button
            onClick={() => setShowTerminalPanel(!showTerminalPanel)}
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors ${
              showTerminalPanel 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title="Toggle Terminal Panel"
          >
            <Terminal className="w-3 h-3" />
            <span>Terminal</span>
          </button>
          {/* Model Selector Button */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModelDropdown(v => !v)}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors border border-gray-700"
              title="Select AI Model"
              aria-haspopup="listbox"
              aria-expanded={showModelDropdown}
            >
              <span className="font-semibold">{currentModel.name}</span>
              <span className="text-xs text-gray-400">({currentModel.provider})</span>
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showModelDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-[#23232a] border border-gray-700 rounded shadow-lg z-50">
                <ul className="py-1" role="listbox">
                  {models.map(model => (
                    <li
                      key={model.id}
                      role="option"
                      aria-selected={model.id === currentModel.id}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-800 ${model.id === currentModel.id ? 'bg-blue-900 text-blue-300' : 'text-white'}`}
                      onClick={() => handleModelSwitch(model.id)}
                    >
                      <div className="font-semibold">{model.name} <span className="text-xs text-gray-400">({model.provider})</span></div>
                      <div className="text-xs text-gray-400">{model.description}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Chat Button */}
          <button
            onClick={() => { setShowChatOverlay(true); trackEvent('chat_opened', { source: 'code_editor' }); trackAudit('chat_opened', { source: 'code_editor' }); }}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-600/80 hover:bg-purple-700 text-white rounded transition-colors"
            title="Open Chat"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {splits.length === 1 ? (
            <EditorPane
              openTabs={openTabs}
              activeTabId={activeTabId}
              setActiveTab={setActiveTab}
              closeTab={closeTab}
              setTabDirty={setTabDirty}
              onSave={handleSave}
              showSaved={false}
              showChatPanel={false}
              onToggleChat={() => {}}
              onSendToChat={handleSendToChat}
              chatContext={chatContext}
              setChatContext={setChatContext}
              showGitPanel={showGitPanel}
              onToggleGit={() => setShowGitPanel(!showGitPanel)}
              onShowCodeGeneration={handleShowCodeGeneration}
              onShowAIActions={handleShowAIActions}
            />
          ) : (
            <div className="flex-1 flex">
              {splits.map((split, idx) => (
                <div key={split.id} className="flex-1 flex flex-col border-r border-[#23232a] last:border-r-0">
                  <EditorPane
                    openTabs={openTabs}
                    activeTabId={split.tabId}
                    setActiveTab={(tabId) => setActiveTabForSplit(idx, tabId)}
                    closeTab={closeTab}
                    setTabDirty={setTabDirty}
                    onSave={handleSave}
                    showSaved={false}
                    showChatPanel={false}
                    onToggleChat={() => {}}
                    onSendToChat={handleSendToChat}
                    chatContext={chatContext}
                    setChatContext={setChatContext}
                    showGitPanel={false}
                    onToggleGit={() => {}}
                    onShowCodeGeneration={handleShowCodeGeneration}
                    onShowAIActions={handleShowAIActions}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Git Panel */}
        {showGitPanel && (
          <div className="w-80 bg-glass border-l border-[#23232a]">
            <GitPanel />
          </div>
        )}
      </div>

      {/* Terminal Panel */}
      {showTerminalPanel && (
        <div className="h-64 border-t border-gray-800">
          <TerminalPanel />
        </div>
      )}

      {/* Chat Overlay */}
      {showChatOverlay && (
        <div className="absolute top-0 left-0 w-full h-full z-50 bg-black/80 flex flex-col">
          <div className="flex justify-end p-4">
            <button
              onClick={() => { setShowChatOverlay(false); trackEvent('chat_closed', { source: 'code_editor' }); trackAudit('chat_closed', { source: 'code_editor' }); }}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
              title="Close Chat"
            >
              Close ✕
            </button>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <ChatGPTStyleChat />
          </div>
        </div>
      )}

      {/* AI Modals */}
      {showCodeGeneration && (
        <CodeGenerationPanel
          onInsertCode={(code, position) => {
            // Handle code insertion
            setShowCodeGeneration(false);
          }}
          filePath={activeTabId ? openTabs.find(t => t.id === activeTabId)?.path || '' : ''}
          currentLine={1}
          currentColumn={1}
          onClose={() => setShowCodeGeneration(false)}
        />
      )}

      {showAIActions && aiActionsContext && (
        <AICodeActions
          selectedCode={aiActionsContext.selectedCode}
          filePath={aiActionsContext.filePath}
          lineNumber={aiActionsContext.lineNumber}
          onApplyChanges={(newCode) => {
            // Handle code changes
            setShowAIActions(false);
          }}
          onClose={() => setShowAIActions(false)}
          position={{ x: 100, y: 100 }}
        />
      )}
    </div>
  );
};

export default CodeEditorRoot;
