export type WindowType = 'agent_map' | 'code_agent' | 'chat' | 'watchtower' | 'workflow_builder' | 'data_importer';

export type MessageType = 
  // Agent Map messages
  | 'agent_status_update'
  | 'agent_spawn'
  | 'agent_kill'
  | 'agent_map_update'
  
  // Code Agent messages
  | 'code_change'
  | 'code_save'
  | 'code_run'
  | 'code_diff'
  | 'harry_suggestion'
  
  // Chat messages
  | 'chat_message'
  | 'chat_history'
  | 'agent_response'
  | 'slash_command'
  
  // Watchtower messages
  | 'log_update'
  | 'system_stats'
  | 'alert'
  | 'incident'
  
  // Workflow messages
  | 'workflow_update'
  | 'workflow_start'
  | 'workflow_complete'
  | 'workflow_error'
  
  // System messages
  | 'window_open'
  | 'window_close'
  | 'window_focus'
  | 'hot_swap'
  | 'health_check';

export interface WebSocketMessage {
  type: MessageType;
  window_type: WindowType;
  timestamp: string;
  data: Record<string, any>;
  user_id?: string;
  session_id?: string;
}

export interface WebSocketConnection {
  id: string;
  window_type: WindowType;
  user_id?: string;
  session_id?: string;
  connected_at: string;
  last_activity: string;
  capabilities: string[];
}

export interface WebSocketStatus {
  status: 'active' | 'connecting' | 'disconnected' | 'error';
  connections: {
    total_connections: number;
    window_connections: Record<WindowType, number>;
    active_users: number;
    active_sessions: number;
  };
  windows: Record<WindowType, {
    connections: number;
    capabilities: string[];
  }>;
} 