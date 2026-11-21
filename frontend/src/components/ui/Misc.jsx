import { Inbox, Loader2, Search, X } from 'lucide-react';
import { t } from '../../i18n';

export function Badge({ tone = 'neutral', children, dot }) {
  return <span className={`badge badge-${tone}`}>{dot && <i className="badge-dot" />}{children}</span>;
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon size={22} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = t('Loading…') }) {
  return <div className="spinner-wrap"><Loader2 className="spin" size={22} /><span>{label}</span></div>;
}

export function Skeleton({ h = 16, w = '100%', r = 8, className = '' }) {
  return <div className={`skeleton ${className}`} style={{ height: h, width: w, borderRadius: r }} />;
}

export function SkeletonCards({ count = 4, h = 140 }) {
  return <div className="grid-auto">{Array.from({ length: count }).map((_, i) => <Skeleton key={i} h={h} r={16} />)}</div>;
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty">
      <h3>{t('Couldn’t load this data')}</h3>
      <p>{error?.message}</p>
      {onRetry && <button type="button" className="btn btn-secondary btn-md" onClick={() => onRetry()}>{t('Try again')}</button>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = t('Search…'), className = '' }) {
  return (
    <div className={`search-input ${className}`}>
      <Search size={16} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && <button type="button" onClick={() => onChange('')} aria-label={t('Clear search')}><X size={14} /></button>}
    </div>
  );
}

export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className={`segmented segmented-${size}`} role="tablist">
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)} title={o.label}>
            {Icon && <Icon size={15} />}{(!Icon || !o.iconOnly) && <span>{o.label}</span>}
            {o.count !== undefined && <em>{o.count}</em>}
          </button>
        );
      })}
    </div>
  );
}

export function Progress({ value, tone = 'accent' }) {
  return <div className={`progress progress-${tone}`}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Tags({ items, max = 4 }) {
  if (!items?.length) return null;
  return (
    <div className="tags">
      {items.slice(0, max).map((t) => <span key={t} className="tag">{t}</span>)}
      {items.length > max && <span className="tag tag-more">+{items.length - max}</span>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="page-head">
      <div className="page-head-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
      {children}
    </div>
  );
}

export function Toolbar({ children }) {
  return <div className="toolbar">{children}</div>;
}

export function MiniStat({ label, value, sub, tone }) {
  return (
    <div className={`mini-stat${tone ? ` tone-${tone}` : ''}`}>
      <span className="mini-stat-label">{label}</span>
      <strong>{value}</strong>
      {sub && <span className="mini-stat-sub">{sub}</span>}
    </div>
  );
}
