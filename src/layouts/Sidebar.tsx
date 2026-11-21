import { NavLink } from 'react-router-dom';
import { Moon, PanelLeftClose, PanelLeftOpen, Plus, Sun, Monitor } from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { useSettings } from '@/store/settings';
import { useTxForm } from '@/store/ui';
import { Logo } from '@/components/Logo';
import { cn } from '@/utils/misc';
import type { ThemeMode } from '@/types';

declare const __APP_VERSION__: string;

const THEMES: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Yorug‘' },
  { value: 'dark', icon: Moon, label: 'Qorong‘i' },
  { value: 'system', icon: Monitor, label: 'Tizim' },
];

export function Sidebar() {
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const theme = useSettings((s) => s.theme);
  const set = useSettings((s) => s.set);
  const openNew = useTxForm((s) => s.openNew);

  return (
    <aside
      className={cn(
        'hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-line/70 bg-surface transition-[width] duration-200',
        collapsed ? 'w-[84px]' : 'w-[260px]',
      )}
    >
      <div className={cn('flex h-[72px] items-center gap-3 px-5', collapsed && 'justify-center px-0')}>
        <Logo />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight">Personal Finance</p>
            <p className="text-[12px] text-muted">Shaxsiy moliya</p>
          </div>
        )}
      </div>

      <div className={cn('px-4 pb-3', collapsed && 'px-3')}>
        <button type="button" className={cn('btn btn-primary w-full', collapsed && 'px-0')} onClick={() => openNew('expense')} title="Yangi tranzaksiya">
          <Plus size={18} />
          {!collapsed && 'Yangi tranzaksiya'}
        </button>
      </div>

      <nav className={cn('flex-1 space-y-1 overflow-y-auto px-3 py-2')} aria-label="Asosiy menyu">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'group flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
                collapsed && 'justify-center px-0',
                isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={cn('border-t border-line/70 p-3 space-y-3')}>
        {!collapsed ? (
          <div role="radiogroup" aria-label="Mavzu" className="flex rounded-xl bg-surface-2 p-1">
            {THEMES.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                title={label}
                onClick={() => set({ theme: value })}
                className={cn(
                  'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                  theme === value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="icon-btn mx-auto flex"
            title="Mavzuni almashtirish"
            onClick={() => set({ theme: theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light' })}
          >
            {theme === 'light' ? <Sun size={18} /> : theme === 'dark' ? <Moon size={18} /> : <Monitor size={18} />}
          </button>
        )}
        <div className={cn('flex items-center gap-2', collapsed ? 'justify-center' : 'justify-between pl-1')}>
          {!collapsed && (
            <p className="text-[12px] text-subtle">
              Personal Finance · v{__APP_VERSION__}
            </p>
          )}
          <button
            type="button"
            className="icon-btn h-8 w-8"
            onClick={() => set({ sidebarCollapsed: !collapsed })}
            aria-label={collapsed ? 'Menyuni ochish' : 'Menyuni yig‘ish'}
            title={collapsed ? 'Menyuni ochish' : 'Menyuni yig‘ish'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
