import { t } from '../i18n';

export const PROJECT_STATUSES = [
  { value: 'planning', label: t('Planning') },
  { value: 'active', label: t('Active') },
  { value: 'paused', label: t('Paused') },
  { value: 'completed', label: t('Completed') },
];
export const PRIORITIES = [
  { value: 'low', label: t('Low') },
  { value: 'medium', label: t('Medium') },
  { value: 'high', label: t('High') },
  { value: 'critical', label: t('Critical') },
];
export const TASK_STATUSES = [
  { value: 'todo', label: t('To do') },
  { value: 'in_progress', label: t('In progress') },
  { value: 'review', label: t('Review') },
  { value: 'done', label: t('Done') },
];
export const SERVER_STATUSES = [
  { value: 'online', label: t('Online') },
  { value: 'maintenance', label: t('Maintenance') },
  { value: 'offline', label: t('Offline') },
];
export const CURRENCIES = [
  { value: 'USD', label: t('USD — US Dollar') },
  { value: 'EUR', label: t('EUR — Euro') },
  { value: 'UZS', label: t("UZS — Uzbek so'm") },
];
export const INTERVALS = [1, 5, 10, 15, 30, 60].map((m) => ({ value: String(m), label: m === 60 ? t('Every hour') : t('Every {n} min', { n: m }) }));

export const LANGUAGES = [
  ['plaintext', t('Plain text')], ['php', 'PHP'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['jsx', 'JSX'],
  ['html', 'HTML'], ['css', 'CSS'], ['scss', 'SCSS'], ['sql', 'SQL'], ['bash', 'Bash'], ['python', 'Python'], ['json', 'JSON'],
  ['yaml', 'YAML'], ['go', 'Go'], ['rust', 'Rust'], ['java', 'Java'], ['csharp', 'C#'], ['cpp', 'C++'], ['c', 'C'],
  ['ruby', 'Ruby'], ['kotlin', 'Kotlin'], ['swift', 'Swift'], ['dart', 'Dart'], ['nginx', 'Nginx'], ['apache', 'Apache'],
  ['dockerfile', 'Dockerfile'], ['markdown', 'Markdown'], ['xml', 'XML'], ['ini', 'INI'],
].map(([value, label]) => ({ value, label }));

export const PROJECT_COLORS = ['#B8FF65', '#FF9F2E', '#6EA8FE', '#C084FC', '#F472B6', '#2DD4BF', '#FACC15', '#F87171'];

/** Human label for any status / state / priority value. */
const STATUS_LABELS = {
  planning: 'Planning', active: 'Active', paused: 'Paused', completed: 'Completed',
  todo: 'To do', in_progress: 'In progress', review: 'Review', done: 'Done',
  online: 'Online', maintenance: 'Maintenance', offline: 'Offline',
  up: 'Up', down: 'Down', unknown: 'Unknown', expiring: 'Expiring', expired: 'Expired',
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
};
export const statusLabel = (s) => t(STATUS_LABELS[s] || s);
