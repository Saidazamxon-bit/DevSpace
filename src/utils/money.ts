import type { CurrencyCode, Minor, NumberFormat } from '@/types';

/** Ruxsat etilgan eng katta summa (≈ 10 trillion birlik) — Number.MAX_SAFE_INTEGER dan ancha kichik */
export const MAX_MINOR = 1_000_000_000_000_000;

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  position: 'prefix' | 'suffix';
  /** Kasr qismi har doim ko‘rsatiladimi */
  alwaysDecimals: boolean;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  UZS: { code: 'UZS', name: 'O‘zbek so‘mi', symbol: 'so‘m', position: 'suffix', alwaysDecimals: false },
  USD: { code: 'USD', name: 'AQSH dollari', symbol: '$', position: 'prefix', alwaysDecimals: true },
  EUR: { code: 'EUR', name: 'Yevro', symbol: '€', position: 'prefix', alwaysDecimals: true },
  RUB: { code: 'RUB', name: 'Rossiya rubli', symbol: '₽', position: 'suffix', alwaysDecimals: false },
};

const SEPARATORS: Record<NumberFormat, { group: string; decimal: string; label: string }> = {
  space: { group: ' ', decimal: ',', label: '1 234 567,89' },
  comma: { group: ',', decimal: '.', label: '1,234,567.89' },
  dot: { group: '.', decimal: ',', label: '1.234.567,89' },
};

export const NUMBER_FORMAT_OPTIONS = (Object.keys(SEPARATORS) as NumberFormat[]).map((k) => ({
  value: k,
  label: SEPARATORS[k].label,
}));

