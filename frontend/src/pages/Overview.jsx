import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock, AlertTriangle, ArrowRight, BarChart3, CalendarClock, CheckCircle2, CircleDot, FolderKanban, Globe, History,
  ListChecks, Pin, Server, ServerCrash, Sparkles,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BarChart, useThemeTokens } from '../components/ui/Charts';
import { ErrorState, Segmented, Skeleton } from '../components/ui/Misc';
import { fmtDate, formatShortDate, formatTime, parseDate, relativeDays, serverNow, syncServerTime, timeAgo, todayISO } from '../lib/format';
import { t, tr } from '../i18n';
import { statusLabel } from '../lib/constants';

/* ---------------- Stat cards ---------------- */

function Barcode({ percent, count = 64 }) {
  const lit = Math.round((percent / 100) * count);
  return (
    <div className="barcode" role="img" aria-label={t('{n}% complete', { n: percent })}>
      {Array.from({ length: count }).map((_, i) => <i key={i} className={i < lit ? 'on' : ''} />)}
    </div>
  );
}

function ThickBars({ done, total, count = 24 }) {
  const lit = total ? Math.round((done / total) * count) : 0;
  return (
    <div className="thickbars" role="img" aria-label={t('{done} of {total} tasks done', { done, total })}>
      {Array.from({ length: count }).map((_, i) => <i key={i} className={i < lit ? 'on' : ''} />)}
    </div>
  );
}

function StatCard({ title, icon: Icon, value, foot, to, children }) {
  return (
    <Link to={to} className="stat-card">
      <div className="stat-head">
        <span>{title}</span>
        <Icon size={19} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-visual">{children}</div>
      <div className="stat-foot">{foot}</div>
    </Link>
  );
}

function Stats({ stats }) {
  const { projects: p, servers: s, tasks: k, domains: d } = stats;
  const serverTone = (st) => ({ online: 'on', maintenance: 'warn', offline: 'off' }[st]);
  const domainTone = (st) => ({ active: 'on', expiring: 'warn', expired: 'off', unknown: '' }[st]);

  return (
    <div className="stats">
      <StatCard title={t('Projects')} icon={FolderKanban} to="/projects" value={<>{p.active}<small> {t('active')}</small><em>{t('/ {n} total', { n: p.total })}</em></>}
        foot={p.tasks_total ? t('{p}% of {n} tasks done in open projects', { p: p.progress, n: p.tasks_total }) : t('{c} completed · {p} planning', { c: p.completed, p: p.planning })}>
        <Barcode percent={p.progress} />
      </StatCard>

      <StatCard title={t('Active Servers')} icon={Server} to="/servers" value={<>{s.online}<small> {t('online')}</small><em>{t('/ {n} servers', { n: s.total })}</em></>}
        foot={s.websites_total ? `${t('{up}/{total} sites up', { up: s.websites_up, total: s.websites_total })}${s.maintenance ? ` · ${t('{n} maintenance', { n: s.maintenance })}` : ''}${s.offline ? ` · ${t('{n} offline', { n: s.offline })}` : ''}` : `${t('{n} maintenance', { n: s.maintenance })} · ${t('{n} offline', { n: s.offline })}`}>
        <div className="bubbles">
          {s.items.length === 0 && <span className="bubble">0</span>}
          {s.items.map((x, i) => (
            <span key={x.id} className={`bubble ${serverTone(x.status)}`} title={`${x.name} — ${statusLabel(x.status)}`}>
              {x.status === 'online' ? i + 1 : <ServerCrash size={13} />}
            </span>
          ))}
          {s.total > s.items.length && <span className="bubble">+{s.total - s.items.length}</span>}
        </div>
      </StatCard>

      <StatCard title={t('Pending Tasks')} icon={AlarmClock} to="/tasks" value={<>{k.pending}<small> {t('pending')}</small><em>{t('· {n} in progress', { n: k.in_progress })}</em></>}
        foot={k.overdue || k.due_today ? t('{o} overdue · {d} due today', { o: k.overdue, d: k.due_today }) : t('{n} completed in the last 7 days', { n: k.done_week })}>
        <ThickBars done={k.done} total={k.total} />
      </StatCard>

      <StatCard title={t('Domains')} icon={AlertTriangle} to="/domains" value={<>{d.total}<small> {t('domains')}</small>{d.expiring + d.expired > 0 && <em className="warn">{t('· {n} need attention', { n: d.expiring + d.expired })}</em>}</>}
        foot={d.next ? t('Next renewal: {name} {when}', { name: d.next.name, when: d.next.days_left !== null ? relativeDays(d.next.days_left).toLowerCase() : '' }) : t('No domains tracked yet')}>
        <div className="bubbles">
          {d.items.length === 0 && <span className="bubble">0</span>}
          {d.items.map((x) => (
            <span key={x.id} className={`bubble icon ${domainTone(x.state)}`} title={`${x.name} — ${statusLabel(x.state)}${x.days_left !== null ? ` (${t('{n}d', { n: x.days_left })})` : ''}`}><Globe size={13} /></span>
          ))}
        </div>
      </StatCard>
    </div>
  );
}

