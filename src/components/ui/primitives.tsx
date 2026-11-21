import { type ReactNode, useId } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { InfoButton } from '../InfoButton';
import type { InfoKey } from '@/utils/infoTexts';
import { cn } from '@/utils/misc';
import { getIcon } from '@/utils/icons';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; tone?: 'income' | 'expense' }[];
  className?: string;
  size?: 'sm' | 'md';
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-xl bg-surface-2 p-1 gap-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-lg font-semibold transition-all duration-150',
              size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-sm',
              active
                ? cn(
                    'bg-surface shadow-card',
                    o.tone === 'income' ? 'text-income' : o.tone === 'expense' ? 'text-expense' : 'text-ink',
                  )
                : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function CategoryIcon({ icon, color, size = 'md', className }: { icon: string; color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = getIcon(icon);
  const dims = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-11 w-11';
  const px = size === 'sm' ? 16 : size === 'lg' ? 22 : 20;
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full text-white', dims, className)} style={{ backgroundColor: color }} aria-hidden>
      <Icon size={px} strokeWidth={2.1} />
    </span>
  );
}

export function ProgressBar({ value, tone = 'accent', className, label }: { value: number; tone?: 'accent' | 'warn' | 'over' | 'income'; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = tone === 'over' ? 'bg-expense' : tone === 'warn' ? 'bg-warn' : tone === 'income' ? 'bg-income' : 'bg-accent';
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {description && <span className="block text-[13px] text-muted mt-0.5">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
          checked ? 'bg-accent' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] text-expense" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

/** Sahifa sarlavhasi: ← orqaga (ixtiyoriy), nom, ⓘ va amallar */
export function PageHeader({
  title,
  subtitle,
  actions,
  info,
  back = true,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  info?: InfoKey;
  back?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 bg-bg/85 px-3 pt-[var(--safe-top)] backdrop-blur-xl sm:-mx-6 sm:px-5">
      <div className="flex min-h-14 items-center gap-1">
        {back ? (
          <button
            type="button"
            className="icon-btn text-ink"
            aria-label="Orqaga"
            onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
          >
            <ArrowLeft size={21} />
          </button>
        ) : (
          <span className="w-2" />
        )}
        <div className="min-w-0 flex-1 pl-1">
          <div className="flex items-center gap-2">
            <h1 className={cn('truncate font-bold tracking-tight text-ink', back ? 'text-[18px]' : 'text-[24px]')}>{title}</h1>
            {info && <InfoButton topic={info} />}
          </div>
          {subtitle && <p className="truncate text-[12px] text-muted -mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
    </header>
  );
}
