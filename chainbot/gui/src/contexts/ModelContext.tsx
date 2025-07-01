import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

interface ModelContextType {
  models: AIModel[];
  currentModel: AIModel;
  setModel: (id: string) => void;
}

const DEFAULT_MODELS: AIModel[] = [
  { id: 'openai-gpt-4', name: 'GPT-4', provider: 'OpenAI', description: 'OpenAI GPT-4 (cloud)' },
  { id: 'openai-gpt-3.5', name: 'GPT-3.5', provider: 'OpenAI', description: 'OpenAI GPT-3.5 (cloud)' },
  { id: 'local-llama', name: 'Llama 2', provider: 'Local', description: 'Local Llama 2 model' },
];

const STORAGE_KEY = 'chainbot-current-model';

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [models] = useState<AIModel[]>(DEFAULT_MODELS);
  const [currentModelId, setCurrentModelId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_MODELS[0].id;
  });

  const currentModel = models.find(m => m.id === currentModelId) || models[0];

  const setModel = useCallback((id: string) => {
    setCurrentModelId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <ModelContext.Provider value={{ models, currentModel, setModel }}>
      {children}
    </ModelContext.Provider>
  );
};

export const useModel = () => {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error('useModel must be used within a ModelProvider');
  return ctx;
}; 