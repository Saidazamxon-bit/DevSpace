import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import { useAuth } from '../../context/AuthContext';
import { useMediaQuery } from '../../hooks/useApi';
import { DEMO } from '../../api/client';

function DemoBanner() {
  const reset = async () => {
    if (!window.confirm('Reset all demo data to the original sample?')) return;
    const m = await import('../../api/demo/server');
    m.resetDemo();
    window.location.reload();
  };
  return (
    <div className="demo-banner" role="note">
      <span><strong>Demo mode</strong> · sample data, saved only in this browser. Backend features (live checks, backups) are disabled.</span>
      <button type="button" className="link-btn" onClick={reset}>Reset demo</button>
    </div>
  );
}

export default function AppLayout() {
  const { settings, updatePreferences } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const isTablet = useMediaQuery('(max-width: 1099px)');
  const isMobile = useMediaQuery('(max-width: 899px)');

  // Desktop: user preference. Tablet: icon rail that expands as an overlay. Phone: off-canvas drawer.
  const collapsed = isMobile ? false : isTablet ? !drawer : !!settings?.sidebar_collapsed;

  useEffect(() => { setDrawer(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => { if (!isTablet) setDrawer(false); }, [isTablet]);
  useEffect(() => { document.body.classList.toggle('drawer-lock', drawer && isMobile); }, [drawer, isMobile]);

  return (
    <div className={`app${collapsed || (isTablet && !isMobile) ? ' is-collapsed' : ''}`}>
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => updatePreferences({ sidebar_collapsed: !settings?.sidebar_collapsed })}
        drawerOpen={drawer}
        onCloseDrawer={() => setDrawer(false)}
      />
      <div className="main-col">
        <Topbar onMenu={() => setDrawer(true)} />
        <main id="main" className="content">
          {DEMO && <DemoBanner />}
          <Outlet />
        </main>
      </div>
      <MobileNav onMore={() => setDrawer(true)} />
    </div>
  );
}
