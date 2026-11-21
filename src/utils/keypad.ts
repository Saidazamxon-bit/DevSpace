import type { NumberFormat } from '@/types';

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | 'dec' | 'back' | 'clear' | 'sign';

const SEP: Record<NumberFormat, { group: string; decimal: string }> = {
  space: { group: ' ', decimal: ',' },
  comma: { group: ',', decimal: '.' },
  dot: { group: '.', decimal: ',' },
};

const MAX_INT_DIGITS = 13;

export function decimalSeparator(fmt: NumberFormat): string {
  return SEP[fmt].decimal;
}

/**
 * Ilova klaviaturasidagi tugma bosilganda summa matnini yangilaydi.
 * Natija har doim minglik ajratuvchilar bilan chiroyli ko‘rinishda bo‘ladi: "1 250 000,5".
 */
export function applyPadKey(value: string, key: PadKey, fmt: NumberFormat, allowNegative = false): string {
  const { group, decimal } = SEP[fmt];
  let neg = /^\s*[-−]/.test(value);
  const raw = value.replace(/^\s*[-−]\s*/, '').split(group).join('').replace(/\s/g, '');
  const decIdx = raw.indexOf(decimal);
  let hasDec = decIdx >= 0;
  let int = (hasDec ? raw.slice(0, decIdx) : raw).replace(/\D/g, '');
  let frac = hasDec ? raw.slice(decIdx + 1).replace(/\D/g, '').slice(0, 2) : '';

  switch (key) {
    case 'clear':
      return '';
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
