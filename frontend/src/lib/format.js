const pad = (n) => String(n).padStart(2, '0');

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
  return d ? d.toLocaleDateString('en-US', opts) : '—';
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
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return '';
  const s = Math.round((serverNow().getTime() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 604800) return `${Math.round(s / 86400)}d ago`;
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
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export const splitList = (s) => (s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : []);
export const humanize = (s) => (s ? String(s).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'D';
