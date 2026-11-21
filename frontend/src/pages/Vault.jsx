import { useEffect, useState } from 'react';
import { Copy, Eye, EyeOff, KeyRound, Lock, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useApi, useDebounce } from '../hooks/useApi';
import { useCrud, useEditor, useProjectOptions } from '../hooks/useCrud';
import { post } from '../api/client';
import { useUI } from '../context/UIContext';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import Modal from '../components/ui/Modal';
import Menu from '../components/ui/Menu';
import DataTable from '../components/ui/DataTable';
import { Field, Input, Select } from '../components/ui/Fields';
import { EmptyState, ErrorState, PageHeader, SearchInput, SkeletonCards, Tags, Toolbar } from '../components/ui/Misc';
import { DaysBadge } from '../lib/ui';
import { formatDate, splitList, timeAgo } from '../lib/format';

const fields = (projects, isNew) => [
  { name: 'provider', label: 'Provider', required: true, placeholder: 'Stripe, AWS, OpenAI…' },
  { name: 'name', label: 'Credential name', required: true, placeholder: 'Live secret key' },
  { name: 'secret', label: isNew ? 'Secret value' : 'New secret value', type: 'password', required: isNew, span: 2,
    hint: isNew ? 'Encrypted with libsodium before it is stored. It is never shown in lists.' : 'Leave empty to keep the current secret.' },
  { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 2 },
  { name: 'project_id', label: 'Linked project', type: 'select', options: projects, placeholder: 'None' },
  { name: 'expires_at', label: 'Expiration', type: 'date' },
  { name: 'tags', label: 'Tags', span: 2, placeholder: 'production, payments', hint: 'Comma-separated' },
];

/** Password re-confirmation → decrypted secret shown for 30 seconds. */
function RevealModal({ cred, onClose }) {
  const { toast } = useUI();
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [left, setLeft] = useState(30);

  useEffect(() => { setPassword(''); setSecret(null); setError(''); setVisible(false); setLeft(30); }, [cred]);
  useEffect(() => {
    if (!secret) return undefined;
    const t = setInterval(() => setLeft((l) => { if (l <= 1) { onClose(); return 0; } return l - 1; }), 1000);
    return () => clearInterval(t);
  }, [secret, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) { setError('Enter your account password.'); return; }
    setLoading(true); setError('');
    try { const r = await post(`/credentials/${cred.id}/reveal`, { password }); setSecret(r.secret); setPassword(''); } catch (err) { setError(err.fields?.password || err.message); } finally { setLoading(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(secret); toast('Secret copied to clipboard'); } catch { toast('Clipboard unavailable', 'error'); } };

  return (
    <Modal open={!!cred} onClose={onClose} size="sm" title={secret ? cred?.name : 'Confirm it’s you'} subtitle={cred ? `${cred.provider}${secret ? ` · hides in ${left}s` : ''}` : ''}
      footer={secret ? <><Button variant="ghost" onClick={onClose}>Done</Button><Button variant="primary" icon={Copy} onClick={copy}>Copy</Button></>
        : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="reveal-form" loading={loading} icon={Lock}>Reveal</Button></>}>
      {secret ? (
        <div className="stack" style={{ gap: 10 }}>
          <div className="secret" style={{ width: '100%', padding: '10px 8px 10px 12px' }}>
            <span style={{ flex: 1, whiteSpace: visible ? 'pre-wrap' : 'nowrap', wordBreak: 'break-all' }}>{visible ? secret : '•'.repeat(Math.min(32, secret.length))}</span>
            <button type="button" className="icon-btn sm" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide' : 'Show'}>{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
          <p className="muted small">This access was recorded in your activity log.</p>
        </div>
      ) : (
        <form id="reveal-form" onSubmit={submit}>
          <Field label="Account password" error={error} htmlFor="reveal-pw">
            <Input id="reveal-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </Field>
        </form>
      )}
    </Modal>
  );
}

export default function Vault() {
  const [q, setQ] = useState('');
  const [projectId, setProjectId] = useState('');
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useApi('/credentials', { q: dq, project_id: projectId, sort: 'provider' });
  const projects = useProjectOptions();
  const editor = useEditor();
  const [reveal, setReveal] = useState(null);
  const { save, remove } = useCrud('/credentials', { entity: 'credential', onChange: () => reload({ silent: true }) });

  const columns = [
    { key: 'name', label: 'Credential', mobile: 'title', render: (c) => (
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="search-item-icon"><KeyRound size={14} /></span>
        <div style={{ minWidth: 0 }}><div className="cell-title">{c.name}</div><div className="cell-sub">{c.provider}{c.description ? ` · ${c.description}` : ''}</div></div>
      </div>
    ) },
    { key: 'secret', label: 'Secret', render: (c) => (
      <span className="secret" onClick={(e) => e.stopPropagation()}>
        <span>{c.masked}</span>
        <button type="button" className="icon-btn sm" onClick={() => setReveal(c)} aria-label="Reveal secret"><Eye size={13} /></button>
      </span>
    ) },
    { key: 'project', label: 'Project', render: (c) => c.project_name || <span className="faint">—</span> },
    { key: 'expires', label: 'Expires', render: (c) => (c.expires_at ? <div className="row-wrap"><span className="nowrap">{formatDate(c.expires_at)}</span><DaysBadge days={c.days_left} warnAt={14} /></div> : <span className="faint">Never</span>) },
    { key: 'tags', label: 'Tags', render: (c) => (c.tags ? <Tags items={splitList(c.tags)} max={3} /> : <span className="faint">—</span>) },
    { key: 'revealed', label: 'Last revealed', render: (c) => (c.last_revealed_at ? timeAgo(c.last_revealed_at) : <span className="faint">Never</span>) },
  ];

  return (
    <>
      <PageHeader title="API Vault" subtitle="API keys and tokens, encrypted at rest. Secrets are only decrypted after password confirmation."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>Add credential</Button>} />
      <div className="vault-banner">
        <ShieldCheck size={20} />
        <span>Secrets are encrypted with <strong>libsodium (XSalsa20-Poly1305)</strong> using the key in your server’s <code className="mono">.env</code>. They are never sent to the browser unless you reveal them, and every reveal is logged.</span>
      </div>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search provider, name, tags…" />
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projects} placeholder="All projects" aria-label="Filter by project" />
      </Toolbar>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={3} h={70} /> : data.length === 0 ? (
        <EmptyState icon={KeyRound} title="Vault is empty" text={q || projectId ? 'No credentials match.' : 'Store API keys, tokens and webhooks secrets safely.'} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>Add credential</Button>} />
      ) : (
        <DataTable columns={columns} rows={data} onRowClick={editor.edit}
          actions={(c) => <Menu items={[
            { label: 'Reveal / copy', icon: Eye, onClick: () => setReveal(c) },
            { label: 'Edit', icon: Pencil, onClick: () => editor.edit(c) },
            { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(c, `${c.provider} · ${c.name}`) },
          ]} />} />
      )}
      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? 'Add credential' : 'Edit credential'} fields={fields(projects, editor.isNew)} initial={editor.editing}
        onSubmit={(v) => { const payload = { ...v }; if (!payload.secret) delete payload.secret; return save(payload, editor.isNew ? null : editor.editing.id); }} />
      <RevealModal cred={reveal} onClose={() => setReveal(null)} />
    </>
  );
}
