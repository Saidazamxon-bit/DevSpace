import { Badge } from '../components/ui/Misc';
import { statusLabel } from './constants';
import { t } from '../i18n';

const STATUS_TONES = {
  active: 'accent', planning: 'info', paused: 'orange', completed: 'neutral',
  online: 'accent', maintenance: 'orange', offline: 'danger',
  up: 'accent', down: 'danger', unknown: 'muted',
  todo: 'neutral', in_progress: 'info', review: 'orange', done: 'accent',
  expiring: 'orange', expired: 'danger',
};

export function StatusBadge({ status, label }) {
  return <Badge tone={STATUS_TONES[status] || 'neutral'} dot>{label || statusLabel(status)}</Badge>;
}

export function PriorityBadge({ priority }) {
  return <span className={`prio prio-${priority}`}>{statusLabel(priority)}</span>;
}

export function DaysBadge({ days, warnAt = 30 }) {
  if (days === null || days === undefined) return <span className="faint">—</span>;
  if (days < 0) return <Badge tone="danger">{t('Expired {n}d ago', { n: Math.abs(days) })}</Badge>;
  if (days <= 7) return <Badge tone="danger">{days === 0 ? t('Today') : t('{n}d left', { n: days })}</Badge>;
  if (days <= warnAt) return <Badge tone="orange">{t('{n}d left', { n: days })}</Badge>;
  return <Badge tone="muted">{t('{n}d left', { n: days })}</Badge>;
}

export const toSelect = (v) => (v === null || v === undefined ? '' : String(v));
