import type { DateFormat, DateRange, ISODate, PeriodPreset } from '@/types';

export const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];
export const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
/** getDay() tartibida: 0 — yakshanba */
export const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
export const WEEKDAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

const pad = (n: number) => n.toString().padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `YYYY-MM-DD` ni mahalliy vaqt bo‘yicha Date ga aylantiradi (UTC siljishisiz) */
export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function isValidISODate(s: unknown): s is ISODate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = fromISODate(s);
  return toISODate(d) === s && d.getFullYear() >= 1970 && d.getFullYear() <= 2200;
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function addMonths(s: ISODate, n: number): ISODate {
  const d = fromISODate(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

export function startOfMonth(s: ISODate): ISODate {
  return s.slice(0, 8) + '01';
}
export function endOfMonth(s: ISODate): ISODate {
  const d = fromISODate(s);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
/** Hafta dushanbadan boshlanadi */
export function startOfWeek(s: ISODate): ISODate {
  const d = fromISODate(s);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return toISODate(d);
}
export function monthKey(s: ISODate): string {
  return s.slice(0, 7);
}
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000);
}

export function rangeForPreset(preset: Exclude<PeriodPreset, 'custom'>, today = todayISO()): DateRange {
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: startOfWeek(today), to: addDays(startOfWeek(today), 6) };
    case 'month':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  }
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: 'Bugun',
  week: 'Bu hafta',
  month: 'Bu oy',
  year: 'Bu yil',
  custom: 'Maxsus',
};

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'DD.MM.YYYY', label: '21.11.2026' },
  { value: 'DD/MM/YYYY', label: '21/11/2026' },
  { value: 'YYYY-MM-DD', label: '2026-11-21' },
  { value: 'D MMMM YYYY', label: '21-noyabr, 2026' },
];

export function formatDate(s: ISODate, fmt: DateFormat): string {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  switch (fmt) {
    case 'DD.MM.YYYY':
      return `${d}.${m}.${y}`;
    case 'DD/MM/YYYY':
      return `${d}/${m}/${y}`;
    case 'YYYY-MM-DD':
      return s;
    case 'D MMMM YYYY':
      return `${Number(d)}-${MONTHS[Number(m) - 1].toLowerCase()}, ${y}`;
  }
}

/** Ro‘yxat sarlavhalari uchun: "Bugun", "Kecha", "18-noyabr, chorshanba" */
export function formatDayHeading(s: ISODate, fmt: DateFormat, today = todayISO()): string {
  if (s === today) return 'Bugun';
  if (s === addDays(today, -1)) return 'Kecha';
  const d = fromISODate(s);
  const wd = WEEKDAYS[d.getDay()].toLowerCase();
  if (fmt === 'D MMMM YYYY' || s.slice(0, 4) === today.slice(0, 4)) {
    const base = `${d.getDate()}-${MONTHS[d.getMonth()].toLowerCase()}`;
    return s.slice(0, 4) === today.slice(0, 4) ? `${base}, ${wd}` : `${base} ${d.getFullYear()}, ${wd}`;
  }
  return `${formatDate(s, fmt)}, ${wd}`;
}

export function formatRange(r: DateRange, fmt: DateFormat): string {
  if (r.from === r.to) return formatDate(r.from, fmt);
  return `${formatDate(r.from, fmt)} — ${formatDate(r.to, fmt)}`;
}

/** "Noyabr 2026" */
export function formatMonthYear(s: ISODate): string {
  const d = fromISODate(s);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Bosh sahifa salomlashuvi: "Dushanba, 21-noyabr 2026" */
export function formatLongToday(d = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}-${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}
