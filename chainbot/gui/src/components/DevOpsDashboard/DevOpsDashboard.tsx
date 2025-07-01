import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  GitBranch,
  GitCommit,
  Download,
  Upload,
  Server,
  Database,
  Globe,
  Settings,
  Terminal,
  Activity,
  BarChart3,
  Zap
} from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';

interface BuildStatus {
  id: string;
  name: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  startTime: string;
  endTime?: string;
  duration?: number;
  logs: string[];
  agent: string;
}

interface DeploymentStatus {
  id: string;
  environment: 'development' | 'staging' | 'production';
  status: 'deploying' | 'success' | 'failed' | 'pending';
  version: string;
  startTime: string;
  endTime?: string;
  agent: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export const DevOpsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builds' | 'deployments' | 'metrics' | 'agents'>('builds');
  const [builds, setBuilds] = useState<BuildStatus[]>([]);
  const [deployments, setDeployments] = useState<DeploymentStatus[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 62,
    disk: 28,
    network: 15
  });
  const [isLoading, setIsLoading] = useState(false);
  const { agents, executeAgentAction } = useAgentStore();

  // Mock data initialization
  useEffect(() => {
    setBuilds([
      {
        id: '1',
        name: 'Frontend Build',
        status: 'success',
        startTime: '2024-01-15 14:30',
        endTime: '2024-01-15 14:32',
        duration: 120,
        logs: ['Building frontend...', 'Compiling TypeScript...', 'Bundle created successfully'],
        agent: 'harry'
      },
      {
        id: '2',
        name: 'Backend Build',
        status: 'running',
        startTime: '2024-01-15 14:35',
        logs: ['Building backend...', 'Installing dependencies...'],
        agent: 'harry'
      },
      {
        id: '3',
        name: 'Test Suite',
        status: 'pending',
        startTime: '2024-01-15 14:40',
        logs: [],
        agent: 'harry'
      }
    ]);

    setDeployments([
      {
        id: '1',
        environment: 'development',
        status: 'success',
        version: 'v1.2.3',
        startTime: '2024-01-15 14:00',
        endTime: '2024-01-15 14:05',
        agent: 'harry'
      },
      {
        id: '2',
        environment: 'staging',
        status: 'deploying',
        version: 'v1.2.3',
        startTime: '2024-01-15 14:30',
        agent: 'harry'
      }
    ]);
  }, []);

  const handleStartBuild = async (buildType: string) => {
    setIsLoading(true);
    
    const newBuild: BuildStatus = {
      id: Date.now().toString(),
      name: `${buildType} Build`,
      status: 'running',
      startTime: new Date().toISOString().replace('T', ' ').substr(0, 16),
      logs: [`Starting ${buildType} build...`],
      agent: 'harry'
    };

    setBuilds(prev => [newBuild, ...prev]);

    // Execute through Harry agent
    await executeAgentAction('harry', {
      type: 'deploy',
      action: `build-${buildType}`,
      description: `Start ${buildType} build process`,
      context: {
        buildId: newBuild.id,
        buildType
      }
    });

    // Simulate build completion
    setTimeout(() => {
      setBuilds(prev => prev.map(build => 
        build.id === newBuild.id 
          ? { 
              ...build, 
              status: 'success', 
              endTime: new Date().toISOString().replace('T', ' ').substr(0, 16),
              duration: 180,
              logs: [...build.logs, 'Build completed successfully']
            }
          : build
      ));
    }, 3000);

    setIsLoading(false);
  };

  const handleDeploy = async (environment: string) => {
    setIsLoading(true);
    
    const newDeployment: DeploymentStatus = {
      id: Date.now().toString(),
      environment: environment as any,
      status: 'deploying',
      version: 'v1.2.4',
      startTime: new Date().toISOString().replace('T', ' ').substr(0, 16),
      agent: 'harry'
    };

    setDeployments(prev => [newDeployment, ...prev]);

    // Execute through Harry agent
    await executeAgentAction('harry', {
      type: 'deploy',
      action: `deploy-${environment}`,
      description: `Deploy to ${environment} environment`,
      context: {
        deploymentId: newDeployment.id,
        environment,
        version: newDeployment.version
      }
    });

    // Simulate deployment completion
    setTimeout(() => {
      setDeployments(prev => prev.map(deployment => 
        deployment.id === newDeployment.id 
          ? { 
              ...deployment, 
              status: 'success', 
              endTime: new Date().toISOString().replace('T', ' ').substr(0, 16)
            }
          : deployment
      ));
    }, 5000);

    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'deploying':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'deploying':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-[#1a1a1e] border border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 bg-[#18181b] border-b border-gray-800 px-4">
        <div className="flex items-center space-x-3">
          <Wrench className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">DevOps Dashboard</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('builds')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeTab === 'builds' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Builds
          </button>
          <button
            onClick={() => setActiveTab('deployments')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeTab === 'deployments' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Deployments
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeTab === 'metrics' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeTab === 'agents' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Agents
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'builds' && (
          <div className="h-full flex flex-col">
            {/* Build Controls */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Build Pipeline</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStartBuild('frontend')}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    <span>Frontend</span>
                  </button>
                  <button
                    onClick={() => handleStartBuild('backend')}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    <span>Backend</span>
                  </button>
                  <button
                    onClick={() => handleStartBuild('full')}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Full Stack</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Build List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {builds.map((build) => (
                  <div key={build.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(build.status)}
                        <div>
                          <h4 className="font-medium text-white">{build.name}</h4>
                          <p className="text-sm text-gray-400">
                            Started: {build.startTime} • Agent: {build.agent}
                            {build.duration && ` • Duration: ${build.duration}s`}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${getStatusColor(build.status)}`}>
                        {build.status.toUpperCase()}
                      </span>
                    </div>
                    
                    {build.logs.length > 0 && (
                      <div className="bg-gray-900 rounded p-3">
                        <div className="text-xs font-mono text-gray-300 space-y-1">
                          {build.logs.map((log, index) => (
                            <div key={index}>{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deployments' && (
          <div className="h-full flex flex-col">
            {/* Deployment Controls */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Deployments</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeploy('development')}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    <Server className="w-4 h-4" />
                    <span>Dev</span>
                  </button>
                  <button
                    onClick={() => handleDeploy('staging')}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    <Database className="w-4 h-4" />
                    <span>Staging</span>
                  </button>
                  <button
                    onClick={() => handleDeploy('production')}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Production</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Deployment List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {deployments.map((deployment) => (
                  <div key={deployment.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(deployment.status)}
                        <div>
                          <h4 className="font-medium text-white">
                            {deployment.environment.charAt(0).toUpperCase() + deployment.environment.slice(1)} Deployment
                          </h4>
                          <p className="text-sm text-gray-400">
                            Version: {deployment.version} • Started: {deployment.startTime} • Agent: {deployment.agent}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${getStatusColor(deployment.status)}`}>
                        {deployment.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* System Metrics */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-4">System Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">CPU Usage</span>
                      <span className="text-white">{metrics.cpu}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.cpu}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Memory Usage</span>
                      <span className="text-white">{metrics.memory}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.memory}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Disk Usage</span>
                      <span className="text-white">{metrics.disk}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.disk}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Network</span>
                      <span className="text-white">{metrics.network}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.network}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Status */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-4">Agent Status</h3>
                <div className="space-y-3">
                  {Object.entries(agents).map(([name, agent]) => (
                    <div key={name} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-sm text-white capitalize">{name}</span>
                      </div>
                      <span className={`text-xs ${agent.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {agent.isActive ? 'active' : 'inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              {Object.entries(agents).map(([name, agent]) => (
                <div key={name} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-white capitalize">{name}</h4>
                      <p className="text-sm text-gray-400">{agent.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      agent.isActive 
                        ? 'bg-green-600/20 text-green-400' 
                        : 'bg-red-600/20 text-red-400'
                    }`}>
                      {agent.isActive ? 'active' : 'inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">
                      <strong>Capabilities:</strong> {agent.capabilities.join(', ')}
                    </div>
                    <div className="text-sm text-gray-400">
                      <strong>Role:</strong> {agent.role}
                    </div>
                    <div className="text-sm text-gray-400">
                      <strong>Last Active:</strong> {agent.lastActive.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 