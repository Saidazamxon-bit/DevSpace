import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useSettings } from '@/store/settings';
import { CURRENCIES, parseMoney, minorToInput } from '@/utils/money';
import { applyPadKey, decimalSeparator, evaluateToString, hasOperator, type PadKey } from '@/utils/keypad';
import { cn } from '@/utils/misc';
import { NumPad } from './NumPad';

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  large?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  allowNegative?: boolean;
}

/** Sensorli qurilma (telefon/planshet) — tizim klaviaturasi o‘rniga ilova klaviaturasi ishlatiladi */
function useTouchDevice(): boolean {
  const q = '(hover: none) and (pointer: coarse)';
  const [touch, setTouch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setTouch(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return touch;
}

/**
 * Summa kiritish maydoni.
 *  - Kompyuterda: oddiy klaviatura, fokusdan chiqqanda chiroyli formatlanadi.
 *  - Telefonda: tizim klaviaturasi ochilmaydi, uning o‘rniga ilovaning o‘z raqamli klaviaturasi chiqadi.
 */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { id, value, onChange, error, large, placeholder = '0', autoFocus, allowNegative },
  ref,
) {
  const currency = useSettings((s) => s.currency);
  const numberFormat = useSettings((s) => s.numberFormat);
  const cur = CURRENCIES[currency];
  const touch = useTouchDevice();
  const [padOpen, setPadOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  // Yangi forma ochilganda klaviatura darhol ko‘rinsin
  useEffect(() => {
    if (touch && autoFocus) setPadOpen(true);
  }, [touch, autoFocus]);

  // Maydon va klaviaturadan tashqariga bosilsa — klaviaturani yopish.
  // `click` dan keyin yopiladi (pointerdown’da emas): aks holda klaviatura yo‘qolib, sahifa siljiydi
  // va barmoq ostidagi bosish boshqa elementga (masalan, boshqa kategoriyaga) tushib qoladi.
  useEffect(() => {
    if (!padOpen) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPadOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [padOpen]);

  const onKey = (k: PadKey) => onChange(applyPadKey(valueRef.current, k, numberFormat, allowNegative));

  return (
    <div ref={wrapRef}>
      <div className="relative">
        {cur.position === 'prefix' && (
          <span className={cn('pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-subtle', large ? 'text-2xl' : 'text-[15px]')}>
            {cur.symbol}
          </span>
        )}
        <input
          ref={inputRef}
          id={id}
          inputMode={touch ? 'none' : 'decimal'}
          readOnly={touch}
          aria-haspopup={touch ? 'true' : undefined}
          aria-expanded={touch ? padOpen : undefined}
          autoComplete="off"
          enterKeyHint="next"
          autoFocus={autoFocus && !touch}
          data-autofocus={autoFocus && !touch ? '' : undefined}
          placeholder={placeholder}
          value={value}
          maxLength={60}
          onClick={() => touch && setPadOpen(true)}
          onFocus={() => touch && setPadOpen(true)}
          onChange={(e) => {
            if (allowNegative) return onChange(e.target.value.replace(/[^\d\s.,\-−]/g, ''));
            // Kompyuterda ham hisoblash mumkin: 45000+12000-5000
            onChange(e.target.value.replace(/[^\d\s.,+\-−]/g, '').replace(/-/g, '−').replace(/^[+−]+/, ''));
          }}
          onBlur={() => {
            if (touch) return;
            if (!allowNegative && hasOperator(value)) return onChange(evaluateToString(value.replace(/[+−]\s*$/, ''), numberFormat));
            const neg = allowNegative && /^\s*[-−]/.test(value);
            const r = parseMoney(neg ? value.replace(/[-−]/g, '') : value);
            if (r.ok) onChange((neg ? '−' : '') + minorToInput(r.value, numberFormat));
          }}
          className={cn(
            'input tabular font-semibold',
            large ? 'amount-input h-[76px] rounded-[24px] border-transparent bg-surface-2 text-center text-[36px] font-bold tracking-tight focus:bg-surface' : '',
            cur.position === 'prefix' ? (large ? 'px-12' : 'pl-8') : '',
            cur.position === 'suffix' ? (large ? 'px-20' : 'pr-16') : '',
            touch && 'cursor-pointer caret-transparent select-none',
            touch && padOpen && '!border-accent ring-4 ring-accent/15',
            error && 'input-error',
          )}
        />
        {cur.position === 'suffix' && (
          <span className={cn('pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-semibold text-subtle', large ? 'text-[17px]' : 'text-sm')}>
            {cur.symbol}
          </span>
        )}
      </div>
      {touch && padOpen && (
        <NumPad
          onKey={onKey}
          onDone={() => setPadOpen(false)}
          decimal={decimalSeparator(numberFormat)}
          allowNegative={allowNegative}
          hasExpression={!allowNegative && hasOperator(value) && !/[+−]$/.test(value)}
        />
      )}
    </div>
  );
});

/** Ishorali summani o‘qish (boshlang‘ich balans uchun) */
export function parseSignedMoney(v: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = v.trim();
  if (!trimmed || /^[-−]?\s*0*([.,]0*)?$/.test(trimmed)) return { ok: true, value: 0 };
  const neg = /^[-−]/.test(trimmed);
  const r = parseMoney(trimmed.replace(/^[-−]\s*/, ''));
  if (!r.ok) return r;
  return { ok: true, value: neg ? -r.value : r.value };
}
