import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { DatabaseBackup, Lock, X } from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { useLock, useNav } from '@/store/ui';
import { useSecurityConfig } from '@/hooks/useData';
import { Logo } from '@/components/Logo';
import { cn } from '@/utils/misc';

declare const __APP_VERSION__: string;

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      {[4, 14].flatMap((x) => [4, 14].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.2" fill="currentColor" />))}
    </svg>
  );
}

export function MenuButton() {
  const setDrawer = useNav((s) => s.setDrawer);
  return (
    <button type="button" className="icon-btn text-ink" onClick={() => setDrawer(true)} aria-label="Menyuni ochish">
      <DotsIcon />
    </button>
  );
}

/** Chapdan ochiladigan menyu — barcha qo‘shimcha bo‘limlar shu yerda */
export function MenuDrawer() {
  const open = useNav((s) => s.drawer);
  const setOpen = useNav((s) => s.setDrawer);
  const setLocked = useLock((s) => s.setLocked);
  const security = useSecurityConfig();
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
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menyu">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setOpen(false)} />
      <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-surface pt-[var(--safe-top)] shadow-lift animate-fade-up">
        <div className="flex h-16 items-center gap-3 px-5">
          <Logo size={34} />
          <p className="flex-1 font-bold tracking-tight">Personal Finance</p>
          <button className="icon-btn -mr-2" onClick={() => setOpen(false)} aria-label="Yopish">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Asosiy menyu">
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
          <NavLink to="/settings#data" className="flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink hover:bg-surface-2">
            <DatabaseBackup size={20} />
            Zaxira va tiklash
          </NavLink>
          {security?.pinHash && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setLocked(true);
              }}
              className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink hover:bg-surface-2"
            >
              <Lock size={20} />
              Ilovani qulflash
            </button>
          )}
        </nav>
        <p className="px-5 py-4 pb-[calc(1rem+var(--safe-bottom))] text-[12px] text-subtle">Versiya {__APP_VERSION__} · Internetsiz ishlaydi</p>
      </div>
    </div>
  );
}
