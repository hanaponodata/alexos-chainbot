import { useCallback, useMemo } from 'react';
import { usePersistentMemoryStore } from '../stores/persistentMemoryStore';
import type { 
  MemoryContext, 
  ChatSession, 
  ChatMessage, 
  MemorySearchResult 
} from '../stores/persistentMemoryStore';

export const usePersistentMemory = () => {
  const {
    contexts,
    sessions,
    activeSessionId,
    createChatSession,
    addMessageToSession,
    getSessionHistory,
    addContext,
    updateContext,
    searchMemory,
    exportSessionData,
    importSessionData,
    cleanupMemory,
    getActiveContexts,
    setActiveSession,
    getSessionById,
    deleteSession,
    mergeSessions
  } = usePersistentMemoryStore();

  // Computed values
  const activeContexts = useMemo(() => getActiveContexts(), [contexts, activeSessionId]);
  const activeSession = useMemo(() => 
    activeSessionId ? getSessionById(activeSessionId) : null, 
    [activeSessionId, sessions]
  );

  // Enhanced functions with better error handling and logging
  const createSession = useCallback((title: string, sessionType?: ChatSession['metadata']['sessionType']) => {
    console.log('Creating new chat session:', { title, sessionType });
    return createChatSession(title, sessionType);
  }, [createChatSession]);

  const addMessage = useCallback((sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    console.log('Adding message to session:', { sessionId, message });
    addMessageToSession(sessionId, message);
  }, [addMessageToSession]);

  const getHistory = useCallback((sessionId: string) => {
    return getSessionHistory(sessionId);
  }, [getSessionHistory]);

  const addMemoryContext = useCallback((context: Omit<MemoryContext, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessed'>) => {
    console.log('Adding memory context:', context);
    return addContext(context);
  }, [addContext]);

  const updateMemoryContext = useCallback((id: string, updates: Partial<MemoryContext>) => {
    console.log('Updating memory context:', { id, updates });
    updateContext(id, updates);
  }, [updateContext]);

  const search = useCallback((query: string, limit?: number) => {
    console.log('Searching memory:', { query, limit });
    return searchMemory(query, limit);
  }, [searchMemory]);

  const exportSession = useCallback((sessionId: string) => {
    console.log('Exporting session:', sessionId);
    return exportSessionData(sessionId);
  }, [exportSessionData]);

  const importSession = useCallback((data: any) => {
    console.log('Importing session data');
    return importSessionData(data);
  }, [importSessionData]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up memory');
    cleanupMemory();
  }, [cleanupMemory]);

  const setActive = useCallback((sessionId: string) => {
    console.log('Setting active session:', sessionId);
    setActiveSession(sessionId);
  }, [setActiveSession]);

  const getSession = useCallback((sessionId: string) => {
    return getSessionById(sessionId);
  }, [getSessionById]);

  const deleteSessionById = useCallback((sessionId: string) => {
    console.log('Deleting session:', sessionId);
    deleteSession(sessionId);
  }, [deleteSession]);

  const merge = useCallback((sourceId: string, targetId: string) => {
    console.log('Merging sessions:', { sourceId, targetId });
    mergeSessions(sourceId, targetId);
  }, [mergeSessions]);

  // Memory statistics
  const memoryStats = useMemo(() => ({
    totalContexts: contexts.length,
    totalSessions: sessions.length,
    activeContexts: activeContexts.length,
    activeSession: activeSession?.id || null,
    memoryUsage: Math.round((contexts.length / 1000) * 100), // Assuming max 1000 contexts
    oldestContext: contexts.length > 0 ? Math.min(...contexts.map(c => c.createdAt.getTime())) : null,
    newestContext: contexts.length > 0 ? Math.max(...contexts.map(c => c.createdAt.getTime())) : null
  }), [contexts, sessions, activeContexts, activeSession]);

  return {
    // Core functions
    createChatSession: createSession,
    addMessageToSession: addMessage,
    getSessionHistory: getHistory,
    addContext: addMemoryContext,
    updateContext: updateMemoryContext,
    searchMemory: search,
    exportSessionData: exportSession,
    importSessionData: importSession,
    cleanupMemory: cleanup,
    setActiveSession: setActive,
    getSessionById: getSession,
    deleteSession: deleteSessionById,
    mergeSessions: merge,

    // State
    activeSessionId,
    activeContexts,
    activeSession,
    contexts,
    sessions,

    // Statistics
    memoryStats
  };
};
