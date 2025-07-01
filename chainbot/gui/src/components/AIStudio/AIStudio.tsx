import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Sparkles, 
  Code, 
  MessageSquare, 
  Lightbulb, 
  Zap, 
  Target, 
  Settings,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
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
  Clock
} from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import { usePersistentMemory } from '../../hooks/usePersistentMemory';

interface AIFeature {
  id: string;
  name: string;
  description: string;
  type: 'nlp' | 'codegen' | 'suggestion' | 'learning' | 'analysis';
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
  metadata?: any;
}

interface AISession {
  id: string;
  name: string;
  features: AIFeature[];
  context: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'paused' | 'completed';
}

interface CodeGenerationRequest {
  prompt: string;
  language: string;
  framework?: string;
  style?: string;
  complexity: 'simple' | 'medium' | 'complex';
  includeTests: boolean;
  includeDocs: boolean;
}

interface NLPAnalysis {
  intent: string;
  entities: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  suggestions: string[];
}

export const AIStudio: React.FC = () => {
  const [activeSession, setActiveSession] = useState<AISession | null>(null);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<AIFeature | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showCodeGen, setShowCodeGen] = useState(false);
  const [showNLPAnalysis, setShowNLPAnalysis] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [codeGenRequest, setCodeGenRequest] = useState<CodeGenerationRequest>({
    prompt: '',
    language: 'typescript',
    framework: 'react',
    style: 'functional',
    complexity: 'medium',
    includeTests: false,
    includeDocs: false
  });
  
  const [nlpInput, setNlpInput] = useState('');
  const [nlpResult, setNlpResult] = useState<NLPAnalysis | null>(null);

  const { agents } = useAgentStore();
  const { addContext } = usePersistentMemory();

  // Predefined AI features
  const availableFeatures: Omit<AIFeature, 'id' | 'status' | 'progress'>[] = [
    {
      name: 'Natural Language Processing',
      description: 'Analyze and understand natural language input',
      type: 'nlp',
      metadata: {
        capabilities: ['Intent Detection', 'Entity Extraction', 'Sentiment Analysis', 'Language Understanding']
      }
    },
    {
      name: 'Code Generation',
      description: 'Generate code based on natural language descriptions',
      type: 'codegen',
      metadata: {
        languages: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust'],
        frameworks: ['React', 'Vue', 'Angular', 'Node.js', 'Express']
      }
    },
    {
      name: 'Intelligent Suggestions',
      description: 'Provide context-aware suggestions and completions',
      type: 'suggestion',
      metadata: {
        contexts: ['Code', 'Documentation', 'Configuration', 'Workflow']
      }
    },
    {
      name: 'Learning System',
      description: 'Learn from user interactions and improve over time',
      type: 'learning',
      metadata: {
        learningTypes: ['Pattern Recognition', 'User Preference', 'Code Style', 'Workflow Optimization']
      }
    },
    {
      name: 'Code Analysis',
      description: 'Analyze code for improvements, bugs, and optimizations',
      type: 'analysis',
      metadata: {
        analysisTypes: ['Performance', 'Security', 'Best Practices', 'Refactoring']
      }
    }
  ];

  const createNewSession = (name: string, context: string) => {
    const session: AISession = {
      id: `session_${Date.now()}`,
      name,
      features: [],
      context,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    setSessions(prev => [session, ...prev]);
    setActiveSession(session);
    setShowCreateSession(false);
  };

  const addFeatureToSession = (sessionId: string, featureType: AIFeature['type']) => {
    const featureTemplate = availableFeatures.find(f => f.type === featureType);
    if (!featureTemplate) return;

    const feature: AIFeature = {
      ...featureTemplate,
      id: `feature_${Date.now()}`,
      status: 'idle',
      progress: 0
    };

    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, features: [...s.features, feature], updatedAt: new Date() }
        : s
    ));

    if (activeSession?.id === sessionId) {
      setActiveSession(prev => prev ? { ...prev, features: [...prev.features, feature], updatedAt: new Date() } : null);
    }
  };

  const executeFeature = async (sessionId: string, featureId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const feature = session?.features.find(f => f.id === featureId);
    if (!session || !feature) return;

    // Update feature status to running
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? {
            ...s,
            features: s.features.map(f => 
              f.id === featureId 
                ? { ...f, status: 'running', progress: 0 }
                : f
            )
          }
        : s
    ));

    setIsProcessing(true);

    try {
      // Simulate AI processing based on feature type
      switch (feature.type) {
        case 'nlp':
          await simulateNLPProcessing(sessionId, featureId);
          break;
        case 'codegen':
          await simulateCodeGeneration(sessionId, featureId);
          break;
        case 'suggestion':
          await simulateIntelligentSuggestions(sessionId, featureId);
          break;
        case 'learning':
          await simulateLearningSystem(sessionId, featureId);
          break;
        case 'analysis':
          await simulateCodeAnalysis(sessionId, featureId);
          break;
      }
    } catch (error) {
      // Handle error
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? {
              ...s,
              features: s.features.map(f => 
                f.id === featureId 
                  ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
                  : f
              )
            }
          : s
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateNLPProcessing = async (sessionId: string, featureId: string) => {
    const steps = [
      { progress: 20, message: 'Analyzing text structure...' },
      { progress: 40, message: 'Detecting intent and entities...' },
      { progress: 60, message: 'Performing sentiment analysis...' },
      { progress: 80, message: 'Generating suggestions...' },
      { progress: 100, message: 'NLP analysis complete!' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? {
              ...s,
              features: s.features.map(f => 
                f.id === featureId 
                  ? { ...f, progress: step.progress }
                  : f
              )
            }
          : s
      ));
    }

    // Complete the feature
    const result = {
      intent: 'code_generation',
      entities: ['React component', 'TypeScript', 'functional'],
      sentiment: 'positive' as const,
      confidence: 0.92,
      suggestions: [
        'Generate a React functional component',
        'Add TypeScript interfaces',
        'Include proper error handling'
      ]
    };

    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? {
            ...s,
            features: s.features.map(f => 
              f.id === featureId 
                ? { ...f, status: 'completed', progress: 100, result }
                : f
            )
          }
        : s
    ));
  };

  const simulateCodeGeneration = async (sessionId: string, featureId: string) => {
    const steps = [
      { progress: 15, message: 'Understanding requirements...' },
      { progress: 30, message: 'Analyzing context and patterns...' },
      { progress: 50, message: 'Generating code structure...' },
      { progress: 70, message: 'Adding implementation details...' },
      { progress: 85, message: 'Optimizing and refactoring...' },
      { progress: 100, message: 'Code generation complete!' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? {
              ...s,
              features: s.features.map(f => 
                f.id === featureId 
                  ? { ...f, progress: step.progress }
                  : f
              )
            }
          : s
      ));
    }

    // Generate sample code
    const result = {
      code: `import React, { useState, useEffect } from 'react';

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId);
  }, [userId]);

  const fetchUser = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(\`/api/users/\${id}\`);
      if (!response.ok) throw new Error('Failed to fetch user');
      
      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    onUpdate?.(updatedUser);
  };

  if (loading) return <div>Loading user profile...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      {user.avatar && <img src={user.avatar} alt={user.name} />}
    </div>
  );
};`,
      language: 'typescript',
      framework: 'react',
      complexity: 'medium',
      includes: ['TypeScript', 'React Hooks', 'Error Handling', 'Loading States']
    };

    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? {
            ...s,
            features: s.features.map(f => 
              f.id === featureId 
                ? { ...f, status: 'completed', progress: 100, result }
                : f
            )
          }
        : s
    ));
  };

  const simulateIntelligentSuggestions = async (sessionId: string, featureId: string) => {
    const steps = [
      { progress: 25, message: 'Analyzing current context...' },
      { progress: 50, message: 'Searching relevant patterns...' },
      { progress: 75, message: 'Generating suggestions...' },
      { progress: 100, message: 'Suggestions ready!' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? {
              ...s,
              features: s.features.map(f => 
                f.id === featureId 
                  ? { ...f, progress: step.progress }
                  : f
              )
            }
          : s
      ));
    }

    const result = {
      suggestions: [
        'Consider adding error boundaries for better error handling',
        'Use React.memo for performance optimization',
        'Add PropTypes or TypeScript for type safety',
        'Implement loading states for better UX',
        'Add unit tests for component logic'
      ],
      context: 'React component development',
      confidence: 0.88
    };

    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? {
            ...s,
            features: s.features.map(f => 
              f.id === featureId 
                ? { ...f, status: 'completed', progress: 100, result }
                : f
            )
          }
        : s
    ));
  };

  const simulateLearningSystem = async (sessionId: string, featureId: string) => {
    const steps = [
      { progress: 20, message: 'Analyzing user patterns...' },
      { progress: 40, message: 'Identifying preferences...' },
      { progress: 60, message: 'Updating knowledge base...' },
      { progress: 80, message: 'Optimizing suggestions...' },
      { progress: 100, message: 'Learning complete!' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 700));
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? {
              ...s,
              features: s.features.map(f => 
                f.id === featureId 
                  ? { ...f, progress: step.progress }
                  : f
              )
            }
          : s
      ));
    }

    const result = {
      patterns: [
        'Prefers functional components over class components',
        'Uses TypeScript for type safety',
        'Implements error boundaries consistently',
        'Follows consistent naming conventions'
      ],
      improvements: [
        'Code generation accuracy improved by 15%',
        'Suggestion relevance increased by 22%',
        'User satisfaction score: 4.8/5'
      ],
      nextActions: [
        'Continue learning from user interactions',
        'Adapt to new coding patterns',
        'Optimize for React 18 features'
      ]
    };

    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? {
            ...s,
            features: s.features.map(f => 
              f.id === featureId 
                ? { ...f, status: 'completed', progress: 100, result }
                : f
            )
          }
        : s
    ));
  };

  const simulateCodeAnalysis = async (sessionId: string, featureId: string) => {
    const steps = [
      { progress: 15, message: 'Parsing code structure...' },
      { progress: 30, message: 'Analyzing performance patterns...' },
      { progress: 50, message: 'Checking security vulnerabilities...' },
      { progress: 70, message: 'Identifying best practices...' },
      { progress: 85, message: 'Generating recommendations...' },
      { progress: 100, message: 'Analysis complete!' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 900));
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? {
              ...s,
              features: s.features.map(f => 
                f.id === featureId 
                  ? { ...f, progress: step.progress }
                  : f
              )
            }
          : s
      ));
    }

    const result = {
      score: 85,
      issues: [
        { type: 'performance', severity: 'medium', message: 'Consider using React.memo for expensive components' },
        { type: 'security', severity: 'low', message: 'Validate user input before processing' },
        { type: 'best-practice', severity: 'low', message: 'Add PropTypes or TypeScript interfaces' }
      ],
      recommendations: [
        'Implement code splitting for better performance',
        'Add comprehensive error handling',
        'Use React DevTools for debugging',
        'Consider implementing unit tests'
      ],
      metrics: {
        complexity: 'Low',
        maintainability: 'High',
        testability: 'Medium',
        performance: 'Good'
      }
    };

    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? {
            ...s,
            features: s.features.map(f => 
              f.id === featureId 
                ? { ...f, status: 'completed', progress: 100, result }
                : f
            )
          }
        : s
    ));
  };

  const getFeatureIcon = (type: AIFeature['type']) => {
    switch (type) {
      case 'nlp':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'codegen':
        return <Code className="w-4 h-4 text-green-400" />;
      case 'suggestion':
        return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      case 'learning':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'analysis':
        return <BarChart3 className="w-4 h-4 text-red-400" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AIFeature['status']) => {
    switch (status) {
      case 'running':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: AIFeature['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Play className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-[#1a1a1e] border border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 bg-[#18181b] border-b border-gray-800 px-4">
        <div className="flex items-center space-x-3">
          <Brain className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">AI Studio</h2>
          {activeSession && (
            <span className="text-sm text-gray-400">
              ({activeSession.features.length} features)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateSession(true)}
            className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-white">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sessions Sidebar */}
        <div className="w-80 border-r border-gray-800 bg-[#18181b] flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-sm font-medium text-white mb-2">AI Sessions</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSession(session)}
                className={`p-3 cursor-pointer border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                  activeSession?.id === session.id ? 'bg-purple-600/20 border-purple-600/50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">{session.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    session.status === 'active' ? 'bg-green-600/20 text-green-400' :
                    session.status === 'paused' ? 'bg-yellow-600/20 text-yellow-400' :
                    'bg-gray-600/20 text-gray-400'
                  }`}>
                    {session.status}
                  </span>
                </div>
                
                <p className="text-xs text-gray-400 mb-2">{session.context}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{session.features.length} features</span>
                  <span>{session.updatedAt.toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeSession ? (
            <>
              {/* Session Header */}
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{activeSession.name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowCodeGen(true)}
                      className="flex items-center space-x-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                    >
                      <Code className="w-4 h-4" />
                      <span>Code Gen</span>
                    </button>
                    <button
                      onClick={() => setShowNLPAnalysis(true)}
                      className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>NLP</span>
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-400 mb-3">{activeSession.context}</p>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{activeSession.features.length} features</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      {activeSession.updatedAt.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Available Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableFeatures.map((feature) => (
                      <div
                        key={feature.type}
                        className="p-3 border border-gray-700 rounded-lg hover:border-purple-600/50 transition-colors cursor-pointer bg-gray-800/30"
                        onClick={() => addFeatureToSession(activeSession.id, feature.type)}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          {getFeatureIcon(feature.type)}
                          <h5 className="text-sm font-medium text-white">{feature.name}</h5>
                        </div>
                        <p className="text-xs text-gray-400">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Session Features</h4>
                  <div className="space-y-3">
                    {activeSession.features.map((feature) => (
                      <div
                        key={feature.id}
                        className="p-4 border border-gray-700 rounded-lg bg-gray-800/30"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {getFeatureIcon(feature.type)}
                            <div>
                              <h5 className="text-sm font-medium text-white">{feature.name}</h5>
                              <p className="text-xs text-gray-400">{feature.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(feature.status)}
                            <button
                              onClick={() => executeFeature(activeSession.id, feature.id)}
                              disabled={feature.status === 'running' || isProcessing}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {feature.status === 'running' ? 'Running...' : 'Execute'}
                            </button>
                          </div>
                        </div>
                        
                        {feature.status === 'running' && (
                          <div className="mb-3">
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${feature.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{feature.progress}% complete</p>
                          </div>
                        )}
                        
                        {feature.status === 'completed' && feature.result && (
                          <div className="mt-3 p-3 bg-gray-700/50 rounded border border-gray-600">
                            <h6 className="text-sm font-medium text-white mb-2">Result:</h6>
                            <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                              {JSON.stringify(feature.result, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {feature.status === 'error' && feature.error && (
                          <div className="mt-3 p-3 bg-red-600/20 border border-red-600/50 rounded">
                            <p className="text-xs text-red-400">Error: {feature.error}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Active Session</h3>
                <p className="text-gray-400 mb-4">Create a new AI session to start exploring advanced AI features</p>
                <button
                  onClick={() => setShowCreateSession(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                >
                  Create New Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1e] border border-gray-800 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Create AI Session</h3>
              <button
                onClick={() => setShowCreateSession(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Session Name
                </label>
                <input
                  type="text"
                  placeholder="Enter session name..."
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Context
                </label>
                <textarea
                  placeholder="Describe what you want to accomplish..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowCreateSession(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createNewSession('New AI Session', 'Exploring advanced AI features')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                >
                  Create Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 