import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  isActive: boolean;
  avatar: string;
  color: string;
  lastActive: Date;
  memoryContext: string[];
}

export interface AgentAction {
  id: string;
  agentId: string;
  type: 'code' | 'deploy' | 'review' | 'design' | 'security' | 'documentation';
  action: string;
  description: string;
  timestamp: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  context?: any;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  agents: string[];
  steps: AgentAction[];
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

interface AgentState {
  agents: Agent[];
  activeAgentId: string | null;
  actions: AgentAction[];
  workflows: AgentWorkflow[];
  
  // Actions
  setActiveAgent: (agentId: string) => void;
  addAgent: (agent: Omit<Agent, 'id' | 'lastActive' | 'memoryContext'>) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  executeAgentAction: (agentId: string, action: Omit<AgentAction, 'id' | 'agentId' | 'timestamp' | 'status'>) => Promise<AgentAction>;
  createWorkflow: (workflow: Omit<AgentWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => string;
  executeWorkflow: (workflowId: string) => Promise<void>;
  getAgentActions: (agentId: string) => AgentAction[];
  getAgentWorkflows: (agentId: string) => AgentWorkflow[];
}

// Default agents
const defaultAgents: Agent[] = [
  {
    id: 'harry',
    name: 'Harry',
    role: 'DevOps Engineer',
    description: 'Handles deployment, build, test, and infrastructure tasks',
    capabilities: ['deploy', 'build', 'test', 'infrastructure', 'monitoring'],
    isActive: true,
    avatar: '🛠️',
    color: '#3B82F6',
    lastActive: new Date(),
    memoryContext: []
  },
  {
    id: 'laka',
    name: 'Laka',
    role: 'UI/UX Designer & Frontend Developer',
    description: 'Specializes in design, theming, and frontend improvements',
    capabilities: ['design', 'ui', 'ux', 'frontend', 'theming', 'accessibility'],
    isActive: true,
    avatar: '🎨',
    color: '#8B5CF6',
    lastActive: new Date(),
    memoryContext: []
  },
  {
    id: 'devbot',
    name: 'DevBot',
    role: 'Full-Stack Developer',
    description: 'Handles code generation, refactoring, and documentation',
    capabilities: ['code', 'refactor', 'documentation', 'testing', 'review'],
    isActive: true,
    avatar: '🤖',
    color: '#10B981',
    lastActive: new Date(),
    memoryContext: []
  },
  {
    id: 'guardbot',
    name: 'GuardBot',
    role: 'Security & Compliance Officer',
    description: 'Reviews, audits, and approves changes for security',
    capabilities: ['security', 'audit', 'compliance', 'approval', 'review'],
    isActive: true,
    avatar: '🛡️',
    color: '#EF4444',
    lastActive: new Date(),
    memoryContext: []
  }
];

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: defaultAgents,
      activeAgentId: null,
      actions: [],
      workflows: [],

      setActiveAgent: (agentId: string) => {
        set({ activeAgentId: agentId });
        // Update agent's last active time
        set(state => ({
          agents: state.agents.map(agent =>
            agent.id === agentId
              ? { ...agent, lastActive: new Date() }
              : agent
          )
        }));
      },

      addAgent: (agentData) => {
        const newAgent: Agent = {
          ...agentData,
          id: `agent_${Date.now()}`,
          lastActive: new Date(),
          memoryContext: []
        };
        set(state => ({ agents: [...state.agents, newAgent] }));
      },

      updateAgent: (id, updates) => {
        set(state => ({
          agents: state.agents.map(agent =>
            agent.id === id ? { ...agent, ...updates } : agent
          )
        }));
      },

      executeAgentAction: async (agentId, actionData) => {
        const action: AgentAction = {
          ...actionData,
          id: `action_${Date.now()}`,
          agentId,
          timestamp: new Date(),
          status: 'pending'
        };

        set(state => ({ actions: [...state.actions, action] }));

        // Simulate action execution
        try {
          // Update status to running
          set(state => ({
            actions: state.actions.map(a =>
              a.id === action.id ? { ...a, status: 'running' } : a
            )
          }));

          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

          // Mock results based on action type
          let result = {};
          switch (action.type) {
            case 'code':
              result = { 
                code: '// Generated code by ' + get().agents.find(a => a.id === agentId)?.name,
                files: ['src/generated/file.ts'],
                changes: 15
              };
              break;
            case 'deploy':
              result = { 
                status: 'deployed',
                url: 'https://deployed-app.example.com',
                buildTime: '2m 30s'
              };
              break;
            case 'review':
              result = { 
                issues: 3,
                suggestions: 8,
                approved: true
              };
              break;
            case 'design':
              result = { 
                theme: 'dark',
                components: ['Button', 'Card', 'Modal'],
                changes: 5
              };
              break;
            case 'security':
              result = { 
                vulnerabilities: 0,
                approved: true,
                recommendations: ['Use HTTPS', 'Validate inputs']
              };
              break;
            case 'documentation':
              result = { 
                files: ['README.md', 'API.md'],
                lines: 45,
                coverage: '85%'
              };
              break;
          }

          // Update action as completed
          set(state => ({
            actions: state.actions.map(a =>
              a.id === action.id ? { ...a, status: 'completed', result } : a
            )
          }));

          return { ...action, status: 'completed', result };
        } catch (error) {
          // Update action as failed
          set(state => ({
            actions: state.actions.map(a =>
              a.id === action.id ? { ...a, status: 'failed', result: { error: String(error) } } : a
            )
          }));

          return { ...action, status: 'failed', result: { error: String(error) } };
        }
      },

      createWorkflow: (workflowData) => {
        const workflow: AgentWorkflow = {
          ...workflowData,
          id: `workflow_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        set(state => ({ workflows: [...state.workflows, workflow] }));
        return workflow.id;
      },

      executeWorkflow: async (workflowId) => {
        const workflow = get().workflows.find(w => w.id === workflowId);
        if (!workflow) return;

        set(state => ({
          workflows: state.workflows.map(w =>
            w.id === workflowId ? { ...w, status: 'running' } : w
          )
        }));

        // Execute each step in the workflow
        for (const step of workflow.steps) {
          await get().executeAgentAction(step.agentId, {
            type: step.type,
            action: step.action,
            description: step.description,
            context: step.context
          });
        }

        set(state => ({
          workflows: state.workflows.map(w =>
            w.id === workflowId ? { ...w, status: 'completed', updatedAt: new Date() } : w
          )
        }));
      },

      getAgentActions: (agentId: string) => {
        return get().actions.filter(action => action.agentId === agentId);
      },

      getAgentWorkflows: (agentId: string) => {
        return get().workflows.filter(workflow => workflow.agents.includes(agentId));
      }
    }),
    {
      name: 'chainbot-agents',
      partialize: (state) => ({
        agents: state.agents,
        activeAgentId: state.activeAgentId,
        actions: state.actions,
        workflows: state.workflows
      })
    }
  )
);
