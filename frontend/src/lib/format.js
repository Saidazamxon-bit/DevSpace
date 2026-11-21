import { lang, t } from '../i18n';

const pad = (n) => String(n).padStart(2, '0');

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const UZ_DAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

/**
 * Locale-aware date formatting with Intl-like options.
 * Uzbek is formatted by hand (e.g. "shanba, 21-noyabr, 2026") so it never depends on browser locale data.
 */
export function fmtDate(d, opts = {}) {
  if (!d) return '—';
  if (lang !== 'uz') return d.toLocaleDateString('en-US', opts);
  const parts = [];
  if (opts.weekday) parts.push(opts.weekday === 'long' ? UZ_DAYS[d.getDay()] : UZ_DAYS_SHORT[d.getDay()]);
  const month = opts.month ? (opts.month === 'long' ? UZ_MONTHS : UZ_MONTHS_SHORT)[d.getMonth()] : null;
  let main = '';
  if (opts.day && month) main = `${d.getDate()}-${month}`;
  else if (opts.day) main = String(d.getDate());
  else if (month) main = month;
  if (main) parts.push(main);
  let out = parts.join(opts.weekday && opts.day && !month ? ' ' : ', ');
  if (opts.year) out += opts.day ? `, ${d.getFullYear()}` : ` ${d.getFullYear()}`;
  if (opts.hour) out += `, ${pad(d.getHours())}:00`;
  return out;
}

/*
 * All timestamps from the API are wall-clock times in the server's timezone.
 * We measure the difference between the server's wall clock and the browser's once,
 * so "now", "today" and relative times are correct even if the browser is elsewhere.
 */
let offsetMs = 0;
export function syncServerTime(serverNow) {
  const d = parseDate(serverNow);
  if (d) offsetMs = d.getTime() - Date.now();
}
export const serverNow = () => new Date(Date.now() + offsetMs);

/** Parse "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS" as a local date. */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const [d, t = '00:00:00'] = String(value).split(/[ T]/);
  const [y, m, day] = d.split('-').map(Number);
  const [h = 0, mi = 0, s = 0] = t.split(':').map(Number);
  return new Date(y, m - 1, day, h, mi, s);
}

export const todayISO = () => { const d = serverNow(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function formatDate(value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const d = parseDate(value);
  return d ? fmtDate(d, opts) : '—';
}
export const formatShortDate = (v) => formatDate(v, { month: 'short', day: 'numeric' });
export function formatTime(value) {
  const d = parseDate(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
}
export function formatDateTime(value) {
  const d = parseDate(value);
  return d ? `${formatDate(d, { month: 'short', day: 'numeric' })}, ${formatTime(d)}` : '—';
}

export function daysUntil(value) {
  const d = parseDate(value);
  if (!d) return null;
  const t = serverNow(); t.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return Math.round((x - t) / 86400000);
}

export function relativeDays(days) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return t('Today');
  if (days === 1) return t('Tomorrow');
  if (days === -1) return t('Yesterday');
  return days > 0 ? t('in {n} days', { n: days }) : t('{n} days ago', { n: Math.abs(days) });
}

export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return '';
  const s = Math.round((serverNow().getTime() - d.getTime()) / 1000);
  if (s < 45) return t('just now');
  if (s < 3600) return t('{n}m ago', { n: Math.round(s / 60) });
  if (s < 86400) return t('{n}h ago', { n: Math.round(s / 3600) });
  if (s < 604800) return t('{n}d ago', { n: Math.round(s / 86400) });
  return formatDate(d);
}

const SYMBOLS = { USD: '$', EUR: '€', UZS: '' };
export function formatMoney(amount, currency = 'USD', { compact = false } = {}) {
  const n = Number(amount || 0);
  const digits = currency === 'UZS' ? 0 : 2;
  const num = compact && Math.abs(n) >= 10000
    ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  return currency === 'UZS' ? `${num} so'm` : `${SYMBOLS[currency] ?? ''}${num}`;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function formatDuration(seconds) {
  const u = lang === 'uz' ? { s: 's', m: 'daq', h: 'soat', d: 'kun' } : { s: 's', m: 'm', h: 'h', d: 'd' };
  const sp = lang === 'uz' ? ' ' : '';
  if (seconds < 60) return `${seconds}${sp}${u.s}`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}${sp}${u.m}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${sp}${u.h} ${m % 60}${sp}${u.m}`;
  return `${Math.floor(h / 24)}${sp}${u.d} ${h % 24}${sp}${u.h}`;
}

export const splitList = (s) => (s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : []);
export const humanize = (s) => (s ? String(s).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'D';
