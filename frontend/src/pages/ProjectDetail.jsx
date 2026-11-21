import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, Archive, ArchiveRestore, ArrowLeft, Check, ExternalLink, Github, Globe, KeyRound, ListChecks, Pencil, Plus, Server, Trash2, Wallet,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useCrud, useEditor, useProjectOptions } from '../hooks/useCrud';
import { patch } from '../api/client';
import { useUI } from '../context/UIContext';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import { ErrorState, MiniStat, Progress, Spinner, Tags } from '../components/ui/Misc';
import { DaysBadge, PriorityBadge, StatusBadge } from '../lib/ui';
import { daysUntil, formatDate, formatMoney, relativeDays, splitList, timeAgo } from '../lib/format';
import { projectFields } from './projectFields';
import { taskFields } from './taskFields';
import { useProjectActions } from './Projects';

function Section({ icon: Icon, title, count, action, children }) {
  return (
    <section className="card">
      <div className="card-head">
        <h3><Icon size={16} />{title}{count !== undefined && <span className="insight-count">{count}</span>}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { data: p, loading, error, reload } = useApi(`/projects/${id}`);
  const editor = useEditor();
  const taskEditor = useEditor();
  const projectOptions = useProjectOptions();
  const { save, remove, archive } = useProjectActions(reload);
  const tasksCrud = useCrud('/tasks', { entity: 'task', onChange: reload });

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !p) return <Spinner />;

  const toggleTask = async (t) => {
    try { await patch(`/tasks/${t.id}`, { status: t.status === 'done' ? 'todo' : 'done' }); reload({ silent: true }); } catch (e) { toast(e.message, 'error'); }
  };
  const days = daysUntil(p.deadline);
  const openTasks = p.tasks.filter((t) => t.status !== 'done');

  return (
    <>
      <Link to="/projects" className="back-link"><ArrowLeft size={15} />Projects</Link>
      <div className="page-head">
        <div className="page-head-text">
          <div className="row" style={{ gap: 12 }}>
            <span className="project-swatch" style={{ background: p.color || 'var(--card-3)', color: p.color ? '#0a0a0a' : 'var(--text)' }}>{p.name[0]?.toUpperCase()}</span>
            <div style={{ minWidth: 0 }}>
              <h1 className="truncate">{p.name}</h1>
              <div className="row-wrap" style={{ marginTop: 4 }}>
                <StatusBadge status={p.status} /><PriorityBadge priority={p.priority} />
                {p.archived && <StatusBadge status="paused" label="Archived" />}
              </div>
            </div>
          </div>
        </div>
        <div className="page-head-actions">
          <Button icon={Pencil} onClick={() => editor.edit(p)}>Edit</Button>
          <Button icon={p.archived ? ArchiveRestore : Archive} onClick={() => archive(p)}>{p.archived ? 'Restore' : 'Archive'}</Button>
          <Button icon={Trash2} variant="ghost" onClick={async () => { if (await remove(p, p.name)) navigate('/projects'); }} aria-label="Delete project" />
        </div>
      </div>

      <div className="mini-stats">
        <MiniStat label="Progress" value={`${p.progress}%`} sub={`${p.tasks_done} of ${p.tasks_total} tasks done`} tone="accent" />
        <MiniStat label="Open tasks" value={openTasks.length} sub={`${openTasks.filter((t) => t.overdue).length} overdue`} />
        <MiniStat label="Deadline" value={p.deadline ? relativeDays(days) : '—'} sub={p.deadline ? formatDate(p.deadline) : 'Not set'} tone={days !== null && days < 0 && p.status !== 'completed' ? 'danger' : undefined} />
        <MiniStat label="Expenses" value={formatMoney(p.expenses_total.amount, p.expenses_total.currency, { compact: true })} sub={`${p.expenses.length} entries · converted`} tone="orange" />
      </div>

      <div className="detail-grid">
        <div className="stack">
          <section className="card">
            <div className="card-head"><h3>About</h3></div>
            <p className="notes-body">{p.description || <span className="muted">No description.</span>}</p>
            <div style={{ marginTop: 14 }}><Tags items={splitList(p.technologies)} max={20} /></div>
            <div style={{ marginTop: 16 }}><Progress value={p.progress} /></div>
          </section>

          <Section icon={ListChecks} title="Tasks" count={p.tasks.length}
            action={<Button size="sm" icon={Plus} onClick={() => taskEditor.create({ project_id: p.id })}>Add task</Button>}>
            {p.tasks.length === 0 ? <p className="muted small">No tasks yet for this project.</p> : (
              <div className="related-list">
                {p.tasks.map((t) => (
                  <div key={t.id} className="related-item">
                    <button type="button" className={`check-btn${t.status === 'done' ? ' checked' : ''}`} onClick={() => toggleTask(t)} aria-label={t.status === 'done' ? 'Mark as not done' : 'Mark as done'}><Check size={12} /></button>
                    <button type="button" className="grow truncate" style={{ border: 0, background: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--muted)' : 'inherit' }} onClick={() => taskEditor.edit(t)}>{t.title}</button>
                    <PriorityBadge priority={t.priority} />
                    {t.due_date && <span className={`small nowrap ${t.overdue ? 'c-danger' : 'muted'}`}>{formatDate(t.due_date, { month: 'short', day: 'numeric' })}</span>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section icon={Wallet} title="Expenses" count={p.expenses.length} action={<Link to="/expenses?new=1" className="link-btn">Add expense</Link>}>
            {p.expenses.length === 0 ? <p className="muted small">No expenses linked to this project.</p> : (
              <div className="related-list">
                {p.expenses.slice(0, 8).map((e) => (
                  <div key={e.id} className="related-item">
                    <span className="grow truncate">{e.title}</span>
                    <span className="muted small nowrap">{formatDate(e.spent_at, { month: 'short', day: 'numeric' })}</span>
                    <strong className="nowrap">{formatMoney(e.amount, e.currency)}</strong>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section icon={Pencil} title="Notes" action={<Button size="sm" variant="ghost" onClick={() => editor.edit(p)}>Edit</Button>}>
            {p.notes ? <p className="notes-body">{p.notes}</p> : <p className="muted small">No notes yet.</p>}
          </Section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head"><h3>Details</h3></div>
            <dl className="kv">
              <dt>Start date</dt><dd>{formatDate(p.start_date)}</dd>
              <dt>Deadline</dt><dd>{formatDate(p.deadline)}</dd>
              <dt>Live URL</dt><dd>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="ink row" style={{ gap: 4 }}>{p.url.replace(/^https?:\/\//, '')}<ExternalLink size={12} /></a> : '—'}</dd>
              <dt>Repository</dt><dd>{p.repo_url ? <a href={p.repo_url} target="_blank" rel="noopener noreferrer" className="ink row" style={{ gap: 4 }}><Github size={13} />{p.repo_url.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</a> : '—'}</dd>
              <dt>Created</dt><dd>{formatDate(p.created_at)}</dd>
              <dt>Updated</dt><dd>{timeAgo(p.updated_at)}</dd>
            </dl>
          </section>

          <Section icon={Server} title="Servers" count={p.servers.length}>
            {p.servers.length === 0 ? <p className="muted small">Link servers from the Servers page.</p> : p.servers.map((s) => (
              <div key={s.id} className="related-item"><i className={`dot dot-${s.status}`} /><span className="grow truncate">{s.name}</span><span className="muted small mono">{s.ip_address}</span></div>
            ))}
          </Section>

          <Section icon={Globe} title="Domains" count={p.domains.length}>
            {p.domains.length === 0 ? <p className="muted small">No domains linked.</p> : p.domains.map((d) => (
              <div key={d.id} className="related-item"><span className="grow truncate">{d.name}</span><DaysBadge days={d.days_left} /></div>
            ))}
          </Section>

          <Section icon={Activity} title="Monitors" count={p.websites.length}>
            {p.websites.length === 0 ? <p className="muted small">No uptime monitors linked.</p> : p.websites.map((w) => (
              <Link to={`/monitoring/${w.id}`} key={w.id} className="related-item"><i className={`dot dot-${w.last_state}`} /><span className="grow truncate">{w.name}</span><span className="muted small">{w.uptime_30d !== null ? `${w.uptime_30d}%` : '—'}</span></Link>
            ))}
          </Section>

          <Section icon={KeyRound} title="API keys" count={p.credentials.length}>
            {p.credentials.length === 0 ? <p className="muted small">No credentials linked.</p> : p.credentials.map((c) => (
              <Link to="/vault" key={c.id} className="related-item"><span className="grow truncate">{c.provider} · {c.name}</span><span className="mono small muted">{c.masked.slice(-8)}</span></Link>
            ))}
          </Section>

          {p.activity.length > 0 && (
            <Section icon={Activity} title="History">
              <ul className="ins-feed">
                {p.activity.map((a) => <li key={a.id}><span>{a.description}</span><em>{timeAgo(a.created_at)}</em></li>)}
              </ul>
            </Section>
          )}
        </div>
      </div>


      <FormModal open={editor.open} onClose={editor.close} title="Edit project" fields={projectFields} initial={editor.editing} onSubmit={(v) => save(v, p.id)} size="lg" />
      <FormModal open={taskEditor.open} onClose={taskEditor.close} title={taskEditor.isNew ? 'New task' : 'Edit task'}
        fields={taskFields(projectOptions)} initial={taskEditor.editing} onSubmit={(v) => tasksCrud.save(v, taskEditor.isNew ? null : taskEditor.editing.id)} />
    </>
  );
}
