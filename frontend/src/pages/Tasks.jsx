import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, Columns3, List, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApi, useDebounce } from '../hooks/useApi';
import { useCrud, useEditor, useProjectOptions } from '../hooks/useCrud';
import { patch, post, get } from '../api/client';
import { useUI } from '../context/UIContext';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import Menu from '../components/ui/Menu';
import DataTable from '../components/ui/DataTable';
import { Select } from '../components/ui/Fields';
import { EmptyState, ErrorState, MiniStat, PageHeader, SearchInput, Segmented, SkeletonCards, Toolbar } from '../components/ui/Misc';
import { PriorityBadge, StatusBadge } from '../lib/ui';
import { PRIORITIES, TASK_STATUSES } from '../lib/constants';
import { daysUntil, formatDate } from '../lib/format';
import { taskFields } from './taskFields';

const COLUMN_COLORS = { todo: 'var(--faint)', in_progress: 'var(--info)', review: 'var(--orange)', done: 'var(--accent)' };
const DUE = [
  { value: '', label: 'Any due date' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'open', label: 'All open' },
];

function DueLabel({ task }) {
  if (!task.due_date) return null;
  const d = daysUntil(task.due_date);
  const cls = task.status !== 'done' && d < 0 ? 'overdue' : d === 0 ? 'today' : '';
  return (
    <span className={`task-due ${cls}`}>
      <CalendarDays size={12} />
      {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : formatDate(task.due_date, { month: 'short', day: 'numeric' })}
      {task.due_time ? ` · ${task.due_time}` : ''}
    </span>
  );
}

function TaskCard({ t, onEdit, onDelete, onToggle, onMove, onDragStart, dragging }) {
  return (
    <div className={`task-card${t.status === 'done' ? ' done' : ''}${dragging ? ' dragging' : ''}`} draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(t.id)); e.dataTransfer.effectAllowed = 'move'; onDragStart(t.id); }}
      onDragEnd={() => onDragStart(null)}
      onDoubleClick={() => onEdit(t)}>
      <div className="task-card-title">
        <button type="button" className={`check-btn${t.status === 'done' ? ' checked' : ''}`} onClick={() => onToggle(t)} aria-label={t.status === 'done' ? 'Mark as not done' : 'Mark as done'}><Check size={12} /></button>
        <span>{t.title}</span>
        <Menu items={[
          { label: 'Edit', icon: Pencil, onClick: () => onEdit(t) },
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => onDelete(t) },
        ]} />
      </div>
      <div className="task-card-meta">
        <PriorityBadge priority={t.priority} />
        {t.category && <span className="tag">{t.category}</span>}
        <DueLabel task={t} />
      </div>
      {t.project_name && <div className="task-card-meta"><span className="task-project"><i style={{ background: t.project_color || 'var(--faint)' }} />{t.project_name}</span></div>}
      <select className="input move-select" value={t.status} onChange={(e) => onMove(t, e.target.value)} aria-label="Move to column">
        {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>Move to: {s.label}</option>)}
      </select>
    </div>
  );
}

