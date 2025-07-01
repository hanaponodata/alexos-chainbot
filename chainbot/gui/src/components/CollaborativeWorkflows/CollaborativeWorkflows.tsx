import React, { useState, useEffect } from 'react';
import { 
  Workflow, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause, 
  Plus, 
  Settings,
  ArrowRight,
  ArrowDown,
  Eye,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Brain,
  Zap,
  Target,
  BarChart3,
  Calendar,
  UserCheck,
  GitBranch,
  Code,
  Palette,
  Shield,
  Wrench
} from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import { usePersistentMemory } from '../../hooks/usePersistentMemory';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  assignedAgent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  priority: number;
  estimatedDuration: number; // minutes
  actualDuration?: number;
  dependencies: string[];
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: any;
}

interface CollaborativeWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalEstimatedDuration: number;
  totalActualDuration?: number;
  participants: string[];
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: Omit<WorkflowStep, 'id' | 'status' | 'startedAt' | 'completedAt'>[];
  estimatedDuration: number;
  requiredAgents: string[];
}

export const CollaborativeWorkflows: React.FC = () => {
  const [workflows, setWorkflows] = useState<CollaborativeWorkflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<CollaborativeWorkflow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    priority: 'medium' as const,
    tags: [] as string[]
  });

  const { agents, executeAgentAction } = useAgentStore();
  const { addContext, searchMemory } = usePersistentMemory();

  // Predefined workflow templates
  const workflowTemplates: WorkflowTemplate[] = [
    {
      id: 'full_stack_feature',
      name: 'Full-Stack Feature Development',
      description: 'Complete feature development from design to deployment',
      category: 'Development',
      estimatedDuration: 240, // 4 hours
      requiredAgents: ['devbot', 'laka', 'harry'],
      steps: [
        {
          name: 'Requirements Analysis',
          description: 'Analyze and document feature requirements',
          assignedAgent: 'devbot',
          priority: 1,
          estimatedDuration: 30,
          dependencies: []
        },
        {
          name: 'UI/UX Design',
          description: 'Create wireframes and design mockups',
          assignedAgent: 'laka',
          priority: 2,
          estimatedDuration: 60,
          dependencies: ['requirements_analysis']
        },
        {
          name: 'Frontend Implementation',
          description: 'Implement the user interface components',
          assignedAgent: 'laka',
          priority: 3,
          estimatedDuration: 90,
          dependencies: ['ui_ux_design']
        },
        {
          name: 'Backend Implementation',
          description: 'Implement API endpoints and business logic',
          assignedAgent: 'devbot',
          priority: 3,
          estimatedDuration: 90,
          dependencies: ['requirements_analysis']
        },
        {
          name: 'Security Review',
          description: 'Review code for security vulnerabilities',
          assignedAgent: 'guardbot',
          priority: 4,
          estimatedDuration: 30,
          dependencies: ['frontend_implementation', 'backend_implementation']
        },
        {
          name: 'Testing & QA',
          description: 'Perform comprehensive testing',
          assignedAgent: 'devbot',
          priority: 5,
          estimatedDuration: 45,
          dependencies: ['security_review']
        },
        {
          name: 'Deployment',
          description: 'Deploy to staging and production',
          assignedAgent: 'harry',
          priority: 6,
          estimatedDuration: 30,
          dependencies: ['testing_qa']
        }
      ]
    },
    {
      id: 'security_audit',
      name: 'Security Audit & Compliance',
      description: 'Comprehensive security audit and compliance check',
      category: 'Security',
      estimatedDuration: 180, // 3 hours
      requiredAgents: ['guardbot', 'harry'],
      steps: [
        {
          name: 'Vulnerability Scan',
          description: 'Run automated security scans',
          assignedAgent: 'guardbot',
          priority: 1,
          estimatedDuration: 45,
          dependencies: []
        },
        {
          name: 'Code Security Review',
          description: 'Manual code security review',
          assignedAgent: 'guardbot',
          priority: 2,
          estimatedDuration: 60,
          dependencies: ['vulnerability_scan']
        },
        {
          name: 'Infrastructure Security',
          description: 'Review infrastructure security',
          assignedAgent: 'harry',
          priority: 2,
          estimatedDuration: 45,
          dependencies: ['vulnerability_scan']
        },
        {
          name: 'Compliance Check',
          description: 'Verify compliance requirements',
          assignedAgent: 'guardbot',
          priority: 3,
          estimatedDuration: 30,
          dependencies: ['code_security_review', 'infrastructure_security']
        }
      ]
    },
    {
      id: 'performance_optimization',
      name: 'Performance Optimization',
      description: 'Optimize application performance and scalability',
      category: 'Optimization',
      estimatedDuration: 120, // 2 hours
      requiredAgents: ['devbot', 'harry'],
      steps: [
        {
          name: 'Performance Analysis',
          description: 'Analyze current performance metrics',
          assignedAgent: 'devbot',
          priority: 1,
          estimatedDuration: 30,
          dependencies: []
        },
        {
          name: 'Frontend Optimization',
          description: 'Optimize frontend performance',
          assignedAgent: 'devbot',
          priority: 2,
          estimatedDuration: 45,
          dependencies: ['performance_analysis']
        },
        {
          name: 'Backend Optimization',
          description: 'Optimize backend performance',
          assignedAgent: 'devbot',
          priority: 2,
          estimatedDuration: 45,
          dependencies: ['performance_analysis']
        }
      ]
    }
  ];

  const createWorkflowFromTemplate = (template: WorkflowTemplate) => {
    const workflow: CollaborativeWorkflow = {
      id: `workflow_${Date.now()}`,
      name: template.name,
      description: template.description,
      steps: template.steps.map((step, index) => ({
        ...step,
        id: `step_${index + 1}`,
        status: 'pending' as const,
        dependencies: step.dependencies.map(dep => `step_${template.steps.findIndex(s => s.name.toLowerCase().replace(/\s+/g, '_') === dep) + 1}`)
      })),
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      totalEstimatedDuration: template.estimatedDuration,
      participants: template.requiredAgents,
      tags: [template.category.toLowerCase()],
      priority: 'medium'
    };

    setWorkflows(prev => [workflow, ...prev]);
    setActiveWorkflow(workflow);
    setShowTemplates(false);
    setSelectedTemplate(null);
  };

  const startWorkflow = async (workflow: CollaborativeWorkflow) => {
    const updatedWorkflow = {
      ...workflow,
      status: 'active' as const,
      startedAt: new Date(),
      updatedAt: new Date()
    };

    setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWorkflow : w));
    setActiveWorkflow(updatedWorkflow);

    // Start the first available step
    const firstStep = workflow.steps.find(step => step.status === 'pending' && step.dependencies.length === 0);
    if (firstStep) {
      await startStep(firstStep, updatedWorkflow);
    }

    // Add to memory
    addContext({
      type: 'workflow',
      title: `Workflow Started: ${workflow.name}`,
      content: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'active',
        participants: workflow.participants,
        steps: workflow.steps.length
      },
      metadata: {
        contextType: 'collaborative_workflow',
        workflowId: workflow.id
      },
      tags: ['workflow', 'collaboration', ...workflow.tags],
      priority: 8
    });
  };

  const startStep = async (step: WorkflowStep, workflow: CollaborativeWorkflow) => {
    const updatedStep = {
      ...step,
      status: 'in_progress' as const,
      startedAt: new Date()
    };

    const updatedWorkflow = {
      ...workflow,
      steps: workflow.steps.map(s => s.id === step.id ? updatedStep : s),
      updatedAt: new Date()
    };

    setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWorkflow : w));
    setActiveWorkflow(updatedWorkflow);

    // Simulate agent working on the step
    setTimeout(async () => {
      await completeStep(updatedStep, updatedWorkflow);
    }, step.estimatedDuration * 1000); // Convert minutes to milliseconds
  };

  const completeStep = async (step: WorkflowStep, workflow: CollaborativeWorkflow) => {
    const actualDuration = step.startedAt ? 
      Math.round((Date.now() - step.startedAt.getTime()) / 60000) : 
      step.estimatedDuration;

    const updatedStep = {
      ...step,
      status: 'completed' as const,
      completedAt: new Date(),
      actualDuration,
      result: `Step "${step.name}" completed successfully by ${step.assignedAgent}`
    };

    const updatedWorkflow = {
      ...workflow,
      steps: workflow.steps.map(s => s.id === step.id ? updatedStep : s),
      updatedAt: new Date()
    };

    setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWorkflow : w));
    setActiveWorkflow(updatedWorkflow);

    // Check if workflow is complete
    const allStepsCompleted = updatedWorkflow.steps.every(s => s.status === 'completed');
    if (allStepsCompleted) {
      await completeWorkflow(updatedWorkflow);
    } else {
      // Start next available steps
      const nextSteps = updatedWorkflow.steps.filter(s => 
        s.status === 'pending' && 
        s.dependencies.every(dep => 
          updatedWorkflow.steps.find(step => step.id === dep)?.status === 'completed'
        )
      );

      for (const nextStep of nextSteps) {
        await startStep(nextStep, updatedWorkflow);
      }
    }
  };

  const completeWorkflow = async (workflow: CollaborativeWorkflow) => {
    const totalActualDuration = workflow.steps.reduce((sum, step) => sum + (step.actualDuration || 0), 0);

    const updatedWorkflow = {
      ...workflow,
      status: 'completed' as const,
      completedAt: new Date(),
      totalActualDuration,
      updatedAt: new Date()
    };

    setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWorkflow : w));
    setActiveWorkflow(updatedWorkflow);

    // Add completion to memory
    addContext({
      type: 'workflow',
      title: `Workflow Completed: ${workflow.name}`,
      content: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'completed',
        totalDuration: totalActualDuration,
        participants: workflow.participants
      },
      metadata: {
        contextType: 'collaborative_workflow',
        workflowId: workflow.id
      },
      tags: ['workflow', 'completed', ...workflow.tags],
      priority: 9
    });
  };

  const getStepStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'blocked':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getWorkflowStatusColor = (status: CollaborativeWorkflow['status']) => {
    switch (status) {
      case 'active':
        return 'bg-blue-600/20 text-blue-400';
      case 'completed':
        return 'bg-green-600/20 text-green-400';
      case 'failed':
        return 'bg-red-600/20 text-red-400';
      case 'paused':
        return 'bg-yellow-600/20 text-yellow-400';
      default:
        return 'bg-gray-600/20 text-gray-400';
    }
  };

  const getAgentIcon = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return <UserCheck className="w-4 h-4" />;

    switch (agent.role) {
      case 'DevOps Engineer':
        return <Wrench className="w-4 h-4 text-blue-400" />;
      case 'UI/UX Designer & Frontend Developer':
        return <Palette className="w-4 h-4 text-purple-400" />;
      case 'Full-Stack Developer':
        return <Code className="w-4 h-4 text-green-400" />;
      case 'Security & Compliance Officer':
        return <Shield className="w-4 h-4 text-red-400" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getProgressPercentage = (workflow: CollaborativeWorkflow) => {
    const completedSteps = workflow.steps.filter(s => s.status === 'completed').length;
    return Math.round((completedSteps / workflow.steps.length) * 100);
  };

  return (
    <div className="bg-[#1a1a1e] border border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 bg-[#18181b] border-b border-gray-800 px-4">
        <div className="flex items-center space-x-3">
          <Workflow className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Collaborative Workflows</h2>
          {activeWorkflow && (
            <span className="text-sm text-gray-400">
              ({activeWorkflow.steps.length} steps)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Workflow</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-white">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Workflows Sidebar */}
        <div className="w-80 border-r border-gray-800 bg-[#18181b] flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-sm font-medium text-white mb-2">Workflows</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                onClick={() => setActiveWorkflow(workflow)}
                className={`p-3 cursor-pointer border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                  activeWorkflow?.id === workflow.id ? 'bg-purple-600/20 border-purple-600/50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">{workflow.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${getWorkflowStatusColor(workflow.status)}`}>
                    {workflow.status}
                  </span>
                </div>
                
                <p className="text-xs text-gray-400 mb-2">{workflow.description}</p>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    {workflow.participants.length} agents
                  </span>
                  <span className="text-xs text-gray-500">
                    {workflow.totalEstimatedDuration}m
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-1 mb-2">
                  <div 
                    className="bg-purple-600 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage(workflow)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {getProgressPercentage(workflow)}% complete
                  </span>
                  <span className="text-xs text-gray-500">
                    {workflow.updatedAt.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Details */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeWorkflow ? (
            <>
              {/* Workflow Header */}
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{activeWorkflow.name}</h3>
                  <div className="flex items-center space-x-2">
                    {activeWorkflow.status === 'draft' && (
                      <button
                        onClick={() => startWorkflow(activeWorkflow)}
                        className="flex items-center space-x-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>Start</span>
                      </button>
                    )}
                    {activeWorkflow.status === 'active' && (
                      <button className="flex items-center space-x-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors">
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-400 mb-3">{activeWorkflow.description}</p>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{activeWorkflow.participants.length} participants</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      {activeWorkflow.totalActualDuration || activeWorkflow.totalEstimatedDuration}m
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{activeWorkflow.steps.length} steps</span>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {activeWorkflow.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`p-4 border rounded-lg ${
                        step.status === 'completed' ? 'border-green-600/50 bg-green-600/10' :
                        step.status === 'in_progress' ? 'border-blue-600/50 bg-blue-600/10' :
                        step.status === 'failed' ? 'border-red-600/50 bg-red-600/10' :
                        'border-gray-700 bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getStepStatusIcon(step.status)}
                          <div>
                            <h4 className="text-sm font-medium text-white">{step.name}</h4>
                            <p className="text-xs text-gray-400">{step.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getAgentIcon(step.assignedAgent)}
                          <span className="text-xs text-gray-400">
                            {agents.find(a => a.id === step.assignedAgent)?.name || step.assignedAgent}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Priority: {step.priority}</span>
                        <span>Duration: {step.actualDuration || step.estimatedDuration}m</span>
                        {step.startedAt && (
                          <span>Started: {step.startedAt.toLocaleTimeString()}</span>
                        )}
                        {step.completedAt && (
                          <span>Completed: {step.completedAt.toLocaleTimeString()}</span>
                        )}
                      </div>
                      
                      {step.result && (
                        <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs text-gray-300">
                          {step.result}
                        </div>
                      )}
                      
                      {step.error && (
                        <div className="mt-2 p-2 bg-red-600/20 border border-red-600/50 rounded text-xs text-red-400">
                          Error: {step.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Workflow className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Workflow Selected</h3>
                <p className="text-gray-400 mb-4">Select a workflow to view details or create a new one</p>
                <button
                  onClick={() => setShowTemplates(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                >
                  Create New Workflow
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1e] border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Workflow Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflowTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border border-gray-700 rounded-lg hover:border-purple-600/50 transition-colors cursor-pointer"
                    onClick={() => createWorkflowFromTemplate(template)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-white">{template.name}</h4>
                      <span className="text-xs text-gray-400">{template.category}</span>
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-3">{template.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{template.steps.length} steps</span>
                      <span>{template.estimatedDuration}m</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {template.requiredAgents.map(agentId => (
                        <div key={agentId} className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                          {getAgentIcon(agentId)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 