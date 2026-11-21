import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, CalendarDays, ExternalLink, FolderKanban, Github, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApi, useDebounce } from '../hooks/useApi';
import { useCrud, useEditor } from '../hooks/useCrud';
import { post } from '../api/client';
import { useUI } from '../context/UIContext';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import Menu from '../components/ui/Menu';
import { Select } from '../components/ui/Fields';
import { EmptyState, ErrorState, PageHeader, Progress, SearchInput, Segmented, SkeletonCards, Tags, Toolbar } from '../components/ui/Misc';
import { PriorityBadge, StatusBadge } from '../lib/ui';
import { PRIORITIES } from '../lib/constants';
import { daysUntil, formatDate, relativeDays, splitList } from '../lib/format';
import { projectFields } from './projectFields';
import { t } from '../i18n';

const FILTERS = [
  { value: 'all', label: t('All') },
  { value: 'active', label: t('Active') },
  { value: 'planning', label: t('Planning') },
  { value: 'paused', label: t('Paused') },
  { value: 'completed', label: t('Completed') },
  { value: 'archived', label: t('Archived') },
];
const SORTS = [
  { value: 'updated', label: t('Recently updated') },
  { value: 'deadline', label: t('Deadline') },
  { value: 'priority', label: t('Priority') },
  { value: 'name', label: t('Name') },
];

export function ProjectCard({ p, onEdit, onArchive, onDelete }) {
  const navigate = useNavigate();
  const days = daysUntil(p.deadline);
  return (
    <article className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
      <div className="project-card-top">
        <span className="project-swatch" style={{ background: p.color || 'var(--card-3)', color: p.color ? '#0a0a0a' : 'var(--text)' }}>{p.name[0]?.toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="truncate">{p.name}</h3>
          <div className="row-wrap" style={{ marginTop: 4 }}><StatusBadge status={p.status} /><PriorityBadge priority={p.priority} /></div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Menu items={[
            { label: t('Edit'), icon: Pencil, onClick: () => onEdit(p) },
            { label: p.archived ? t('Restore') : t('Archive'), icon: p.archived ? ArchiveRestore : Archive, onClick: () => onArchive(p) },
            { label: t('Delete'), icon: Trash2, danger: true, onClick: () => onDelete(p) },
          ]} />
        </div>
      </div>
      <p className="desc">{p.description || t('No description yet.')}</p>
      <Tags items={splitList(p.technologies)} max={4} />
      <div>
        <div className="project-meta" style={{ marginBottom: 6 }}><span>{t('{d}/{n} tasks', { d: p.tasks_done, n: p.tasks_total })}</span><span>{p.progress}%</span></div>
        <Progress value={p.progress} />
      </div>
      <div className="project-meta">
        <span className="row" style={{ gap: 6 }}>
          <CalendarDays size={13} />
          {p.deadline ? <span className={days !== null && days < 0 && p.status !== 'completed' ? 'c-danger' : days !== null && days <= 7 ? 'c-orange' : ''}>{formatDate(p.deadline)} · {relativeDays(days)}</span> : t('No deadline')}
        </span>
        <span className="project-links" onClick={(e) => e.stopPropagation()}>
          {p.url && <a className="icon-btn sm" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={t('Open live site')}><ExternalLink size={14} /></a>}
          {p.repo_url && <a className="icon-btn sm" href={p.repo_url} target="_blank" rel="noopener noreferrer" aria-label={t('Open repository')}><Github size={14} /></a>}
        </span>
      </div>
    </article>
  );
}

export function useProjectActions(reload) {
  const { toast, confirm } = useUI();
  const crud = useCrud('/projects', { entity: 'project', onChange: reload });
  const archive = async (p) => {
    if (!p.archived) {
      const ok = await confirm({ title: t('Archive project?'), message: t('“{name}” will be hidden from your active lists. You can restore it any time.', { name: p.name }), confirmLabel: t('Archive') });
      if (!ok) return;
    }
    try { await post(`/projects/${p.id}/archive`); toast(p.archived ? t('Project restored') : t('Project archived')); reload(); } catch (e) { toast(e.message, 'error'); }
  };
  return { ...crud, archive };
}

export default function Projects() {
  const [filter, setFilter] = useState('all');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('updated');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const query = { q: dq, sort, priority, status: filter !== 'archived' ? filter : undefined, archived: filter === 'archived' ? '1' : undefined };
  const { data, loading, error, reload } = useApi('/projects', query);
  const editor = useEditor();
  const { save, remove, archive } = useProjectActions(reload);

  const counts = useMemo(() => data?.length ?? 0, [data]);

  return (
    <>
      <PageHeader title={t('Projects')} subtitle={t('Everything you’re building — status, deadlines, stack and progress.')}
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('New project')}</Button>} />
      <Toolbar>
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
        <SearchInput value={q} onChange={setQ} placeholder={t('Search projects or tech…')} />
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={PRIORITIES} placeholder={t('Any priority')} aria-label={t('Filter by priority')} />
        <Select value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS} aria-label={t('Sort projects')} />
      </Toolbar>

      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={6} h={250} /> : counts === 0 ? (
        <EmptyState icon={FolderKanban} title={filter === 'archived' ? t('No archived projects') : t('No projects found')}
          text={q || priority || filter !== 'all' ? t('Try adjusting your filters.') : t('Create your first project to start tracking tasks, domains, servers and expenses.')}
          action={!q && filter === 'all' && <Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('New project')}</Button>} />
      ) : (
        <div className="project-grid">
          {data.map((p) => <ProjectCard key={p.id} p={p} onEdit={editor.edit} onArchive={archive} onDelete={(x) => remove(x, x.name)} />)}
        </div>
      )}

      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? t('New project') : t('Edit project')}
        fields={projectFields} initial={editor.editing} onSubmit={(v) => save(v, editor.isNew ? null : editor.editing.id)} size="lg" />
    </>
  );
}
