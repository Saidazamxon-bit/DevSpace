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
import { t } from '../i18n';

const COLUMN_COLORS = { todo: 'var(--faint)', in_progress: 'var(--info)', review: 'var(--orange)', done: 'var(--accent)' };
const DUE = [
  { value: '', label: t('Any due date') },
  { value: 'overdue', label: t('Overdue') },
  { value: 'today', label: t('Due today') },
  { value: 'week', label: t('Next 7 days') },
  { value: 'open', label: t('All open') },
];

function DueLabel({ task }) {
  if (!task.due_date) return null;
  const d = daysUntil(task.due_date);
  const cls = task.status !== 'done' && d < 0 ? 'overdue' : d === 0 ? 'today' : '';
  return (
    <span className={`task-due ${cls}`}>
      <CalendarDays size={12} />
      {d === 0 ? t('Today') : d === 1 ? t('Tomorrow') : formatDate(task.due_date, { month: 'short', day: 'numeric' })}
      {task.due_time ? ` · ${task.due_time}` : ''}
    </span>
  );
}

function TaskCard({ t: tk, onEdit, onDelete, onToggle, onMove, onDragStart, dragging }) {
  return (
    <div className={`task-card${tk.status === 'done' ? ' done' : ''}${dragging ? ' dragging' : ''}`} draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(tk.id)); e.dataTransfer.effectAllowed = 'move'; onDragStart(tk.id); }}
      onDragEnd={() => onDragStart(null)}
      onDoubleClick={() => onEdit(tk)}>
      <div className="task-card-title">
        <button type="button" className={`check-btn${tk.status === 'done' ? ' checked' : ''}`} onClick={() => onToggle(tk)} aria-label={tk.status === 'done' ? t('Mark as not done') : t('Mark as done')}><Check size={12} /></button>
        <span>{tk.title}</span>
        <Menu items={[
          { label: t('Edit'), icon: Pencil, onClick: () => onEdit(tk) },
          { label: t('Delete'), icon: Trash2, danger: true, onClick: () => onDelete(tk) },
        ]} />
      </div>
      <div className="task-card-meta">
        <PriorityBadge priority={tk.priority} />
        {tk.category && <span className="tag">{tk.category}</span>}
        <DueLabel task={tk} />
      </div>
      {tk.project_name && <div className="task-card-meta"><span className="task-project"><i style={{ background: tk.project_color || 'var(--faint)' }} />{tk.project_name}</span></div>}
      <select className="input move-select" value={tk.status} onChange={(e) => onMove(tk, e.target.value)} aria-label={t('Move to column')}>
        {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{t('Move to: {name}', { name: s.label })}</option>)}
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
    tasks.forEach((tk) => c[tk.status]?.push(tk));
    Object.values(c).forEach((list) => list.sort((a, b) => a.position - b.position || b.id - a.id));
    return c;
  }, [tasks]);

  const persist = async (items) => {
    try { await post('/tasks/reorder', { items }); onChanged?.(); } catch (e) { toast(e.message, 'error'); }
  };

  const moveTo = (taskId, status, beforeId = null) => {
    const task = tasks.find((tk) => tk.id === taskId);
    if (!task) return;
    const target = columns[status].filter((tk) => tk.id !== taskId);
    const idx = beforeId ? target.findIndex((tk) => tk.id === beforeId) : target.length;
    target.splice(idx < 0 ? target.length : idx, 0, { ...task, status });
    const items = target.map((tk, i) => ({ id: tk.id, status, position: i + 1 }));
    setTasks((all) => all.map((tk) => {
      const it = items.find((x) => x.id === tk.id);
      if (!it) return tk;
      const becameDone = status === 'done' && tk.status !== 'done';
      return { ...tk, status, position: it.position, completed_at: becameDone ? new Date().toISOString() : status === 'done' ? tk.completed_at : null };
    }));
    persist(items);
    if (status !== task.status) toast(t('Moved to {name}', { name: TASK_STATUSES.find((s) => s.value === status).label }));
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
            <button type="button" className="icon-btn" onClick={() => onNew(col.value)} aria-label={t('Add task to {name}', { name: col.label })}><Plus size={16} /></button>
          </div>
          {columns[col.value].map((tk) => (
            <div key={tk.id} data-task={tk.id}>
              <TaskCard t={tk} dragging={dragId === tk.id} onDragStart={setDragId} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} onMove={(task, s) => moveTo(task.id, s)} />
            </div>
          ))}
          {columns[col.value].length === 0 && <p className="muted small" style={{ textAlign: 'center', padding: '18px 0' }}>{t('Drop tasks here')}</p>}
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

  const toggle = async (tk) => {
    const status = tk.status === 'done' ? 'todo' : 'done';
    setData((all) => all.map((x) => (x.id === tk.id ? { ...x, status } : x)));
    try { await patch(`/tasks/${tk.id}`, { status }); if (status === 'done') toast(t('Task completed 🎉')); refresh(); } catch (e) { toast(e.message, 'error'); reload(); }
  };

  const s = stats.data;
  const categories = s?.categories || [];
  const columns = [
    { key: 'title', label: t('Task'), mobile: 'title', render: (tk) => (
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <button type="button" className={`check-btn${tk.status === 'done' ? ' checked' : ''}`} onClick={(e) => { e.stopPropagation(); toggle(tk); }} aria-label={t('Toggle done')}><Check size={12} /></button>
        <div style={{ minWidth: 0 }}>
          <div className="cell-title" style={{ textDecoration: tk.status === 'done' ? 'line-through' : 'none', color: tk.status === 'done' ? 'var(--muted)' : undefined }}>{tk.title}</div>
          {tk.category && <div className="cell-sub">{tk.category}</div>}
        </div>
      </div>
    ) },
    { key: 'project', label: t('Project'), render: (tk) => (tk.project_name ? <span className="task-project"><i className="dot" style={{ background: tk.project_color || 'var(--faint)' }} />{tk.project_name}</span> : <span className="faint">—</span>) },
    { key: 'priority', label: t('Priority'), render: (tk) => <PriorityBadge priority={tk.priority} /> },
    { key: 'status', label: t('Status'), render: (tk) => <StatusBadge status={tk.status} label={TASK_STATUSES.find((x) => x.value === tk.status)?.label} /> },
    { key: 'due', label: t('Due'), render: (tk) => (tk.due_date ? <DueLabel task={tk} /> : <span className="faint">—</span>) },
  ];

  return (
    <>
      <PageHeader title={t('Tasks')} subtitle={t('Plan, prioritise and ship. Drag cards between columns to update status.')}
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('New task')}</Button>} />

      {s && (
        <div className="mini-stats">
          <MiniStat label={t('Open')} value={s.by_status.todo + s.by_status.in_progress + s.by_status.review} sub={t('{p} in progress · {r} in review', { p: s.by_status.in_progress, r: s.by_status.review })} />
          <MiniStat label={t('Overdue')} value={s.overdue} tone={s.overdue ? 'danger' : undefined} sub={t('Past their due date')} />
          <MiniStat label={t('Completed this week')} value={s.completed_week} tone="accent" sub={t('Last 7 days')} />
          <MiniStat label={t('Completed this month')} value={s.completed_month} sub={t('{n} done all-time', { n: s.by_status.done })} />
        </div>
      )}

      <Toolbar>
        <Segmented options={[{ value: 'board', label: t('Board'), icon: Columns3 }, { value: 'list', label: t('List'), icon: List }]} value={view} onChange={setView} />
        <SearchInput value={q} onChange={setQ} placeholder={t('Search tasks…')} />
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projectOptions} placeholder={t('All projects')} aria-label={t('Filter by project')} />
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={PRIORITIES} placeholder={t('Any priority')} aria-label={t('Filter by priority')} />
        {categories.length > 0 && <Select value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((c) => ({ value: c, label: c }))} placeholder={t('All categories')} aria-label={t('Filter by category')} />}
        <Select value={due} onChange={(e) => setDue(e.target.value)} options={DUE.slice(1)} placeholder={t('Any due date')} aria-label={t('Filter by due date')} />
      </Toolbar>

      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={4} h={320} /> : data.length === 0 && view === 'list' ? (
        <EmptyState icon={ListChecks} title={t('No tasks found')} text={q || projectId || priority || due ? t('Try clearing filters.') : t('Create your first task.')} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('New task')}</Button>} />
      ) : view === 'board' ? (
        <Board tasks={data} setTasks={setData} onChanged={() => stats.reload({ silent: true })} onEdit={editor.edit} onDelete={(tk) => remove(tk, tk.title)} onToggle={toggle} onNew={(status) => editor.create({ status, project_id: projectId || undefined })} />
      ) : (
        <DataTable columns={columns} rows={data} onRowClick={editor.edit}
          actions={(tk) => <Menu items={[{ label: t('Edit'), icon: Pencil, onClick: () => editor.edit(tk) }, { label: t('Delete'), icon: Trash2, danger: true, onClick: () => remove(tk, tk.title) }]} />} />
      )}

      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? t('New task') : t('Edit task')}
        fields={taskFields(projectOptions, categories)} initial={editor.editing} onSubmit={(v) => save(v, editor.isNew ? null : editor.editing.id)} />
    </>
  );
}
