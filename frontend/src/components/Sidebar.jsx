import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Archive, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || '??';

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={20} color="white" strokeWidth={2.5} />
          </div>
          <span className="sidebar-logo-text">
            Habit<span>Flow</span>
          </span>
        </div>

        <nav className="nav-section">
          <div className="nav-label">Navigation</div>
          <NavLink
            to="/"
            end
            id="nav-dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <LayoutDashboard size={17} />
            Dashboard
          </NavLink>
          <NavLink
            to="/stats"
            id="nav-stats"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <BarChart2 size={17} />
            Stats
          </NavLink>
          <NavLink
            to="/archive"
            id="nav-archive"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Archive size={17} />
            Archive
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={handleLogout} id="logout-btn">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-email">{user?.email}</div>
            </div>
            <LogOut size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>
    </>
  );
}
