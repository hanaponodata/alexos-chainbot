export const mockFileContents: Record<string, string> = {
  '/src/App.tsx': `import React from 'react';\n\nconst app = () => <div>Hello, ChainBot!</div>\n\nexport default App`,
  '/src/index.css': `body {\n  background: #101014;\n  color: #fff;\n}`,
};

// Mock AI suggestions
export const mockAISuggestions: Record<string, Array<{
  label: string;
  kind: string;
  detail: string;
  insertText: string;
  documentation: string;
}>> = {
  '/src/App.tsx': [
    { label: 'useState', kind: 'function', detail: 'React Hook', insertText: 'useState', documentation: 'React state hook for functional components' },
    { label: 'useEffect', kind: 'function', detail: 'React Hook', insertText: 'useEffect', documentation: 'React effect hook for side effects' },
    { label: 'ChainBot', kind: 'class', detail: 'Component', insertText: 'ChainBot', documentation: 'Main ChainBot component' },
    { label: 'handleClick', kind: 'function', detail: 'Event Handler', insertText: 'const handleClick = () => {\n  // TODO: Implement click handler\n}', documentation: 'Click event handler' },
  ],
  '/src/index.css': [
    { label: 'glassmorphism', kind: 'snippet', detail: 'CSS Effect', insertText: 'background: rgba(255, 255, 255, 0.1);\nbackdrop-filter: blur(10px);\nborder: 1px solid rgba(255, 255, 255, 0.2);', documentation: 'Glassmorphism effect' },
    { label: 'gradient', kind: 'snippet', detail: 'CSS Effect', insertText: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);', documentation: 'Beautiful gradient background' },
  ]
};

// Mock AI error diagnostics
export const mockErrorDiagnostics: Record<string, Array<{
  range: { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number };
  message: string;
  severity: number;
  source: string;
  code: string;
  aiExplanation: string;
  aiFix: string;
  aiCode: string;
}>> = {
  '/src/App.tsx': [
    {
      range: { startLineNumber: 2, endLineNumber: 2, startColumn: 1, endColumn: 50 },
      message: 'React component should start with uppercase letter',
      severity: 2, // Error
      source: 'AI Analysis',
      code: 'react-component-naming',
      aiExplanation: 'React components must start with an uppercase letter to distinguish them from regular HTML elements. This helps React differentiate between custom components and built-in DOM elements.',
      aiFix: 'Rename the component from "app" to "App"',
      aiCode: 'const App = () => <div>Hello, ChainBot!</div>;'
    },
    {
      range: { startLineNumber: 3, endLineNumber: 3, startColumn: 1, endColumn: 30 },
      message: 'Missing semicolon after export statement',
      severity: 1, // Warning
      source: 'AI Analysis',
      code: 'missing-semicolon',
      aiExplanation: 'While JavaScript doesn\'t require semicolons due to automatic semicolon insertion (ASI), it\'s a best practice to include them for clarity and to avoid potential parsing issues.',
      aiFix: 'Add semicolon after the export statement',
      aiCode: 'export default App;'
    }
  ]
};

export const mockDecorations = [
  // Error on line 2
  { range: { startLineNumber: 2, endLineNumber: 2, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: 'mock-error-line', glyphMarginClassName: 'mock-error-glyph' } },
  // Warning on line 3
  { range: { startLineNumber: 3, endLineNumber: 3, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: 'mock-warning-line', glyphMarginClassName: 'mock-warning-glyph' } },
  // Git diff on line 4
  { range: { startLineNumber: 4, endLineNumber: 4, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: 'mock-git-line', glyphMarginClassName: 'mock-git-glyph' } },
  // Agent suggestion (lightbulb) on line 5
  { range: { startLineNumber: 5, endLineNumber: 5, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: 'mock-agent-line', glyphMarginClassName: 'mock-agent-glyph' } },
]; 