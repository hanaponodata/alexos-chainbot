import React, { createContext, useContext, useState, useCallback } from 'react';

export interface PluginLogEntry {
  plugin: string;
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: Date;
}

interface PluginLogContextType {
  logs: PluginLogEntry[];
  addLog: (plugin: string, level: PluginLogEntry['level'], message: string) => void;
  clearLogs: (plugin?: string) => void;
}

const PluginLogContext = createContext<PluginLogContextType | undefined>(undefined);

export const PluginLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<PluginLogEntry[]>([]);

  const addLog = useCallback((plugin: string, level: PluginLogEntry['level'], message: string) => {
    setLogs(prev => [
      ...prev,
      { plugin, level, message, timestamp: new Date() }
    ]);
  }, []);

  const clearLogs = useCallback((plugin?: string) => {
    setLogs(prev => plugin ? prev.filter(l => l.plugin !== plugin) : []);
  }, []);

  return (
    <PluginLogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </PluginLogContext.Provider>
  );
};

export const usePluginLogs = () => {
  const ctx = useContext(PluginLogContext);
  if (!ctx) throw new Error('usePluginLogs must be used within a PluginLogProvider');
  return ctx;
}; 