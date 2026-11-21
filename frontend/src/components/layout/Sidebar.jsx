import { NavLink } from 'react-router-dom';
import { LogOut, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Sun, X } from 'lucide-react';
import Logo from './Logo';
import { NAV } from './nav';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../lib/format';

const THEMES = [
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
];

export default function Sidebar({ collapsed, onToggleCollapse, drawerOpen, onCloseDrawer, badges = {} }) {
  const { user, settings, updatePreferences, logout } = useAuth();
  const theme = settings?.theme || 'dark';

  return (
    <>
      <div className={`drawer-backdrop${drawerOpen ? ' show' : ''}`} onClick={onCloseDrawer} aria-hidden="true" />
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}${drawerOpen ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-top">
          <Logo collapsed={collapsed && !drawerOpen} />
          <button type="button" className="icon-btn drawer-close" onClick={onCloseDrawer} aria-label="Close menu"><X size={18} /></button>
        </div>

        <p className="nav-label">Navigation</p>
        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-item" onClick={onCloseDrawer} title={collapsed ? label : undefined}>
              <span className="nav-icon"><Icon size={18} /></span>
              <span className="nav-text">{label}</span>
              {badges[to] ? <span className="nav-badge">{badges[to]}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="theme-switch" role="radiogroup" aria-label="Theme">
            {THEMES.map(({ value, icon: Icon, label }) => (
              <button key={value} type="button" role="radio" aria-checked={theme === value} className={theme === value ? 'active' : ''} onClick={() => updatePreferences({ theme: value })} title={`${label} theme`}>
                <Icon size={15} /><span>{label}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-user">
            <NavLink to="/settings" className="avatar" onClick={onCloseDrawer} title="Profile settings">{initials(user?.name)}</NavLink>
            <div className="sidebar-user-text">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
            <button type="button" className="icon-btn" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
          </div>

          <button type="button" className="collapse-btn" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <span>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}
