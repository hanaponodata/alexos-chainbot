import React, { useState, useEffect, useRef } from 'react';
import { 
  Code, 
  Sparkles, 
  Lightbulb, 
  Zap, 
  Target, 
  Settings,
  Play,
  Pause,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit,
  Copy,
  Star,
  History,
  TrendingUp,
  BarChart3,
  Cpu,
  Database,
  Network,
  Shield,
  Palette,
  Wrench,
  Clock,
  MessageSquare,
  Brain,
  FileText,
  GitBranch,
  Terminal
} from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import { usePersistentMemory } from '../../hooks/usePersistentMemory';

interface CodeSuggestion {
  id: string;
  type: 'completion' | 'snippet' | 'refactor' | 'optimization' | 'fix';
  content: string;
  description: string;
  confidence: number;
  context: string;
  language: string;
  tags: string[];
  metadata?: any;
}

interface CompletionContext {
  currentFile: string;
  currentLine: number;
  currentColumn: number;
  surroundingCode: string;
  imports: string[];
  variables: string[];
  functions: string[];
  projectStructure: string[];
}

interface AISuggestion {
  id: string;
  suggestion: string;
  explanation: string;
  confidence: number;
  type: 'completion' | 'refactor' | 'optimization' | 'best-practice';
  priority: 'low' | 'medium' | 'high';
  context: CompletionContext;
}

