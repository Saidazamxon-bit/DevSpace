import { Check, Delete } from 'lucide-react';
import type { PadKey } from '@/utils/keypad';
import { cn } from '@/utils/misc';

/**
 * Ilovaning o‘z raqamli klaviaturasi (telefon klaviaturasi o‘rniga).
 * Tugmalar `pointerdown` da ishlaydi — fokus inputdan ketmaydi va javob tez bo‘ladi.
 */
export function NumPad({
  onKey,
  onDone,
  decimal,
  allowNegative,
}: {
  onKey: (k: PadKey) => void;
  onDone: () => void;
  decimal: string;
  allowNegative?: boolean;
}) {
  const press = (k: PadKey) => (e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(6);
      } catch {
        /* */
      }
    }
    onKey(k);
  };

  const keyCls =
    'h-[52px] rounded-2xl bg-surface-2 text-[22px] font-semibold text-ink tabular select-none transition-[transform,background-color] duration-100 active:scale-95 active:bg-line touch-manipulation';
  const Key = ({ k, label, className, aria }: { k: PadKey; label: React.ReactNode; className?: string; aria?: string }) => (
    <button
      type="button"
      data-key={k}
      aria-label={aria ?? (typeof label === 'string' ? label : k)}
      onPointerDown={press(k)}
      onClick={(e) => {
        // Klaviatura (Enter/Space) orqali bosilganda — pointerdown bo‘lmaydi
        if (e.detail === 0) press(k)(e);
      }}
      className={cn(keyCls, className)}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-3 grid grid-cols-4 gap-2 animate-fade-in" role="group" aria-label="Raqamli klaviatura" data-numpad>
      <Key k="1" label="1" />
      <Key k="2" label="2" />
      <Key k="3" label="3" />
      <Key k="back" label={<Delete size={22} className="mx-auto" />} aria="O‘chirish" className="text-muted" />

      <Key k="4" label="4" />
      <Key k="5" label="5" />
      <Key k="6" label="6" />
      <Key k="clear" label="C" aria="Tozalash" className="text-expense text-lg" />

      <Key k="7" label="7" />
      <Key k="8" label="8" />
      <Key k="9" label="9" />
      <Key k="000" label="000" className="text-lg" />

      {allowNegative ? <Key k="sign" label="±" aria="Ishorani almashtirish" /> : <Key k="dec" label={decimal} aria="Kasr belgisi" />}
      <Key k="0" label="0" />
      {allowNegative && <Key k="dec" label={decimal} aria="Kasr belgisi" />}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onDone();
        }}
        onClick={(e) => e.detail === 0 && onDone()}
        className={cn('h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-95 transition-transform touch-manipulation inline-flex items-center justify-center gap-1.5', !allowNegative && 'col-span-2')}
        aria-label="Tayyor"
      >
        <Check size={22} strokeWidth={2.6} />
        {!allowNegative && <span className="text-[15px]">Tayyor</span>}
      </button>
    </div>
  );
}
