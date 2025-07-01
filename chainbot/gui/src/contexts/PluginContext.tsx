import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface Plugin {
  id: string;
  name: string;
  description: string;
  renderPanel?: () => React.ReactNode;
}

interface PluginContextType {
  plugins: Plugin[];
  enabled: Record<string, boolean>;
  togglePlugin: (id: string) => void;
}

const DEFAULT_PLUGINS: Plugin[] = [
  // Hello World plugin removed - no longer needed
];

const STORAGE_KEY = 'chainbot-enabled-plugins';

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plugins] = useState<Plugin[]>(DEFAULT_PLUGINS);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      // Remove hello-world from stored settings
      const { 'hello-world': _, ...cleanSettings } = parsed;
      return cleanSettings;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    // Remove hello-world from localStorage when saving
    const { 'hello-world': _, ...cleanEnabled } = enabled;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanEnabled));
  }, [enabled]);

  const togglePlugin = useCallback((id: string) => {
    setEnabled(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <PluginContext.Provider value={{ plugins, enabled, togglePlugin }}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = () => {
  const ctx = useContext(PluginContext);
  if (!ctx) throw new Error('usePlugins must be used within a PluginProvider');
  return ctx;
}; 