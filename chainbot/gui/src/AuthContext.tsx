import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  is_superuser: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // DEV BYPASS: Always set a fake user and token for development
  const devBypass = true; // Set to false to disable bypass

  const [user, setUser] = useState<User | null>(devBypass ? {
    id: 1,
    username: 'devuser',
    is_superuser: true
  } : null);
  const [token, setToken] = useState<string | null>(devBypass ? 'dev-token' : localStorage.getItem('token'));

  useEffect(() => {
    if (devBypass) {
      setUser({ id: 1, username: 'devuser', is_superuser: true });
      setToken('dev-token');
      return;
    }
    if (token) {
      localStorage.setItem('token', token);
      // Optionally decode token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({
        id: parseInt(payload.sub),
        username: payload.username,
        is_superuser: payload.is_superuser,
      });
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token, devBypass]);

  const login = async (username: string, password: string) => {
    if (devBypass) {
      setUser({ id: 1, username: 'devuser', is_superuser: true });
      setToken('dev-token');
      return true;
    }
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.access_token);
      return true;
    }
    return false;
  };

  const register = async (username: string, email: string, password: string) => {
    if (devBypass) {
      setUser({ id: 1, username: 'devuser', is_superuser: true });
      setToken('dev-token');
      return true;
    }
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    return res.ok;
  };

  const logout = () => {
    if (devBypass) {
      setUser({ id: 1, username: 'devuser', is_superuser: true });
      setToken('dev-token');
      return;
    }
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}; 