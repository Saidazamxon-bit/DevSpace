import { Outlet, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { MenuDrawer } from './Menu';
import { useOnline } from '@/hooks/useOnline';

function OfflineBadge() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+3.75rem)] z-40 flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-3 py-1 text-[12px] font-semibold text-warn backdrop-blur" role="status">
        <WifiOff size={14} />
        Offline rejim
      </span>
    </div>
  );
}

/** Sodda layout: sidebar va pastki menyu yo‘q, kontent markazda */
export function AppLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-dvh">
      <OfflineBadge />
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div key={loc.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
      <MenuDrawer />
    </div>
  );
}
