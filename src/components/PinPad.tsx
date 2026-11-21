import { useEffect } from 'react';
import { Delete, Fingerprint } from 'lucide-react';
import { cn } from '@/utils/misc';

/** Raqamli PIN klaviaturasi (sensorli ekran va klaviatura bilan ishlaydi) */
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
    'grid h-16 w-16 sm:h-[68px] sm:w-[68px] place-items-center rounded-full text-2xl font-semibold transition-all active:scale-90 disabled:opacity-40',
    dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-surface-2 text-ink hover:bg-line',
  );

  return (
    <div className="flex flex-col items-center">
      <div className={cn('mb-8 flex gap-3.5', error && 'animate-[shake_.35s]')} aria-label={`${value.length} / ${length} raqam kiritildi`} role="status">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-3.5 w-3.5 rounded-full border-2 transition-all duration-150',
              error ? 'border-rose-400 bg-rose-400' : i < value.length ? (dark ? 'border-white bg-white scale-110' : 'border-accent bg-accent scale-110') : dark ? 'border-white/40' : 'border-subtle',
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 sm:gap-5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={keyCls} onClick={() => press(d)} disabled={disabled}>
            {d}
          </button>
        ))}
        {onBiometric ? (
          <button type="button" className={cn(keyCls, '!bg-transparent')} onClick={onBiometric} aria-label="Biometrik tasdiqlash" disabled={disabled}>
            <Fingerprint size={28} />
          </button>
        ) : (
          <span />
        )}
        <button type="button" className={keyCls} onClick={() => press('0')} disabled={disabled}>
          0
        </button>
        <button type="button" className={cn(keyCls, '!bg-transparent')} onClick={back} aria-label="O‘chirish" disabled={disabled}>
          <Delete size={26} />
        </button>
      </div>
    </div>
  );
}
