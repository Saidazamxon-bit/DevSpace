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
import { t, tr } from '../i18n';

export function useMonitorActions(reload) {
  const { toast } = useUI();
  const [checking, setChecking] = useState(null);
  const checkNow = async (w) => {
    setChecking(w.id);
    try {
      const r = await post(`/monitoring/${w.id}/check`);
      const res = r.result;
      toast(res.is_up ? t('{name} is up · {code} in {ms} ms', { name: w.name, code: res.status_code, ms: res.response_ms }) : t('{name} is down · {err}', { name: w.name, err: tr(res.error) }), res.is_up ? 'success' : 'error');
      reload({ silent: true });
    } catch (e) { toast(e.message, 'error'); } finally { setChecking(null); }
  };
  const toggleActive = async (w) => {
    try { await patch(`/monitoring/${w.id}`, { is_active: !w.is_active }); toast(w.is_active ? t('Monitoring paused') : t('Monitoring resumed')); reload({ silent: true }); } catch (e) { toast(e.message, 'error'); }
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
        <strong>{t('Scheduled checks aren’t running')}{lastRun ? ` (${t('last run {when}', { when: timeAgo(lastRun) })})` : ''}.</strong> {t('Add this cron job in cPanel → Cron Jobs (every minute):')}{' '}
        <code>php /path/to/devspace/cron/monitor.php</code>. {t('You can still use “Check now”.')}
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
      <PageHeader title={t('Monitoring')} subtitle={t('Real HTTP uptime checks, response times and incident history.')}
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('New monitor')}</Button>} />
      {meta && <CronNote lastRun={meta.cron_last_run} />}
      {meta && (
        <div className="mini-stats">
          <MiniStat label={t('Monitors')} value={data?.length ?? 0} sub={t('{n} paused', { n: (data || []).filter((w) => !w.is_active).length })} />
          <MiniStat label={t('Up')} value={meta.up} tone="accent" sub={t('Last check succeeded')} />
          <MiniStat label={t('Down')} value={meta.down} tone={meta.down ? 'danger' : undefined} sub={t('Failing right now')} />
          <MiniStat label={t('Avg uptime (30d)')} value={meta.avg_uptime_30d !== null ? `${meta.avg_uptime_30d}%` : '—'} sub={t('Across all monitors')} />
        </div>
      )}
      <Toolbar>
        <Segmented options={[{ value: 'all', label: t('All') }, { value: 'up', label: t('Up') }, { value: 'down', label: t('Down') }, { value: 'unknown', label: t('Pending') }]} value={state} onChange={setState} />
        <SearchInput value={q} onChange={setQ} placeholder={t('Search monitors…')} />
      </Toolbar>

      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={3} h={200} /> : data.length === 0 ? (
        <EmptyState icon={Activity} title={t('No monitors')} text={q || state !== 'all' ? t('Nothing matches.') : t('Add a URL and DEVSPACE will check it on a schedule and alert you when it goes down.')} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('New monitor')}</Button>} />
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
                {!w.is_active ? <StatusBadge status="paused" label={t('Paused')} /> : <StatusBadge status={w.last_state} label={w.last_state === 'unknown' ? t('Pending') : w.last_state === 'up' ? t('Up') : t('Down')} />}
                <div onClick={(e) => e.stopPropagation()}>
                  <Menu items={[
                    { label: t('Check now'), icon: RefreshCw, onClick: () => checkNow(w) },
                    { label: t('Edit'), icon: Pencil, onClick: () => editor.edit(w) },
                    { label: w.is_active ? t('Pause') : t('Resume'), icon: w.is_active ? Pause : Play, onClick: () => toggleActive(w) },
                    { label: t('Delete'), icon: Trash2, danger: true, onClick: () => remove(w, w.name) },
                  ]} />
                </div>
              </div>
              <div className="monitor-stats">
                <div><span>{t('Response')}</span><strong>{w.last_response_ms !== null ? `${w.last_response_ms} ms` : '—'}</strong></div>
                <div><span>{t('Uptime 24h')}</span><strong>{w.uptime_24h !== null ? `${w.uptime_24h}%` : '—'}</strong></div>
                <div><span>{t('Uptime 30d')}</span><strong>{w.uptime_30d !== null ? `${w.uptime_30d}%` : '—'}</strong></div>
              </div>
              <div className="project-meta">
                <span>{w.last_checked_at ? t('Checked {when}', { when: timeAgo(w.last_checked_at) }) : t('Not checked yet')}{w.last_status_code ? ` · HTTP ${w.last_status_code}` : ''}</span>
                <span onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" icon={RefreshCw} loading={checking === w.id} onClick={() => checkNow(w)}>{t('Check')}</Button>
                </span>
              </div>
              {w.last_state === 'down' && w.last_error && <div className="small c-danger truncate">{tr(w.last_error)}</div>}
            </article>
          ))}
        </div>
      )}

      <div className="card-head" style={{ marginTop: 28 }}><h2 style={{ fontSize: 16 }}>{t('Incident history')}</h2></div>
      {incidents.data?.length ? (
        <DataTable rows={incidents.data} onRowClick={(i) => navigate(`/monitoring/${i.website_id}`)} columns={[
          { key: 'website', label: t('Monitor'), mobile: 'title', render: (i) => <div><div className="cell-title">{i.website_name}</div><div className="cell-sub truncate">{i.url}</div></div> },
          { key: 'status', label: t('Status'), render: (i) => (i.open ? <StatusBadge status="down" label={t('Ongoing')} /> : <StatusBadge status="up" label={t('Resolved')} />) },
          { key: 'started_at', label: t('Started'), render: (i) => formatDateTime(i.started_at) },
          { key: 'duration', label: t('Duration'), render: (i) => formatDuration(i.duration_seconds) },
          { key: 'error', label: t('Cause'), render: (i) => <span className="muted">{tr(i.error) || (i.status_code ? `HTTP ${i.status_code}` : '—')}</span> },
        ]} />
      ) : <p className="muted small">{t('No incidents recorded. 🎉')}</p>}

      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? t('New monitor') : t('Edit monitor')} fields={monitorFields(projects, servers)} initial={editor.editing}
        onSubmit={(v) => save(v, editor.isNew ? null : editor.editing.id)} />
    </>
  );
}
