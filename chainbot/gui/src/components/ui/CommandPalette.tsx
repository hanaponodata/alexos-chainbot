import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

interface Command {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredCommands(commands);
      setSelectedIndex(0);
      return;
    }

    const filtered = commands.filter(cmd => 
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query, commands]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleCommandSelect = (command: Command) => {
    command.action();
    onClose();
  };

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl mx-4"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/10">
                <div className="flex items-center gap-2 text-gray-400">
                  <Command className="w-4 h-4" />
                  <span className="text-sm font-medium">Command Palette</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">K</kbd>
                </div>
              </div>

              {/* Search Input */}
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search commands..."
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/25"
                  />
                </div>
              </div>

              {/* Commands List */}
              <div className="max-h-96 overflow-y-auto">
                {Object.entries(groupedCommands).map(([category, cmds]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="px-4 py-2 bg-white/5 border-b border-white/5">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {category}
                      </h3>
                    </div>

                    {/* Commands in Category */}
                    {cmds.map((command, index) => {
                      const globalIndex = filteredCommands.indexOf(command);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <motion.div
                          key={command.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`relative cursor-pointer transition-colors duration-150 ${
                            isSelected ? 'bg-blue-500/20' : 'hover:bg-white/5'
                          }`}
                          onClick={() => handleCommandSelect(command)}
                        >
                          <div className="flex items-center gap-3 p-4">
                            {/* Icon */}
                            <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-lg">
                              {command.icon}
                            </div>

                            {/* Command Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium truncate">
                                {command.name}
                              </h4>
                              <p className="text-sm text-gray-400 truncate">
                                {command.description}
                              </p>
                            </div>

                            {/* Selection Indicator */}
                            {isSelected && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                              >
                                <ArrowRight className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </div>

                          {/* Selection Glow */}
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ))}

                {/* No Results */}
                {filteredCommands.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-400">No commands found</p>
                    <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" />
                      <ArrowDown className="w-3 h-3" />
                      <span>Navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      <span>Select</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-white/10 rounded">Esc</kbd>
                    <span>Close</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette; 