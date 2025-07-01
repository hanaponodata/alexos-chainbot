import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare,
  Code,
  Terminal as TerminalIcon,
  Folder,
  Settings,
  Maximize2,
  Minimize2,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
  Split,
  Grid
} from 'lucide-react';
import ChatInterface from './ChatInterface';
import CodeEditor from './ui/CodeEditor';
import Terminal from './ui/Terminal';
import FileExplorer from './ui/FileExplorer';
import Button from './ui/Button';
import Card from './ui/Card';

interface Pane {
  id: string;
  type: 'chat' | 'code' | 'terminal' | 'files';
  title: string;
  icon: React.ReactNode;
  isVisible: boolean;
  isMinimized: boolean;
  width?: number;
  height?: number;
}

interface MultiPaneLayoutProps {
  className?: string;
}

const MultiPaneLayout: React.FC<MultiPaneLayoutProps> = ({
  className = ''
}) => {
  const [panes, setPanes] = useState<Pane[]>([
    {
      id: 'chat',
      type: 'chat',
      title: 'Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      isVisible: true,
      isMinimized: false,
      width: 400
    },
    {
      id: 'code',
      type: 'code',
      title: 'Code Editor',
      icon: <Code className="w-4 h-4" />,
      isVisible: true,
      isMinimized: false,
      width: 600
    },
    {
      id: 'terminal',
      type: 'terminal',
      title: 'Terminal',
      icon: <TerminalIcon className="w-4 h-4" />,
      isVisible: true,
      isMinimized: false,
      height: 300
    },
    {
      id: 'files',
      type: 'files',
      title: 'File Explorer',
      icon: <Folder className="w-4 h-4" />,
      isVisible: true,
      isMinimized: false,
      width: 300
    }
  ]);

  const [layout, setLayout] = useState<'horizontal' | 'vertical' | 'grid'>('horizontal');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [activePane, setActivePane] = useState<string>('chat');
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePane = (paneId: string) => {
    setPanes(prev => prev.map(pane => 
      pane.id === paneId ? { ...pane, isVisible: !pane.isVisible } : pane
    ));
  };

  const minimizePane = (paneId: string) => {
    setPanes(prev => prev.map(pane => 
      pane.id === paneId ? { ...pane, isMinimized: !pane.isMinimized } : pane
    ));
  };

  const closePane = (paneId: string) => {
    setPanes(prev => prev.map(pane => 
      pane.id === paneId ? { ...pane, isVisible: false } : pane
    ));
  };

  const setActivePaneHandler = (paneId: string) => {
    setActivePane(paneId);
  };

  const handleMouseDown = (e: React.MouseEvent, paneId: string) => {
    setIsDragging(true);
    setDragStart(e.clientX);
    setActivePane(paneId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const delta = e.clientX - dragStart;
    const containerWidth = containerRef.current?.offsetWidth || 0;
    
    setPanes(prev => prev.map(pane => {
      if (pane.id === activePane && pane.width) {
        const newWidth = Math.max(200, Math.min(800, pane.width + delta));
        return { ...pane, width: newWidth };
      }
      return pane;
    }));

    setDragStart(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, activePane, dragStart]);

  const renderPane = (pane: Pane) => {
    if (!pane.isVisible) return null;

    const paneClasses = `
      ${pane.isMinimized ? 'h-12' : 'h-full'}
      transition-all duration-300 ease-out
    `;

    const paneContent = (
      <div className={paneClasses}>
        {pane.isMinimized ? (
          <div className="h-full flex items-center justify-between px-4 bg-white/5 backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-2">
              {pane.icon}
              <span className="text-white font-medium">{pane.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => minimizePane(pane.id)}
                icon={<Maximize2 className="w-3 h-3" />}
              >
                {''}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => closePane(pane.id)}
                icon={<X className="w-3 h-3" />}
              >
                {''}
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Pane Header */}
            <div className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-md border-b border-white/10">
              <div className="flex items-center gap-2">
                {pane.icon}
                <span className="text-white font-medium">{pane.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => minimizePane(pane.id)}
                  icon={<Minimize2 className="w-3 h-3" />}
                >
                  {''}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => closePane(pane.id)}
                  icon={<X className="w-3 h-3" />}
                >
                  {''}
                </Button>
              </div>
            </div>

            {/* Pane Content */}
            <div className="flex-1 overflow-hidden">
              {pane.type === 'chat' && <ChatInterface />}
              {pane.type === 'code' && (
                <CodeEditor
                  initialValue="// Welcome to ChainBot Code Editor\n// Start coding with AI assistance\n\nfunction helloWorld() {\n  console.log('Hello, ChainBot!');\n  return 'Welcome to the future of coding!';\n}\n\n// Try running this code or ask for suggestions"
                  language="javascript"
                  filename="main.js"
                />
              )}
              {pane.type === 'terminal' && <Terminal />}
              {pane.type === 'files' && <FileExplorer />}
            </div>
          </div>
        )}
      </div>
    );

    return (
      <motion.div
        key={pane.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        style={{ width: pane.width }}
        className="relative"
      >
        {paneContent}
        
        {/* Resize Handle */}
        {!pane.isMinimized && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1 bg-white/10 hover:bg-white/20 cursor-col-resize transition-colors"
            onMouseDown={(e) => handleMouseDown(e, pane.id)}
          />
        )}
      </motion.div>
    );
  };

  const visiblePanes = panes.filter(pane => pane.isVisible);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Toolbar */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">ChainBot Studio</h1>
          
          <div className="flex items-center gap-2">
            {panes.map(pane => (
              <Button
                key={pane.id}
                variant={pane.isVisible ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => togglePane(pane.id)}
                icon={pane.icon}
              >
                {pane.title}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout(layout === 'horizontal' ? 'vertical' : 'horizontal')}
            icon={layout === 'horizontal' ? <Split className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          >
            Layout
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Settings className="w-4 h-4" />}
          >
            Settings
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div 
        ref={containerRef}
        className="flex-1 flex overflow-hidden"
        style={{ cursor: isDragging ? 'col-resize' : 'default' }}
      >
        <AnimatePresence>
          {layout === 'horizontal' ? (
            <div className="flex h-full">
              {visiblePanes.slice(0, -1).map((pane, index) => (
                <React.Fragment key={pane.id}>
                  {renderPane(pane)}
                </React.Fragment>
              ))}
              
              {/* Last pane takes remaining space */}
              {visiblePanes.length > 0 && (
                <div className="flex-1">
                  {renderPane(visiblePanes[visiblePanes.length - 1])}
                </div>
              )}
            </div>
          ) : layout === 'vertical' ? (
            <div className="flex flex-col h-full">
              {visiblePanes.slice(0, -1).map((pane, index) => (
                <React.Fragment key={pane.id}>
                  {renderPane(pane)}
                </React.Fragment>
              ))}
              
              {/* Last pane takes remaining space */}
              {visiblePanes.length > 0 && (
                <div className="flex-1">
                  {renderPane(visiblePanes[visiblePanes.length - 1])}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 grid-rows-2 gap-4 p-4 h-full">
              {visiblePanes.map(pane => (
                <div key={pane.id} className="h-full">
                  {renderPane(pane)}
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <motion.div
        className="flex items-center justify-between p-3 border-t border-white/10 bg-white/5 backdrop-blur-md text-sm"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-4 text-gray-400">
          <span>{visiblePanes.length} panes active</span>
          <span>Layout: {layout}</span>
          {activePane && (
            <span>Active: {panes.find(p => p.id === activePane)?.title}</span>
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

export default MultiPaneLayout; 