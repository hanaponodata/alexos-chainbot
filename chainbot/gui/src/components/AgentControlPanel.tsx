import React, { useState } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { usePersistentMemory } from '../hooks/usePersistentMemory';
import { SelfBuildDashboard } from './SelfBuildDashboard';
import { 
  Play, 
  Pause, 
  Settings, 
  Activity, 
  Users, 
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain,
  Code,
  Shield,
  Palette,
  BarChart3
} from 'lucide-react';

export const AgentControlPanel: React.FC = () => {
  const {
    agents,
    activeAgentId,
    actions,
    workflows,
    setActiveAgent,
    executeAgentAction,
    createWorkflow,
    executeWorkflow,
    getAgentActions,
    getAgentWorkflows
  } = useAgentStore();

  const { addContext } = usePersistentMemory();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'dashboard'>('control');

  const activeAgent = agents.find(a => a.id === activeAgentId);
  const selectedAgentData = selectedAgent ? agents.find(a => a.id === selectedAgent) : null;
  const agentActions = selectedAgent ? getAgentActions(selectedAgent) : [];
  const agentWorkflows = selectedAgent ? getAgentWorkflows(selectedAgent) : [];

  const quickActions = [
    {
      id: 'harry-deploy',
      agent: 'harry',
      action: 'Deploy Current Build',
      type: 'deploy' as const,
      description: 'Deploy the current application build to production'
    },
    {
      id: 'laka-theme',
      agent: 'laka',
      action: 'Apply Dark Theme',
      type: 'design' as const,
      description: 'Apply a modern dark theme to the application'
    },
    {
      id: 'devbot-refactor',
      agent: 'devbot',
      action: 'Refactor Current File',
      type: 'code' as const,
      description: 'Refactor the currently open file for better structure'
    },
    {
      id: 'guardbot-audit',
      agent: 'guardbot',
      action: 'Security Audit',
      type: 'security' as const,
      description: 'Perform a security audit of the current codebase'
    }
  ];

  const handleQuickAction = async (action: typeof quickActions[0]) => {
    const agent = agents.find(a => a.id === action.agent);
    if (!agent) return;

    setActiveAgent(action.agent);
    
    const result = await executeAgentAction(action.agent, {
      type: action.type,
      action: action.action,
      description: action.description,
      context: { source: 'quick_action' }
    });

    // Add to memory
    addContext({
      type: 'workflow',
      title: `Agent Action: ${action.action}`,
      content: {
        agent: agent.name,
        action: action.action,
        result: result.result,
        status: result.status
      },
      metadata: {
        agentId: action.agent,
        actionType: action.type,
        timestamp: new Date()
      },
      tags: ['agent-action', action.type, action.agent],
      priority: 8
    });
  };

  const handleCreateWorkflow = () => {
    const workflowId = createWorkflow({
      name: 'Self-Build Workflow',
      description: 'Automated workflow for building and deploying ChainBot GUI',
      agents: ['harry', 'devbot', 'guardbot'],
      steps: [
        {
          id: 'step1',
          agentId: 'devbot',
          type: 'code',
          action: 'Generate Tests',
          description: 'Generate comprehensive tests for the codebase',
          timestamp: new Date(),
          status: 'pending'
        },
        {
          id: 'step2',
          agentId: 'harry',
          type: 'deploy',
          action: 'Build and Deploy',
          description: 'Build the application and deploy to staging',
          timestamp: new Date(),
          status: 'pending'
        },
        {
          id: 'step3',
          agentId: 'guardbot',
          type: 'security',
          action: 'Security Review',
          description: 'Review the deployment for security issues',
          timestamp: new Date(),
          status: 'pending'
        }
      ],
      status: 'draft'
    });

    // Execute the workflow
    executeWorkflow(workflowId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Agent Control Panel</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreateWorkflow}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span>Start Self-Build</span>
          </button>
          <button
            onClick={() => setShowWorkflowBuilder(!showWorkflowBuilder)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Workflow Builder</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 bg-gray-800/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('control')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'control' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Agent Control</span>
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Self-Build Dashboard</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'control' ? (
        <>
          {/* Active Agent Status */}
          {activeAgent && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{activeAgent.avatar}</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{activeAgent.name}</h3>
                  <p className="text-sm text-gray-400">{activeAgent.role}</p>
                  <p className="text-xs text-gray-500">Last active: {activeAgent.lastActive.toLocaleTimeString()}</p>
                </div>
                <div className="ml-auto">
                  <div className="flex items-center space-x-1 text-sm text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(action => {
              const agent = agents.find(a => a.id === action.agent);
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  className="p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">{agent?.avatar}</span>
                    <span className="text-sm font-medium text-white">{agent?.name}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-200 mb-1">{action.action}</h4>
                  <p className="text-xs text-gray-400">{action.description}</p>
                </button>
              );
            })}
          </div>

          {/* Agent Grid */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Available Agents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedAgent === agent.id
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50'
                  }`}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{agent.avatar}</span>
                    <div>
                      <h3 className="font-semibold text-white">{agent.name}</h3>
                      <p className="text-xs text-gray-400">{agent.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">{agent.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map(cap => (
                      <span
                        key={cap}
                        className="px-2 py-1 text-xs bg-gray-700/50 text-gray-300 rounded"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Details */}
          {selectedAgentData && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">
                {selectedAgentData.name} - Activity & Workflows
              </h3>
              
              {/* Recent Actions */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Recent Actions</h4>
                <div className="space-y-2">
                  {agentActions.slice(0, 5).map(action => (
                    <div key={action.id} className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                      <div>
                        <div className="text-sm text-white">{action.action}</div>
                        <div className="text-xs text-gray-400">{action.description}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          action.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                          action.status === 'running' ? 'bg-yellow-600/20 text-yellow-400' :
                          action.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {action.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {action.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflows */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Workflows</h4>
                <div className="space-y-2">
                  {agentWorkflows.slice(0, 3).map(workflow => (
                    <div key={workflow.id} className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                      <div>
                        <div className="text-sm text-white">{workflow.name}</div>
                        <div className="text-xs text-gray-400">{workflow.description}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        workflow.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                        workflow.status === 'running' ? 'bg-yellow-600/20 text-yellow-400' :
                        'bg-gray-600/20 text-gray-400'
                      }`}>
                        {workflow.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">Active Actions</h3>
              </div>
              <div className="text-2xl font-bold text-white">
                {actions.filter(a => a.status === 'running').length}
              </div>
              <p className="text-sm text-gray-400">Currently executing</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-white">Active Agents</h3>
              </div>
              <div className="text-2xl font-bold text-white">
                {agents.filter(a => a.isActive).length}
              </div>
              <p className="text-sm text-gray-400">Ready for tasks</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Completed Today</h3>
              </div>
              <div className="text-2xl font-bold text-white">
                {actions.filter(a => a.status === 'completed' && 
                  a.timestamp.toDateString() === new Date().toDateString()).length}
              </div>
              <p className="text-sm text-gray-400">Successful actions</p>
            </div>
          </div>
        </>
      ) : (
        <SelfBuildDashboard />
      )}
    </div>
  );
};
