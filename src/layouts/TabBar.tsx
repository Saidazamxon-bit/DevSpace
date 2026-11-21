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
 * Pastki navigatsiya — iOS “Liquid Glass” uslubida: shaffof xira panel,
 * tanlangan bo‘lim ustida silliq suriladigan shisha “pufak”.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const active = Math.max(0, TABS.findIndex((t) => t.match(pathname)));

  return (
    <nav
      aria-label="Asosiy bo‘limlar"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.6rem+var(--safe-bottom))]"
    >
      <div className="glass pointer-events-auto relative grid h-[66px] w-full max-w-[420px] grid-cols-4 rounded-full p-1.5">
        {/* Shisha pufak */}
        <span
          aria-hidden
          className="glass-bubble absolute top-1.5 bottom-1.5 rounded-full transition-[left] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)]"
          style={{ left: `calc(6px + (100% - 12px) * ${active} / 4)`, width: 'calc((100% - 12px) / 4)' }}
        />
        {TABS.map((t, i) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            aria-current={i === active ? 'page' : undefined}
            className={cn(
              'relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-full text-[11.5px] font-semibold transition-colors duration-200',
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
