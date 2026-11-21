import { NavLink, useLocation } from 'react-router-dom';
import { House, LayoutGrid, PieChart, Wallet, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/misc';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shu bo‘limga tegishli ichki sahifalar */
  match: (path: string) => boolean;
}

export const TABS: Tab[] = [
  { to: '/', label: 'Asosiy', icon: House, match: (p) => p === '/' || p.startsWith('/transactions') },
  { to: '/analytics', label: 'Tahlil', icon: PieChart, match: (p) => p.startsWith('/analytics') },
  { to: '/accounts', label: 'Hisoblar', icon: Wallet, match: (p) => p.startsWith('/accounts') },
  { to: '/more', label: 'Boshqa', icon: LayoutGrid, match: (p) => !['/', '/analytics', '/accounts'].some((x) => (x === '/' ? p === '/' : p.startsWith(x))) && !p.startsWith('/transactions') },
];

/**
 * Navigatsiya — iOS “Liquid Glass” uslubida: shaffof xira panel,
 * tanlangan bo‘lim ustida silliq suriladigan shisha “pufak”.
 * Telefonda pastda gorizontal, kompyuterda (lg) chap tomonda vertikal panel.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const active = Math.max(0, TABS.findIndex((t) => t.match(pathname)));

  return (
    <nav
      aria-label="Asosiy bo‘limlar"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.6rem+var(--safe-bottom))] lg:inset-x-auto lg:bottom-auto lg:left-0 lg:top-0 lg:h-dvh lg:w-[112px] lg:flex-col lg:items-center lg:px-0 lg:pb-0"
    >
      <div className="glass pointer-events-auto relative grid h-[66px] w-full max-w-[420px] grid-cols-4 rounded-full p-1.5 lg:h-auto lg:w-[84px] lg:grid-cols-1 lg:grid-rows-4 lg:rounded-[2.25rem]">
        {/* Shisha pufak */}
        <span aria-hidden className="glass-bubble tab-bubble absolute rounded-full lg:rounded-[1.75rem]" style={{ '--i': active } as React.CSSProperties} />
        {TABS.map((t, i) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            aria-current={i === active ? 'page' : undefined}
            className={cn(
              'relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-full text-[11.5px] font-semibold transition-colors duration-200 lg:h-[72px] lg:gap-1',
              i === active ? 'text-accent' : 'text-ink/80 hover:text-ink',
            )}
          >
            <t.icon size={22} strokeWidth={i === active ? 2.3 : 1.9} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