function Board({ tasks, setTasks, onEdit, onDelete, onToggle, onNew, onChanged }) {
  const { toast } = useUI();
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);

  const columns = useMemo(() => {
    const c = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, []]));
    tasks.forEach((t) => c[t.status]?.push(t));
    Object.values(c).forEach((list) => list.sort((a, b) => a.position - b.position || b.id - a.id));
    return c;
  }, [tasks]);

  const persist = async (items) => {
    try { await post('/tasks/reorder', { items }); onChanged?.(); } catch (e) { toast(e.message, 'error'); }
  };

  const moveTo = (taskId, status, beforeId = null) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const target = columns[status].filter((t) => t.id !== taskId);
    const idx = beforeId ? target.findIndex((t) => t.id === beforeId) : target.length;
    target.splice(idx < 0 ? target.length : idx, 0, { ...task, status });
    const items = target.map((t, i) => ({ id: t.id, status, position: i + 1 }));
    setTasks((all) => all.map((t) => {
      const it = items.find((x) => x.id === t.id);
      if (!it) return t;
      const becameDone = status === 'done' && t.status !== 'done';
      return { ...t, status, position: it.position, completed_at: becameDone ? new Date().toISOString() : status === 'done' ? t.completed_at : null };
    }));
    persist(items);
    if (status !== task.status) toast(`Moved to ${TASK_STATUSES.find((s) => s.value === status).label}`);
  };

  return (
    <div className="kanban">
      {TASK_STATUSES.map((col) => (
        <div key={col.value} className={`kanban-col${over === col.value ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(col.value); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
          onDrop={(e) => {
            e.preventDefault(); setOver(null);
            const id = Number(e.dataTransfer.getData('text/plain'));
            const card = e.target.closest('[data-task]');
            moveTo(id, col.value, card ? Number(card.dataset.task) : null);
          }}>
          <div className="kanban-col-head">
            <i className="kanban-dot" style={{ background: COLUMN_COLORS[col.value] }} />
            {col.label}<em>{columns[col.value].length}</em>
            <button type="button" className="icon-btn" onClick={() => onNew(col.value)} aria-label={`Add task to ${col.label}`}><Plus size={16} /></button>
          </div>
          {columns[col.value].map((t) => (
            <div key={t.id} data-task={t.id}>
              <TaskCard t={t} dragging={dragId === t.id} onDragStart={setDragId} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} onMove={(task, s) => moveTo(task.id, s)} />
            </div>
          ))}
          {columns[col.value].length === 0 && <p className="muted small" style={{ textAlign: 'center', padding: '18px 0' }}>Drop tasks here</p>}
        </div>
      ))}
    </div>
  );
}

export default function Tasks() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(() => { try { return localStorage.getItem('ds.tasks.view') || 'board'; } catch { return 'board'; } });
  const [q, setQ] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [due, setDue] = useState('');
  const dq = useDebounce(q);
  const query = { q: dq, project_id: projectId, priority, category, due, sort: view === 'board' ? 'board' : 'due' };
  const { data, setData, loading, error, reload } = useApi('/tasks', query);
  const stats = useApi('/tasks/stats');
  const projectOptions = useProjectOptions();
  const editor = useEditor();
  const { toast } = useUI();
  const refresh = () => { reload({ silent: true }); stats.reload({ silent: true }); };
  const { save, remove } = useCrud('/tasks', { entity: 'task', onChange: refresh });

  useEffect(() => { try { localStorage.setItem('ds.tasks.view', view); } catch { /* ignore */ } }, [view]);
  useEffect(() => {
    const open = params.get('open');
    if (open) {
      get(`/tasks/${open}`).then((r) => editor.edit(r.data)).catch(() => {});
      params.delete('open'); setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const toggle = async (t) => {
    const status = t.status === 'done' ? 'todo' : 'done';
    setData((all) => all.map((x) => (x.id === t.id ? { ...x, status } : x)));
    try { await patch(`/tasks/${t.id}`, { status }); if (status === 'done') toast('Task completed 🎉'); refresh(); } catch (e) { toast(e.message, 'error'); reload(); }
  };

  const s = stats.data;
  const categories = s?.categories || [];
  const columns = [
    { key: 'title', label: 'Task', mobile: 'title', render: (t) => (
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <button type="button" className={`check-btn${t.status === 'done' ? ' checked' : ''}`} onClick={(e) => { e.stopPropagation(); toggle(t); }} aria-label="Toggle done"><Check size={12} /></button>
        <div style={{ minWidth: 0 }}>
          <div className="cell-title" style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--muted)' : undefined }}>{t.title}</div>
          {t.category && <div className="cell-sub">{t.category}</div>}
        </div>
      </div>
    ) },
    { key: 'project', label: 'Project', render: (t) => (t.project_name ? <span className="task-project"><i className="dot" style={{ background: t.project_color || 'var(--faint)' }} />{t.project_name}</span> : <span className="faint">—</span>) },
    { key: 'priority', label: 'Priority', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} label={TASK_STATUSES.find((x) => x.value === t.status)?.label} /> },
    { key: 'due', label: 'Due', render: (t) => (t.due_date ? <DueLabel task={t} /> : <span className="faint">—</span>) },
  ];

  return (
    <>
      <PageHeader title="Tasks" subtitle="Plan, prioritise and ship. Drag cards between columns to update status."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>New task</Button>} />

      {s && (
        <div className="mini-stats">
          <MiniStat label="Open" value={s.by_status.todo + s.by_status.in_progress + s.by_status.review} sub={`${s.by_status.in_progress} in progress · ${s.by_status.review} in review`} />
          <MiniStat label="Overdue" value={s.overdue} tone={s.overdue ? 'danger' : undefined} sub="Past their due date" />
          <MiniStat label="Completed this week" value={s.completed_week} tone="accent" sub="Last 7 days" />
          <MiniStat label="Completed this month" value={s.completed_month} sub={`${s.by_status.done} done all-time`} />
        </div>
      )}

      <Toolbar>
        <Segmented options={[{ value: 'board', label: 'Board', icon: Columns3 }, { value: 'list', label: 'List', icon: List }]} value={view} onChange={setView} />
        <SearchInput value={q} onChange={setQ} placeholder="Search tasks…" />
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projectOptions} placeholder="All projects" aria-label="Filter by project" />
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={PRIORITIES} placeholder="Any priority" aria-label="Filter by priority" />
        {categories.length > 0 && <Select value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((c) => ({ value: c, label: c }))} placeholder="All categories" aria-label="Filter by category" />}
        <Select value={due} onChange={(e) => setDue(e.target.value)} options={DUE.slice(1)} placeholder="Any due date" aria-label="Filter by due date" />
      </Toolbar>

      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={4} h={320} /> : data.length === 0 && view === 'list' ? (
        <EmptyState icon={ListChecks} title="No tasks found" text={q || projectId || priority || due ? 'Try clearing filters.' : 'Create your first task.'} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>New task</Button>} />
      ) : view === 'board' ? (
        <Board tasks={data} setTasks={setData} onChanged={() => stats.reload({ silent: true })} onEdit={editor.edit} onDelete={(t) => remove(t, t.title)} onToggle={toggle} onNew={(status) => editor.create({ status, project_id: projectId || undefined })} />
      ) : (
        <DataTable columns={columns} rows={data} onRowClick={editor.edit}
          actions={(t) => <Menu items={[{ label: 'Edit', icon: Pencil, onClick: () => editor.edit(t) }, { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(t, t.title) }]} />} />
      )}

      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? 'New task' : 'Edit task'}
        fields={taskFields(projectOptions, categories)} initial={editor.editing} onSubmit={(v) => save(v, editor.isNew ? null : editor.editing.id)} />
    </>
  );
}