function groupDigits(int: string, sep: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

export interface FormatOptions {
  currency: CurrencyCode;
  numberFormat: NumberFormat;
  /** Belgini qo‘shish (+/−) */
  sign?: 'auto' | 'always' | 'never';
  /** Valyuta belgisini ko‘rsatmaslik */
  plain?: boolean;
  /** Qisqa ko‘rinish: 1,2 mln */
  compact?: boolean;
}

/** Butun sonli tiyinni matnga aylantiradi. Floating-point ishlatilmaydi. */
export function formatMoney(minor: Minor, opts: FormatOptions): string {
  const cur = CURRENCIES[opts.currency];
  const sep = SEPARATORS[opts.numberFormat];
  const negative = minor < 0;
  const abs = Math.abs(Math.trunc(minor));

  let body: string;
  if (opts.compact && abs >= 100_000_000) {
    body = compactNumber(abs, sep.decimal);
  } else {
    const intPart = Math.floor(abs / 100).toString();
    const frac = (abs % 100).toString().padStart(2, '0');
    const showFrac = cur.alwaysDecimals || frac !== '00';
    body = groupDigits(intPart, sep.group) + (showFrac ? sep.decimal + frac : '');
  }

  const signMode = opts.sign ?? 'auto';
  let sign = '';
  if (signMode === 'always') sign = negative ? '−' : minor > 0 ? '+' : '';
  else if (signMode === 'auto' && negative) sign = '−';

  if (opts.plain) return sign + body;
  return cur.position === 'prefix' ? `${sign}${cur.symbol}${body}` : `${sign}${body} ${cur.symbol}`;
}

/** 1 250 000 000 tiyin => "12,5 mln" */
function compactNumber(absMinor: number, decimal: string): string {
  const units = absMinor / 100;
  const steps: [number, string][] = [
    [1e12, 'trln'],
    [1e9, 'mlrd'],
    [1e6, 'mln'],
    [1e3, 'ming'],
  ];
  for (const [v, label] of steps) {
    if (units >= v) {
      const n = Math.round((units / v) * 10) / 10;
      return `${n.toString().replace('.', decimal)} ${label}`;
    }
  }
  return Math.round(units).toString();
}

/** Grafik o‘qlari uchun qisqa son */
export function formatAxis(minor: number): string {
  const units = Math.abs(minor) / 100;
  const sign = minor < 0 ? '−' : '';
  if (units >= 1e9) return `${sign}${trim(units / 1e9)} mlrd`;
  if (units >= 1e6) return `${sign}${trim(units / 1e6)} mln`;
  if (units >= 1e3) return `${sign}${trim(units / 1e3)} ming`;
  return `${sign}${Math.round(units)}`;
}
function trim(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}

export type ParseResult = { ok: true; value: Minor } | { ok: false; error: string };

/**
 * Foydalanuvchi kiritgan matnni tiyinga aylantiradi.
 * Qabul qilinadi: "1 250 000", "1250000,5", "1,250,000.50", "1.250.000,50", "99.9".
 * Hisob faqat satr va butun sonlar orqali — floating-point xatolari yo‘q.
 */
export function parseMoney(input: string): ParseResult {
  let s = (input ?? '').toString().trim().replace(/[\s  '’]/g, '');
  if (!s) return { ok: false, error: 'Summani kiriting' };
  if (s.startsWith('-') || s.startsWith('−')) return { ok: false, error: 'Summa manfiy bo‘lishi mumkin emas' };
  if (!/^[\d.,]+$/.test(s)) return { ok: false, error: 'Faqat raqamlardan foydalaning' };

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let decimalSep: '.' | ',' | null = null;

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSep = lastDot > lastComma ? '.' : ',';
  } else if (lastDot >= 0 || lastComma >= 0) {
    const ch = lastDot >= 0 ? '.' : ',';
    const count = s.split(ch).length - 1;
    const after = s.length - s.lastIndexOf(ch) - 1;
    // Bitta ajratuvchi va undan keyin 1-2 raqam — kasr qismi; aks holda minglik ajratuvchi
    decimalSep = count === 1 && after > 0 && after <= 2 ? ch : null;
    if (count === 1 && after === 0) {
      s = s.slice(0, -1); // "100." => "100"
    }
  }

  let intStr = s;
  let fracStr = '';
  if (decimalSep) {
    const idx = s.lastIndexOf(decimalSep);
    intStr = s.slice(0, idx);
    fracStr = s.slice(idx + 1);
  }
  intStr = intStr.replace(/[.,]/g, '');
  if (/[.,]/.test(fracStr)) return { ok: false, error: 'Summa noto‘g‘ri formatda' };
  if (fracStr.length > 2) return { ok: false, error: 'Kasr qismi ko‘pi bilan 2 xonali' };
  if (!intStr) intStr = '0';
  if (intStr.length > 16) return { ok: false, error: 'Summa juda katta' };

  const value = Number(intStr) * 100 + Number(fracStr.padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(value)) return { ok: false, error: 'Summa juda katta' };
  if (value <= 0) return { ok: false, error: 'Summa noldan katta bo‘lishi kerak' };
  if (value > MAX_MINOR) return { ok: false, error: 'Summa juda katta' };
  return { ok: true, value };
}

/** Tahrirlash maydoni uchun: 1250050 => "12500,50" (guruhlarsiz) */
export function minorToInput(minor: Minor, numberFormat: NumberFormat): string {
  const int = Math.floor(minor / 100);
  const frac = minor % 100;
  const dec = SEPARATORS[numberFormat].decimal;
  const intStr = groupDigits(int.toString(), numberFormat === 'space' ? ' ' : SEPARATORS[numberFormat].group);
  return frac ? `${intStr}${dec}${frac.toString().padStart(2, '0')}` : intStr;
}

/** CSV uchun mashina o‘qiydigan son: 1250050 => "12500.50" */
export function minorToDecimalString(minor: Minor): string {
  const neg = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${neg}${Math.floor(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

/** Butun sonlar yig‘indisi */
export function sumMinor(values: Minor[]): Minor {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Foiz (0..∞), butun son aniqligida emas — faqat ko‘rsatish uchun */
export function percent(part: Minor, whole: Minor): number {
  if (whole <= 0) return 0;
  return (part / whole) * 100;
}
