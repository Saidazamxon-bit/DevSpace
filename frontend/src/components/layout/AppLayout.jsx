import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import { useAuth } from '../../context/AuthContext';
import { useMediaQuery } from '../../hooks/useApi';

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
          <Outlet />
        </main>
      </div>
      <MobileNav onMore={() => setDrawer(true)} />
    </div>
  );
}
