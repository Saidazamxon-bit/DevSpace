import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useApi, useDebounce } from '../hooks/useApi';
import { useCrud, useEditor, useOptions, useProjectOptions } from '../hooks/useCrud';
import { patch, post } from '../api/client';
import { useUI } from '../context/UIContext';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import Menu from '../components/ui/Menu';
import DataTable from '../components/ui/DataTable';
import { EmptyState, ErrorState, MiniStat, PageHeader, SearchInput, Segmented, SkeletonCards, Toolbar } from '../components/ui/Misc';
import { StatusBadge } from '../lib/ui';
import { formatDateTime, formatDuration, timeAgo } from '../lib/format';
import { monitorFields } from './monitorFields';

export function useMonitorActions(reload) {
  const { toast } = useUI();
  const [checking, setChecking] = useState(null);
  const checkNow = async (w) => {
    setChecking(w.id);
    try {
      const r = await post(`/monitoring/${w.id}/check`);
      const res = r.result;
      toast(res.is_up ? `${w.name} is up · ${res.status_code} in ${res.response_ms} ms` : `${w.name} is down · ${res.error}`, res.is_up ? 'success' : 'error');
      reload({ silent: true });
    } catch (e) { toast(e.message, 'error'); } finally { setChecking(null); }
  };
  const toggleActive = async (w) => {
    try { await patch(`/monitoring/${w.id}`, { is_active: !w.is_active }); toast(w.is_active ? 'Monitoring paused' : 'Monitoring resumed'); reload({ silent: true }); } catch (e) { toast(e.message, 'error'); }
  };
  return { checking, checkNow, toggleActive };
}

export function CronNote({ lastRun }) {
  const stale = !lastRun || (Date.now() - new Date(lastRun.replace(' ', 'T')).getTime()) > 10 * 60 * 1000;
  if (!stale) return null;
  return (
    <div className="cron-note">
      <AlertTriangle size={16} />
      <div>
        <strong>Scheduled checks aren’t running{lastRun ? ` (last run ${timeAgo(lastRun)})` : ''}.</strong> Add this cron job in cPanel → Cron Jobs (every minute):{' '}
        <code>php /path/to/devspace/cron/monitor.php</code>. You can still use “Check now”.
      </div>
    </div>
  );
}

