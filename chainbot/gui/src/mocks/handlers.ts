import { http, HttpResponse } from 'msw';

// Mock data for realistic responses
const mockAgents = [
  { 
    id: 'agent-1', 
    name: 'Laka', 
    avatar: '🦄', 
    status: 'online', 
    description: 'Your magical AI assistant', 
    capabilities: ['chat', 'code', 'workflow', 'analysis'],
    lastSeen: new Date().toISOString(),
    performance: { responseTime: 120, accuracy: 0.98, uptime: 99.9 }
  },
  { 
    id: 'agent-2', 
    name: 'Codey', 
    avatar: '🤖', 
    status: 'idle', 
    description: 'Code expert and reviewer', 
    capabilities: ['code', 'review', 'debug', 'optimize'],
    lastSeen: new Date(Date.now() - 300000).toISOString(),
    performance: { responseTime: 85, accuracy: 0.95, uptime: 99.7 }
  },
  { 
    id: 'agent-3', 
    name: 'Watcher', 
    avatar: '🦉', 
    status: 'monitoring', 
    description: 'System monitor and alert manager', 
    capabilities: ['logs', 'alerts', 'monitoring', 'security'],
    lastSeen: new Date().toISOString(),
    performance: { responseTime: 45, accuracy: 0.99, uptime: 100.0 }
  },
  { 
    id: 'agent-4', 
    name: 'Flow', 
    avatar: '🌊', 
    status: 'processing', 
    description: 'Workflow orchestrator', 
    capabilities: ['workflow', 'automation', 'integration'],
    lastSeen: new Date().toISOString(),
    performance: { responseTime: 200, accuracy: 0.97, uptime: 99.8 }
  }
];

const mockWorkflows = [
  { 
    id: 'wf-1', 
    name: 'Deploy App', 
    status: 'idle', 
    steps: ['build', 'test', 'deploy'],
    lastRun: null,
    successRate: 0.95,
    avgDuration: 180
  },
  { 
    id: 'wf-2', 
    name: 'Monitor System', 
    status: 'running', 
    steps: ['check logs', 'alert'],
    lastRun: new Date().toISOString(),
    successRate: 0.98,
    avgDuration: 30
  },
  { 
    id: 'wf-3', 
    name: 'Data Pipeline', 
    status: 'completed', 
    steps: ['extract', 'transform', 'load'],
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    successRate: 0.92,
    avgDuration: 600
  }
];

const mockLogs = [
  { id: 1, level: 'info', message: 'Agent Laka started', timestamp: new Date().toISOString(), agent: 'Laka' },
  { id: 2, level: 'warn', message: 'Watcher: High CPU usage detected', timestamp: new Date().toISOString(), agent: 'Watcher' },
  { id: 3, level: 'error', message: 'Codey: Lint error in main.js', timestamp: new Date().toISOString(), agent: 'Codey' },
  { id: 4, level: 'info', message: 'Flow: Workflow "Deploy App" completed successfully', timestamp: new Date().toISOString(), agent: 'Flow' },
  { id: 5, level: 'debug', message: 'System: Memory usage at 67%', timestamp: new Date().toISOString(), agent: 'System' }
];

