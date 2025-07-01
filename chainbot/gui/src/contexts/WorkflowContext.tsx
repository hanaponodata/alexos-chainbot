import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface WorkflowStep {
  id: string;
  type: string;
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

interface WorkflowContextType {
  workflows: Workflow[];
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (workflow: Workflow) => void;
  deleteWorkflow: (id: string) => void;
  runWorkflow: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'chainbot-workflows';

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  }, [workflows]);

  const addWorkflow = useCallback((workflow: Workflow) => {
    setWorkflows(prev => [...prev, workflow]);
  }, []);

  const updateWorkflow = useCallback((workflow: Workflow) => {
    setWorkflows(prev => prev.map(w => w.id === workflow.id ? workflow : w));
  }, []);

  const deleteWorkflow = useCallback((id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id));
  }, []);

  // Dummy runWorkflow implementation
  const runWorkflow = useCallback(async (id: string) => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) return;
    for (const step of workflow.steps) {
      // Simulate step execution
      await new Promise(res => setTimeout(res, 500));
      // In a real app, call the appropriate action/plugin here
    }
    alert(`Workflow '${workflow.name}' completed!`);
  }, [workflows]);

  return (
    <WorkflowContext.Provider value={{ workflows, addWorkflow, updateWorkflow, deleteWorkflow, runWorkflow }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflows = () => {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflows must be used within a WorkflowProvider');
  return ctx;
}; 