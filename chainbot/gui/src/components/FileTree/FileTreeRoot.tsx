import React, { useState, useRef } from 'react';
import { mockFileTree } from '../../mocks/mockFileTree';
import { useEditorStore } from '../../stores/editorStore';
import { Folder as FolderIcon, File as FileIcon, ChevronDown, ChevronRight, MoreVertical, Search as SearchIcon } from 'lucide-react';
import Fuse from 'fuse.js';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

// Flatten file tree for search
function flattenTree(nodes: FileNode[], parentPath = ''): { node: FileNode; path: string[] }[] {
  let result: { node: FileNode; path: string[] }[] = [];
  for (const node of nodes) {
    const currentPath = [...(parentPath ? [parentPath] : []), node.name];
    result.push({ node, path: currentPath });
    if (node.type === 'folder' && node.children) {
      result = result.concat(flattenTree(node.children, node.name));
    }
  }
  return result;
}

const ContextMenu: React.FC<{
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: string) => void;
  isFolder: boolean;
}> = ({ x, y, onClose, onAction, isFolder }) => {
  return (
    <div
      className="fixed z-50 bg-[#23232a] border border-gray-700 rounded shadow-lg py-1 min-w-[140px] text-sm"
      style={{ left: x, top: y }}
      onClick={onClose}
    >
      {isFolder && <div className="px-4 py-2 hover:bg-[#18181b] cursor-pointer" onClick={() => onAction('newFile')}>New File</div>}
      {isFolder && <div className="px-4 py-2 hover:bg-[#18181b] cursor-pointer" onClick={() => onAction('newFolder')}>New Folder</div>}
      <div className="px-4 py-2 hover:bg-[#18181b] cursor-pointer" onClick={() => onAction('rename')}>Rename</div>
      <div className="px-4 py-2 hover:bg-[#18181b] cursor-pointer text-red-400" onClick={() => onAction('delete')}>Delete</div>
    </div>
  );
};

const FileTreeItem: React.FC<{ node: FileNode; level?: number; highlight?: string }> = ({ node, level = 0, highlight }) => {
  const [open, setOpen] = useState(true);
  const { openTabs, openFile, setActiveTab } = useEditorStore();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleFileClick = () => {
    const existing = openTabs.find(tab => tab.path === `/${node.id}`);
    if (existing) {
      setActiveTab(existing.id);
    } else {
      openFile({ id: node.id, name: node.name, path: `/${node.id}`, isDirty: false });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
    document.addEventListener('click', handleCloseMenu);
  };

  const handleCloseMenu = () => {
    setMenu(null);
    document.removeEventListener('click', handleCloseMenu);
  };

  const handleAction = (action: string) => {
    handleCloseMenu();
    // Mocked actions
    if (action === 'newFile') alert('New File (mocked)');
    if (action === 'newFolder') alert('New Folder (mocked)');
    if (action === 'rename') alert('Rename (mocked)');
    if (action === 'delete') alert('Delete (mocked)');
  };

  // highlight: if highlight is set, wrap matching text in <mark>
  const highlightName = (name: string) => {
    if (!highlight) return name;
    const idx = name.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) return name;
    return <>{name.slice(0, idx)}<mark className="bg-yellow-400 text-black rounded px-0.5">{name.slice(idx, idx + highlight.length)}</mark>{name.slice(idx + highlight.length)}</>;
  };

  if (node.type === 'folder') {
    return (
      <div style={{ marginLeft: level * 12 }} ref={itemRef}>
        <div
          className="flex items-center cursor-pointer select-none py-1 hover:bg-[#23232a] rounded relative"
          onClick={() => setOpen(o => !o)}
          onContextMenu={handleContextMenu}
        >
          {open ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
          <FolderIcon className="w-4 h-4 mr-1 text-blue-400" />
          <span className="font-medium text-gray-200 flex-1">{highlightName(node.name)}</span>
          <MoreVertical className="w-4 h-4 ml-auto opacity-40 hover:opacity-80" onClick={e => { e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }} />
          {menu && <ContextMenu x={menu.x} y={menu.y} onClose={handleCloseMenu} onAction={handleAction} isFolder />}
        </div>
        {open && node.children && (
          <div>
            {node.children.map(child => (
              <FileTreeItem key={child.id} node={child} level={level + 1} highlight={highlight} />
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      style={{ marginLeft: level * 12 }}
      className="flex items-center cursor-pointer select-none py-1 hover:bg-[#23232a] rounded relative"
      onClick={handleFileClick}
      onContextMenu={handleContextMenu}
      ref={itemRef}
    >
      <FileIcon className="w-4 h-4 mr-1 text-gray-400" />
      <span className="text-gray-300 flex-1">{highlightName(node.name)}</span>
      <MoreVertical className="w-4 h-4 ml-auto opacity-40 hover:opacity-80" onClick={e => { e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }} />
      {menu && <ContextMenu x={menu.x} y={menu.y} onClose={handleCloseMenu} onAction={handleAction} isFolder={false} />}
    </div>
  );
};

const FileTreeRoot: React.FC = () => {
  const [search, setSearch] = useState('');
  const allFiles = flattenTree(mockFileTree as FileNode[]);
  const fuse = new Fuse(allFiles, { keys: ['node.name'], threshold: 0.4 });
  let filteredTree = mockFileTree as FileNode[];
  let highlight = '';

  if (search.trim()) {
    const results = fuse.search(search.trim());
    const ids = new Set(results.map(r => r.item.node.id));
    // Show only matching nodes and their parents
    const filterTree = (nodes: FileNode[]): FileNode[] =>
      nodes
        .map(node => {
          if (ids.has(node.id)) return node;
          if (node.type === 'folder' && node.children) {
            const filtered = filterTree(node.children);
            if (filtered.length) return { ...node, children: filtered };
          }
          return null;
        })
        .filter(Boolean) as FileNode[];
    filteredTree = filterTree(mockFileTree as FileNode[]);
    highlight = search.trim();
  }

  return (
    <div className="h-full w-64 bg-glass border-r border-gray-800 flex flex-col overflow-y-auto">
      <div className="p-3 pb-1 text-xs text-gray-400 font-semibold tracking-wide flex items-center gap-2">
        <SearchIcon className="w-4 h-4 text-gray-400" />
        <input
          className="flex-1 bg-transparent outline-none border-none text-sm text-gray-200 placeholder-gray-500 px-2 py-1"
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 px-2 pb-2">
        {filteredTree.map(node => (
          <FileTreeItem key={node.id} node={node} highlight={highlight} />
        ))}
      </div>
    </div>
  );
};

export default FileTreeRoot; 