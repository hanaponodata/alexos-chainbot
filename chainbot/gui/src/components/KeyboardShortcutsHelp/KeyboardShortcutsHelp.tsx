import React, { useState } from 'react';
import { Keyboard, Search, X, Command, Settings } from 'lucide-react';
import type { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ 
  isOpen, 
  onClose, 
  shortcuts 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All', count: shortcuts.length },
    { id: 'navigation', label: 'Navigation', count: shortcuts.filter(s => s.category === 'navigation').length },
    { id: 'actions', label: 'Actions', count: shortcuts.filter(s => s.category === 'actions').length },
    { id: 'tools', label: 'Tools', count: shortcuts.filter(s => s.category === 'tools').length },
    { id: 'system', label: 'System', count: shortcuts.filter(s => s.category === 'system').length },
  ];

  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesSearch = shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shortcut.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatKey = (shortcut: KeyboardShortcut) => {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.metaKey) parts.push('Cmd');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return <Command className="w-4 h-4" />;
      case 'actions': return <Keyboard className="w-4 h-4" />;
      case 'tools': return <Settings className="w-4 h-4" />;
      case 'system': return <Keyboard className="w-4 h-4" />;
      default: return <Keyboard className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return 'text-blue-400';
      case 'actions': return 'text-green-400';
      case 'tools': return 'text-purple-400';
      case 'system': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#18181b] rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#23232a]">
          <div className="flex items-center space-x-3">
            <Keyboard className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold px-2"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-[#23232a]">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search shortcuts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#23232a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="flex space-x-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#23232a] text-gray-400 hover:text-white'
                  }`}
                >
                  {category.label} ({category.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Keyboard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No shortcuts found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-[#101014] rounded-lg border border-[#23232a] hover:border-[#3a3a3a] transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg bg-[#23232a] ${getCategoryColor(shortcut.category)}`}>
                      {getCategoryIcon(shortcut.category)}
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{shortcut.description}</h3>
                      <p className="text-sm text-gray-400 capitalize">{shortcut.category}</p>
                    </div>
                  </div>
                  <kbd className="px-3 py-1 bg-[#23232a] border border-[#3a3a3a] rounded text-sm font-mono text-white">
                    {formatKey(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#23232a] bg-[#101014]">
          <div className="text-sm text-gray-400">
            <p>💡 Tip: You can customize keyboard shortcuts in Preferences → Keyboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp; 