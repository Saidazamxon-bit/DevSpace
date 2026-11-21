import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useToasts, type Toast } from '@/store/ui';
import { cn } from '@/utils/misc';

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info, warning: TriangleAlert };
const TONE = { success: 'text-income', error: 'text-expense', info: 'text-accent', warning: 'text-warn' };

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(t.id), t.duration);
    return () => window.clearTimeout(id);
  }, [t.id, t.duration, dismiss]);
  const Icon = ICONS[t.kind];
  return (
    <div
      role={t.kind === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto w-full sm:w-[360px] flex items-start gap-3 rounded-2xl border border-line/70 bg-surface/95 backdrop-blur px-4 py-3 shadow-lift animate-pop-in"
    >
      <Icon size={20} className={cn('mt-0.5 shrink-0', TONE[t.kind])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{t.title}</p>
        {t.message && <p className="mt-0.5 text-[13px] text-muted leading-snug">{t.message}</p>}
      </div>
      {t.action && (
        <button
          type="button"
          className="shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-semibold text-accent hover:bg-accent/10"
          onClick={() => {
            t.action!.onClick();
            dismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
      <button type="button" className="shrink-0 -mr-1 text-subtle hover:text-ink" onClick={() => dismiss(t.id)} aria-label="Yopish">
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastHost() {
  const toasts = useToasts((s) => s.toasts);
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed z-[80] inset-x-3 bottom-[calc(6.25rem+var(--safe-bottom))] lg:bottom-auto lg:top-5 lg:right-5 lg:left-auto flex flex-col gap-2 items-center lg:items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>,
    document.body,
  );
}
