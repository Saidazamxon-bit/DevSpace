import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Pause, Pencil, Play, RefreshCw, Trash2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useCrud, useEditor, useOptions, useProjectOptions } from '../hooks/useCrud';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import DataTable from '../components/ui/DataTable';
import { LineChart, useThemeTokens } from '../components/ui/Charts';
import { ErrorState, MiniStat, Segmented, Spinner } from '../components/ui/Misc';
import { StatusBadge } from '../lib/ui';
import { fmtDate, formatDateTime, formatDuration, formatTime, parseDate, timeAgo } from '../lib/format';
import { monitorFields } from './monitorFields';
import { useMonitorActions } from './Monitoring';
import { t, tr } from '../i18n';

export default function MonitorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [range, setRange] = useState('24h');
  const { data: w, loading, error, reload } = useApi(`/monitoring/${id}`, { range });
  const projects = useProjectOptions();
  const servers = useOptions('/servers', (s) => ({ value: String(s.id), label: s.name }));
  const editor = useEditor();
  const { save, remove } = useCrud('/monitoring', { entity: 'monitor', onChange: () => reload({ silent: true }) });
  const { checking, checkNow, toggleActive } = useMonitorActions(reload);
  const tk = useThemeTokens();

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !w) return <Spinner />;

  const labels = w.series.map((p) => (range === '24h' ? formatTime(p.t) : fmtDate(parseDate(p.t), { month: 'short', day: 'numeric', hour: '2-digit' })));
  const values = w.series.map((p) => p.ms);
  const pointColors = w.series.map((p) => (p.up ? null : tk.danger));
  const recent = [...w.recent_checks].reverse();

  return (
    <>
      <Link to="/monitoring" className="back-link"><ArrowLeft size={15} />{t('Monitoring')}</Link>
      <div className="page-head">
        <div className="page-head-text">
          <div className="row" style={{ gap: 10 }}>
            <i className={`dot dot-${w.is_active ? w.last_state : 'unknown'}`} />
            <h1 className="truncate">{w.name}</h1>
            {!w.is_active ? <StatusBadge status="paused" label={t('Paused')} /> : <StatusBadge status={w.last_state} label={w.last_state === 'unknown' ? t('Pending') : w.last_state === 'up' ? t('Up') : t('Down')} />}
          </div>
          <p><a href={w.url} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 5, display: 'inline-flex' }}>{w.url}<ExternalLink size={12} /></a></p>
        </div>
        <div className="page-head-actions">
          <Button variant="primary" icon={RefreshCw} loading={checking === w.id} onClick={() => checkNow(w)}>{t('Check now')}</Button>
          <Button icon={Pencil} onClick={() => editor.edit(w)}>{t('Edit')}</Button>
          <Button icon={w.is_active ? Pause : Play} onClick={() => toggleActive(w)}>{w.is_active ? t('Pause') : t('Resume')}</Button>
          <Button variant="ghost" icon={Trash2} aria-label={t('Delete monitor')} onClick={async () => { if (await remove(w, w.name)) navigate('/monitoring'); }} />
        </div>
      </div>


      <div className="mini-stats">
        <MiniStat label={t('Last check')} value={w.last_status_code ? `HTTP ${w.last_status_code}` : w.last_state === 'unknown' ? t('Pending') : t('No response')} sub={w.last_checked_at ? timeAgo(w.last_checked_at) : t('Every {n} min', { n: w.check_interval })} tone={w.last_state === 'down' ? 'danger' : 'accent'} />
        <MiniStat label={t('Response time')} value={w.last_response_ms !== null ? `${w.last_response_ms} ms` : '—'} sub={w.avg_response_24h !== null ? t('avg {n} ms (24h)', { n: w.avg_response_24h }) : t('No data yet')} />
        <MiniStat label={t('Uptime 24h / 7d')} value={w.uptime_24h !== null ? `${w.uptime_24h}%` : '—'} sub={w.uptime_7d !== null ? t('{n}% over 7 days', { n: w.uptime_7d }) : '—'} />
        <MiniStat label={t('Uptime 30d')} value={w.uptime_30d !== null ? `${w.uptime_30d}%` : '—'} sub={t('{n} checks recorded', { n: w.checks_total })} />
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-head wrap">
          <h3>{t('Response time')}</h3>
          <Segmented size="sm" options={[{ value: '24h', label: t('24 hours') }, { value: '7d', label: t('7 days') }, { value: '30d', label: t('30 days') }]} value={range} onChange={setRange} />
        </div>
        {w.series.length === 0 ? <p className="muted small" style={{ padding: '40px 0', textAlign: 'center' }}>{t('No checks in this range yet.')}</p> : (
          <LineChart labels={labels} values={values} label={t('Response')} format={(v) => `${v} ms`} pointColors={pointColors} height={240} />
        )}
        {recent.length > 0 && (
          <>
            <p className="muted small" style={{ margin: '14px 0 6px' }}>{t('Last {n} checks', { n: recent.length })}</p>
            <div className="uptime-bars">{recent.map((c) => <i key={c.id} className={c.is_up ? 'up' : 'down'} title={`${formatDateTime(c.checked_at)} — ${c.is_up ? t('Up') : t('Down')}${c.response_ms ? ` · ${c.response_ms} ms` : ''}`} />)}</div>
          </>
        )}
      </section>

      <div className="grid-2">
        <section>
          <div className="card-head"><h3>{t('Incidents')}</h3></div>
          {w.incidents.length === 0 ? <p className="muted small">{t('No incidents for this monitor.')}</p> : (
            <DataTable rows={w.incidents} columns={[
              { key: 'started', label: t('Started'), mobile: 'title', render: (i) => formatDateTime(i.started_at) },
              { key: 'state', label: t('Status'), render: (i) => (i.open ? <StatusBadge status="down" label={t('Ongoing')} /> : <StatusBadge status="up" label={t('Resolved')} />) },
              { key: 'duration', label: t('Duration'), render: (i) => formatDuration(i.duration_seconds) },
              { key: 'error', label: t('Cause'), render: (i) => <span className="muted">{tr(i.error) || '—'}</span> },
            ]} />
          )}
        </section>
        <section>
          <div className="card-head"><h3>{t('Recent checks')}</h3></div>
          {w.recent_checks.length === 0 ? <p className="muted small">{t('Waiting for the first check…')}</p> : (
            <DataTable rows={w.recent_checks.slice(0, 10)} columns={[
              { key: 'checked_at', label: t('Time'), mobile: 'title', render: (c) => formatDateTime(c.checked_at) },
              { key: 'is_up', label: t('Result'), render: (c) => <StatusBadge status={c.is_up ? 'up' : 'down'} label={c.is_up ? t('Up') : t('Down')} /> },
              { key: 'status_code', label: 'HTTP', render: (c) => c.status_code || '—' },
              { key: 'response_ms', label: t('Time'), render: (c) => (c.response_ms !== null ? `${c.response_ms} ms` : tr(c.error) || '—') },
            ]} />
          )}
        </section>
      </div>

      <FormModal open={editor.open} onClose={editor.close} title={t('Edit monitor')} fields={monitorFields(projects, servers)} initial={editor.editing} onSubmit={(v) => save(v, w.id)} />
    </>
  );
}
