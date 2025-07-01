import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder,
  File,
  FileCode,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  Copy,
  Search,
  Filter,
  Grid,
  List,
  Star,
  MoreVertical,
  FolderOpen,
  FolderPlus,
  FilePlus
} from 'lucide-react';
import Button from './Button';
import Card from './Card';
import Input from './Input';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified: Date;
  path: string;
  extension?: string;
  isFavorite?: boolean;
  isHidden?: boolean;
}

interface FileExplorerProps {
  className?: string;
  onFileSelect?: (file: FileItem) => void;
  onFileOpen?: (file: FileItem) => void;
  onFileDelete?: (file: FileItem) => void;
  onFileRename?: (file: FileItem, newName: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  className = '',
  onFileSelect,
  onFileOpen,
  onFileDelete,
  onFileRename
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showHidden, setShowHidden] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(false);

  // Mock file data
  useEffect(() => {
    const mockFiles: FileItem[] = [
      {
        id: '1',
        name: 'main.js',
        type: 'file',
        size: 2048,
        modified: new Date('2024-01-15T10:30:00'),
        path: '/main.js',
        extension: 'js',
        isFavorite: true
      },
      {
        id: '2',
        name: 'styles.css',
        type: 'file',
        size: 1024,
        modified: new Date('2024-01-14T15:45:00'),
        path: '/styles.css',
        extension: 'css'
      },
      {
        id: '3',
        name: 'index.html',
        type: 'file',
        size: 512,
        modified: new Date('2024-01-13T09:20:00'),
        path: '/index.html',
        extension: 'html'
      },
      {
        id: '4',
        name: 'src',
        type: 'folder',
        modified: new Date('2024-01-12T14:15:00'),
        path: '/src'
      },
      {
        id: '5',
        name: 'assets',
        type: 'folder',
        modified: new Date('2024-01-11T11:30:00'),
        path: '/assets'
      },
      {
        id: '6',
        name: 'package.json',
        type: 'file',
        size: 1536,
        modified: new Date('2024-01-10T16:00:00'),
        path: '/package.json',
        extension: 'json'
      },
      {
        id: '7',
        name: 'README.md',
        type: 'file',
        size: 3072,
        modified: new Date('2024-01-09T13:25:00'),
        path: '/README.md',
        extension: 'md'
      },
      {
        id: '8',
        name: '.gitignore',
        type: 'file',
        size: 256,
        modified: new Date('2024-01-08T08:45:00'),
        path: '/.gitignore',
        extension: 'gitignore',
        isHidden: true
      }
    ];

    setFiles(mockFiles);
  }, []);

  const filteredFiles = files
    .filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHidden = showHidden || !file.isHidden;
      return matchesSearch && matchesHidden;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'modified':
          comparison = a.modified.getTime() - b.modified.getTime();
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file);
    onFileSelect?.(file);
  };

  const handleFileDoubleClick = (file: FileItem) => {
    if (file.type === 'folder') {
      setCurrentPath(file.path);
    } else {
      onFileOpen?.(file);
    }
  };

  const handleFileDelete = (file: FileItem) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      setFiles(prev => prev.filter(f => f.id !== file.id));
      onFileDelete?.(file);
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
      }
    }
  };

  const handleFileRename = (file: FileItem) => {
    const newName = prompt('Enter new name:', file.name);
    if (newName && newName !== file.name) {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, name: newName } : f
      ));
      onFileRename?.(file, newName);
    }
  };

  const toggleFavorite = (file: FileItem) => {
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, isFavorite: !f.isFavorite } : f
    ));
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') {
      return <Folder className="w-5 h-5 text-blue-400" />;
    }

    switch (file.extension) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <FileCode className="w-5 h-5 text-yellow-400" />;
      case 'html':
      case 'css':
      case 'md':
      case 'txt':
        return <FileText className="w-5 h-5 text-gray-400" />;
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
        return <FileCode className="w-5 h-5 text-green-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage className="w-5 h-5 text-purple-400" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <FileVideo className="w-5 h-5 text-red-400" />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <FileAudio className="w-5 h-5 text-pink-400" />;
      case 'zip':
      case 'tar':
      case 'gz':
        return <FileArchive className="w-5 h-5 text-orange-400" />;
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="font-semibold text-white">File Explorer</h2>
            <p className="text-sm text-gray-400">{currentPath}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            icon={viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          >
            {viewMode === 'grid' ? 'List' : 'Grid'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHidden(!showHidden)}
            icon={<Filter className="w-4 h-4" />}
          >
            Hidden
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
          >
            Upload
          </Button>
          <Button
            icon={<FilePlus className="w-4 h-4" />}
          >
            New File
          </Button>
        </div>
      </motion.div>

      {/* Search and Controls */}
      <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={setSearchQuery}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-');
              setSortBy(sort as any);
              setSortOrder(order as any);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm backdrop-blur-md"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="modified-desc">Modified (Newest)</option>
            <option value="modified-asc">Modified (Oldest)</option>
            <option value="size-desc">Size (Largest)</option>
            <option value="size-asc">Size (Smallest)</option>
            <option value="type-asc">Type (A-Z)</option>
          </select>
        </div>
      </div>

      {/* File Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AnimatePresence>
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    variant="glass"
                    onClick={() => handleFileClick(file)}
                    onDoubleClick={() => handleFileDoubleClick(file)}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedFile?.id === file.id 
                        ? 'ring-2 ring-blue-500/50 bg-white/10' 
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="p-4 text-center">
                      <div className="flex justify-center mb-2">
                        {getFileIcon(file)}
                      </div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-sm text-white font-medium truncate">
                          {file.name}
                        </span>
                        {file.isFavorite && (
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {file.type === 'file' ? formatFileSize(file.size) : 'Folder'}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    variant="glass"
                    onClick={() => handleFileClick(file)}
                    onDoubleClick={() => handleFileDoubleClick(file)}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedFile?.id === file.id 
                        ? 'ring-2 ring-blue-500/50 bg-white/10' 
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{file.name}</span>
                            {file.isFavorite && (
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {file.type === 'file' ? formatFileSize(file.size) : 'Folder'} • {formatDate(file.modified)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toggleFavorite(file);
                          }}
                          icon={<Star className={`w-4 h-4 ${file.isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />}
                        >
                          {''}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleFileRename(file);
                          }}
                          icon={<Edit className="w-4 h-4" />}
                        >
                          {''}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleFileDelete(file);
                          }}
                          icon={<Trash2 className="w-4 h-4" />}
                        >
                          {''}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredFiles.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            <Folder className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p>No files found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </motion.div>
        )}
      </div>

      {/* Status Bar */}
      <motion.div
        className="flex items-center justify-between p-3 border-t border-white/10 bg-white/5 backdrop-blur-md text-sm"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-4 text-gray-400">
          <span>{filteredFiles.length} items</span>
          {selectedFile && (
            <span>Selected: {selectedFile.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400">Ready</span>
        </div>
      </motion.div>
    </div>
  );
};

export default FileExplorer; 