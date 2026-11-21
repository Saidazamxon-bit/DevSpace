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
import { t, tr } from '../i18n';

const fields = (projects, isNew) => [
  { name: 'provider', label: t('Provider'), required: true, placeholder: t('Stripe, AWS, OpenAI…') },
  { name: 'name', label: t('Credential name'), required: true, placeholder: t('Live secret key') },
  { name: 'secret', label: isNew ? t('Secret value') : t('New secret value'), type: 'password', required: isNew, span: 2,
    hint: isNew ? t('Encrypted with libsodium before it is stored. It is never shown in lists.') : t('Leave empty to keep the current secret.') },
  { name: 'description', label: t('Description'), type: 'textarea', span: 2, rows: 2 },
  { name: 'project_id', label: t('Linked project'), type: 'select', options: projects, placeholder: t('None') },
  { name: 'expires_at', label: t('Expiration'), type: 'date' },
  { name: 'tags', label: t('Tags'), span: 2, placeholder: t('production, payments'), hint: t('Comma-separated') },
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
    const timer = setInterval(() => setLeft((l) => { if (l <= 1) { onClose(); return 0; } return l - 1; }), 1000);
    return () => clearInterval(timer);
  }, [secret, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) { setError(t('Enter your account password.')); return; }
    setLoading(true); setError('');
    try { const r = await post(`/credentials/${cred.id}/reveal`, { password }); setSecret(r.secret); setPassword(''); } catch (err) { setError(err.fields?.password || err.message); } finally { setLoading(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(secret); toast('Secret copied to clipboard'); } catch { toast('Clipboard unavailable', 'error'); } };

  return (
    <Modal open={!!cred} onClose={onClose} size="sm" title={secret ? cred?.name : t('Confirm it’s you')} subtitle={cred ? `${cred.provider}${secret ? ` · hides in ${left}s` : ''}` : ''}
      footer={secret ? <><Button variant="ghost" onClick={onClose}>{t('Done')}</Button><Button variant="primary" icon={Copy} onClick={copy}>{t('Copy')}</Button></>
        : <><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" type="submit" form="reveal-form" loading={loading} icon={Lock}>{t('Reveal')}</Button></>}>
      {secret ? (
        <div className="stack" style={{ gap: 10 }}>
          <div className="secret" style={{ width: '100%', padding: '10px 8px 10px 12px' }}>
            <span style={{ flex: 1, whiteSpace: visible ? 'pre-wrap' : 'nowrap', wordBreak: 'break-all' }}>{visible ? secret : '•'.repeat(Math.min(32, secret.length))}</span>
            <button type="button" className="icon-btn sm" onClick={() => setVisible((v) => !v)} aria-label={visible ? t('Hide') : t('Show')}>{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
          <p className="muted small">{t('This access was recorded in your activity log.')}</p>
        </div>
      ) : (
        <form id="reveal-form" onSubmit={submit}>
          <Field label={t('Account password')} error={error} htmlFor="reveal-pw">
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
    { key: 'name', label: t('Credential'), mobile: 'title', render: (c) => (
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="search-item-icon"><KeyRound size={14} /></span>
        <div style={{ minWidth: 0 }}><div className="cell-title">{c.name}</div><div className="cell-sub">{c.provider}{c.description ? ` · ${c.description}` : ''}</div></div>
      </div>
    ) },
    { key: 'secret', label: t('Secret'), render: (c) => (
      <span className="secret" onClick={(e) => e.stopPropagation()}>
        <span>{c.masked}</span>
        <button type="button" className="icon-btn sm" onClick={() => setReveal(c)} aria-label={t('Reveal secret')}><Eye size={13} /></button>
      </span>
    ) },
    { key: 'project', label: t('Project'), render: (c) => c.project_name || <span className="faint">—</span> },
    { key: 'expires', label: t('Expires'), render: (c) => (c.expires_at ? <div className="row-wrap"><span className="nowrap">{formatDate(c.expires_at)}</span><DaysBadge days={c.days_left} warnAt={14} /></div> : <span className="faint">{t('Never')}</span>) },
    { key: 'tags', label: t('Tags'), render: (c) => (c.tags ? <Tags items={splitList(c.tags)} max={3} /> : <span className="faint">—</span>) },
    { key: 'revealed', label: t('Last revealed'), render: (c) => (c.last_revealed_at ? timeAgo(c.last_revealed_at) : <span className="faint">{t('Never')}</span>) },
  ];

  return (
    <>
      <PageHeader title={t('API Vault')} subtitle={t('API keys and tokens, encrypted at rest. Secrets are only decrypted after password confirmation.')}
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('Add credential')}</Button>} />
      <div className="vault-banner">
        <ShieldCheck size={20} />
        <span>{t('Secrets are encrypted with libsodium (XSalsa20-Poly1305) using the key in your server’s .env file. They are never sent to the browser unless you reveal them, and every reveal is logged.')}</span>
      </div>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder={t('Search provider, name, tags…')} />
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projects} placeholder={t('All projects')} aria-label={t('Filter by project')} />
      </Toolbar>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={3} h={70} /> : data.length === 0 ? (
        <EmptyState icon={KeyRound} title={t('Vault is empty')} text={q || projectId ? t('No credentials match.') : t('Store API keys, tokens and webhooks secrets safely.')} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('Add credential')}</Button>} />
      ) : (
        <DataTable columns={columns} rows={data} onRowClick={editor.edit}
          actions={(c) => <Menu items={[
            { label: t('Reveal / copy'), icon: Eye, onClick: () => setReveal(c) },
            { label: t('Edit'), icon: Pencil, onClick: () => editor.edit(c) },
            { label: t('Delete'), icon: Trash2, danger: true, onClick: () => remove(c, `${c.provider} · ${c.name}`) },
          ]} />} />
      )}
      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? t('Add credential') : t('Edit credential')} fields={fields(projects, editor.isNew)} initial={editor.editing}
        onSubmit={(v) => { const payload = { ...v }; if (!payload.secret) delete payload.secret; return save(payload, editor.isNew ? null : editor.editing.id); }} />
      <RevealModal cred={reveal} onClose={() => setReveal(null)} />
    </>
  );
}
