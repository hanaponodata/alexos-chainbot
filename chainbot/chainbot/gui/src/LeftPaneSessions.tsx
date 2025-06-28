import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface Session {
  id: number;
  name: string;
  user_id: number;
  entanglement_id?: number;
}

interface Props {
  selectedSessionId: number | null;
  onSelectSession: (id: number) => void;
}

const LeftPaneSessions: React.FC<Props> = ({ selectedSessionId, onSelectSession }) => {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/sessions', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setSessions);
  }, [token]);

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName, user_id: 1 }), // TODO: use real user_id
    });
    if (res.ok) {
      const session = await res.json();
      setSessions(s => [session, ...s]);
      setNewName('');
    }
    setLoading(false);
  };

  return (
    <div>
      <h3>Workspaces</h3>
      <form onSubmit={createSession} style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="New workspace name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          required
          style={{ width: '70%' }}
        />
        <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>
          +
        </button>
      </form>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sessions.map(session => (
          <li
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            style={{
              background: session.id === selectedSessionId ? '#393e6e' : 'transparent',
              color: session.id === selectedSessionId ? '#fff' : '#eee',
              borderRadius: 6,
              padding: '0.5rem 0.75rem',
              marginBottom: 4,
              cursor: 'pointer',
              fontWeight: session.id === selectedSessionId ? 600 : 400,
              transition: 'background 0.2s',
            }}
          >
            {session.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LeftPaneSessions; 