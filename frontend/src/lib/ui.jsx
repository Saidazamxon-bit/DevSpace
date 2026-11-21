import { Badge } from '../components/ui/Misc';
import { humanize } from './format';

const STATUS_TONES = {
  active: 'accent', planning: 'info', paused: 'orange', completed: 'neutral',
  online: 'accent', maintenance: 'orange', offline: 'danger',
  up: 'accent', down: 'danger', unknown: 'muted',
  todo: 'neutral', in_progress: 'info', review: 'orange', done: 'accent',
  expiring: 'orange', expired: 'danger',
};

export function StatusBadge({ status, label }) {
  return <Badge tone={STATUS_TONES[status] || 'neutral'} dot>{label || humanize(status)}</Badge>;
}

export function PriorityBadge({ priority }) {
  return <span className={`prio prio-${priority}`}>{priority}</span>;
}

export function DaysBadge({ days, warnAt = 30 }) {
  if (days === null || days === undefined) return <span className="faint">—</span>;
  if (days < 0) return <Badge tone="danger">Expired {Math.abs(days)}d ago</Badge>;
  if (days <= 7) return <Badge tone="danger">{days === 0 ? 'Today' : `${days}d left`}</Badge>;
  if (days <= warnAt) return <Badge tone="orange">{days}d left</Badge>;
  return <Badge tone="muted">{days}d left</Badge>;
}

export const toSelect = (v) => (v === null || v === undefined ? '' : String(v));