/* ---------------- Timeline ---------------- */

const KIND_ICON = { task: ListChecks, deadline: CalendarClock, domain: Globe, incident: ServerCrash, activity: CircleDot };

function Timeline({ items }) {
  const scroller = useRef(null);
  const nowRef = useRef(null);
  const [now, setNow] = useState(serverNow());
  useEffect(() => { const timer = setInterval(() => setNow(serverNow()), 60000); return () => clearInterval(timer); }, []);

  const today = todayISO();
  const { past, upcoming } = useMemo(() => {
    const p = []; const u = [];
    items.forEach((it) => { (it.ongoing || parseDate(it.at) > now ? u : p).push(it); });
    return { past: p, upcoming: u };
  }, [items, now]);

  useEffect(() => {
    const el = scroller.current; const marker = nowRef.current;
    if (el && marker) el.scrollLeft = Math.max(0, marker.offsetLeft - el.clientWidth * 0.35);
  }, [items]);

  const label = (it) => {
    const day = it.at.slice(0, 10);
    if (day === today) return it.all_day ? t('Today') : formatTime(it.at);
    return fmtDate(parseDate(it.at), { weekday: 'short', day: 'numeric' });
  };

  const renderItem = (it, i, isPast) => {
    const Icon = KIND_ICON[it.kind] || CircleDot;
    const firstUpcoming = !isPast && i === 0;
    const pill = it.all_day && it.at.slice(0, 10) === today ? t('Due today') : it.at.slice(0, 10) === today ? formatTime(it.at) : formatShortDate(it.at);
    const content = (
      <>
        <span className={`tl-pill${firstUpcoming ? ' next' : ''}${it.level === 'critical' ? ' crit' : ''}`}>{it.ongoing ? t('Ongoing') : pill}</span>
        <strong className="tl-title"><Icon size={14} />{tr(it.title)}</strong>
        <span className="tl-sub">{tr(it.subtitle)}</span>
      </>
    );
    return (
      <div className={`tl-col${isPast ? ' past' : ''}`} key={`${it.kind}-${it.at}-${i}`}>
        <span className="tl-label">{label(it)}</span>
        {it.link ? <Link to={it.link} className={`tl-card level-${it.level}`}>{content}</Link> : <div className={`tl-card level-${it.level}`}>{content}</div>}
      </div>
    );
  };

  return (
    <section className="card timeline-card">
      <div className="card-head">
        <h2><Pin size={16} className="pin" />{t('Today’s Activity')}</h2>
        <span className="card-sub">{t('{p} done today · {u} upcoming (14 days)', { p: past.length, u: upcoming.length })}</span>
      </div>
      {items.length === 0 ? (
        <p className="muted small tl-empty">{t('Nothing scheduled. Tasks with due dates, project deadlines, domain renewals and incidents will appear here.')}</p>
      ) : (
        <div className="tl-scroll" ref={scroller}>
          <div className="tl-track">
            {past.map((it, i) => renderItem(it, i, true))}
            <div className="tl-now" ref={nowRef}>
              <span className="tl-label now">{formatTime(now)}</span>
              <i className="tl-now-dot" />
            </div>
            {upcoming.map((it, i) => renderItem(it, i, false))}
            {upcoming.length === 0 && <div className="tl-col"><span className="tl-label">{t('Later')}</span><div className="tl-card ghost"><span className="tl-sub">{t('Nothing else coming up — nice.')}</span></div></div>}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- Weekly chart ---------------- */

const METRICS = [
  { value: 'tasks_completed', label: t('Tasks completed'), unit: t('tasks completed this week') },
  { value: 'activity', label: t('Dev activity'), unit: t('development events this week') },
  { value: 'active_projects', label: t('Active projects'), unit: t('projects worked on this week') },
];

function Weekly({ weekly, tasks }) {
  const [metric, setMetric] = useState('tasks_completed');
  const tk = useThemeTokens();
  const values = weekly.days.map((d) => d[metric]);
  const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const colors = values.map((v) => (v >= avg && v > 0 ? tk.accent : tk.orange));
  const labels = weekly.days.map((d) => fmtDate(parseDate(d.date), { weekday: 'short' }));
  const titles = weekly.days.map((d) => fmtDate(parseDate(d.date), { weekday: 'long', month: 'short', day: 'numeric' }));
  const m = METRICS.find((x) => x.value === metric);

  const prev = weekly.previous[metric];
  const total = weekly.totals[metric];
  const delta = prev !== undefined && prev > 0 ? Math.round(((total - prev) / prev) * 100) : null;
  const due = weekly.due_window;
  const pct = due.total ? Math.round((due.done / due.total) * 100) : 0;
  const busiest = weekly.busiest_day ? fmtDate(parseDate(weekly.busiest_day), { weekday: 'long' }) : null;
  const busiestCount = weekly.busiest_day ? weekly.days.find((d) => d.date === weekly.busiest_day)?.tasks_completed : 0;

  return (
    <section className="card weekly-card">
      <div className="card-head wrap">
        <h2><BarChart3 size={16} />{t('Weekly Activity Overview')}</h2>
        <Segmented size="sm" options={METRICS} value={metric} onChange={setMetric} />
      </div>
      <div className="weekly-total">
        <strong>{total}</strong>
        <span>{m.unit}{delta !== null && <em className={delta >= 0 ? 'up' : 'down'}>{t('{d}% vs last week', { d: `${delta >= 0 ? '+' : ''}${delta}` })}</em>}</span>
      </div>
      <BarChart labels={labels} titles={titles} values={values} colors={colors} label={m.label} height={250} />
      <div className="chart-legend">
        <span><i style={{ background: tk.accent }} />{t('At or above daily average ({n})', { n: avg.toFixed(1) })}</span>
        <span><i style={{ background: tk.orange }} />{t('Below average')}</span>
      </div>

      <div className="weekly-summary">
        <h3>{due.total ? t('You’ve completed {n}% of the tasks due this week', { n: pct }) : t('No tasks are due this week')} <span className="ink">{due.done}/{due.total}</span></h3>
        <ul>
          {tasks.overdue > 0 && <li><AlertTriangle size={14} className="c-orange" />{tasks.overdue > 1 ? t('{n} overdue tasks — clear them before starting new work.', { n: tasks.overdue }) : t('1 overdue task — clear it before starting new work.')}</li>}
          <li><CheckCircle2 size={14} className="ink" />{t('Average {a} tasks/day · {c} completed vs {p} the previous week.', { a: weekly.avg_per_day, c: weekly.totals.tasks_completed, p: weekly.previous.tasks_completed })}</li>
          {busiest && <li><Sparkles size={14} className="ink" />{t('Most productive day: {day} ({n} tasks completed).', { day: busiest, n: busiestCount })}</li>}
          <li><History size={14} className="muted" />{t('{a} logged changes across {p} projects in the last 7 days.', { a: weekly.totals.activity, p: weekly.totals.active_projects })}</li>
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Insights ---------------- */

function Insight({ icon: Icon, tone = 'accent', title, children, to, count }) {
  return (
    <div className="insight">
      <div className="insight-head">
        <span className={`insight-icon tone-${tone}`}><Icon size={14} /></span>
        <strong>{title}</strong>
        {count !== undefined && <span className="insight-count">{count}</span>}
        {to && <Link to={to} className="insight-link" aria-label={t('Open {name}', { name: title })}><ArrowRight size={14} /></Link>}
      </div>
      <div className="insight-body">{children}</div>
    </div>
  );
}

function Insights({ data }) {
  const dl = (n) => (n < 0 ? <span className="c-danger">{t('{n}d overdue', { n: Math.abs(n) })}</span> : n === 0 ? <span className="c-orange">{t('today')}</span> : <span className="muted">{t('{n}d', { n })}</span>);
  return (
    <aside className="card insights-card" aria-label={t('Developer Insights')}>
      <div className="insights-title">
        <h2><Sparkles size={16} />{t('Developer Insights')}</h2>
        <p>{t('Live signals from your projects, servers and tasks.')}</p>
      </div>

      <Insight icon={CalendarClock} title={t('Upcoming deadlines')} to="/tasks" tone="accent">
        {data.deadlines.length === 0 ? <p>{t('No dated work coming up.')}</p> : (
          <ul className="ins-list">
            {data.deadlines.map((x) => (
              <li key={`${x.kind}-${x.id}`}>
                <Link to={x.kind === 'project' ? `/projects/${x.id}` : '/tasks'} className="truncate">{x.kind === 'project' && <FolderKanban size={12} />}{x.name}</Link>
                {dl(x.days_left)}
              </li>
            ))}
          </ul>
        )}
      </Insight>

      <Insight icon={ServerCrash} title={t('Server warnings')} to="/monitoring" tone={data.server_warnings.length ? 'danger' : 'accent'} count={data.server_warnings.length || undefined}>
        {data.server_warnings.length === 0 ? <p>{t('All servers online and monitored sites healthy.')}</p> : (
          <ul className="ins-list">
            {data.server_warnings.slice(0, 4).map((w) => (
              <li key={`${w.kind}-${w.id}`}>
                <Link to={w.link} className="truncate"><i className={`dot dot-${w.level === 'critical' ? 'down' : 'maintenance'}`} />{w.name}</Link>
                <span className="muted truncate ins-detail">{tr(w.detail)}</span>
              </li>
            ))}
          </ul>
        )}
      </Insight>

      <Insight icon={Globe} title={t('Expiring domains & SSL')} to="/domains" tone={data.expiring.length ? 'orange' : 'accent'}>
        {data.expiring.length === 0 ? <p>{t('Nothing expires within your alert window.')}</p> : (
          <ul className="ins-list">
            {data.expiring.map((x) => (
              <li key={`${x.kind}-${x.id}`}>
                <span className="truncate">{x.kind === 'ssl' ? 'SSL · ' : ''}{x.name}</span>
                {dl(x.days_left)}
              </li>
            ))}
          </ul>
        )}
      </Insight>

      <Insight icon={ListChecks} title={t('Incomplete tasks')} to="/tasks" tone={data.incomplete.overdue ? 'orange' : 'accent'} count={data.incomplete.total}>
        <p>
          {t('{u} high-priority · {p} in progress', { u: data.incomplete.urgent, p: data.incomplete.in_progress })}
          {data.incomplete.overdue ? <> · <span className="c-orange">{t('{n} overdue', { n: data.incomplete.overdue })}</span></> : null}
          {data.incomplete.undated ? <> · {t('{n} without a due date', { n: data.incomplete.undated })}</> : null}
        </p>
        {data.incomplete.top.length > 0 && (
          <ul className="ins-list compact">
            {data.incomplete.top.map((x) => (
              <li key={x.id}><span className="truncate">{x.title}</span><span className={`prio prio-${x.priority}`}>{statusLabel(x.priority)}</span></li>
            ))}
          </ul>
        )}
      </Insight>

      <Insight icon={History} title={t('Recent activity')} to="/activity">
        {data.recent.length === 0 ? <p>{t('No activity yet.')}</p> : (
          <ul className="ins-feed">
            {data.recent.map((a) => (
              <li key={a.id}>
                {a.link ? <Link to={a.link}>{tr(a.description)}</Link> : <span>{tr(a.description)}</span>}
                <em>{timeAgo(a.created_at)}</em>
              </li>
            ))}
          </ul>
        )}
      </Insight>
    </aside>
  );
}

/* ---------------- Page ---------------- */

function OverviewSkeleton() {
  return (
    <>
      <div className="stats">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={150} r={20} />)}</div>
      <Skeleton h={210} r={20} className="mt" />
      <div className="overview-grid mt"><Skeleton h={520} r={20} /><Skeleton h={520} r={20} /></div>
    </>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi('/overview');
  if (data?.generated_at) syncServerTime(data.generated_at);
  const first = (user?.name || '').split(' ')[0];
  const hour = serverNow().getHours();
  const greet = t(hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

  useEffect(() => {
    const timer = setInterval(() => reload({ silent: true }), 120000);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <div className="overview">
      <div className="welcome">
        <h1>{greet}, {first} <span className="wave" aria-hidden="true">👋</span></h1>
        <p>{fmtDate(serverNow(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {t('Here’s your developer summary & live insights')}</p>
      </div>

      {error && !data ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <OverviewSkeleton /> : (
        <>
          <Stats stats={data.stats} />
          <Timeline items={data.timeline} />
          <div className="overview-grid">
            <Weekly weekly={data.weekly} tasks={data.stats.tasks} />
            <Insights data={data.insights} />
          </div>
        </>
      )}
    </div>
  );
}