export const handlers = [
  // Agents
  http.get('/api/agents', () => {
    return HttpResponse.json({
      agents: mockAgents,
      total: mockAgents.length,
      online: mockAgents.filter(a => a.status === 'online').length
    });
  }),

  http.get('/api/agents/:id', ({ params }) => {
    const agent = mockAgents.find(a => a.id === params.id);
    if (!agent) {
      return HttpResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return HttpResponse.json({ agent });
  }),

  http.post('/api/agents/:id/start', () => {
    return HttpResponse.json({ 
      success: true, 
      message: 'Agent started successfully',
      agent: { ...mockAgents[0], status: 'online' }
    });
  }),

  http.post('/api/agents/:id/stop', () => {
    return HttpResponse.json({ 
      success: true, 
      message: 'Agent stopped successfully',
      agent: { ...mockAgents[0], status: 'idle' }
    });
  }),

  // Chat with streaming simulation
  http.post('/api/chat', async ({ request }) => {
    const { messages, agentId = 'agent-1' } = await request.json() as any;
    const lastMessage = messages[messages.length - 1]?.content || '';
    const agent = mockAgents.find(a => a.id === agentId);
    
    // Simulate agent typing delay
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
    
    // Simulate random error
    if (Math.random() < 0.05) {
      return HttpResponse.json({ error: 'Agent is busy, try again!' }, { status: 500 });
    }

    // Generate contextual response based on message content
    let response = '';
    if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
      response = `Hello! I'm ${agent?.name || 'Laka'}, your AI assistant. How can I help you today?`;
    } else if (lastMessage.toLowerCase().includes('code') || lastMessage.toLowerCase().includes('program')) {
      response = `I'd be happy to help with coding! Here's a simple example:\n\n\`\`\`javascript\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\`\`\``;
    } else if (lastMessage.toLowerCase().includes('workflow') || lastMessage.toLowerCase().includes('automate')) {
      response = `I can help you create workflows! Here's what we can automate:\n\n• **Build & Deploy**: Automated testing and deployment\n• **Monitoring**: System health checks and alerts\n• **Data Processing**: ETL pipelines and analysis`;
    } else {
      response = `I understand you said: "${lastMessage}"\n\nI'm here to help with coding, workflows, monitoring, and more. What would you like to work on?`;
    }

    return HttpResponse.json({
      response,
      agent: agent?.name || 'Laka',
      timestamp: new Date().toISOString(),
      messageId: `msg_${Date.now()}`,
      status: 'completed'
    });
  }),

  // Streaming chat simulation
  http.post('/api/chat/stream', async ({ request }) => {
    const { messages, agentId = 'agent-1' } = await request.json() as any;
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Simulate streaming response
    const response = `I'm processing your request: "${lastMessage}"...\n\nThis is a streaming response that would normally come in chunks. In a real implementation, you'd see this text appear gradually as the AI generates it.`;
    
    return HttpResponse.json({
      response,
      agent: 'Laka',
      timestamp: new Date().toISOString(),
      messageId: `stream_${Date.now()}`,
      status: 'streaming'
    });
  }),

  // Code suggestions with context
  http.post('/api/code/suggestions', async ({ request }) => {
    const { context, language = 'javascript' } = await request.json() as any;
    await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
    
    const suggestions: Record<string, string[]> = {
      javascript: [
        'function helloWorld() {\n  console.log("Hello, world!");\n}',
        'const sum = (a, b) => a + b;',
        'for (let i = 0; i < 10; i++) {\n  // ...\n}',
        'const asyncFunction = async () => {\n  const result = await fetch("/api/data");\n  return result.json();\n}'
      ],
      python: [
        'def hello_world():\n    print("Hello, world!")',
        'sum = lambda a, b: a + b',
        'for i in range(10):\n    # ...\n    pass',
        'async def async_function():\n    async with aiohttp.ClientSession() as session:\n        async with session.get("/api/data") as response:\n            return await response.json()'
      ],
      typescript: [
        'function helloWorld(): void {\n  console.log("Hello, world!");\n}',
        'const sum = (a: number, b: number): number => a + b;',
        'interface User {\n  id: string;\n  name: string;\n  email: string;\n}',
        'const fetchUser = async (id: string): Promise<User> => {\n  const response = await fetch(\`/api/users/\${id}\`);\n  return response.json();\n}'
      ]
    };

    return HttpResponse.json({
      suggestions: suggestions[language as keyof typeof suggestions] || suggestions.javascript,
      language,
      context: context || 'general'
    });
  }),

  // Logs with filtering
  http.get('/api/logs', ({ request }) => {
    const url = new URL(request.url);
    const level = url.searchParams.get('level');
    const agent = url.searchParams.get('agent');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    let filteredLogs = mockLogs;
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    if (agent) {
      filteredLogs = filteredLogs.filter(log => log.agent === agent);
    }
    
    return HttpResponse.json({
      logs: filteredLogs.slice(0, limit),
      total: filteredLogs.length,
      levels: ['info', 'warn', 'error', 'debug'],
      agents: [...new Set(mockLogs.map(log => log.agent))]
    });
  }),

  // Workflows
  http.get('/api/workflows', () => {
    return HttpResponse.json({
      workflows: mockWorkflows,
      total: mockWorkflows.length,
      running: mockWorkflows.filter(w => w.status === 'running').length
    });
  }),

  http.post('/api/workflows', async ({ request }) => {
    const { name, description, steps } = await request.json() as any;
    const newWorkflow = {
      id: `wf-${Date.now()}`,
      name,
      description,
      steps,
      status: 'idle',
      lastRun: null,
      successRate: 0,
      avgDuration: 0
    };
    
    return HttpResponse.json({ 
      success: true, 
      workflow: newWorkflow,
      message: 'Workflow created successfully'
    });
  }),

  http.post('/api/workflows/:id/start', () => {
    return HttpResponse.json({ 
      success: true, 
      message: 'Workflow started successfully',
      executionId: `exec_${Date.now()}`
    });
  }),

  // Watchtower endpoints
  http.get('/api/watchtower/status', () => {
    return HttpResponse.json({
      status: 'running',
      uptime: '2d 14h 32m',
      version: '2.8.1',
      targets: 12,
      alerts: 3,
      lastCheck: new Date().toISOString()
    });
  }),

  http.get('/api/watchtower/targets', () => {
    return HttpResponse.json({
      targets: [
        { id: 'target-1', name: 'web-app', status: 'healthy', lastCheck: new Date().toISOString() },
        { id: 'target-2', name: 'api-server', status: 'warning', lastCheck: new Date().toISOString() },
        { id: 'target-3', name: 'database', status: 'healthy', lastCheck: new Date().toISOString() }
      ]
    });
  }),

  http.get('/api/watchtower/alerts', () => {
    return HttpResponse.json({
      alerts: [
        { id: 'alert-1', severity: 'warning', message: 'High CPU usage on api-server', timestamp: new Date().toISOString() },
        { id: 'alert-2', severity: 'info', message: 'Database backup completed', timestamp: new Date().toISOString() },
        { id: 'alert-3', severity: 'error', message: 'Service timeout on web-app', timestamp: new Date().toISOString() }
      ]
    });
  }),

  // User profile and personalization
  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      id: 'user-1',
      name: 'Alex',
      email: 'alex@example.com',
      avatar: '👨‍💻',
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: true,
        autoSave: true
      },
      stats: {
        totalSessions: 156,
        favoriteAgent: 'Laka',
        lastActive: new Date().toISOString()
      }
    });
  }),

  http.put('/api/user/preferences', async ({ request }) => {
    const preferences = await request.json();
    return HttpResponse.json({ 
      success: true, 
      preferences,
      message: 'Preferences updated successfully'
    });
  }),

  // Command palette suggestions
  http.get('/api/commands', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    const allCommands = [
      { id: 'chat', name: 'Start Chat', description: 'Open chat with AI agents', icon: '💬', category: 'communication' },
      { id: 'workflow', name: 'Create Workflow', description: 'Build a new automation workflow', icon: '⚡', category: 'automation' },
      { id: 'code', name: 'Open Code Editor', description: 'Launch the code editor', icon: '📝', category: 'development' },
      { id: 'agents', name: 'Manage Agents', description: 'View and manage AI agents', icon: '🤖', category: 'management' },
      { id: 'watchtower', name: 'Open Watchtower', description: 'Access system monitoring', icon: '🦉', category: 'monitoring' },
      { id: 'settings', name: 'Settings', description: 'Configure application settings', icon: '⚙️', category: 'system' },
      { id: 'help', name: 'Help', description: 'Get help and documentation', icon: '❓', category: 'system' }
    ];

    const filteredCommands = query 
      ? allCommands.filter(cmd => 
          cmd.name.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description.toLowerCase().includes(query.toLowerCase())
        )
      : allCommands;

    return HttpResponse.json({
      commands: filteredCommands,
      categories: [...new Set(allCommands.map(cmd => cmd.category))]
    });
  }),

  // System status
  http.get('/api/system/status', () => {
    return HttpResponse.json({
      status: 'healthy',
      uptime: '5d 2h 15m',
      version: '1.0.0',
      resources: {
        cpu: 23,
        memory: 67,
        disk: 45,
        network: 12
      },
      services: {
        agents: 'running',
        watchtower: 'running',
        database: 'running',
        api: 'running'
      }
    });
  })
]; 