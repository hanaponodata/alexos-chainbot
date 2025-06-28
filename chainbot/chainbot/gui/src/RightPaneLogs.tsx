import React, { useEffect, useRef, useState } from 'react';

interface AuditLog {
  action: string;
  actor_id: number;
  target_type: string;
  target_id: number;
  timestamp: string;
  session_id?: number;
  agent_id?: number;
  workflow_id?: number;
  entanglement_id?: number;
  meta?: any;
}

const RightPaneLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/logs');
    wsRef.current = ws;
    ws.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setLogs(prev => [log, ...prev].slice(0, 100));
    };
    ws.onclose = () => {
      // Optionally handle reconnect
    };
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
      <h3>Live Audit Logs</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {logs.map((log, i) => (
          <li key={i} style={{ marginBottom: '1rem', background: '#fff', borderRadius: 6, padding: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div><b>{log.action}</b> <span style={{ color: '#888' }}>{new Date(log.timestamp).toLocaleString()}</span></div>
            <div style={{ fontSize: '0.95em', color: '#555' }}>Actor: {log.actor_id} | Target: {log.target_type} #{log.target_id}</div>
            {log.meta && <pre style={{ fontSize: '0.85em', color: '#888', margin: 0 }}>{JSON.stringify(log.meta, null, 2)}</pre>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RightPaneLogs; 