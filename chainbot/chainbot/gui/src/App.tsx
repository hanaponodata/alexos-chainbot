import React, { useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import RightPaneLogs from './RightPaneLogs';
import LeftPaneSessions from './LeftPaneSessions';
import CenterPaneChat from './CenterPaneChat';

function LeftPane() {
  return (
    <aside className="left-pane">
      <h2>Workspace / Threads</h2>
      {/* TODO: Add workspace/thread/workflow browser */}
    </aside>
  );
}

function CenterPane() {
  return (
    <main className="center-pane">
      <h2>Chat / Workflow Canvas</h2>
      {/* TODO: Add chat/conversation/workflow canvas */}
    </main>
  );
}

function RightPane() {
  return (
    <aside className="right-pane">
      <RightPaneLogs />
    </aside>
  );
}

const MainLayout: React.FC = () => {
  const [selectedSessionId, setSelectedSessionId] = React.useState<number | null>(null);
  return (
    <div className="app-layout">
      <aside className="left-pane">
        <LeftPaneSessions selectedSessionId={selectedSessionId} onSelectSession={setSelectedSessionId} />
      </aside>
      <main className="center-pane">
        <CenterPaneChat selectedSessionId={selectedSessionId} />
      </main>
      <RightPane />
    </div>
  );
};

const AuthGate: React.FC = () => {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  if (user) return <MainLayout />;
  return (
    <div className="auth-gate">
      {showRegister ? <RegisterForm /> : <LoginForm />}
      <button className="auth-toggle" onClick={() => setShowRegister(r => !r)}>
        {showRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
      </button>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App; 