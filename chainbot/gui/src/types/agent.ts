export type AgentStatus = 'starting' | 'running' | 'idle' | 'error' | 'stopped' | 'busy';

export interface AgentPosition {
  x: number;
  y: number;
}

export interface AgentConnection {
  source_id: string;
  target_id: string;
  type: 'data' | 'control' | 'dependency';
  status: 'active' | 'inactive' | 'error';
  metadata?: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  position: AgentPosition;
  connections: string[];
  last_activity: string;
  config: Record<string, any>;
  capabilities: string[];
  description?: string;
  version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AgentConfig {
  name: string;
  type: string;
  description?: string;
  capabilities: string[];
  config_schema: Record<string, any>;
  dependencies: string[];
}

export interface AgentStats {
  messages_processed: number;
  response_time_avg: number;
  error_count: number;
  uptime: number;
  memory_usage: number;
  cpu_usage: number;
} 