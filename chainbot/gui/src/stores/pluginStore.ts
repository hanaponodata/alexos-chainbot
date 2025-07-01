import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  type: 'panel' | 'tool' | 'workflow' | 'theme' | 'integration';
  entryPoint: string;
  config: Record<string, any>;
  dependencies: string[];
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginPanel {
  id: string;
  pluginId: string;
  title: string;
  component: string;
  position: 'left' | 'right' | 'bottom' | 'top';
  size: number;
  resizable: boolean;
  collapsible: boolean;
  defaultOpen: boolean;
}

export interface PluginWorkflow {
  id: string;
  pluginId: string;
  name: string;
  description: string;
  triggers: string[];
  actions: any[];
  enabled: boolean;
}

interface PluginStore {
  // State
  plugins: Plugin[];
  activePanels: PluginPanel[];
  workflows: PluginWorkflow[];
  loading: boolean;
  error: string | null;

  // Actions
  registerPlugin: (plugin: Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>) => void;
  unregisterPlugin: (pluginId: string) => void;
  enablePlugin: (pluginId: string) => void;
  disablePlugin: (pluginId: string) => void;
  updatePluginConfig: (pluginId: string, config: Record<string, any>) => void;
  
  // Panel Management
  addPanel: (panel: Omit<PluginPanel, 'id'>) => void;
  removePanel: (panelId: string) => void;
  updatePanel: (panelId: string, updates: Partial<PluginPanel>) => void;
  togglePanel: (panelId: string) => void;
  
  // Workflow Management
  addWorkflow: (workflow: Omit<PluginWorkflow, 'id'>) => void;
  removeWorkflow: (workflowId: string) => void;
  enableWorkflow: (workflowId: string) => void;
  disableWorkflow: (workflowId: string) => void;
  
  // Utility
  getPluginById: (pluginId: string) => Plugin | undefined;
  getPanelsByPlugin: (pluginId: string) => PluginPanel[];
  getWorkflowsByPlugin: (pluginId: string) => PluginWorkflow[];
  clearError: () => void;
}

export const usePluginStore = create<PluginStore>()(
  persist(
    (set, get) => ({
      // Initial state
      plugins: [],
      activePanels: [],
      workflows: [],
      loading: false,
      error: null,

      // Plugin Management
      registerPlugin: (pluginData) => {
        const plugin: Plugin = {
          ...pluginData,
          id: `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          plugins: [...state.plugins, plugin],
          error: null
        }));
      },

      unregisterPlugin: (pluginId) => {
        set((state) => ({
          plugins: state.plugins.filter(p => p.id !== pluginId),
          activePanels: state.activePanels.filter(p => p.pluginId !== pluginId),
          workflows: state.workflows.filter(w => w.pluginId !== pluginId),
          error: null
        }));
      },

      enablePlugin: (pluginId) => {
        set((state) => ({
          plugins: state.plugins.map(p => 
            p.id === pluginId ? { ...p, enabled: true, updatedAt: new Date() } : p
          ),
          error: null
        }));
      },

      disablePlugin: (pluginId) => {
        set((state) => ({
          plugins: state.plugins.map(p => 
            p.id === pluginId ? { ...p, enabled: false, updatedAt: new Date() } : p
          ),
          error: null
        }));
      },

      updatePluginConfig: (pluginId, config) => {
        set((state) => ({
          plugins: state.plugins.map(p => 
            p.id === pluginId ? { ...p, config, updatedAt: new Date() } : p
          ),
          error: null
        }));
      },

      // Panel Management
      addPanel: (panelData) => {
        const panel: PluginPanel = {
          ...panelData,
          id: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        
        set((state) => ({
          activePanels: [...state.activePanels, panel],
          error: null
        }));
      },

      removePanel: (panelId) => {
        set((state) => ({
          activePanels: state.activePanels.filter(p => p.id !== panelId),
          error: null
        }));
      },

      updatePanel: (panelId, updates) => {
        set((state) => ({
          activePanels: state.activePanels.map(p => 
            p.id === panelId ? { ...p, ...updates } : p
          ),
          error: null
        }));
      },

      togglePanel: (panelId) => {
        set((state) => ({
          activePanels: state.activePanels.map(p => 
            p.id === panelId ? { ...p, defaultOpen: !p.defaultOpen } : p
          ),
          error: null
        }));
      },

      // Workflow Management
      addWorkflow: (workflowData) => {
        const workflow: PluginWorkflow = {
          ...workflowData,
          id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        
        set((state) => ({
          workflows: [...state.workflows, workflow],
          error: null
        }));
      },

      removeWorkflow: (workflowId) => {
        set((state) => ({
          workflows: state.workflows.filter(w => w.id !== workflowId),
          error: null
        }));
      },

      enableWorkflow: (workflowId) => {
        set((state) => ({
          workflows: state.workflows.map(w => 
            w.id === workflowId ? { ...w, enabled: true } : w
          ),
          error: null
        }));
      },

      disableWorkflow: (workflowId) => {
        set((state) => ({
          workflows: state.workflows.map(w => 
            w.id === workflowId ? { ...w, enabled: false } : w
          ),
          error: null
        }));
      },

      // Utility Methods
      getPluginById: (pluginId) => {
        return get().plugins.find(p => p.id === pluginId);
      },

      getPanelsByPlugin: (pluginId) => {
        return get().activePanels.filter(p => p.pluginId === pluginId);
      },

      getWorkflowsByPlugin: (pluginId) => {
        return get().workflows.filter(w => w.pluginId === pluginId);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'chainbot-plugins',
      partialize: (state) => ({
        plugins: state.plugins,
        activePanels: state.activePanels,
        workflows: state.workflows,
      }),
    }
  )
); 