export const AICodeCompletion: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<CodeSuggestion | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [completionMode, setCompletionMode] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced');
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [contextWindow, setContextWindow] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [currentContext, setCurrentContext] = useState<CompletionContext>({
    currentFile: 'example.tsx',
    currentLine: 15,
    currentColumn: 25,
    surroundingCode: '',
    imports: ['react', 'useState', 'useEffect'],
    variables: ['user', 'loading', 'error'],
    functions: ['fetchUser', 'handleUpdate'],
    projectStructure: ['src/', 'components/', 'hooks/', 'utils/']
  });

  const { agents } = useAgentStore();
  const { addContext } = usePersistentMemory();

  // Simulate AI code completion
  const generateSuggestions = async (context: CompletionContext) => {
    setIsProcessing(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockSuggestions: CodeSuggestion[] = [
      {
        id: 'suggestion_1',
        type: 'completion',
        content: 'useState<User | null>(null)',
        description: 'Complete useState hook with proper typing',
        confidence: 0.95,
        context: 'React component state management',
        language: 'typescript',
        tags: ['react', 'typescript', 'state']
      },
      {
        id: 'suggestion_2',
        type: 'snippet',
        content: `const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);`,
        description: 'Common loading and error state pattern',
        confidence: 0.88,
        context: 'React component with async operations',
        language: 'typescript',
        tags: ['react', 'typescript', 'loading', 'error']
      },
      {
        id: 'suggestion_3',
        type: 'refactor',
        content: 'React.memo(UserProfile)',
        description: 'Optimize component with React.memo',
        confidence: 0.82,
        context: 'Performance optimization',
        language: 'typescript',
        tags: ['react', 'performance', 'optimization']
      },
      {
        id: 'suggestion_4',
        type: 'optimization',
        content: 'useCallback(() => fetchUser(userId), [userId])',
        description: 'Memoize function to prevent unnecessary re-renders',
        confidence: 0.78,
        context: 'React performance optimization',
        language: 'typescript',
        tags: ['react', 'useCallback', 'performance']
      },
      {
        id: 'suggestion_5',
        type: 'fix',
        content: 'if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);',
        description: 'Add proper error handling for fetch requests',
        confidence: 0.92,
        context: 'Error handling in async operations',
        language: 'typescript',
        tags: ['error-handling', 'fetch', 'async']
      }
    ];

    setSuggestions(mockSuggestions);
    setIsProcessing(false);
  };

  // Apply suggestion
  const applySuggestion = (suggestion: CodeSuggestion) => {
    // Simulate applying the suggestion
    console.log('Applying suggestion:', suggestion);
    
    // Add to memory for learning
    addContext({
      type: 'code',
      title: `Applied Code Suggestion: ${suggestion.description}`,
      content: {
        suggestion: suggestion.content,
        context: suggestion.context,
        language: suggestion.language,
        confidence: suggestion.confidence
      },
      metadata: {
        contextType: 'ai_code_completion',
        suggestionType: suggestion.type,
        language: suggestion.language
      },
      tags: ['ai-completion', 'code', ...suggestion.tags],
      priority: 6
    });

    setActiveSuggestion(null);
  };

  // Get suggestion icon
  const getSuggestionIcon = (type: CodeSuggestion['type']) => {
    switch (type) {
      case 'completion':
        return <Code className="w-4 h-4 text-blue-400" />;
      case 'snippet':
        return <FileText className="w-4 h-4 text-green-400" />;
      case 'refactor':
        return <Wrench className="w-4 h-4 text-yellow-400" />;
      case 'optimization':
        return <Zap className="w-4 h-4 text-purple-400" />;
      case 'fix':
        return <Shield className="w-4 h-4 text-red-400" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Simulate context change
  useEffect(() => {
    if (isEnabled && currentContext.surroundingCode) {
      generateSuggestions(currentContext);
    }
  }, [currentContext, isEnabled]);

  return (
    <div className="bg-[#1a1a1e] border border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 bg-[#18181b] border-b border-gray-800 px-4">
        <div className="flex items-center space-x-3">
          <Code className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">AI Code Completion</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">
              {isEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
              isEnabled 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isEnabled ? 'Disable' : 'Enable'}</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Context Panel */}
        <div className="w-80 border-r border-gray-800 bg-[#18181b] flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-sm font-medium text-white mb-2">Current Context</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-4">
              {/* File Info */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">File</h4>
                <div className="p-2 bg-gray-800/50 rounded text-xs text-gray-300">
                  {currentContext.currentFile}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Line {currentContext.currentLine}, Column {currentContext.currentColumn}
                </div>
              </div>

              {/* Imports */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Imports</h4>
                <div className="space-y-1">
                  {currentContext.imports.map((imp, index) => (
                    <div key={index} className="px-2 py-1 bg-gray-800/50 rounded text-xs text-gray-300">
                      {imp}
                    </div>
                  ))}
                </div>
              </div>

              {/* Variables */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Variables</h4>
                <div className="space-y-1">
                  {currentContext.variables.map((var_, index) => (
                    <div key={index} className="px-2 py-1 bg-blue-600/20 rounded text-xs text-blue-300">
                      {var_}
                    </div>
                  ))}
                </div>
              </div>

              {/* Functions */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Functions</h4>
                <div className="space-y-1">
                  {currentContext.functions.map((func, index) => (
                    <div key={index} className="px-2 py-1 bg-green-600/20 rounded text-xs text-green-300">
                      {func}
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Structure */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Project Structure</h4>
                <div className="space-y-1">
                  {currentContext.projectStructure.map((item, index) => (
                    <div key={index} className="px-2 py-1 bg-gray-800/50 rounded text-xs text-gray-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">AI Suggestions</h3>
              {isProcessing && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{suggestions.length} suggestions</span>
              </div>
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">Learning: {learningEnabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      activeSuggestion?.id === suggestion.id 
                        ? 'border-purple-600/50 bg-purple-600/10' 
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                    onClick={() => setActiveSuggestion(suggestion)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getSuggestionIcon(suggestion.type)}
                        <div>
                          <h4 className="text-sm font-medium text-white">{suggestion.description}</h4>
                          <p className="text-xs text-gray-400">{suggestion.context}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            applySuggestion(suggestion);
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <pre className="text-xs text-gray-300 bg-gray-900/50 p-3 rounded border border-gray-700 overflow-x-auto">
                        <code>{suggestion.content}</code>
                      </pre>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{suggestion.language}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500 capitalize">{suggestion.type}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {suggestion.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {suggestion.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded">
                            +{suggestion.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Suggestions</h3>
                  <p className="text-gray-400 mb-4">
                    {isEnabled 
                      ? 'Start typing to get AI-powered code suggestions' 
                      : 'Enable AI completion to get suggestions'
                    }
                  </p>
                  {!isEnabled && (
                    <button
                      onClick={() => setIsEnabled(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    >
                      Enable AI Completion
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1e] border border-gray-800 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">AI Completion Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Completion Mode
                </label>
                <select
                  value={completionMode}
                  onChange={(e) => setCompletionMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Context Window (lines)
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={contextWindow}
                  onChange={(e) => setContextWindow(parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{contextWindow} lines</span>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Enable Learning
                </label>
                <button
                  onClick={() => setLearningEnabled(!learningEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    learningEnabled ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      learningEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 