// Mock Git data
export const mockGitData = {
  branch: 'feature/ai-integration',
  status: 'modified',
  stagedFiles: ['/src/App.tsx'],
  unstagedFiles: ['/src/index.css'],
  recentCommits: [
    {
      hash: 'abc123',
      message: 'feat: add AI-powered code suggestions',
      author: 'Alex',
      date: '2 hours ago'
    },
    {
      hash: 'def456',
      message: 'fix: resolve TypeScript linting issues',
      author: 'Alex',
      date: '4 hours ago'
    }
  ],
  diff: {
    '/src/App.tsx': {
      additions: 15,
      deletions: 3,
      changes: [
        { line: 2, type: 'add', content: 'const App = () => <div>Hello, ChainBot!</div>;' },
        { line: 3, type: 'del', content: 'const app = () => <div>Hello, ChainBot!</div>' },
        { line: 4, type: 'add', content: 'export default App;' }
      ]
    }
  }
}; 