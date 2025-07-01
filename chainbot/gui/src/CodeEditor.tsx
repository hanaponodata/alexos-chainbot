import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  Play, 
  Save, 
  RefreshCw,
  FileText
} from 'lucide-react';
import Editor from '@monaco-editor/react';

// Temporary cn function until dependencies are installed
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

interface CodeFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isModified: boolean;
  agent?: string;
}

interface AgentContext {
  id: string;
  name: string;
  type: string;
  status: string;
  documentation: string;
  capabilities: string[];
  logs: string[];
}

interface CodeEditorProps {
  sessionId?: number;
}

const CodeEditor: React.FC = () => {
  const { token } = useAuth();
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFile, setActiveFile] = useState<CodeFile | null>(null);
  const [agentContext, setAgentContext] = useState<AgentContext | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const editorRef = useRef<any>(null);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000';

  useEffect(() => {
    if (token) {
      loadFiles();
      loadAgentContext();
    }
  }, [token]);

  const loadFiles = async () => {
    try {
      const response = await fetch(`${API_BASE}/code/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        if (data.files && data.files.length > 0) {
          setActiveFile(data.files[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const loadAgentContext = async () => {
    try {
      const response = await fetch(`${API_BASE}/code/context`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgentContext(data);
      }
    } catch (error) {
      console.error('Failed to load agent context:', error);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Set up AI code completion
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model: any, position: any) => {
        return {
          suggestions: aiSuggestions.map(suggestion => ({
            label: suggestion,
            kind: monaco.languages.CompletionItemKind.Text,
            insertText: suggestion
          }))
        };
      }
    });

    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (model: any, position: any) => {
        return {
          suggestions: aiSuggestions.map(suggestion => ({
            label: suggestion,
            kind: monaco.languages.CompletionItemKind.Text,
            insertText: suggestion
          }))
        };
      }
    });
  };

  const handleFileChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      const updatedFile = { ...activeFile, content: value, isModified: true };
      setActiveFile(updatedFile);
      setFiles((prev: CodeFile[]) => prev.map((f: CodeFile) => f.id === activeFile.id ? updatedFile : f));
    }
  };

  const saveFile = async () => {
    if (!activeFile || !token) return;

    try {
      const response = await fetch(`${API_BASE}/code/files/${activeFile.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: activeFile.content,
          language: activeFile.language
        })
      });

      if (response.ok) {
        const updatedFile = { ...activeFile, isModified: false };
        setActiveFile(updatedFile);
        setFiles(prev => prev.map(f => f.id === activeFile.id ? updatedFile : f));
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const runCode = async () => {
    if (!activeFile) return;

    try {
      const response = await fetch(`${API_BASE}/code/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: activeFile.id,
          content: activeFile.content,
          language: activeFile.language,
          agent: agentContext?.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Code executed successfully', result);
      } else {
        const error = await response.json();
        console.error('Execution failed', error);
      }
    } catch (error) {
      console.error('Execution failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const getAiSuggestions = async () => {
    if (!activeFile) return;

    try {
      const response = await fetch(`${API_BASE}/code/suggestions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: activeFile.content,
          language: activeFile.language,
          agent: agentContext?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      // Remove demo suggestions fallback
      setAiSuggestions([]);
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell'
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-[#f7f8fa] to-[#e9ecf3]">
      {/* File Tree Sidebar */}
      <aside className="w-72 min-w-[220px] max-w-[320px] h-full bg-white rounded-xl shadow-lg m-4 flex flex-col transition-all">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Files</h2>
          <button
            onClick={loadFiles}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => setActiveFile(file)}
              className={`group p-3 mb-2 rounded-lg cursor-pointer transition border border-transparent hover:border-blue-200 hover:bg-blue-50 flex items-center gap-2 ${activeFile?.id === file.id ? 'bg-blue-100 border-blue-400' : ''}`}
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
              {file.isModified && <span className="w-2 h-2 bg-orange-500 rounded-full ml-2"></span>}
              {file.agent && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">{file.agent}</span>}
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-gray-100 flex gap-2">
          <button
            onClick={saveFile}
            className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Save className="w-3 h-3 mr-1" />Save
          </button>
          <button
            onClick={runCode}
            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Play className="w-3 h-3 mr-1" />Run
          </button>
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col h-full bg-white rounded-xl shadow-lg m-4 ml-0 transition-all">
        {/* Tabs */}
        <div className="flex items-center border-b border-gray-100 bg-gradient-to-r from-[#f7f8fa] to-[#e9ecf3] rounded-t-xl px-4 py-2 gap-2">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => setActiveFile(file)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition border-b-2 ${activeFile?.id === file.id ? 'bg-white text-blue-600 border-blue-600 shadow' : 'text-gray-600 hover:bg-gray-50 border-transparent'}`}
            >
              <FileText className="w-4 h-4" />
              <span>{file.name}</span>
              {file.isModified && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
              {file.agent && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">{file.agent}</span>}
            </button>
          ))}
        </div>
        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          {activeFile ? (
            <Editor
              height="100%"
              defaultLanguage={getLanguageFromFileName(activeFile.name)}
              value={activeFile.content}
              onChange={handleFileChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 15,
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                hover: { enabled: true },
                formatOnPaste: true,
                formatOnType: true
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No File Open</h3>
                <p className="text-sm mb-4">Open a file from the sidebar or create a new one to start coding.</p>
              </div>
            </div>
          )}
        </div>
        {/* Status Bar */}
        <footer className="h-10 border-t border-gray-100 bg-gradient-to-r from-[#f7f8fa] to-[#e9ecf3] rounded-b-xl flex items-center px-6 text-xs text-gray-600 gap-6">
          {activeFile && (
            <>
              <span className="font-mono">{activeFile.path}</span>
              <span>{activeFile.language}</span>
              {activeFile.isModified && <span className="text-orange-500">● Unsaved</span>}
              {agentContext && <span className="ml-4">Agent: <span className="font-semibold text-blue-700">{agentContext.name}</span></span>}
            </>
          )}
          <span className="ml-auto">ChainBot Cursor Editor</span>
        </footer>
      </main>
    </div>
  );
};

export default CodeEditor; 