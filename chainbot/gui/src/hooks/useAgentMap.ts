import { useState, useCallback } from 'react';
import type { Agent, AgentPosition, AgentConnection } from '../types/agent';

interface AgentMapData {
  agents: Agent[];
  connections: AgentConnection[];
  layout: 'auto' | 'manual' | 'grid';
}

export const useAgentMap = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAgentMapData = useCallback(async (): Promise<AgentMapData> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agents/map');
      if (!response.ok) {
        throw new Error(`Failed to fetch agent map: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAgents(data.agents);
      setConnections(data.connections);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const spawnAgent = useCallback(async (agentType: string, config?: Record<string, any>): Promise<string> => {
    try {
      const response = await fetch('/api/agents/spawn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_type: agentType,
          config: config || {}
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to spawn agent: ${response.statusText}`);
      }

      const data = await response.json();
      return data.agent_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const killAgent = useCallback(async (agentId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/${agentId}/kill`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to kill agent: ${response.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateAgentPosition = useCallback(async (agentId: string, position: AgentPosition): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/${agentId}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(position),
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent position: ${response.statusText}`);
      }

      // Update local state
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, position }
          : agent
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getAgentDetails = useCallback(async (agentId: string): Promise<Agent> => {
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch agent details: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateAgentConfig = useCallback(async (agentId: string, config: Record<string, any>): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/${agentId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent config: ${response.statusText}`);
      }

      // Update local state
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, config: { ...agent.config, ...config } }
          : agent
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const createConnection = useCallback(async (
    sourceId: string, 
    targetId: string, 
    type: 'data' | 'control' | 'dependency'
  ): Promise<void> => {
    try {
      const response = await fetch('/api/agents/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_id: sourceId,
          target_id: targetId,
          type
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create connection: ${response.statusText}`);
      }

      const connection = await response.json();
      setConnections(prev => [...prev, connection]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const removeConnection = useCallback(async (sourceId: string, targetId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/agents/connections/${sourceId}/${targetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to remove connection: ${response.statusText}`);
      }

      setConnections(prev => prev.filter(conn => 
        !(conn.source_id === sourceId && conn.target_id === targetId)
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    agents,
    connections,
    loading,
    error,
    getAgentMapData,
    spawnAgent,
    killAgent,
    updateAgentPosition,
    getAgentDetails,
    updateAgentConfig,
    createConnection,
    removeConnection,
    clearError
  };
}; 