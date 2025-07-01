import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Folder, 
  Plus, 
  X, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Settings,
  ChevronRight,
  ChevronDown,
  File,
  FolderOpen
} from 'lucide-react';
import { fileService, type FileNode } from '../services/fileService';

interface CodeEditorProps {
  className?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ className = '' }) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [showFileTree, setShowFileTree] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file');
  const [newFileParent, setNewFileParent] = useState('/');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const editorRef = useRef<any>(null);

  // Load file tree and open files on mount
  useEffect(() => {
    loadFileTree();
    loadOpenFiles();
  }, []);

  // Auto-save content when it changes
  useEffect(() => {
    if (activeFile && fileContent !== activeFile.content) {
      const timeoutId = setTimeout(() => {
        saveCurrentFile();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [fileContent, activeFile]);

  const loadFileTree = () => {
    setFileTree(fileService.getFileTree());
  };

  const loadOpenFiles = () => {
    setOpenFiles(fileService.getOpenFiles());
  };

  const openFile = (file: FileNode) => {
    if (file.type === 'file') {
      const openedFile = fileService.openFile(file.path);
      if (openedFile) {
        setActiveFile(openedFile);
        setFileContent(openedFile.content || '');
        loadOpenFiles();
      }
    }
  };

  const closeFile = (path: string) => {
    fileService.closeFile(path);
    loadOpenFiles();
    
    if (activeFile?.path === path) {
      const remainingFiles = fileService.getOpenFiles();
      if (remainingFiles.length > 0) {
        setActiveFile(remainingFiles[0]);
        setFileContent(remainingFiles[0].content || '');
      } else {
        setActiveFile(null);
        setFileContent('');
      }
    }
  };

  const saveCurrentFile = () => {
    if (activeFile) {
      fileService.saveFile(activeFile.path, fileContent);
      loadFileTree();
      loadOpenFiles();
    }
  };

  const createNewFile = () => {
    if (!newFileName.trim()) return;

    const fullPath = newFileParent === '/' 
      ? `/${newFileName}` 
      : `${newFileParent}/${newFileName}`;

    if (newFileType === 'file') {
      const file = fileService.createFile(fullPath);
      openFile(file);
    } else {
      fileService.createFolder(fullPath);
    }

    setNewFileName('');
    setShowNewFileDialog(false);
    loadFileTree();
  };

  const deleteFile = (path: string) => {
    if (confirm('Are you sure you want to delete this file/folder?')) {
      fileService.deleteFile(path);
      loadFileTree();
      loadOpenFiles();
      
      if (activeFile?.path === path) {
        const remainingFiles = fileService.getOpenFiles();
        if (remainingFiles.length > 0) {
          setActiveFile(remainingFiles[0]);
          setFileContent(remainingFiles[0].content || '');
        } else {
          setActiveFile(null);
          setFileContent('');
        }
      }
    }
  };

  const exportFileTree = () => {
    const data = fileService.exportFileTree();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainbot-files-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFileTree = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const success = fileService.importFileTree(e.target?.result as string);
        if (success) {
          loadFileTree();
          loadOpenFiles();
          alert('File tree imported successfully!');
        } else {
          alert('Failed to import file tree. Invalid file format.');
        }
      } catch (error) {
        alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
  };

  const renderFileTreeNode = (node: FileNode, level: number = 0) => {
    const isFolder = node.type === 'folder';
    const hasChildren = isFolder && node.children && node.children.length > 0;
    const isOpen = node.isOpen !== false;

    return (
      <div key={node.id}>
        <div 
          className={`flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer ${
            activeFile?.path === node.path ? 'bg-blue-100' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => {
            if (isFolder) {
              node.isOpen = !isOpen;
              setFileTree([...fileTree]);
            } else {
              openFile(node);
            }
          }}
        >
          {isFolder ? (
            <>
              {hasChildren && (isOpen ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />)}
              {isOpen ? <FolderOpen className="w-4 h-4 mr-2 text-blue-500" /> : <Folder className="w-4 h-4 mr-2 text-blue-500" />}
            </>
          ) : (
            <File className="w-4 h-4 mr-2 text-gray-500" />
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        
        {isFolder && isOpen && hasChildren && (
          <div>
            {node.children!.map(child => renderFileTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getLanguageFromFile = (file: FileNode): string => {
    return file.language || 'plaintext';
  };

  return (
    <div className={`flex h-full bg-white ${className}`}>
      {/* File Tree Sidebar */}
      {showFileTree && (
        <div className="w-64 border-r border-gray-200 flex flex-col">
          {/* File Tree Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900">Files</h3>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  setNewFileParent('/');
                  setShowNewFileDialog(true);
                }}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                title="New File"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowFileTree(false)}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                title="Hide File Tree"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* File Tree Content */}
          <div className="flex-1 overflow-y-auto">
            {fileTree.map(node => renderFileTreeNode(node))}
          </div>

          {/* File Tree Footer */}
          <div className="p-2 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-1">
              <button
                onClick={exportFileTree}
                className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                title="Export Files"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </button>
              <label className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer" title="Import Files">
                <Upload className="w-3 h-3 mr-1" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importFileTree}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            {!showFileTree && (
              <button
                onClick={() => setShowFileTree(true)}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                title="Show File Tree"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}
            
            {/* File Tabs */}
            <div className="flex space-x-1">
              {openFiles.map(file => (
                <div
                  key={file.path}
                  className={`flex items-center px-3 py-1 rounded-t cursor-pointer ${
                    activeFile?.path === file.path 
                      ? 'bg-white border-t border-l border-r border-gray-200' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => openFile(file)}
                >
                  <span className="text-sm truncate max-w-32">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFile(file.path);
                    }}
                    className="ml-2 p-0.5 hover:bg-gray-300 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeFile && (
              <span className="text-xs text-gray-500 px-2 py-1 bg-gray-200 rounded">
                {getLanguageFromFile(activeFile)}
              </span>
            )}
            <button
              onClick={saveCurrentFile}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
              title="Save File"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex flex-col">
          {activeFile ? (
            <>
              {/* Editor Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {activeFile.path}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => deleteFile(activeFile.path)}
                    className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 p-4">
                <textarea
                  ref={textareaRef}
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full h-full p-4 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Start coding..."
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No File Open</h3>
                <p className="text-sm mb-4">
                  Open a file from the file tree or create a new one to start coding.
                </p>
                <button
                  onClick={() => {
                    setNewFileParent('/');
                    setShowNewFileDialog(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create New File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New {newFileType === 'file' ? 'File' : 'Folder'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder={`Enter ${newFileType} name...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={newFileType}
                  onChange={(e) => setNewFileType(e.target.value as 'file' | 'folder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="file">File</option>
                  <option value="folder">Folder</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newFileParent}
                  onChange={(e) => setNewFileParent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowNewFileDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={createNewFile}
                disabled={!newFileName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor; 