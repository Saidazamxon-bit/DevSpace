import { useState } from 'react';
import { Copy, Cpu, HardDrive, MapPin, MemoryStick, Pencil, Plus, Server, Trash2 } from 'lucide-react';
import { useApi, useDebounce } from '../hooks/useApi';
import { useCrud, useEditor, useOptions } from '../hooks/useCrud';
import { useUI } from '../context/UIContext';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import Menu from '../components/ui/Menu';
import { EmptyState, ErrorState, MiniStat, PageHeader, SearchInput, Segmented, SkeletonCards, Toolbar } from '../components/ui/Misc';
import { StatusBadge } from '../lib/ui';
import { CURRENCIES, SERVER_STATUSES } from '../lib/constants';
import { formatMoney } from '../lib/format';

const fields = (projects) => [
  { name: 'name', label: 'Server name', required: true, placeholder: 'prod-web-01' },
  { name: 'status', label: 'Status', type: 'select', options: SERVER_STATUSES, required: true, default: 'online' },
  { name: 'provider', label: 'Provider', placeholder: 'Hetzner, DigitalOcean…' },
  { name: 'ip_address', label: 'IP address', placeholder: '203.0.113.10', validate: (v) => (/^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]+$/i.test(v) ? null : 'Enter a valid IPv4 or IPv6 address.') },
  { name: 'os', label: 'Operating system', placeholder: 'Ubuntu 24.04 LTS' },
  { name: 'location', label: 'Location', placeholder: 'Frankfurt, DE' },
  { name: 'cpu', label: 'CPU', placeholder: '4 vCPU' },
  { name: 'ram', label: 'RAM', placeholder: '8 GB' },
  { name: 'storage', label: 'Storage', placeholder: '160 GB NVMe' },
  { name: 'monthly_cost', label: 'Monthly cost', type: 'number', min: 0, step: '0.01' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, required: true, default: 'USD' },
  { name: 'project_ids', label: 'Linked projects', type: 'chips', options: projects, span: 2 },
  { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 3, placeholder: 'SSH user, panel URL, firewall rules… (never store passwords here — use the API Vault)' },
];

function ServerCard({ s, onEdit, onDelete }) {
  const { toast } = useUI();
  const copy = async () => { try { await navigator.clipboard.writeText(s.ip_address); toast('IP copied'); } catch { toast('Copy failed', 'error'); } };
  return (
    <article className="monitor-card" onClick={() => onEdit(s)}>
      <div className="monitor-head">
        <span className="project-swatch" style={{ width: 36, height: 36, background: 'var(--card-2)', color: 'var(--accent-ink)' }}><Server size={17} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="truncate">{s.name}</h3>
          <div className="monitor-url">{s.provider || 'Unknown provider'}{s.os ? ` · ${s.os}` : ''}</div>
        </div>
        <StatusBadge status={s.status} />
        <div onClick={(e) => e.stopPropagation()}>
          <Menu items={[{ label: 'Edit', icon: Pencil, onClick: () => onEdit(s) }, { label: 'Delete', icon: Trash2, danger: true, onClick: () => onDelete(s) }]} />
        </div>
      </div>
      {s.ip_address && (
        <div onClick={(e) => e.stopPropagation()}>
          <span className="secret"><span>{s.ip_address}</span><button type="button" className="icon-btn sm" onClick={copy} aria-label="Copy IP"><Copy size={13} /></button></span>
        </div>
      )}
      <div className="monitor-stats">
        <div><span><Cpu size={11} /> CPU</span><strong className="truncate" style={{ display: 'block' }}>{s.cpu || '—'}</strong></div>
        <div><span><MemoryStick size={11} /> RAM</span><strong className="truncate" style={{ display: 'block' }}>{s.ram || '—'}</strong></div>
        <div><span><HardDrive size={11} /> Disk</span><strong className="truncate" style={{ display: 'block' }}>{s.storage || '—'}</strong></div>
      </div>
      <div className="project-meta">
        <span className="row" style={{ gap: 5 }}><MapPin size={13} />{s.location || 'Unknown location'}</span>
        <span>{s.monthly_cost !== null ? `${formatMoney(s.monthly_cost, s.currency)}/mo` : ''}</span>
      </div>
      {s.projects.length > 0 && (
        <div className="tags">{s.projects.map((p) => <span key={p.id} className="tag task-project"><i style={{ background: p.color || 'var(--faint)' }} />{p.name}</span>)}</div>
      )}
    </article>
  );
}

export default function Servers() {
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useApi('/servers', { q: dq, status, sort: 'status' });
  const all = useApi('/servers');
  const projects = useOptions('/projects', (p) => ({ value: p.id, label: p.name }));
  const editor = useEditor();
  const refresh = () => { reload({ silent: true }); all.reload({ silent: true }); };
  const { save, remove } = useCrud('/servers', { entity: 'server', onChange: refresh });
  const list = all.data || [];
  const count = (st) => list.filter((s) => s.status === st).length;

  return (
    <>
      <PageHeader title="Servers" subtitle="Your infrastructure inventory — specs, providers, costs and linked projects."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>Add server</Button>} />
      <div className="mini-stats">
        <MiniStat label="Servers" value={list.length} sub={`${new Set(list.map((s) => s.provider).filter(Boolean)).size} providers`} />
        <MiniStat label="Online" value={count('online')} tone="accent" sub="Healthy" />
        <MiniStat label="Maintenance" value={count('maintenance')} tone={count('maintenance') ? 'orange' : undefined} sub="Planned work" />
        <MiniStat label="Offline" value={count('offline')} tone={count('offline') ? 'danger' : undefined} sub="Needs attention" />
      </div>
      <Toolbar>
        <Segmented options={[{ value: 'all', label: 'All' }, ...SERVER_STATUSES]} value={status} onChange={setStatus} />
        <SearchInput value={q} onChange={setQ} placeholder="Search name, IP, provider…" />
      </Toolbar>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={3} h={230} /> : data.length === 0 ? (
        <EmptyState icon={Server} title="No servers found" text={q || status !== 'all' ? 'Try clearing filters.' : 'Add your VPS, shared hosting and database servers.'} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>Add server</Button>} />
      ) : (
        <div className="monitor-grid">{data.map((s) => <ServerCard key={s.id} s={s} onEdit={editor.edit} onDelete={(x) => remove(x, x.name)} />)}</div>
      )}
      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? 'Add server' : 'Edit server'} fields={fields(projects)} initial={editor.editing}
        onSubmit={(v) => save(v, editor.isNew ? null : editor.editing.id)} size="lg" />
    </>
  );
}
