import { Outlet, useLocation } from 'react-router-dom';
import { Lock, WifiOff } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BottomNav, MobileDrawer } from './MobileNav';
import { useSettings } from '@/store/settings';
import { useLock, useNav } from '@/store/ui';
import { useOnline } from '@/hooks/useOnline';
import { useSecurityConfig } from '@/hooks/useData';
import { cn } from '@/utils/misc';
import { Logo } from '@/components/Logo';

function OfflineBadge({ className }: { className?: string }) {
  const online = useOnline();
  if (online) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-2.5 py-1 text-[12px] font-semibold text-warn', className)} role="status">
      <WifiOff size={14} />
      Offline rejim
    </span>
  );
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      {[4, 14].flatMap((x) => [4, 14].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.2" fill="currentColor" />))}
    </svg>
  );
}

function MobileTopBar() {
  const loc = useLocation();
  const setDrawer = useNav((s) => s.setDrawer);
  const security = useSecurityConfig();
  const setLocked = useLock((s) => s.setLocked);
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-bg/85 backdrop-blur-xl pt-[var(--safe-top)]">
      <div className="flex h-14 items-center gap-2 px-4">
        <button type="button" className="icon-btn -ml-1.5 h-10 w-10 bg-surface shadow-card border border-line/70 text-ink" onClick={() => setDrawer(true)} aria-label="Menyuni ochish">
          <DotsIcon />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-1">
          {loc.pathname === '/' ? <Logo size={26} /> : null}
          {loc.pathname === '/' && <span className="truncate text-[15px] font-semibold">Personal Finance</span>}
        </div>
        <OfflineBadge />
        {security?.pinHash && (
          <button type="button" className="icon-btn" onClick={() => setLocked(true)} aria-label="Ilovani qulflash">
            <Lock size={18} />
          </button>
        )}
      </div>
    </header>
  );
}

export function AppLayout() {
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const loc = useLocation();
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[84px]' : 'lg:pl-[260px]')}>
        <MobileTopBar />
        <div className="hidden lg:flex fixed top-4 right-6 z-20">
          <OfflineBadge className="shadow-card" />
        </div>
        <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 pt-3 lg:pt-9 pb-[calc(7rem+var(--safe-bottom))] lg:pb-12">
          <div key={loc.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
      <MobileDrawer />
    </div>
  );
}
