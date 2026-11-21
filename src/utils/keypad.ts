import type { NumberFormat } from '@/types';
import { parseMoney } from './money';

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | 'dec' | 'back' | 'clear' | 'sign' | 'plus' | 'minus' | 'equals';

const SEP: Record<NumberFormat, { group: string; decimal: string }> = {
  space: { group: ' ', decimal: ',' },
  comma: { group: ',', decimal: '.' },
  dot: { group: '.', decimal: ',' },
};

const MAX_INT_DIGITS = 13;

export function decimalSeparator(fmt: NumberFormat): string {
  return SEP[fmt].decimal;
}

const OPS = /[+−]/;

/** Matnda hisoblash amali bormi: "45 000+12 000" */
export function hasOperator(value: string): boolean {
  return OPS.test(value.replace(/^\s*[-−]/, ''));
}

/**
 * Ilova klaviaturasidagi tugma bosilganda summa matnini yangilaydi.
 * Natija minglik ajratuvchilar bilan: "1 250 000,5". Hisoblash: "45 000+12 000−5 000".
 */
export function applyPadKey(value: string, key: PadKey, fmt: NumberFormat, allowNegative = false): string {
  if (key === 'clear') return '';
  if (key === 'equals') return evaluateToString(value, fmt);
  if (key === 'plus' || key === 'minus') {
    if (allowNegative) return value;
    const op = key === 'plus' ? '+' : '−';
    if (!value) return '';
    if (/[+−]$/.test(value)) return value.slice(0, -1) + op;
    const { decimal } = SEP[fmt];
    return value.replace(new RegExp(`\\${decimal}$`), '') + op;
  }
  if (!allowNegative) {
    // Oxirgi operand bilan ishlaymiz
    const m = /^(.*[+−])?([^+−]*)$/.exec(value)!;
    const head = m[1] ?? '';
    if (key === 'back' && !m[2] && head) return head.slice(0, -1);
    return head + applyToNumber(m[2], key, fmt, false);
  }
  return applyToNumber(value, key, fmt, allowNegative);
}

/** Ifodani hisoblab, natijani formatlangan matn sifatida qaytaradi ("" — noto‘g‘ri bo‘lsa) */
export function evaluateToString(value: string, fmt: NumberFormat): string {
  const minor = evaluateMinor(value, fmt);
  if (minor === null || minor <= 0) return minor === 0 ? '' : value;
  const { group, decimal } = SEP[fmt];
  const int = Math.floor(minor / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, group);
  const frac = minor % 100;
  return frac ? `${int}${decimal}${frac.toString().padStart(2, '0').replace(/0$/, '')}` : int;
}

/** "45 000+12 000−5 000" → tiyinda butun son. Operandlar tiyin aniqligida qo‘shiladi. */
export function evaluateMinor(value: string, fmt: NumberFormat): number | null {
  const { group, decimal } = SEP[fmt];
  const parts = value.split(/([+−])/);
  let total = 0;
  let sign = 1;
  let any = false;
  for (const p of parts) {
    if (p === '+') sign = 1;
    else if (p === '−') sign = -1;
    else {
      const raw = p.split(group).join('').replace(/\s/g, '');
      if (!raw) continue;
      const [i, f = ''] = raw.split(decimal);
      if (!/^\d*$/.test(i) || !/^\d{0,2}$/.test(f)) return null;
      total += sign * (Number(i || '0') * 100 + Number(f.padEnd(2, '0')));
      any = true;
    }
  }
  return any && Number.isSafeInteger(total) ? total : null;
}

function applyToNumber(value: string, key: PadKey, fmt: NumberFormat, allowNegative: boolean): string {
  const { group, decimal } = SEP[fmt];
  let neg = /^\s*[-−]/.test(value);
  const raw = value.replace(/^\s*[-−]\s*/, '').split(group).join('').replace(/\s/g, '');
  const decIdx = raw.indexOf(decimal);
  let hasDec = decIdx >= 0;
  let int = (hasDec ? raw.slice(0, decIdx) : raw).replace(/\D/g, '');
  let frac = hasDec ? raw.slice(decIdx + 1).replace(/\D/g, '').slice(0, 2) : '';

  switch (key) {
    case 'sign':
      if (allowNegative) neg = !neg;
      break;
    case 'dec':
      if (!hasDec) {
        hasDec = true;
        if (!int) int = '0';
      }
      break;
    case 'back':
      if (hasDec && frac) frac = frac.slice(0, -1);
      else if (hasDec) hasDec = false;
      else int = int.slice(0, -1);
      break;
    case '000':
      if (!hasDec && int && int !== '0') int = (int + '000').slice(0, Math.max(int.length, MAX_INT_DIGITS));
      break;
    default:
      if (!/^\d$/.test(key)) break;
      if (hasDec) {
        if (frac.length < 2) frac += key;
      } else if (!int || int === '0') {
        int = key;
      } else if (int.length < MAX_INT_DIGITS) {
        int += key;
      }
  }

  if (!int && !hasDec) return neg && allowNegative ? '−' : '';
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return `${neg && allowNegative ? '−' : ''}${grouped}${hasDec ? decimal + frac : ''}`;
}

/** Summa maydonidagi matnni o‘qish: oddiy son yoki "45 000+12 000" ifodasi */
export function parseAmountInput(value: string, fmt: NumberFormat): { ok: true; value: number } | { ok: false; error: string } {
  if (hasOperator(value)) {
    const v = evaluateMinor(value.replace(/[+−]\s*$/, ''), fmt);
    if (v === null) return { ok: false, error: 'Hisoblashda xato' };
    if (v <= 0) return { ok: false, error: 'Natija noldan katta bo‘lishi kerak' };
    if (v > 1_000_000_000_000_000) return { ok: false, error: 'Summa juda katta' };
    return { ok: true, value: v };
  }
  return parseMoney(value);
}
