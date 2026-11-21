import { useEffect } from 'react';
import { Delete, Fingerprint } from 'lucide-react';
import { cn } from '@/utils/misc';

/**
 * PIN klaviaturasi — iPhone qulf ekrani uslubida: dumaloq shisha tugmalar.
 * Sensorli ekran va jismoniy klaviatura bilan ishlaydi.
 */
export function PinPad({
  value,
  onChange,
  length,
  onComplete,
  error,
  disabled,
  onBiometric,
  dark,
}: {
  value: string;
  onChange: (v: string) => void;
  length: number;
  onComplete: (v: string) => void;
  error?: boolean;
  disabled?: boolean;
  onBiometric?: () => void;
  dark?: boolean;
}) {
  const press = (d: string) => {
    if (disabled || value.length >= length) return;
    try {
      navigator.vibrate?.(8);
    } catch {
      /* */
    }
    const next = value + d;
    onChange(next);
    if (next.length === length) onComplete(next);
  };
  const back = () => !disabled && onChange(value.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const keyCls = cn(
    'grid h-[min(74px,8.4dvh)] w-[min(74px,8.4dvh)] min-h-[54px] min-w-[54px] place-items-center rounded-full text-[min(32px,3.8dvh)] font-light tabular select-none transition-[transform,background-color] duration-100 active:scale-95 disabled:opacity-40 touch-manipulation',
    dark
      ? 'bg-white/[0.14] text-white backdrop-blur-md shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] active:bg-white/35'
      : 'bg-surface-2 text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_1px_2px_rgb(15_23_42/0.08)] active:bg-line',
  );
  const ghostCls = cn('grid h-[min(74px,8.4dvh)] w-[min(74px,8.4dvh)] min-h-[54px] min-w-[54px] place-items-center rounded-full transition-transform active:scale-95 disabled:opacity-40', dark ? 'text-white' : 'text-ink');

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn('mb-[min(40px,4dvh)] flex gap-4', error && 'animate-[shake_.4s]')}
        aria-label={`${value.length} / ${length} raqam kiritildi`}
        role="status"
      >
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-[13px] w-[13px] rounded-full border-[1.5px] transition-all duration-150',
              error
                ? 'border-rose-300 bg-rose-300'
                : i < value.length
                  ? dark
                    ? 'scale-110 border-white bg-white'
                    : 'scale-110 border-ink bg-ink'
                  : dark
                    ? 'border-white/80'
                    : 'border-ink/60',
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-[min(16px,1.6dvh)]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={keyCls} onClick={() => press(d)} disabled={disabled}>
            {d}
          </button>
        ))}
        {onBiometric ? (
          <button type="button" className={ghostCls} onClick={onBiometric} aria-label="Biometrik tasdiqlash" disabled={disabled}>
            <Fingerprint size={30} strokeWidth={1.6} />
          </button>
        ) : (
          <span />
        )}
        <button type="button" className={keyCls} onClick={() => press('0')} disabled={disabled}>
          0
        </button>
        <button type="button" className={cn(ghostCls, 'text-[15px] font-medium')} onClick={back} aria-label="O‘chirish" disabled={disabled || !value}>
          <Delete size={26} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}
