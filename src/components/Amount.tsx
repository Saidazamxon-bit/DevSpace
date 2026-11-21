import { useSettings } from '@/store/settings';
import { CURRENCIES, formatMoney } from '@/utils/money';
import { cn } from '@/utils/misc';

/**
 * Katta summa: raqam qismi yirik, valyuta belgisi kichikroq.
 * Tor ekranlarda raqam o‘rtasidan emas, faqat valyuta belgisidan oldin qatorga o‘tadi.
 */
export function Amount({ value, sign, className, symbolClassName }: { value: number; sign?: 'auto' | 'always'; className?: string; symbolClassName?: string }) {
  const currency = useSettings((s) => s.currency);
  const numberFormat = useSettings((s) => s.numberFormat);
  const cur = CURRENCIES[currency];
  const num = formatMoney(value, { currency, numberFormat, sign, plain: true });
  const sym = <span className={cn('text-[0.62em] font-semibold opacity-70', symbolClassName)}>{cur.symbol}</span>;
  if (cur.position === 'prefix') {
    const m = /^([+−]?)(.*)$/.exec(num)!;
    return (
      <span className={cn('tabular', className)}>
        {m[1]}
        {sym}
        <span className="whitespace-nowrap">{m[2]}</span>
      </span>
    );
  }
  return (
    <span className={cn('tabular', className)}>
      <span className="whitespace-nowrap">{num}</span> {sym}
    </span>
  );
}
