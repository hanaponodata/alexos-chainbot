import React, { useState, useEffect } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { usePersistentMemory } from '../hooks/usePersistentMemory';
import { 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Brain,
  Code,
  Shield,
  Palette,
  Wrench,
  Users,
  TrendingUp,
  Activity,
  GitBranch,
  Package,
  Server
} from 'lucide-react';

interface BuildStatus {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agent: string;
  timestamp: Date;
  duration?: number;
  result?: any;
}

interface SelfBuildMetrics {
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  averageBuildTime: number;
  activeAgents: number;
  memoryContexts: number;
  lastBuildTime: Date;
}

export const SelfBuildDashboard: React.FC = () => {
  const { agents, actions, workflows } = useAgentStore();
  const { memoryStats } = usePersistentMemory();
  const [buildHistory, setBuildHistory] = useState<BuildStatus[]>([]);
  const [metrics, setMetrics] = useState<SelfBuildMetrics>({
    totalBuilds: 0,
    successfulBuilds: 0,
    failedBuilds: 0,
    averageBuildTime: 0,
    activeAgents: 0,
    memoryContexts: 0,
    lastBuildTime: new Date()
  });

  // Simulate build history from agent actions
  useEffect(() => {
    const buildActions = actions.filter(action => 
      action.type === 'deploy' || action.type === 'code' || action.type === 'security'
    );
    
    const history: BuildStatus[] = buildActions.map(action => ({
      id: action.id,
      name: action.action,
      status: action.status,
      agent: action.agentId,
      timestamp: action.timestamp,
      duration: Math.random() * 300 + 60, // 1-6 minutes
      result: action.result
    }));

    setBuildHistory(history);

    // Calculate metrics
    const totalBuilds = history.length;
    const successfulBuilds = history.filter(b => b.status === 'completed').length;
    const failedBuilds = history.filter(b => b.status === 'failed').length;
    const averageBuildTime = history.length > 0 
      ? history.reduce((sum, b) => sum + (b.duration || 0), 0) / history.length 
      : 0;

    setMetrics({
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      averageBuildTime,
      activeAgents: agents.filter(a => a.isActive).length,
      memoryContexts: memoryStats.totalContexts,
      lastBuildTime: history.length > 0 ? history[0].timestamp : new Date()
    });
  }, [actions, agents, memoryStats]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'running':
        return <Activity className="w-5 h-5 text-yellow-400 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAgentIcon = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.avatar : '🤖';
  };

  const getAgentColor = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.color : '#6B7280';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="w-8 h-8 text-yellow-400" />
          <h1 className="text-2xl font-bold text-white">Self-Build Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Self-Build Active</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Total Builds</h3>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.totalBuilds}</div>
          <p className="text-sm text-gray-400">All time</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-white">Success Rate</h3>
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.totalBuilds > 0 ? Math.round((metrics.successfulBuilds / metrics.totalBuilds) * 100) : 0}%
          </div>
          <p className="text-sm text-gray-400">{metrics.successfulBuilds} successful</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-white">Avg Build Time</h3>
          </div>
          <div className="text-2xl font-bold text-white">{formatDuration(metrics.averageBuildTime)}</div>
          <p className="text-sm text-gray-400">Per build</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-white">Active Agents</h3>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.activeAgents}</div>
          <p className="text-sm text-gray-400">Ready for tasks</p>
        </div>
      </div>

      {/* Agent Status */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
        <h2 className="text-lg font-semibold text-white mb-4">Agent Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map(agent => {
            const agentActions = actions.filter(a => a.agentId === agent.id);
            const recentActions = agentActions.slice(0, 3);
            const successRate = agentActions.length > 0 
              ? (agentActions.filter(a => a.status === 'completed').length / agentActions.length) * 100 
              : 0;

            return (
              <div key={agent.id} className="p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{agent.avatar}</span>
                  <div>
                    <div className="font-medium text-white">{agent.name}</div>
                    <div className="text-xs text-gray-400">{agent.role}</div>
                  </div>
                  <div className="ml-auto">
                    <div className="flex items-center space-x-1 text-xs text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Active</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Success Rate:</span>
                    <span className="text-white">{Math.round(successRate)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Actions:</span>
                    <span className="text-white">{agentActions.length}</span>
                  </div>
                </div>

                {recentActions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-600/30">
                    <div className="text-xs text-gray-400 mb-1">Recent:</div>
                    {recentActions.map(action => (
                      <div key={action.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 truncate">{action.action}</span>
                        <span className={`px-1 rounded ${
                          action.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                          action.status === 'running' ? 'bg-yellow-600/20 text-yellow-400' :
                          'bg-red-600/20 text-red-400'
                        }`}>
                          {action.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Build History */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Build History</h2>
        <div className="space-y-2">
          {buildHistory.slice(0, 10).map(build => (
            <div key={build.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(build.status)}
                <div>
                  <div className="text-white font-medium">{build.name}</div>
                  <div className="text-xs text-gray-400">
                    {build.timestamp.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="text-lg">{getAgentIcon(build.agent)}</span>
                  <span className="text-xs text-gray-400">
                    {agents.find(a => a.id === build.agent)?.name}
                  </span>
                </div>
                
                {build.duration && (
                  <div className="text-xs text-gray-400">
                    {formatDuration(build.duration)}
                  </div>
                )}
                
                <span className={`px-2 py-1 rounded text-xs ${
                  build.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                  build.status === 'running' ? 'bg-yellow-600/20 text-yellow-400' :
                  build.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                  'bg-gray-600/20 text-gray-400'
                }`}>
                  {build.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Memory System</h3>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.memoryContexts}</div>
          <p className="text-sm text-gray-400">Contexts stored</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <GitBranch className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-white">Version Control</h3>
          </div>
          <div className="text-2xl font-bold text-white">v2.1.0</div>
          <p className="text-sm text-gray-400">Current build</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Server className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-white">Deployment</h3>
          </div>
          <div className="text-2xl font-bold text-white">Live</div>
          <p className="text-sm text-gray-400">Production ready</p>
        </div>
      </div>
    </div>
  );
};
