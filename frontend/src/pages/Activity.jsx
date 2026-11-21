import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, CheckCircle2, Eye, History, LogIn, LogOut, Pencil, Plus, RotateCcw, ServerCrash, Trash2, Download, HeartPulse } from 'lucide-react';
import { useApi, useDebounce } from '../hooks/useApi';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Fields';
import { EmptyState, ErrorState, PageHeader, SearchInput, Spinner, Toolbar } from '../components/ui/Misc';
import { fmtDate, formatTime, humanize, parseDate, serverNow, toISODate } from '../lib/format';
import { t, tr } from '../i18n';

const ICONS = { created: Plus, updated: Pencil, deleted: Trash2, completed: CheckCircle2, archived: Archive, restored: RotateCcw, incident: ServerCrash, recovered: HeartPulse, revealed: Eye, login: LogIn, logout: LogOut, exported: Download, downloaded: Download };
const LINKS = { project: (id) => (id ? `/projects/${id}` : '/projects'), task: () => '/tasks', domain: () => '/domains', server: () => '/servers', monitor: (id) => (id ? `/monitoring/${id}` : '/monitoring'), credential: () => '/vault', expense: () => '/expenses', snippet: () => '/snippets' };

function Heatmap({ cells }) {
  const map = Object.fromEntries(cells.map((c) => [c.date, c.count]));
  const days = [];
  const end = serverNow(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(start.getDate() - 83 - start.getDay());
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(toISODate(d));
  const max = Math.max(1, ...cells.map((c) => c.count));
  const level = (n) => (!n ? '' : n / max > 0.75 ? 'l4' : n / max > 0.5 ? 'l3' : n / max > 0.25 ? 'l2' : 'l1');
  const total = cells.reduce((a, c) => a + c.count, 0);
  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-head"><h3><History size={16} />{t('Last 12 weeks')}</h3><span className="card-sub">{total} changes</span></div>
      <div className="heatmap" role="img" aria-label={t('Activity heatmap: {n} changes in 12 weeks', { n: total })}>
        {days.map((d) => <i key={d} className={level(map[d])} title={t('{date}: {n} changes', { date: fmtDate(parseDate(d), { month: 'short', day: 'numeric' }), n: map[d] || 0 })} />)}
      </div>
      <div className="chart-legend"><span>{t('Less')}</span>{['', 'l1', 'l2', 'l3', 'l4'].map((l) => <span key={l} className="heatmap" style={{ display: 'inline-grid', gridTemplateRows: '12px' }}><i className={l} /></span>)}<span>{t('More')}</span></div>
    </section>
  );
}

export default function Activity() {
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const { data, meta, loading, error, reload } = useApi('/activity', { type, q: dq, page });

  const groups = useMemo(() => {
    const g = [];
    (data || []).forEach((a) => {
      const day = a.created_at.slice(0, 10);
      const last = g[g.length - 1];
      if (last && last.day === day) last.items.push(a); else g.push({ day, items: [a] });
    });
    return g;
  }, [data]);

  const dayLabel = (d) => {
    const today = toISODate(serverNow());
    const y = serverNow(); y.setDate(y.getDate() - 1);
    if (d === today) return t('Today');
    if (d === toISODate(y)) return t('Yesterday');
    return fmtDate(parseDate(d), { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <>
      <PageHeader title={t('Activity')} subtitle={t('A complete history of changes across every module.')} />
      {meta?.heatmap && <Heatmap cells={meta.heatmap} />}
      <Toolbar>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={t('Search activity…')} />
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} options={(meta?.types || []).map((tk) => ({ value: tk, label: t(humanize(tk)) }))} placeholder={t('All modules')} aria-label={t('Module')} />
      </Toolbar>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Spinner /> : data.length === 0 ? (
        <EmptyState icon={History} title={t('No activity')} text={t('Changes you make will show up here.')} />
      ) : (
        <>
          {groups.map((g) => (
            <div key={g.day} className="feed-day">
              <h4>{dayLabel(g.day)}</h4>
              <div className="feed">
                {g.items.map((a) => {
                  const Icon = ICONS[a.action] || Pencil;
                  const link = LINKS[a.entity_type]?.(a.entity_id);
                  return (
                    <div key={a.id} className="feed-item">
                      <span className={`feed-icon ${a.action}`}><Icon size={15} /></span>
                      <div className="feed-text">
                        {link && a.action !== 'deleted' ? <Link to={link}>{tr(a.description)}</Link> : tr(a.description)}
                        <small>{formatTime(a.created_at)} · {t(humanize(a.entity_type))}</small>
                      </div>
                      <span className="tag">{t(humanize(a.entity_type))}</span>
                      <span className="feed-time">{formatTime(a.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {meta.pages > 1 && (
            <div className="pager">
              <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('Newer')}</Button>
              <span>Page {meta.page} of {meta.pages}</span>
              <Button size="sm" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)}>{t('Older')}</Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
