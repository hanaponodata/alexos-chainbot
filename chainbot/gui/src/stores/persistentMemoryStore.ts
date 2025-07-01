import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types for persistent memory
export interface MemoryContext {
  id: string;
  type: 'conversation' | 'code' | 'workflow' | 'system' | 'user_preference';
  title: string;
  content: any;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  priority: number; // 1-10, higher = more important
  accessCount: number;
  lastAccessed: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  contexts: MemoryContext[];
  metadata: {
    agentId?: string;
    projectId?: string;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    lastActivity: Date;
    sessionType: 'project' | 'global' | 'file' | 'workflow';
  };
  tags: string[];
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  timestamp: Date;
  metadata: {
    agentId?: string;
    contextIds?: string[];
    filePath?: string;
    lineNumber?: number;
    codeSnippet?: string;
  };
}

export interface MemorySearchResult {
  context: MemoryContext;
  relevance: number;
  matchedTerms: string[];
}

interface PersistentMemoryState {
  // Core memory storage
  contexts: MemoryContext[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  
  // Memory management
  maxContexts: number;
  maxSessions: number;
  memoryCleanupThreshold: number;
  
  // Actions
  createChatSession: (title: string, sessionType?: ChatSession['metadata']['sessionType']) => { sessionId: string };
  addMessageToSession: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  getSessionHistory: (sessionId: string) => ChatMessage[];
  addContext: (context: Omit<MemoryContext, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessed'>) => string;
  updateContext: (id: string, updates: Partial<MemoryContext>) => void;
  searchMemory: (query: string, limit?: number) => MemorySearchResult[];
  exportSessionData: (sessionId: string) => any;
  importSessionData: (data: any) => boolean;
  cleanupMemory: () => void;
  getActiveContexts: () => MemoryContext[];
  setActiveSession: (sessionId: string) => void;
  getSessionById: (sessionId: string) => ChatSession | null;
  deleteSession: (sessionId: string) => void;
  mergeSessions: (sourceId: string, targetId: string) => void;
}

// Helper function to generate unique IDs
const generateId = () => `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper function to calculate relevance score
const calculateRelevance = (context: MemoryContext, query: string): number => {
  const queryLower = query.toLowerCase();
  const titleMatch = context.title.toLowerCase().includes(queryLower) ? 3 : 0;
  const contentMatch = JSON.stringify(context.content).toLowerCase().includes(queryLower) ? 2 : 0;
  const tagMatch = context.tags.some(tag => tag.toLowerCase().includes(queryLower)) ? 1 : 0;
  const recencyBonus = Math.max(0, 10 - Math.floor((Date.now() - context.lastAccessed.getTime()) / (1000 * 60 * 60 * 24))); // Days since last access
  const priorityBonus = context.priority;
  
  return titleMatch + contentMatch + tagMatch + recencyBonus + priorityBonus;
};

export const usePersistentMemoryStore = create<PersistentMemoryState>()(
  persist(
    (set, get) => ({
      // Initial state
      contexts: [],
      sessions: [],
      activeSessionId: null,
      maxContexts: 1000,
      maxSessions: 50,
      memoryCleanupThreshold: 0.8,

      // Create a new chat session
      createChatSession: (title, sessionType = 'global') => {
        const sessionId = generateId();
        const newSession: ChatSession = {
          id: sessionId,
          title,
          messages: [],
          contexts: [],
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivity: new Date(),
            sessionType
          },
          tags: [],
          isActive: true
        };

        set(state => ({
          sessions: [...state.sessions, newSession],
          activeSessionId: sessionId
        }));

        return { sessionId };
      },

      // Add message to session
      addMessageToSession: (sessionId, messageData) => {
        const message: ChatMessage = {
          ...messageData,
          id: generateId(),
          timestamp: new Date()
        };

        set(state => ({
          sessions: state.sessions.map(session => 
            session.id === sessionId 
              ? {
                  ...session,
                  messages: [...session.messages, message],
                  metadata: {
                    ...session.metadata,
                    updatedAt: new Date(),
                    lastActivity: new Date()
                  }
                }
              : session
          )
        }));
      },

      // Get session history
      getSessionHistory: (sessionId) => {
        const session = get().sessions.find(s => s.id === sessionId);
        return session?.messages || [];
      },

      // Add context to memory
      addContext: (contextData) => {
        const contextId = generateId();
        const context: MemoryContext = {
          ...contextData,
          id: contextId,
          createdAt: new Date(),
          updatedAt: new Date(),
          accessCount: 0,
          lastAccessed: new Date()
        };

        set(state => {
          const newContexts = [...state.contexts, context];
          
          // Cleanup if we exceed max contexts
          if (newContexts.length > state.maxContexts) {
            // Remove least relevant contexts
            newContexts.sort((a, b) => 
              (b.priority + b.accessCount) - (a.priority + a.accessCount)
            );
            newContexts.splice(state.maxContexts);
          }
          
          return { contexts: newContexts };
        });

        return contextId;
      },

      // Update context
      updateContext: (id, updates) => {
        set(state => ({
          contexts: state.contexts.map(context =>
            context.id === id
              ? {
                  ...context,
                  ...updates,
                  updatedAt: new Date(),
                  lastAccessed: new Date(),
                  accessCount: context.accessCount + 1
                }
              : context
          )
        }));
      },

      // Search memory
      searchMemory: (query, limit = 10) => {
        const { contexts } = get();
        const results: MemorySearchResult[] = contexts
          .map(context => ({
            context,
            relevance: calculateRelevance(context, query),
            matchedTerms: query.toLowerCase().split(' ').filter(term => 
              context.title.toLowerCase().includes(term) ||
              context.tags.some(tag => tag.toLowerCase().includes(term))
            )
          }))
          .filter(result => result.relevance > 0)
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, limit);

        return results;
      },

      // Export session data
      exportSessionData: (sessionId) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (!session) return null;

        return {
          session,
          contexts: session.contexts,
          exportDate: new Date().toISOString(),
          version: '1.0'
        };
      },

      // Import session data
      importSessionData: (data) => {
        try {
          if (data.session) {
            const session: ChatSession = {
              ...data.session,
              id: generateId(), // Generate new ID to avoid conflicts
              metadata: {
                ...data.session.metadata,
                createdAt: new Date(data.session.metadata.createdAt),
                updatedAt: new Date(),
                lastActivity: new Date()
              }
            };

            set(state => ({
              sessions: [...state.sessions, session],
              activeSessionId: session.id
            }));

            // Import contexts if provided
            if (data.contexts && Array.isArray(data.contexts)) {
              data.contexts.forEach((contextData: any) => {
                get().addContext({
                  ...contextData,
                  id: generateId() // Generate new ID
                });
              });
            }

            return true;
          }
          return false;
        } catch (error) {
          console.error('Failed to import session data:', error);
          return false;
        }
      },

      // Cleanup memory
      cleanupMemory: () => {
        const { contexts, sessions, maxContexts, maxSessions } = get();
        
        // Cleanup old contexts
        const sortedContexts = [...contexts].sort((a, b) => 
          (b.priority + b.accessCount) - (a.priority + a.accessCount)
        );
        
        // Cleanup old sessions
        const sortedSessions = [...sessions].sort((a, b) => 
          new Date(b.metadata.lastActivity).getTime() - new Date(a.metadata.lastActivity).getTime()
        );

        set({
          contexts: sortedContexts.slice(0, maxContexts),
          sessions: sortedSessions.slice(0, maxSessions)
        });
      },

      // Get active contexts
      getActiveContexts: () => {
        const { contexts, activeSessionId, sessions } = get();
        const activeSession = sessions.find(s => s.id === activeSessionId);
        
        if (activeSession) {
          return contexts.filter(context => 
            activeSession.contexts.some(ctx => ctx.id === context.id)
          );
        }
        
        return contexts.filter(context => context.accessCount > 0);
      },

      // Set active session
      setActiveSession: (sessionId) => {
        set({ activeSessionId: sessionId });
      },

      // Get session by ID
      getSessionById: (sessionId) => {
        return get().sessions.find(s => s.id === sessionId) || null;
      },

      // Delete session
      deleteSession: (sessionId) => {
        set(state => ({
          sessions: state.sessions.filter(s => s.id !== sessionId),
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId
        }));
      },

      // Merge sessions
      mergeSessions: (sourceId, targetId) => {
        const { sessions } = get();
        const sourceSession = sessions.find(s => s.id === sourceId);
        const targetSession = sessions.find(s => s.id === targetId);

        if (!sourceSession || !targetSession) return;

        const mergedSession: ChatSession = {
          ...targetSession,
          messages: [...targetSession.messages, ...sourceSession.messages].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ),
          contexts: [...targetSession.contexts, ...sourceSession.contexts],
          tags: [...new Set([...targetSession.tags, ...sourceSession.tags])],
          metadata: {
            ...targetSession.metadata,
            updatedAt: new Date(),
            lastActivity: new Date()
          }
        };

        set(state => ({
          sessions: state.sessions
            .filter(s => s.id !== sourceId && s.id !== targetId)
            .concat(mergedSession),
          activeSessionId: targetId
        }));
      }
    }),
    {
      name: 'chainbot-persistent-memory',
      partialize: (state) => ({
        contexts: state.contexts,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        maxContexts: state.maxContexts,
        maxSessions: state.maxSessions
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Fix contexts
        if (Array.isArray(state.contexts)) {
          state.contexts = state.contexts.map(ctx => ({
            ...ctx,
            createdAt: new Date(ctx.createdAt),
            updatedAt: new Date(ctx.updatedAt),
            lastAccessed: new Date(ctx.lastAccessed),
          }));
        }
        // Fix sessions
        if (Array.isArray(state.sessions)) {
          state.sessions = state.sessions.map(session => ({
            ...session,
            metadata: {
              ...session.metadata,
              createdAt: new Date(session.metadata.createdAt),
              updatedAt: new Date(session.metadata.updatedAt),
              lastActivity: new Date(session.metadata.lastActivity),
            },
            messages: session.messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
            contexts: session.contexts.map(ctx => ({
              ...ctx,
              createdAt: new Date(ctx.createdAt),
              updatedAt: new Date(ctx.updatedAt),
              lastAccessed: new Date(ctx.lastAccessed),
            })),
          }));
        }
      },
    }
  )
);
