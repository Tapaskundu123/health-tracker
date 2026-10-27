import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Zap, Menu } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import HabitDetail from './pages/HabitDetail';
import StatsPage from './pages/StatsPage';
import ArchivePage from './pages/ArchivePage';
import AuthPage from './pages/AuthPage';

function ProtectedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Mobile top bar */}
        <div className="topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            id="mobile-menu-btn"
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="sidebar-logo-icon" style={{ width: 28, height: 28 }}>
              <Zap size={14} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>HabitFlow</span>
          </div>
          <div style={{ width: 32 }} />
        </div>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits/:id" element={<HabitDetail />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-active)',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
        }}
      />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route
          path="/*"
          element={user ? <ProtectedLayout /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </>
  );
}
