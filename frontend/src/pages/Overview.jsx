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
import { formatShortDate, formatTime, parseDate, relativeDays, serverNow, syncServerTime, timeAgo, todayISO } from '../lib/format';

/* ---------------- Stat cards ---------------- */

function Barcode({ percent, count = 64 }) {
  const lit = Math.round((percent / 100) * count);
  return (
    <div className="barcode" role="img" aria-label={`${percent}% complete`}>
      {Array.from({ length: count }).map((_, i) => <i key={i} className={i < lit ? 'on' : ''} />)}
    </div>
  );
}

function ThickBars({ done, total, count = 24 }) {
  const lit = total ? Math.round((done / total) * count) : 0;
  return (
    <div className="thickbars" role="img" aria-label={`${done} of ${total} tasks done`}>
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
  const { projects: p, servers: s, tasks: t, domains: d } = stats;
  const serverTone = (st) => ({ online: 'on', maintenance: 'warn', offline: 'off' }[st]);
  const domainTone = (st) => ({ active: 'on', expiring: 'warn', expired: 'off', unknown: '' }[st]);

  return (
    <div className="stats">
      <StatCard title="Projects" icon={FolderKanban} to="/projects" value={<>{p.active}<small> active</small><em>/ {p.total} total</em></>}
        foot={p.tasks_total ? `${p.progress}% of ${p.tasks_total} tasks done in open projects` : `${p.completed} completed · ${p.planning} planning`}>
        <Barcode percent={p.progress} />
      </StatCard>

      <StatCard title="Active Servers" icon={Server} to="/servers" value={<>{s.online}<small> online</small><em>/ {s.total} servers</em></>}
        foot={s.websites_total ? `${s.websites_up}/${s.websites_total} sites up${s.maintenance ? ` · ${s.maintenance} maintenance` : ''}${s.offline ? ` · ${s.offline} offline` : ''}` : `${s.maintenance} in maintenance · ${s.offline} offline`}>
        <div className="bubbles">
          {s.items.length === 0 && <span className="bubble">0</span>}
          {s.items.map((x, i) => (
            <span key={x.id} className={`bubble ${serverTone(x.status)}`} title={`${x.name} — ${x.status}`}>
              {x.status === 'online' ? i + 1 : <ServerCrash size={13} />}
            </span>
          ))}
          {s.total > s.items.length && <span className="bubble">+{s.total - s.items.length}</span>}
        </div>
      </StatCard>

      <StatCard title="Pending Tasks" icon={AlarmClock} to="/tasks" value={<>{t.pending}<small> pending</small><em>· {t.in_progress} in progress</em></>}
        foot={t.overdue || t.due_today ? `${t.overdue} overdue · ${t.due_today} due today` : `${t.done_week} completed in the last 7 days`}>
        <ThickBars done={t.done} total={t.total} />
      </StatCard>

      <StatCard title="Domains" icon={AlertTriangle} to="/domains" value={<>{d.total}<small> domains</small>{d.expiring + d.expired > 0 && <em className="warn">· {d.expiring + d.expired} need attention</em>}</>}
        foot={d.next ? `Next renewal: ${d.next.name} ${d.next.days_left !== null ? relativeDays(d.next.days_left).toLowerCase() : ''}` : 'No domains tracked yet'}>
        <div className="bubbles">
          {d.items.length === 0 && <span className="bubble">0</span>}
          {d.items.map((x) => (
            <span key={x.id} className={`bubble icon ${domainTone(x.state)}`} title={`${x.name} — ${x.state}${x.days_left !== null ? ` (${x.days_left}d)` : ''}`}><Globe size={13} /></span>
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
  useEffect(() => { const t = setInterval(() => setNow(serverNow()), 60000); return () => clearInterval(t); }, []);

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
    if (day === today) return it.all_day ? 'Today' : formatTime(it.at);
    return parseDate(it.at).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  const renderItem = (it, i, isPast) => {
    const Icon = KIND_ICON[it.kind] || CircleDot;
    const firstUpcoming = !isPast && i === 0;
    const pill = it.all_day && it.at.slice(0, 10) === today ? 'Due today' : it.at.slice(0, 10) === today ? formatTime(it.at) : formatShortDate(it.at);
    const content = (
      <>
        <span className={`tl-pill${firstUpcoming ? ' next' : ''}${it.level === 'critical' ? ' crit' : ''}`}>{it.ongoing ? 'Ongoing' : pill}</span>
        <strong className="tl-title"><Icon size={14} />{it.title}</strong>
        <span className="tl-sub">{it.subtitle}</span>
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
        <h2><Pin size={16} className="pin" />Today’s Activity</h2>
        <span className="card-sub">{past.length} done today · {upcoming.length} upcoming (14 days)</span>
      </div>
      {items.length === 0 ? (
        <p className="muted small tl-empty">Nothing scheduled. Tasks with due dates, project deadlines, domain renewals and incidents will appear here.</p>
      ) : (
        <div className="tl-scroll" ref={scroller}>
          <div className="tl-track">
            {past.map((it, i) => renderItem(it, i, true))}
            <div className="tl-now" ref={nowRef}>
              <span className="tl-label now">{formatTime(now)}</span>
              <i className="tl-now-dot" />
            </div>
            {upcoming.map((it, i) => renderItem(it, i, false))}
            {upcoming.length === 0 && <div className="tl-col"><span className="tl-label">Later</span><div className="tl-card ghost"><span className="tl-sub">Nothing else coming up — nice.</span></div></div>}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- Weekly chart ---------------- */

const METRICS = [
  { value: 'tasks_completed', label: 'Tasks completed', unit: 'tasks completed this week' },
  { value: 'activity', label: 'Dev activity', unit: 'development events this week' },
  { value: 'active_projects', label: 'Active projects', unit: 'projects worked on this week' },
];

function Weekly({ weekly, tasks }) {
  const [metric, setMetric] = useState('tasks_completed');
  const t = useThemeTokens();
  const values = weekly.days.map((d) => d[metric]);
  const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const colors = values.map((v) => (v >= avg && v > 0 ? t.accent : t.orange));
  const labels = weekly.days.map((d) => parseDate(d.date).toLocaleDateString('en-US', { weekday: 'short' }));
  const titles = weekly.days.map((d) => parseDate(d.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
  const m = METRICS.find((x) => x.value === metric);

  const prev = weekly.previous[metric];
  const total = weekly.totals[metric];
  const delta = prev !== undefined && prev > 0 ? Math.round(((total - prev) / prev) * 100) : null;
  const due = weekly.due_window;
  const pct = due.total ? Math.round((due.done / due.total) * 100) : 0;
  const busiest = weekly.busiest_day ? parseDate(weekly.busiest_day).toLocaleDateString('en-US', { weekday: 'long' }) : null;
  const busiestCount = weekly.busiest_day ? weekly.days.find((d) => d.date === weekly.busiest_day)?.tasks_completed : 0;

  return (
    <section className="card weekly-card">
      <div className="card-head wrap">
        <h2><BarChart3 size={16} />Weekly Activity Overview</h2>
        <Segmented size="sm" options={METRICS} value={metric} onChange={setMetric} />
      </div>
      <div className="weekly-total">
        <strong>{total}</strong>
        <span>{m.unit}{delta !== null && <em className={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? '+' : ''}{delta}% vs last week</em>}</span>
      </div>
      <BarChart labels={labels} titles={titles} values={values} colors={colors} label={m.label} height={250} />
      <div className="chart-legend">
        <span><i style={{ background: t.accent }} />At or above daily average ({avg.toFixed(1)})</span>
        <span><i style={{ background: t.orange }} />Below average</span>
      </div>

      <div className="weekly-summary">
        <h3>{due.total ? <>You’ve completed {pct}% of the tasks due this week</> : <>No tasks are due this week</>} <span className="ink">{due.done}/{due.total}</span></h3>
        <ul>
          {tasks.overdue > 0 && <li><AlertTriangle size={14} className="c-orange" />{tasks.overdue} overdue task{tasks.overdue > 1 ? 's' : ''} — clear {tasks.overdue > 1 ? 'them' : 'it'} before starting new work.</li>}
          <li><CheckCircle2 size={14} className="ink" />Average {weekly.avg_per_day} tasks/day · {weekly.totals.tasks_completed} completed vs {weekly.previous.tasks_completed} the previous week.</li>
          {busiest && <li><Sparkles size={14} className="ink" />Most productive day: {busiest} ({busiestCount} task{busiestCount > 1 ? 's' : ''} completed).</li>}
          <li><History size={14} className="muted" />{weekly.totals.activity} logged changes across {weekly.totals.active_projects} project{weekly.totals.active_projects === 1 ? '' : 's'} in the last 7 days.</li>
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
        {to && <Link to={to} className="insight-link" aria-label={`Open ${title}`}><ArrowRight size={14} /></Link>}
      </div>
      <div className="insight-body">{children}</div>
    </div>
  );
}

function Insights({ data }) {
  const dl = (n) => (n < 0 ? <span className="c-danger">{Math.abs(n)}d overdue</span> : n === 0 ? <span className="c-orange">today</span> : <span className="muted">{n}d</span>);
  return (
    <aside className="card insights-card" aria-label="Developer insights">
      <div className="insights-title">
        <h2><Sparkles size={16} />Developer Insights</h2>
        <p>Live signals from your projects, servers and tasks.</p>
      </div>

      <Insight icon={CalendarClock} title="Upcoming deadlines" to="/tasks" tone="accent">
        {data.deadlines.length === 0 ? <p>No dated work coming up.</p> : (
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

      <Insight icon={ServerCrash} title="Server warnings" to="/monitoring" tone={data.server_warnings.length ? 'danger' : 'accent'} count={data.server_warnings.length || undefined}>
        {data.server_warnings.length === 0 ? <p>All servers online and monitored sites healthy.</p> : (
          <ul className="ins-list">
            {data.server_warnings.slice(0, 4).map((w) => (
              <li key={`${w.kind}-${w.id}`}>
                <Link to={w.link} className="truncate"><i className={`dot dot-${w.level === 'critical' ? 'down' : 'maintenance'}`} />{w.name}</Link>
                <span className="muted truncate ins-detail">{w.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </Insight>

      <Insight icon={Globe} title="Expiring domains & SSL" to="/domains" tone={data.expiring.length ? 'orange' : 'accent'}>
        {data.expiring.length === 0 ? <p>Nothing expires within your alert window.</p> : (
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

      <Insight icon={ListChecks} title="Incomplete tasks" to="/tasks" tone={data.incomplete.overdue ? 'orange' : 'accent'} count={data.incomplete.total}>
        <p>
          {data.incomplete.urgent} high-priority · {data.incomplete.in_progress} in progress
          {data.incomplete.overdue ? <> · <span className="c-orange">{data.incomplete.overdue} overdue</span></> : null}
          {data.incomplete.undated ? <> · {data.incomplete.undated} without a due date</> : null}
        </p>
        {data.incomplete.top.length > 0 && (
          <ul className="ins-list compact">
            {data.incomplete.top.map((t) => (
              <li key={t.id}><span className="truncate">{t.title}</span><span className={`prio prio-${t.priority}`}>{t.priority}</span></li>
            ))}
          </ul>
        )}
      </Insight>

      <Insight icon={History} title="Recent activity" to="/activity">
        {data.recent.length === 0 ? <p>No activity yet.</p> : (
          <ul className="ins-feed">
            {data.recent.map((a) => (
              <li key={a.id}>
                {a.link ? <Link to={a.link}>{a.description}</Link> : <span>{a.description}</span>}
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
  const greet = hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const t = setInterval(() => reload({ silent: true }), 120000);
    return () => clearInterval(t);
  }, [reload]);

  return (
    <div className="overview">
      <div className="welcome">
        <h1>{greet}, {first} <span className="wave" aria-hidden="true">👋</span></h1>
        <p>{serverNow().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · Here’s your developer summary &amp; live insights</p>
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