export default function Monitoring() {
  const navigate = useNavigate();
  const [state, setState] = useState('all');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { data, meta, loading, error, reload } = useApi('/monitoring', { q: dq, state, sort: 'state' });
  const incidents = useApi('/monitoring/incidents');
  const projects = useProjectOptions();
  const servers = useOptions('/servers', (s) => ({ value: String(s.id), label: s.name }));
  const editor = useEditor();
  const refresh = () => { reload({ silent: true }); incidents.reload({ silent: true }); };
  const { save, remove } = useCrud('/monitoring', { entity: 'monitor', onChange: refresh });
  const { checking, checkNow, toggleActive } = useMonitorActions(refresh);

  return (
    <>
      <PageHeader title="Monitoring" subtitle="Real HTTP uptime checks, response times and incident history."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>New monitor</Button>} />
      {meta && <CronNote lastRun={meta.cron_last_run} />}
      {meta && (
        <div className="mini-stats">
          <MiniStat label="Monitors" value={data?.length ?? 0} sub={`${(data || []).filter((w) => !w.is_active).length} paused`} />
          <MiniStat label="Up" value={meta.up} tone="accent" sub="Last check succeeded" />
          <MiniStat label="Down" value={meta.down} tone={meta.down ? 'danger' : undefined} sub="Failing right now" />
          <MiniStat label="Avg uptime (30d)" value={meta.avg_uptime_30d !== null ? `${meta.avg_uptime_30d}%` : '—'} sub="Across all monitors" />
        </div>
      )}
      <Toolbar>
        <Segmented options={[{ value: 'all', label: 'All' }, { value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }, { value: 'unknown', label: 'Pending' }]} value={state} onChange={setState} />
        <SearchInput value={q} onChange={setQ} placeholder="Search monitors…" />
      </Toolbar>

      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={3} h={200} /> : data.length === 0 ? (
        <EmptyState icon={Activity} title="No monitors" text={q || state !== 'all' ? 'Nothing matches.' : 'Add a URL and DEVSPACE will check it on a schedule and alert you when it goes down.'} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>New monitor</Button>} />
      ) : (
        <div className="monitor-grid">
          {data.map((w) => (
            <article key={w.id} className={`monitor-card${w.last_state === 'down' ? ' down' : ''}`} onClick={() => navigate(`/monitoring/${w.id}`)}>
              <div className="monitor-head">
                <i className={`dot dot-${w.is_active ? w.last_state : 'unknown'}${w.last_state === 'up' && w.is_active ? ' dot-pulse' : ''}`} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 className="truncate">{w.name}</h3>
                  <div className="monitor-url">{w.url}</div>
                </div>
                {!w.is_active ? <StatusBadge status="paused" label="Paused" /> : <StatusBadge status={w.last_state} label={w.last_state === 'unknown' ? 'Pending' : w.last_state === 'up' ? 'Up' : 'Down'} />}
                <div onClick={(e) => e.stopPropagation()}>
                  <Menu items={[
                    { label: 'Check now', icon: RefreshCw, onClick: () => checkNow(w) },
                    { label: 'Edit', icon: Pencil, onClick: () => editor.edit(w) },
                    { label: w.is_active ? 'Pause' : 'Resume', icon: w.is_active ? Pause : Play, onClick: () => toggleActive(w) },
                    { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(w, w.name) },
                  ]} />
                </div>
              </div>
              <div className="monitor-stats">
                <div><span>Response</span><strong>{w.last_response_ms !== null ? `${w.last_response_ms} ms` : '—'}</strong></div>
                <div><span>Uptime 24h</span><strong>{w.uptime_24h !== null ? `${w.uptime_24h}%` : '—'}</strong></div>
                <div><span>Uptime 30d</span><strong>{w.uptime_30d !== null ? `${w.uptime_30d}%` : '—'}</strong></div>
              </div>
              <div className="project-meta">
                <span>{w.last_checked_at ? `Checked ${timeAgo(w.last_checked_at)}` : 'Not checked yet'}{w.last_status_code ? ` · HTTP ${w.last_status_code}` : ''}</span>
                <span onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" icon={RefreshCw} loading={checking === w.id} onClick={() => checkNow(w)}>Check</Button>
                </span>
              </div>
              {w.last_state === 'down' && w.last_error && <div className="small c-danger truncate">{w.last_error}</div>}
            </article>
          ))}
        </div>
      )}

      <div className="card-head" style={{ marginTop: 28 }}><h2 style={{ fontSize: 16 }}>Incident history</h2></div>
      {incidents.data?.length ? (
        <DataTable rows={incidents.data} onRowClick={(i) => navigate(`/monitoring/${i.website_id}`)} columns={[
          { key: 'website', label: 'Monitor', mobile: 'title', render: (i) => <div><div className="cell-title">{i.website_name}</div><div className="cell-sub truncate">{i.url}</div></div> },
          { key: 'status', label: 'Status', render: (i) => (i.open ? <StatusBadge status="down" label="Ongoing" /> : <StatusBadge status="up" label="Resolved" />) },
          { key: 'started_at', label: 'Started', render: (i) => formatDateTime(i.started_at) },
          { key: 'duration', label: 'Duration', render: (i) => formatDuration(i.duration_seconds) },
          { key: 'error', label: 'Cause', render: (i) => <span className="muted">{i.error || (i.status_code ? `HTTP ${i.status_code}` : '—')}</span> },
        ]} />
      ) : <p className="muted small">No incidents recorded. 🎉</p>}

      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? 'New monitor' : 'Edit monitor'} fields={monitorFields(projects, servers)} initial={editor.editing}
        onSubmit={(v) => save(v, editor.isNew ? null : editor.editing.id)} />
    </>
  );
}
