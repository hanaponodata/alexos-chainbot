import React, { useState, useRef } from 'react';
import { Sparkles, Code, Copy, Check, X, Zap } from 'lucide-react';
import { usePersistentMemory } from '../../hooks/usePersistentMemory';

interface CodeGenerationPanelProps {
  onInsertCode: (code: string, position: { line: number; column: number }) => void;
  filePath: string;
  currentLine: number;
  currentColumn: number;
  onClose: () => void;
}

export const CodeGenerationPanel: React.FC<CodeGenerationPanelProps> = ({
  onInsertCode,
  filePath,
  currentLine,
  currentColumn,
  onClose
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const { addContext } = usePersistentMemory();
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Mock AI code generation
  const generateCode = async (userPrompt: string) => {
    setIsGenerating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock responses based on prompt keywords
    let response = '';
    const lowerPrompt = userPrompt.toLowerCase();

    if (lowerPrompt.includes('react') && lowerPrompt.includes('component')) {
      response = `import React from 'react';

interface ${userPrompt.match(/create\s+(\w+)/i)?.[1] || 'MyComponent'}Props {
  // Add your props here
}

export const ${userPrompt.match(/create\s+(\w+)/i)?.[1] || 'MyComponent'}: React.FC<${userPrompt.match(/create\s+(\w+)/i)?.[1] || 'MyComponent'}Props> = ({}) => {
  return (
    <div className="p-4">
      <h2>${userPrompt.match(/create\s+(\w+)/i)?.[1] || 'MyComponent'}</h2>
      {/* Add your component content here */}
    </div>
  );
};`;
    } else if (lowerPrompt.includes('function') || lowerPrompt.includes('method')) {
      response = `const ${userPrompt.match(/(\w+)\s+function/i)?.[1] || 'myFunction'} = async (params) => {
  try {
    // Add your function logic here
    const result = await someApiCall(params);
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};`;
    } else if (lowerPrompt.includes('api') || lowerPrompt.includes('fetch')) {
      response = `const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(\`/api/\${endpoint}\`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  return response.json();
};`;
    } else if (lowerPrompt.includes('hook') || lowerPrompt.includes('use')) {
      response = `const use${userPrompt.match(/use(\w+)/i)?.[1] || 'Custom'} = () => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async () => {
    setLoading(true);
    setError(null);
    try {
      // Add your hook logic here
      const result = await someAsyncOperation();
      setState(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { state, loading, error, execute };
};`;
    } else {
      response = `// Generated code based on: "${userPrompt}"
// TODO: Implement the requested functionality

const generatedFunction = () => {
  // Add your implementation here
  console.log('Generated function called');
  return 'Hello from generated code!';
};`;
    }

    setGeneratedCode(response);
    setIsGenerating(false);

    // Add to memory
    addContext({
      type: 'code',
      title: `Code Generation: ${userPrompt.substring(0, 50)}...`,
      content: {
        prompt: userPrompt,
        generatedCode: response,
        filePath,
        line: currentLine,
        column: currentColumn
      },
      metadata: {
        generationType: 'prompt_based',
        filePath,
        line: currentLine
      },
      tags: ['code-generation', 'ai', 'prompt'],
      priority: 7
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      generateCode(prompt.trim());
    }
  };

  const handleInsert = () => {
    if (generatedCode) {
      onInsertCode(generatedCode, { line: currentLine, column: currentColumn });
      onClose();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickPrompts = [
    'Create a React component',
    'Write a function to handle API calls',
    'Create a custom hook',
    'Add error handling',
    'Implement form validation',
    'Create a utility function'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">AI Code Generation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col p-4 space-y-4">
          {/* Quick Prompts */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Quick Prompts</h3>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((quickPrompt, index) => (
                <button
                  key={index}
                  onClick={() => setPrompt(quickPrompt)}
                  className="px-3 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-md transition-colors"
                >
                  {quickPrompt}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <label className="text-sm font-medium text-gray-300 mb-2">
              Describe what you want to generate:
            </label>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Create a React component for a user profile card with avatar, name, and bio..."
              className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded-lg p-3 text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
            >
              {isGenerating ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Code className="w-4 h-4" />
                  <span>Generate Code</span>
                </>
              )}
            </button>
          </form>

          {/* Generated Code */}
          {generatedCode && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">Generated Code:</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleInsert}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                  >
                    <Code className="w-3 h-3" />
                    <span>Insert</span>
                  </button>
                </div>
              </div>
              <pre className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded-lg p-3 text-sm text-gray-200 overflow-auto">
                <code>{generatedCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
