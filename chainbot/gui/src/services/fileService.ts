// File service for Code editor functionality
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
  language?: string;
}

export interface FileOperation {
  type: 'create' | 'delete' | 'rename' | 'move' | 'save';
  path: string;
  data?: any;
  timestamp: Date;
}

class FileService {
  private fileTree: FileNode[] = [];
  private openFiles: Map<string, FileNode> = new Map();
  private recentFiles: string[] = [];
  private operations: FileOperation[] = [];

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultFiles();
  }

  // Initialize with some default files
  private initializeDefaultFiles() {
    if (this.fileTree.length === 0) {
      this.fileTree = [
        {
          id: 'welcome',
          name: 'Welcome',
          type: 'file',
          path: '/welcome.md',
          content: `# Welcome to ChainBot Code Editor!

This is a basic code editor with file management capabilities.

## Features:
- File creation and editing
- Syntax highlighting
- File tree navigation
- Recent files tracking

## Getting Started:
1. Create a new file using the + button
2. Start coding!
3. Your files are saved automatically

## Supported Languages:
- JavaScript/TypeScript
- Python
- HTML/CSS
- JSON
- Markdown
- And more!

Happy coding! 🚀`,
          language: 'markdown'
        },
        {
          id: 'examples',
          name: 'examples',
          type: 'folder',
          path: '/examples',
          children: [
            {
              id: 'hello-js',
              name: 'hello.js',
              type: 'file',
              path: '/examples/hello.js',
              content: `// Hello World in JavaScript
console.log('Hello, ChainBot!');

// Simple function example
function greet(name) {
  return \`Hello, \${name}!\`;
}

// Usage
const message = greet('Developer');
console.log(message);

// Export for module usage
module.exports = { greet };`,
              language: 'javascript'
            },
            {
              id: 'hello-py',
              name: 'hello.py',
              type: 'file',
              path: '/examples/hello.py',
              content: `# Hello World in Python
print("Hello, ChainBot!")

# Simple function example
def greet(name):
    return f"Hello, {name}!"

# Usage
message = greet("Developer")
print(message)

# Class example
class Greeter:
    def __init__(self, name):
        self.name = name
    
    def greet(self):
        return f"Hello, {self.name}!"

# Usage
greeter = Greeter("ChainBot")
print(greeter.greet())`,
              language: 'python'
            }
          ]
        }
      ];
      this.saveToStorage();
    }
  }

  // Get file tree
  getFileTree(): FileNode[] {
    return JSON.parse(JSON.stringify(this.fileTree));
  }

  // Get open files
  getOpenFiles(): FileNode[] {
    return Array.from(this.openFiles.values());
  }

  // Get recent files
  getRecentFiles(): string[] {
    return [...this.recentFiles];
  }

  // Find file by path
  findFile(path: string): FileNode | null {
    const findInTree = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === path) {
          return node;
        }
        if (node.children) {
          const found = findInTree(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findInTree(this.fileTree);
  }

  // Create new file
  createFile(path: string, content: string = '', language?: string): FileNode {
    const pathParts = path.split('/').filter(Boolean);
    const fileName = pathParts.pop() || 'untitled';
    const folderPath = '/' + pathParts.join('/');

    const file: FileNode = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      type: 'file',
      path,
      content,
      language: language || this.detectLanguage(fileName)
    };

    // Add to file tree
    this.addToFileTree(file, folderPath);
    
    // Add operation
    this.addOperation('create', path, { content, language });
    
    this.saveToStorage();
    return file;
  }

  // Create new folder
  createFolder(path: string): FileNode {
    const pathParts = path.split('/').filter(Boolean);
    const folderName = pathParts.pop() || 'untitled';
    const parentPath = '/' + pathParts.join('/');

    const folder: FileNode = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: folderName,
      type: 'folder',
      path,
      children: []
    };

    // Add to file tree
    this.addToFileTree(folder, parentPath);
    
    // Add operation
    this.addOperation('create', path, { type: 'folder' });
    
    this.saveToStorage();
    return folder;
  }

  // Add file/folder to tree
  private addToFileTree(node: FileNode, parentPath: string) {
    if (parentPath === '/') {
      this.fileTree.push(node);
    } else {
      const parent = this.findFile(parentPath);
      if (parent && parent.type === 'folder') {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      }
    }
  }

  // Open file
  openFile(path: string): FileNode | null {
    const file = this.findFile(path);
    if (file && file.type === 'file') {
      this.openFiles.set(path, file);
      this.addToRecentFiles(path);
      return file;
    }
    return null;
  }

  // Close file
  closeFile(path: string): boolean {
    const removed = this.openFiles.delete(path);
    if (removed) {
      this.removeFromRecentFiles(path);
    }
    return removed;
  }

  // Save file
  saveFile(path: string, content: string): boolean {
    const file = this.findFile(path);
    if (file && file.type === 'file') {
      file.content = content;
      this.openFiles.set(path, file);
      this.addOperation('save', path, { content });
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Delete file/folder
  deleteFile(path: string): boolean {
    const file = this.findFile(path);
    if (file) {
      this.removeFromFileTree(path);
      this.openFiles.delete(path);
      this.removeFromRecentFiles(path);
      this.addOperation('delete', path);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Rename file/folder
  renameFile(oldPath: string, newPath: string): boolean {
    const file = this.findFile(oldPath);
    if (file) {
      file.name = newPath.split('/').pop() || file.name;
      file.path = newPath;
      
      // Update open files
      if (this.openFiles.has(oldPath)) {
        this.openFiles.delete(oldPath);
        this.openFiles.set(newPath, file);
      }
      
      // Update recent files
      const recentIndex = this.recentFiles.indexOf(oldPath);
      if (recentIndex !== -1) {
        this.recentFiles[recentIndex] = newPath;
      }
      
      this.addOperation('rename', newPath, { oldPath });
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Remove from file tree
  private removeFromFileTree(path: string) {
    const removeFromNodes = (nodes: FileNode[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].path === path) {
          nodes.splice(i, 1);
          return true;
        }
        if (nodes[i].children) {
          if (removeFromNodes(nodes[i].children!)) {
            return true;
          }
        }
      }
      return false;
    };
    removeFromNodes(this.fileTree);
  }

  // Add to recent files
  private addToRecentFiles(path: string) {
    this.recentFiles = this.recentFiles.filter(p => p !== path);
    this.recentFiles.unshift(path);
    this.recentFiles = this.recentFiles.slice(0, 10); // Keep only 10 recent files
  }

  // Remove from recent files
  private removeFromRecentFiles(path: string) {
    this.recentFiles = this.recentFiles.filter(p => p !== path);
  }

  // Add operation to history
  private addOperation(type: FileOperation['type'], path: string, data?: any) {
    this.operations.push({
      type,
      path,
      data,
      timestamp: new Date()
    });
    
    // Keep only last 100 operations
    if (this.operations.length > 100) {
      this.operations = this.operations.slice(-100);
    }
  }

  // Get operations history
  getOperations(): FileOperation[] {
    return [...this.operations];
  }

  // Detect language from filename
  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'txt': 'plaintext',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sql': 'sql',
      'php': 'php',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash'
    };
    return languageMap[ext || ''] || 'plaintext';
  }

  // Export file tree as JSON
  exportFileTree(): string {
    return JSON.stringify({
      fileTree: this.fileTree,
      recentFiles: this.recentFiles,
      operations: this.operations,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }

  // Import file tree from JSON
  importFileTree(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.fileTree && Array.isArray(data.fileTree)) {
        this.fileTree = data.fileTree;
        this.recentFiles = data.recentFiles || [];
        this.operations = data.operations || [];
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import file tree:', error);
      return false;
    }
  }

  // Save to localStorage
  private saveToStorage() {
    try {
      localStorage.setItem('chainbot_file_tree', JSON.stringify(this.fileTree));
      localStorage.setItem('chainbot_recent_files', JSON.stringify(this.recentFiles));
      localStorage.setItem('chainbot_operations', JSON.stringify(this.operations));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage() {
    try {
      const fileTreeData = localStorage.getItem('chainbot_file_tree');
      const recentFilesData = localStorage.getItem('chainbot_recent_files');
      const operationsData = localStorage.getItem('chainbot_operations');

      if (fileTreeData) {
        this.fileTree = JSON.parse(fileTreeData);
      }
      if (recentFilesData) {
        this.recentFiles = JSON.parse(recentFilesData);
      }
      if (operationsData) {
        this.operations = JSON.parse(operationsData);
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
      this.fileTree = [];
      this.recentFiles = [];
      this.operations = [];
    }
  }
}

// Export singleton instance
export const fileService = new FileService(); 