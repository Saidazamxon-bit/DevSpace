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
import { formatDateTime, formatDuration, formatTime, parseDate, timeAgo } from '../lib/format';
import { monitorFields } from './monitorFields';
import { useMonitorActions } from './Monitoring';

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
  const t = useThemeTokens();

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !w) return <Spinner />;

  const labels = w.series.map((p) => (range === '24h' ? formatTime(p.t) : parseDate(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })));
  const values = w.series.map((p) => p.ms);
  const pointColors = w.series.map((p) => (p.up ? null : t.danger));
  const recent = [...w.recent_checks].reverse();

  return (
    <>
      <Link to="/monitoring" className="back-link"><ArrowLeft size={15} />Monitoring</Link>
      <div className="page-head">
        <div className="page-head-text">
          <div className="row" style={{ gap: 10 }}>
            <i className={`dot dot-${w.is_active ? w.last_state : 'unknown'}`} />
            <h1 className="truncate">{w.name}</h1>
            {!w.is_active ? <StatusBadge status="paused" label="Paused" /> : <StatusBadge status={w.last_state} label={w.last_state === 'unknown' ? 'Pending' : w.last_state === 'up' ? 'Up' : 'Down'} />}
          </div>
          <p><a href={w.url} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 5, display: 'inline-flex' }}>{w.url}<ExternalLink size={12} /></a></p>
        </div>
        <div className="page-head-actions">
          <Button variant="primary" icon={RefreshCw} loading={checking === w.id} onClick={() => checkNow(w)}>Check now</Button>
          <Button icon={Pencil} onClick={() => editor.edit(w)}>Edit</Button>
          <Button icon={w.is_active ? Pause : Play} onClick={() => toggleActive(w)}>{w.is_active ? 'Pause' : 'Resume'}</Button>
          <Button variant="ghost" icon={Trash2} aria-label="Delete monitor" onClick={async () => { if (await remove(w, w.name)) navigate('/monitoring'); }} />
        </div>
      </div>


      <div className="mini-stats">
        <MiniStat label="Last check" value={w.last_status_code ? `HTTP ${w.last_status_code}` : w.last_state === 'unknown' ? 'Pending' : 'No response'} sub={w.last_checked_at ? timeAgo(w.last_checked_at) : `Every ${w.check_interval} min`} tone={w.last_state === 'down' ? 'danger' : 'accent'} />
        <MiniStat label="Response time" value={w.last_response_ms !== null ? `${w.last_response_ms} ms` : '—'} sub={w.avg_response_24h !== null ? `avg ${w.avg_response_24h} ms (24h)` : 'No data yet'} />
        <MiniStat label="Uptime 24h / 7d" value={w.uptime_24h !== null ? `${w.uptime_24h}%` : '—'} sub={w.uptime_7d !== null ? `${w.uptime_7d}% over 7 days` : '—'} />
        <MiniStat label="Uptime 30d" value={w.uptime_30d !== null ? `${w.uptime_30d}%` : '—'} sub={`${w.checks_total} checks recorded`} />
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-head wrap">
          <h3>Response time</h3>
          <Segmented size="sm" options={[{ value: '24h', label: '24 hours' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]} value={range} onChange={setRange} />
        </div>
        {w.series.length === 0 ? <p className="muted small" style={{ padding: '40px 0', textAlign: 'center' }}>No checks in this range yet.</p> : (
          <LineChart labels={labels} values={values} label="Response" format={(v) => `${v} ms`} pointColors={pointColors} height={240} />
        )}
        {recent.length > 0 && (
          <>
            <p className="muted small" style={{ margin: '14px 0 6px' }}>Last {recent.length} checks</p>
            <div className="uptime-bars">{recent.map((c) => <i key={c.id} className={c.is_up ? 'up' : 'down'} title={`${formatDateTime(c.checked_at)} — ${c.is_up ? 'up' : 'down'}${c.response_ms ? ` · ${c.response_ms} ms` : ''}`} />)}</div>
          </>
        )}
      </section>

      <div className="grid-2">
        <section>
          <div className="card-head"><h3>Incidents</h3></div>
          {w.incidents.length === 0 ? <p className="muted small">No incidents for this monitor.</p> : (
            <DataTable rows={w.incidents} columns={[
              { key: 'started', label: 'Started', mobile: 'title', render: (i) => formatDateTime(i.started_at) },
              { key: 'state', label: 'Status', render: (i) => (i.open ? <StatusBadge status="down" label="Ongoing" /> : <StatusBadge status="up" label="Resolved" />) },
              { key: 'duration', label: 'Duration', render: (i) => formatDuration(i.duration_seconds) },
              { key: 'error', label: 'Cause', render: (i) => <span className="muted">{i.error || '—'}</span> },
            ]} />
          )}
        </section>
        <section>
          <div className="card-head"><h3>Recent checks</h3></div>
          {w.recent_checks.length === 0 ? <p className="muted small">Waiting for the first check…</p> : (
            <DataTable rows={w.recent_checks.slice(0, 10)} columns={[
              { key: 'checked_at', label: 'Time', mobile: 'title', render: (c) => formatDateTime(c.checked_at) },
              { key: 'is_up', label: 'Result', render: (c) => <StatusBadge status={c.is_up ? 'up' : 'down'} label={c.is_up ? 'Up' : 'Down'} /> },
              { key: 'status_code', label: 'HTTP', render: (c) => c.status_code || '—' },
              { key: 'response_ms', label: 'Time', render: (c) => (c.response_ms !== null ? `${c.response_ms} ms` : c.error || '—') },
            ]} />
          )}
        </section>
      </div>

      <FormModal open={editor.open} onClose={editor.close} title="Edit monitor" fields={monitorFields(projects, servers)} initial={editor.editing} onSubmit={(v) => save(v, w.id)} />
    </>
  );
}
