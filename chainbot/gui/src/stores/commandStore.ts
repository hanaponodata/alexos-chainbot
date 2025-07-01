import { create } from 'zustand';

export interface Command {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  action: () => void;
}

interface CommandStore {
  isOpen: boolean;
  commands: Command[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  addCommand: (command: Command) => void;
  removeCommand: (id: string) => void;
  clearCommands: () => void;
}

export const useCommandStore = create<CommandStore>((set, get) => ({
  isOpen: false,
  commands: [],
  
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set(state => ({ isOpen: !state.isOpen })),
  
  addCommand: (command) => set(state => ({
    commands: [...state.commands, command]
  })),
  
  removeCommand: (id) => set(state => ({
    commands: state.commands.filter(cmd => cmd.id !== id)
  })),
  
  clearCommands: () => set({ commands: [] })
}));

// Default commands
export const defaultCommands: Omit<Command, 'action'>[] = [
  {
    id: 'chat',
    name: 'Start Chat',
    description: 'Open chat with AI agents',
    icon: '💬',
    category: 'communication'
  },
  {
    id: 'workflow',
    name: 'Create Workflow',
    description: 'Build a new automation workflow',
    icon: '⚡',
    category: 'automation'
  },
  {
    id: 'code',
    name: 'Open Code Editor',
    description: 'Launch the code editor',
    icon: '📝',
    category: 'development'
  },
  {
    id: 'agents',
    name: 'Manage Agents',
    description: 'View and manage AI agents',
    icon: '🤖',
    category: 'management'
  },
  {
    id: 'watchtower',
    name: 'Open Watchtower',
    description: 'Access system monitoring',
    icon: '🦉',
    category: 'monitoring'
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Configure application settings',
    icon: '⚙️',
    category: 'system'
  },
  {
    id: 'help',
    name: 'Help',
    description: 'Get help and documentation',
    icon: '❓',
    category: 'system'
  },
  {
    id: 'search',
    name: 'Search',
    description: 'Search across the application',
    icon: '🔍',
    category: 'navigation'
  },
  {
    id: 'recent',
    name: 'Recent Files',
    description: 'View recently opened files',
    icon: '📁',
    category: 'navigation'
  },
  {
    id: 'theme',
    name: 'Toggle Theme',
    description: 'Switch between light and dark themes',
    icon: '🌙',
    category: 'preferences'
  }
]; 