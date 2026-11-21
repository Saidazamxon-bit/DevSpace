import { Outlet, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { TabBar } from './TabBar';
import { useOnline } from '@/hooks/useOnline';

function OfflineBadge() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+0.5rem)] z-50 flex justify-center">
      <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold text-warn" role="status">
        <WifiOff size={14} />
        Offline rejim
      </span>
    </div>
  );
}

/** Layout: kontent markazda, pastda shisha tab-bar */
export function AppLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-dvh">
      <OfflineBadge />
      <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6.5rem+var(--safe-bottom))] sm:px-6">
        <div key={loc.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
      <TabBar />
    </div>
  );
}
