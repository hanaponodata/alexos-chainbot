import React, { useState } from 'react';
import { Lightbulb, Sparkles, MessageSquare, Code, Zap, Check, X } from 'lucide-react';
import { usePersistentMemory } from '../../hooks/usePersistentMemory';

interface AICodeActionsProps {
  selectedCode: string;
  filePath: string;
  lineNumber: number;
  onApplyChanges: (newCode: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export const AICodeActions: React.FC<AICodeActionsProps> = ({
  selectedCode,
  filePath,
  lineNumber,
  onApplyChanges,
  onClose,
  position
}) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ code: string; explanation: string } | null>(null);
  const { addContext } = usePersistentMemory();

  const actions = [
    {
      id: 'explain',
      label: 'Explain this code',
      icon: MessageSquare,
      description: 'Get a detailed explanation of the selected code'
    },
    {
      id: 'refactor',
      label: 'Refactor for clarity',
      icon: Code,
      description: 'Improve code readability and structure'
    },
    {
      id: 'optimize',
      label: 'Optimize performance',
      icon: Zap,
      description: 'Improve code performance and efficiency'
    },
    {
      id: 'add-docs',
      label: 'Add documentation',
      icon: Lightbulb,
      description: 'Add JSDoc comments and inline documentation'
    },
    {
      id: 'fix-bugs',
      label: 'Fix potential bugs',
      icon: Sparkles,
      description: 'Identify and fix common issues'
    },
    {
      id: 'add-tests',
      label: 'Generate tests',
      icon: Check,
      description: 'Create unit tests for the selected code'
    }
  ];

  // Mock AI processing
  const processAction = async (actionId: string) => {
    setIsProcessing(true);
    setSelectedAction(actionId);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    let processedCode = selectedCode;
    let explanation = '';

    switch (actionId) {
      case 'explain':
        explanation = `This code ${selectedCode.length > 50 ? 'appears to be' : 'is'} a ${selectedCode.includes('function') ? 'function definition' : selectedCode.includes('const') ? 'variable declaration' : 'code block'} that ${selectedCode.includes('async') ? 'performs asynchronous operations' : 'executes synchronously'}.`;
        break;
      
      case 'refactor':
        processedCode = selectedCode
          .replace(/const\s+(\w+)\s*=\s*\(/g, 'const $1 = (')
          .replace(/\s*{\s*/g, ' {\n  ')
          .replace(/\s*}\s*/g, '\n}');
        explanation = 'Refactored code for better readability with consistent formatting and spacing.';
        break;
      
      case 'optimize':
        if (selectedCode.includes('forEach')) {
          processedCode = selectedCode.replace(/\.forEach\(/g, '.map(');
          explanation = 'Replaced forEach with map for better performance and functional programming style.';
        } else {
          explanation = 'Code appears to be already optimized for performance.';
        }
        break;
      
      case 'add-docs':
        const functionName = selectedCode.match(/function\s+(\w+)/)?.[1] || 'function';
        processedCode = `/**
 * ${functionName} - ${selectedCode.includes('async') ? 'Asynchronously ' : ''}performs an operation
 * @param {any} params - The input parameters
 * @returns {Promise<any>} The result of the operation
 */
${selectedCode}`;
        explanation = 'Added comprehensive JSDoc documentation with parameter and return type descriptions.';
        break;
      
      case 'fix-bugs':
        processedCode = selectedCode
          .replace(/console\.log/g, 'console.error')
          .replace(/(\w+)\s*=\s*(\w+)\s*\|\|\s*null/g, '$1 = $2 ?? null');
        explanation = 'Fixed potential issues: replaced console.log with console.error for debugging, and used nullish coalescing operator.';
        break;
      
      case 'add-tests':
        const testName = selectedCode.match(/function\s+(\w+)/)?.[1] || 'testFunction';
        processedCode = `// Test for ${testName}
describe('${testName}', () => {
  it('should work correctly', () => {
    // Add your test cases here
    expect(${testName}()).toBeDefined();
  });
});`;
        explanation = 'Generated basic test structure with describe and it blocks for the selected code.';
        break;
    }

    setResult({ code: processedCode, explanation });
    setIsProcessing(false);

    // Add to memory
    addContext({
      type: 'code',
      title: `AI Action: ${actions.find(a => a.id === actionId)?.label}`,
      content: {
        action: actionId,
        originalCode: selectedCode,
        processedCode,
        explanation,
        filePath,
        line: lineNumber
      },
      metadata: {
        actionType: actionId,
        filePath,
        line: lineNumber
      },
      tags: ['ai-action', 'code-improvement', actionId],
      priority: 8
    });
  };

  const handleApply = () => {
    if (result) {
      onApplyChanges(result.code);
      onClose();
    }
  };

  return (
    <div
      className="fixed z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl min-w-64"
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">AI Code Actions</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions List */}
      {!selectedAction && (
        <div className="p-2">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => processAction(action.id)}
              className="w-full flex items-start space-x-3 p-3 text-left hover:bg-gray-800/50 rounded-lg transition-colors group"
            >
              <action.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-white">{action.label}</div>
                <div className="text-xs text-gray-400">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="p-4 text-center">
          <Zap className="w-6 h-6 text-blue-400 animate-pulse mx-auto mb-2" />
          <div className="text-sm text-gray-300">Processing with AI...</div>
        </div>
      )}

      {/* Results */}
      {result && !isProcessing && (
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-white mb-2">Explanation:</h4>
            <p className="text-sm text-gray-300">{result.explanation}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-white mb-2">Updated Code:</h4>
            <pre className="text-xs bg-gray-800/50 border border-gray-600/50 rounded p-2 text-gray-200 overflow-auto max-h-32">
              <code>{result.code}</code>
            </pre>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm">Apply Changes</span>
            </button>
            <button
              onClick={() => {
                setSelectedAction(null);
                setResult(null);
              }}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm">Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
