import create from 'zustand';

interface FileTab {
  id: string;
  name: string;
  path: string;
  isDirty: boolean;
}

interface EditorState {
  openTabs: FileTab[];
  activeTabId: string | null;
  setActiveTab: (id: string) => void;
  openFile: (file: FileTab) => void;
  closeTab: (id: string) => void;
  setTabDirty: (id: string, dirty: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  openTabs: [
    { id: '1', name: 'App.tsx', path: '/src/App.tsx', isDirty: false },
    { id: '2', name: 'index.css', path: '/src/index.css', isDirty: false },
  ],
  activeTabId: '1',
  setActiveTab: (id) => set({ activeTabId: id }),
  openFile: (file) => set((state) => ({ openTabs: [...state.openTabs, file], activeTabId: file.id })),
  closeTab: (id) => set((state) => ({ openTabs: state.openTabs.filter((tab) => tab.id !== id) })),
  setTabDirty: (id, dirty) => set((state) => ({
    openTabs: state.openTabs.map(tab => tab.id === id ? { ...tab, isDirty: dirty } : tab)
  })),
})); 