import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface UserPreferences {
  // Theme and appearance
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  
  // Layout preferences
  sidebarCollapsed: boolean;
  panelLayout: 'default' | 'compact' | 'expanded';
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  
  // Keyboard shortcuts
  keyboardShortcutsEnabled: boolean;
  customShortcuts: Record<string, string>;
  
  // Chat and AI preferences
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  autoScroll: boolean;
  showTimestamps: boolean;
  
  // Code editor preferences
  editorTheme: string;
  showLineNumbers: boolean;
  wordWrap: boolean;
  tabSize: number;
  insertSpaces: boolean;
  
  // Notifications
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  
  // Privacy and data
  analyticsEnabled: boolean;
  telemetryEnabled: boolean;
  autoUpdate: boolean;
  
  // Performance
  hardwareAcceleration: boolean;
  lowPowerMode: boolean;
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  accentColor: '#3b82f6',
  fontSize: 'medium',
  compactMode: false,
  sidebarCollapsed: false,
  panelLayout: 'default',
  autoSave: true,
  autoSaveInterval: 30,
  keyboardShortcutsEnabled: true,
  customShortcuts: {},
  defaultModel: 'gpt-4',
  maxTokens: 2048,
  temperature: 0.7,
  autoScroll: true,
  showTimestamps: true,
  editorTheme: 'vs-dark',
  showLineNumbers: true,
  wordWrap: true,
  tabSize: 2,
  insertSpaces: true,
  notificationsEnabled: true,
  soundEnabled: true,
  desktopNotifications: false,
  analyticsEnabled: true,
  telemetryEnabled: false,
  autoUpdate: true,
  hardwareAcceleration: true,
  lowPowerMode: false,
};

type PreferencesAction =
  | { type: 'UPDATE_PREFERENCE'; key: keyof UserPreferences; value: any }
  | { type: 'RESET_PREFERENCES' }
  | { type: 'LOAD_PREFERENCES'; preferences: Partial<UserPreferences> }
  | { type: 'RESET_TO_DEFAULT' };

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  resetPreferences: () => void;
  resetToDefault: () => void;
  exportPreferences: () => string;
  importPreferences: (jsonString: string) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const preferencesReducer = (state: UserPreferences, action: PreferencesAction): UserPreferences => {
  switch (action.type) {
    case 'UPDATE_PREFERENCE':
      return {
        ...state,
        [action.key]: action.value,
      };
    case 'RESET_PREFERENCES':
      return defaultPreferences;
    case 'LOAD_PREFERENCES':
      return {
        ...defaultPreferences,
        ...action.preferences,
      };
    case 'RESET_TO_DEFAULT':
      return defaultPreferences;
    default:
      return state;
  }
};

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preferences, dispatch] = useReducer(preferencesReducer, defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chainbot-preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_PREFERENCES', preferences: parsed });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('chainbot-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [preferences]);

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    dispatch({ type: 'UPDATE_PREFERENCE', key, value });
  };

  const resetPreferences = () => {
    dispatch({ type: 'RESET_PREFERENCES' });
  };

  const resetToDefault = () => {
    dispatch({ type: 'RESET_TO_DEFAULT' });
  };

  const exportPreferences = (): string => {
    return JSON.stringify(preferences, null, 2);
  };

  const importPreferences = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      dispatch({ type: 'LOAD_PREFERENCES', preferences: parsed });
    } catch (error) {
      console.error('Failed to import preferences:', error);
      throw new Error('Invalid preferences format');
    }
  };

  const value: PreferencesContextType = {
    preferences,
    updatePreference,
    resetPreferences,
    resetToDefault,
    exportPreferences,
    importPreferences,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}; 