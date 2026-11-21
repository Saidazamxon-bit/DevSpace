import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, LayoutDashboard, ListOrdered, Plus, Settings, X } from 'lucide-react';
import { useNav, useTxForm } from '@/store/ui';
import { NAV_ITEMS } from './nav';
import { cn } from '@/utils/misc';
import { Logo } from '@/components/Logo';
import { useEffect } from 'react';

declare const __APP_VERSION__: string;

const BOTTOM = [
  { to: '/', label: 'Bosh sahifa', icon: LayoutDashboard },
  { to: '/transactions', label: 'Tranzaksiyalar', icon: ListOrdered },
  null,
  { to: '/analytics', label: 'Analitika', icon: BarChart3 },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
] as const;

/** Mobil pastki menyu — suzuvchi “pill” ko‘rinishida */
export function BottomNav() {
  const openNew = useTxForm((s) => s.openNew);
  return (
    <nav
      aria-label="Pastki menyu"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+var(--safe-bottom))] pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-full border border-line/70 bg-surface/85 p-1.5 shadow-float backdrop-blur-xl">
        {BOTTOM.map((item) =>
          item === null ? (
            <button
              key="add"
              type="button"
              onClick={() => openNew('expense')}
              aria-label="Tranzaksiya qo‘shish"
              className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-ink shadow-lift transition-transform active:scale-90"
            >
              <Plus size={24} strokeWidth={2.4} />
            </button>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  'flex h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-semibold transition-colors',
                  isActive ? 'text-accent' : 'text-muted active:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('grid h-7 w-11 place-items-center rounded-full transition-colors', isActive && 'bg-accent/10')}>
                    <item.icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="leading-none">{item.label === 'Tranzaksiyalar' ? 'Tarix' : item.label === 'Bosh sahifa' ? 'Asosiy' : item.label}</span>
                </>
              )}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  );
}

/** Mobil yon menyu — barcha bo‘limlarga kirish */
export function MobileDrawer() {
  const open = useNav((s) => s.drawer);
  const setOpen = useNav((s) => s.setDrawer);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname, setOpen]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menyu">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setOpen(false)} />
      <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-surface shadow-lift animate-fade-up flex flex-col pt-[var(--safe-top)]">
        <div className="flex items-center gap-3 px-5 h-16">
          <Logo size={34} />
          <p className="flex-1 font-bold tracking-tight">Personal Finance</p>
          <button className="icon-btn -mr-2" onClick={() => setOpen(false)} aria-label="Yopish">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn('flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium', isActive ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-surface-2')
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="px-5 py-4 pb-[calc(1rem+var(--safe-bottom))] text-[12px] text-subtle">Versiya {__APP_VERSION__} · Offline ishlaydi</p>
      </div>
    </div>
  );
}
