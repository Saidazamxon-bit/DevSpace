import { forwardRef } from 'react';
import { useSettings } from '@/store/settings';
import { CURRENCIES, parseMoney, minorToInput } from '@/utils/money';
import { cn } from '@/utils/misc';

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

/** Summa kiritish maydoni. Fokusdan chiqqanda chiroyli formatlanadi. */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { id, value, onChange, error, large, placeholder = '0', autoFocus, allowNegative },
  ref,
) {
  const currency = useSettings((s) => s.currency);
  const numberFormat = useSettings((s) => s.numberFormat);
  const cur = CURRENCIES[currency];
  return (
    <div className="relative">
      {cur.position === 'prefix' && (
        <span className={cn('pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-subtle', large ? 'text-2xl' : 'text-[15px]')}>
          {cur.symbol}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="next"
        autoFocus={autoFocus}
        data-autofocus={autoFocus ? '' : undefined}
        placeholder={placeholder}
        value={value}
        maxLength={24}
        onChange={(e) => {
          const allowed = allowNegative ? /[^\d\s.,\-−]/g : /[^\d\s.,]/g;
          onChange(e.target.value.replace(allowed, ''));
        }}
        onBlur={() => {
          const neg = allowNegative && /^\s*[-−]/.test(value);
          const r = parseMoney(neg ? value.replace(/[-−]/g, '') : value);
          if (r.ok) onChange((neg ? '−' : '') + minorToInput(r.value, numberFormat));
        }}
        className={cn(
          'input tabular font-semibold',
          large ? 'h-16 text-3xl rounded-2xl' : '',
          cur.position === 'prefix' ? (large ? 'pl-10' : 'pl-8') : '',
          cur.position === 'suffix' ? (large ? 'pr-20' : 'pr-16') : '',
          error && 'input-error',
        )}
      />
      {cur.position === 'suffix' && (
        <span className={cn('pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-subtle', large ? 'text-lg' : 'text-sm')}>
          {cur.symbol}
        </span>
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
