import { useRef } from 'react';
import { Check, Delete, Equal, Minus, Plus } from 'lucide-react';
import type { PadKey } from '@/utils/keypad';
import { cn } from '@/utils/misc';

/**
 * Ilovaning o‘z raqamli klaviaturasi (telefon klaviaturasi o‘rniga), hisoblash bilan:
 *   1 2 3 ⌫ / 4 5 6 − / 7 8 9 + / , 0 000 ✓(=)
 * ⌫ ni bosib turish — hammasini tozalaydi.
 */
export function NumPad({
  onKey,
  onDone,
  decimal,
  allowNegative,
  hasExpression,
}: {
  onKey: (k: PadKey) => void;
  onDone: () => void;
  decimal: string;
  allowNegative?: boolean;
  hasExpression?: boolean;
}) {
  const holdTimer = useRef<number | null>(null);

  const buzz = () => {
    try {
      navigator.vibrate?.(6);
    } catch {
      /* */
    }
  };
  const press = (k: PadKey) => (e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    buzz();
    onKey(k);
  };

  const opCls = FN_CLS;

  const stopHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  return (
    <div className="mt-3 grid grid-cols-4 gap-[7px] rounded-[26px] bg-[rgb(var(--line)/0.7)] p-[7px] animate-fade-in dark:bg-black/40" role="group" aria-label="Raqamli klaviatura" data-numpad>
      <PadButton onPress={press} k="1" label="1" />
      <PadButton onPress={press} k="2" label="2" />
      <PadButton onPress={press} k="3" label="3" />
      <button
        type="button"
        data-key="back"
        aria-label="O‘chirish (bosib tursangiz — hammasi tozalanadi)"
        onPointerDown={(e) => {
          press('back')(e);
          stopHold();
          holdTimer.current = window.setTimeout(() => {
            buzz();
            onKey('clear');
          }, 550);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onClick={(e) => e.detail === 0 && press('back')(e)}
        className={cn(KEY_CLS, FN_CLS)}
      >
        <Delete size={22} />
      </button>

      <PadButton onPress={press} k="4" label="4" />
      <PadButton onPress={press} k="5" label="5" />
      <PadButton onPress={press} k="6" label="6" />
      {allowNegative ? <PadButton onPress={press} k="sign" label="±" aria="Ishorani almashtirish" className={opCls} /> : <PadButton onPress={press} k="minus" label={<Minus size={22} />} aria="Ayirish" className={opCls} />}

      <PadButton onPress={press} k="7" label="7" />
      <PadButton onPress={press} k="8" label="8" />
      <PadButton onPress={press} k="9" label="9" />
      {allowNegative ? <PadButton onPress={press} k="clear" label="C" aria="Tozalash" className={cn(FN_CLS, 'text-expense text-lg')} /> : <PadButton onPress={press} k="plus" label={<Plus size={22} />} aria="Qo‘shish" className={opCls} />}

      <PadButton onPress={press} k="dec" label={decimal} aria="Kasr belgisi" />
      <PadButton onPress={press} k="0" label="0" />
      <PadButton onPress={press} k="000" label="000" className="text-[19px] tracking-wide" />
      {hasExpression ? (
        <PadButton onPress={press} k="equals" label={<Equal size={24} strokeWidth={2.6} />} aria="Hisoblash" className="!bg-accent !text-accent-ink active:!bg-accent" />
      ) : (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onDone();
          }}
          onClick={(e) => e.detail === 0 && onDone()}
          className="inline-flex h-[54px] items-center justify-center rounded-[16px] bg-accent font-semibold text-accent-ink shadow-[0_1px_0_rgb(0_0_0/0.15)] transition-transform active:scale-95 touch-manipulation"
          aria-label="Tayyor"
        >
          <Check size={24} strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}

/** iOS klaviaturasi uslubi: oq tugmalar, nozik pastki soya */
const KEY_CLS =
  'inline-flex h-[54px] items-center justify-center rounded-[16px] bg-surface text-[26px] font-medium text-ink tabular select-none shadow-[0_1px_0_rgb(15_23_42/0.14)] transition-[transform,background-color] duration-100 active:scale-[0.96] active:bg-surface-2 touch-manipulation dark:bg-[rgb(70_74_86)] dark:shadow-[0_1px_0_rgb(0_0_0/0.5)] dark:active:bg-[rgb(90_95_108)]';
/** Funksiya tugmalari (⌫ − + C) — to‘qroq fon */
const FN_CLS = '!bg-[rgb(var(--line))] text-ink dark:!bg-[rgb(48_51_60)]';

/** Bitta tugma — modul darajasida e’lon qilingan, shuning uchun har bosishda qayta yaratilmaydi */
function PadButton({
  k,
  label,
  className,
  aria,
  onPress,
}: {
  k: PadKey;
  label: React.ReactNode;
  className?: string;
  aria?: string;
  onPress: (k: PadKey) => (e: React.PointerEvent | React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      data-key={k}
      aria-label={aria ?? (typeof label === 'string' ? label : k)}
      onPointerDown={onPress(k)}
      onClick={(e) => e.detail === 0 && onPress(k)(e)}
      className={cn(KEY_CLS, className)}
    >
      {label}
    </button>
  );
}
