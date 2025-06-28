import React, { useState, useEffect, useRef } from 'react';

interface WorkflowExecution {
  execution_id: string;
  workflow_id: string;
  status: string;
  current_step?: string;
  completed_steps: string[];
  failed_steps: string[];
  start_time: string;
  end_time?: string;
  error?: string;
  variables: Record<string, any>;
  results: Record<string, any>;
}

interface WorkflowStep {
  step_id: string;
  status: string;
  results?: Record<string, any>;
  error?: string;
  start_time?: string;
  end_time?: string;
}

interface WorkflowExecutionDashboardProps {
  executionId?: string;
  onClose?: () => void;
}

const WorkflowExecutionDashboard: React.FC<WorkflowExecutionDashboardProps> = ({
  executionId,
  onClose
}) => {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showVariables, setShowVariables] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (executionId) {
      loadExecutionData();
      setupWebSocket();
      setupAutoRefresh();
    }

    return () => {
      cleanup();
    };
  }, [executionId]);

  const loadExecutionData = async () => {
    if (!executionId) return;

    setLoading(true);
    setError('');

    try {
      // Use regular API for now
      const response = await fetch(`http://localhost:8000/api/workflows/executions/${executionId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExecution(data);
        updateStepsFromExecution(data);
      } else {
        throw new Error('Failed to load execution data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution data');
    } finally {
      setLoading(false);
    }
  };

  const updateStepsFromExecution = (execData: WorkflowExecution) => {
    if (!execData) return;

    const stepUpdates: WorkflowStep[] = [];
    
    // Add completed steps
    execData.completed_steps.forEach(stepId => {
      stepUpdates.push({
        step_id: stepId,
        status: 'completed',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString()
      });
    });

    // Add failed steps
    execData.failed_steps.forEach(stepId => {
      stepUpdates.push({
        step_id: stepId,
        status: 'failed',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        error: 'Step failed'
      });
    });

    // Add current step
    if (execData.current_step) {
      stepUpdates.push({
        step_id: execData.current_step,
        status: 'running',
        start_time: new Date().toISOString()
      });
    }

    setSteps(stepUpdates);
  };

  const setupWebSocket = () => {
    if (!executionId) return;

    try {
      const ws = new WebSocket(`ws://localhost:8000/api/workflows/ws/${localStorage.getItem('userId')}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({
          type: 'subscribe_execution',
          execution_id: executionId
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to setup WebSocket:', err);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'workflow_execution_updated':
        if (data.execution_id === executionId) {
          setExecution(prev => prev ? { ...prev, ...data } : null);
          updateStepsFromExecution(data);
        }
        break;
      
      case 'workflow_step_updated':
        if (data.execution_id === executionId) {
          updateStep(data);
        }
        break;
      
      case 'notification':
        addLog(`Notification: ${data.message}`, data.type);
        break;
      
      default:
        console.log('Unknown WebSocket message:', data);
    }
  };

  const updateStep = (stepData: any) => {
    setSteps(prev => {
      const existing = prev.find(s => s.step_id === stepData.step_id);
      if (existing) {
        return prev.map(s => 
          s.step_id === stepData.step_id 
            ? { ...s, ...stepData }
            : s
        );
      } else {
        return [...prev, stepData];
      }
    });
  };

  const setupAutoRefresh = () => {
    if (autoRefresh) {
      refreshIntervalRef.current = window.setInterval(() => {
        if (execution?.status === 'running' || execution?.status === 'pending') {
          loadExecutionData();
        }
      }, 5000); // Refresh every 5 seconds for running executions
    }
  };

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const addLog = (message: string, type: string = 'info') => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev.slice(-99), `${timestamp} [${type.toUpperCase()}] ${message}`]);
  };

  const handleCancelExecution = async () => {
    if (!executionId) return;

    try {
      const response = await fetch(`http://localhost:8000/api/workflows/executions/${executionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        addLog('Execution cancelled successfully', 'success');
        loadExecutionData();
      } else {
        throw new Error('Failed to cancel execution');
      }
    } catch (err) {
      addLog(`Failed to cancel execution: ${err}`, 'error');
    }
  };

  const handlePauseExecution = async () => {
    if (!executionId) return;

    try {
      const response = await fetch(`http://localhost:8000/api/workflows/executions/${executionId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        addLog('Execution paused successfully', 'success');
        loadExecutionData();
      } else {
        throw new Error('Failed to pause execution');
      }
    } catch (err) {
      addLog(`Failed to pause execution: ${err}`, 'error');
    }
  };

  const handleResumeExecution = async () => {
    if (!executionId) return;

    try {
      const response = await fetch(`http://localhost:8000/api/workflows/executions/${executionId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        addLog('Execution resumed successfully', 'success');
        loadExecutionData();
      } else {
        throw new Error('Failed to resume execution');
      }
    } catch (err) {
      addLog(`Failed to resume execution: ${err}`, 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      case 'paused': return '#f59e0b';
      case 'pending': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'running': return '⟳';
      case 'failed': return '✗';
      case 'pending': return '○';
      default: return '○';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading && !execution) {
    return (
      <div className="execution-dashboard">
        <div className="loading">Loading execution data...</div>
      </div>
    );
  }

  if (error && !execution) {
    return (
      <div className="execution-dashboard">
        <div className="error-message">
          {error}
          <button onClick={loadExecutionData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="execution-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h2>Workflow Execution</h2>
          {execution && (
            <div className="execution-info">
              <span className="execution-id">ID: {execution.execution_id}</span>
              <span className="workflow-id">Workflow: {execution.workflow_id}</span>
            </div>
          )}
        </div>
        
        <div className="header-right">
          <div className="controls">
            <label className="auto-refresh">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            
            {execution && (
              <div className="execution-controls">
                {execution.status === 'running' && (
                  <>
                    <button onClick={handlePauseExecution} className="control-btn pause-btn">
                      Pause
                    </button>
                    <button onClick={handleCancelExecution} className="control-btn cancel-btn">
                      Cancel
                    </button>
                  </>
                )}
                
                {execution.status === 'paused' && (
                  <button onClick={handleResumeExecution} className="control-btn resume-btn">
                    Resume
                  </button>
                )}
              </div>
            )}
            
            {onClose && (
              <button onClick={onClose} className="close-btn">
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {execution && (
        <div className="dashboard-content">
          <div className="execution-overview">
            <div className="status-card">
              <div className="status-indicator" style={{ backgroundColor: getStatusColor(execution.status) }}></div>
              <div className="status-info">
                <h3>Status: {execution.status}</h3>
                <p>Started: {new Date(execution.start_time).toLocaleString()}</p>
                {execution.end_time && (
                  <p>Ended: {new Date(execution.end_time).toLocaleString()}</p>
                )}
                <p>Duration: {formatDuration(execution.start_time, execution.end_time)}</p>
              </div>
            </div>

            <div className="progress-card">
              <h3>Progress</h3>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${(execution.completed_steps.length / (execution.completed_steps.length + execution.failed_steps.length + (execution.current_step ? 1 : 0))) * 100}%`,
                    backgroundColor: getStatusColor('completed')
                  }}
                ></div>
              </div>
              <div className="progress-stats">
                <span>Completed: {execution.completed_steps.length}</span>
                <span>Failed: {execution.failed_steps.length}</span>
                {execution.current_step && <span>Current: 1</span>}
              </div>
            </div>

            {execution.error && (
              <div className="error-card">
                <h3>Error</h3>
                <p>{execution.error}</p>
              </div>
            )}
          </div>

          <div className="execution-details">
            <div className="steps-section">
              <h3>Steps</h3>
              <div className="steps-list">
                {steps.map((step) => (
                  <div 
                    key={step.step_id}
                    className={`step-item ${step.status} ${selectedStep === step.step_id ? 'selected' : ''}`}
                    onClick={() => setSelectedStep(step.step_id)}
                  >
                    <div className="step-header">
                      <span className="step-icon">{getStepStatusIcon(step.status)}</span>
                      <span className="step-id">{step.step_id}</span>
                      <span className="step-status">{step.status}</span>
                    </div>
                    
                    {step.start_time && (
                      <div className="step-timing">
                        <span>Started: {new Date(step.start_time).toLocaleTimeString()}</span>
                        {step.end_time && (
                          <span>Duration: {formatDuration(step.start_time, step.end_time)}</span>
                        )}
                      </div>
                    )}
                    
                    {step.error && (
                      <div className="step-error">{step.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="details-section">
              <div className="details-tabs">
                <button 
                  className={`tab-btn ${showVariables ? 'active' : ''}`}
                  onClick={() => setShowVariables(true)}
                >
                  Variables
                </button>
                <button 
                  className={`tab-btn ${showResults ? 'active' : ''}`}
                  onClick={() => setShowResults(true)}
                >
                  Results
                </button>
                <button 
                  className={`tab-btn ${!showVariables && !showResults ? 'active' : ''}`}
                  onClick={() => { setShowVariables(false); setShowResults(false); }}
                >
                  Logs
                </button>
              </div>

              <div className="details-content">
                {showVariables && (
                  <div className="variables-content">
                    <h4>Execution Variables</h4>
                    <pre>{JSON.stringify(execution.variables, null, 2)}</pre>
                  </div>
                )}

                {showResults && (
                  <div className="results-content">
                    <h4>Execution Results</h4>
                    <pre>{JSON.stringify(execution.results, null, 2)}</pre>
                  </div>
                )}

                {!showVariables && !showResults && (
                  <div className="logs-content">
                    <h4>Execution Logs</h4>
                    <div className="logs-container">
                      {logs.length === 0 ? (
                        <p>No logs available</p>
                      ) : (
                        logs.map((log, index) => (
                          <div key={index} className="log-entry">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowExecutionDashboard; 