import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Save, 
  Download, 
  Upload, 
  Settings, 
  Sparkles,
  Copy,
  Check,
  FileCode,
  Terminal,
  Lightbulb
} from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface CodeEditorProps {
  initialValue?: string;
  language?: string;
  filename?: string;
  onSave?: (code: string) => void;
  onRun?: (code: string) => void;
  className?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialValue = '// Welcome to ChainBot Code Editor\n// Start coding with AI assistance\n\nfunction helloWorld() {\n  console.log("Hello, ChainBot!");\n}',
  language = 'javascript',
  filename = 'main.js',
  onSave,
  onRun,
  className = ''
}) => {
  const [code, setCode] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.height = 'auto';
      editorRef.current.style.height = `${editorRef.current.scrollHeight}px`;
    }
  }, [code]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const handleSave = () => {
    onSave?.(code);
    // Show save feedback
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleRun = () => {
    onRun?.(code);
    // Show run feedback
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const getCodeSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/code/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: code,
          language: language
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setCode(suggestion);
    setShowSuggestions(false);
  };

  const getLanguageIcon = () => {
    switch (language) {
      case 'javascript':
      case 'js':
        return '⚡';
      case 'typescript':
      case 'ts':
        return '🔷';
      case 'python':
      case 'py':
        return '🐍';
      case 'html':
        return '🌐';
      case 'css':
        return '🎨';
      case 'json':
        return '📄';
      default:
        return '📝';
    }
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Editor Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getLanguageIcon()}</span>
            <div>
              <h2 className="font-semibold text-white">{filename}</h2>
              <p className="text-sm text-gray-400 capitalize">{language}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={getCodeSuggestions}
            loading={isLoading}
            icon={<Lightbulb className="w-4 h-4" />}
          >
            AI Suggestions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            loading={isLoading}
            icon={<Save className="w-4 h-4" />}
          >
            Save
          </Button>
          <Button
            onClick={handleRun}
            loading={isLoading}
            icon={<Play className="w-4 h-4" />}
          >
            Run
          </Button>
        </div>
      </motion.div>

      {/* Editor Content */}
      <div className="flex-1 flex">
        {/* Main Editor */}
        <div className="flex-1 relative">
          <motion.div
            className="h-full bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Line Numbers */}
            <div className="absolute left-0 top-0 w-12 h-full bg-gray-800/50 border-r border-white/10 text-xs text-gray-500 flex flex-col items-end pr-2 pt-4">
              {code.split('\n').map((_, index) => (
                <div key={index} className="leading-6">
                  {index + 1}
                </div>
              ))}
            </div>

            {/* Code Textarea */}
            <textarea
              ref={editorRef}
              value={code}
              onChange={handleCodeChange}
              className="w-full h-full bg-transparent border-none outline-none text-gray-100 font-mono text-sm leading-6 pl-16 pr-4 pt-4 resize-none"
              placeholder="Start coding..."
              spellCheck={false}
            />

            {/* Glassmorphic overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
          </motion.div>
        </div>

        {/* Suggestions Panel */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-80 bg-white/5 backdrop-blur-md border-l border-white/10 p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Suggestions
                </h3>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      variant="glass"
                      onClick={() => applySuggestion(suggestion)}
                      className="cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <div className="p-3">
                        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                          {suggestion}
                        </pre>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
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
          <span>Lines: {code.split('\n').length}</span>
          <span>Characters: {code.length}</span>
          <span>Language: {language}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400">Ready</span>
        </div>
      </motion.div>
    </div>
  );
};

export default CodeEditor; 