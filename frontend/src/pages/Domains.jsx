import { useState } from 'react';
import { Globe, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useApi, useDebounce } from '../hooks/useApi';
import { useCrud, useEditor, useProjectOptions } from '../hooks/useCrud';
import { post } from '../api/client';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import Menu from '../components/ui/Menu';
import DataTable from '../components/ui/DataTable';
import { Select } from '../components/ui/Fields';
import { Badge, EmptyState, ErrorState, MiniStat, PageHeader, SearchInput, Segmented, SkeletonCards, Toolbar } from '../components/ui/Misc';
import { DaysBadge } from '../lib/ui';
import { CURRENCIES } from '../lib/constants';
import { formatDate, formatMoney } from '../lib/format';
import { t, tr } from '../i18n';

const fields = (projects) => [
  { name: 'name', label: t('Domain name'), required: true, placeholder: t('example.com'), span: 2, hint: t('Without http:// — e.g. example.com or app.example.com') },
  { name: 'registrar', label: t('Registrar'), placeholder: t('Namecheap, Cloudflare…') },
  { name: 'dns_provider', label: t('DNS provider'), placeholder: t('Cloudflare…') },
  { name: 'registered_at', label: t('Registration date'), type: 'date' },
  { name: 'expires_at', label: t('Expiration date'), type: 'date', validate: (v, all) => (all.registered_at && v < all.registered_at ? t(t('Must be after the registration date.')) : null) },
  { name: 'renewal_price', label: t('Renewal price'), type: 'number', min: 0, step: '0.01' },
  { name: 'currency', label: t('Currency'), type: 'select', options: CURRENCIES, required: true, default: 'USD' },
  { name: 'ssl_expires_at', label: t('SSL expiration'), type: 'date', hint: t('Or use “Check SSL” to fetch it automatically') },
  { name: 'project_id', label: t('Linked project'), type: 'select', options: projects, placeholder: t('None') },
  { name: 'auto_renew', label: t('Auto-renew'), type: 'switch', switchLabel: t('Auto-renew is enabled at the registrar'), span: 2 },
  { name: 'notes', label: t('Notes'), type: 'textarea', span: 2, rows: 3 },
];

export default function Domains() {
  const [state, setState] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('expires');
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useApi('/domains', { q: dq, state, sort });
  const all = useApi('/domains', { sort: 'expires' });
  const projects = useProjectOptions();
  const editor = useEditor();
  const { toast } = useUI();
  const { settings } = useAuth();
  const refresh = () => { reload({ silent: true }); all.reload({ silent: true }); };
  const { save, remove } = useCrud('/domains', { entity: 'domain', onChange: refresh });
  const [checking, setChecking] = useState(null);
  const alertDays = settings?.domain_alert_days || 30;

  const checkSsl = async (d) => {
    setChecking(d.id);
    try { const r = await post(`/domains/${d.id}/ssl-check`); toast(`SSL valid until ${formatDate(r.data.ssl_expires_at)}`); refresh(); } catch (e) { toast(e.message, 'error'); } finally { setChecking(null); }
  };

  const list = all.data || [];
  const expiring = list.filter((d) => d.days_left !== null && d.days_left >= 0 && d.days_left <= alertDays).length;
  const expired = list.filter((d) => d.days_left !== null && d.days_left < 0).length;
  const sslSoon = list.filter((d) => d.ssl_days_left !== null && d.ssl_days_left <= 14).length;

  const columns = [
    { key: 'name', label: t('Domain'), mobile: 'title', render: (d) => (
      <div><div className="cell-title row" style={{ gap: 6 }}><Globe size={14} className="muted" />{d.name}</div><div className="cell-sub">{d.registrar || t('Unknown registrar')}{d.auto_renew ? ` · ${t('auto-renew')}` : ''}</div></div>
    ) },
    { key: 'expires_at', label: t('Expires'), render: (d) => <div className="row-wrap"><span className="nowrap">{formatDate(d.expires_at)}</span><DaysBadge days={d.days_left} warnAt={alertDays} /></div> },
    { key: 'ssl', label: 'SSL', render: (d) => (
      <div className="row-wrap">
        {d.ssl_expires_at ? <><span className="nowrap">{formatDate(d.ssl_expires_at)}</span><DaysBadge days={d.ssl_days_left} warnAt={14} /></> : <span className="faint">{t('Unknown')}</span>}
      </div>
    ) },
    { key: 'renewal_price', label: t('Renewal'), render: (d) => (d.renewal_price !== null ? formatMoney(d.renewal_price, d.currency) : '—') },
    { key: 'dns_provider', label: t('DNS'), render: (d) => d.dns_provider || '—' },
    { key: 'project', label: t('Project'), render: (d) => d.project_name || <span className="faint">—</span> },
  ];

  return (
    <>
      <PageHeader title={t('Domains')} subtitle={t('Registrations, renewals, DNS and SSL certificates in one place.')}
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('Add domain')}</Button>} />
      <div className="mini-stats">
        <MiniStat label={t('Domains')} value={list.length} sub={`${list.filter((d) => d.auto_renew).length} on auto-renew`} />
        <MiniStat label={t('Expiring ≤ {n} days', { n: alertDays })} value={expiring} tone={expiring ? 'orange' : undefined} sub={t('Renew soon')} />
        <MiniStat label={t('Expired')} value={expired} tone={expired ? 'danger' : undefined} sub={t('Needs action')} />
        <MiniStat label={t('SSL ≤ 14 days')} value={sslSoon} tone={sslSoon ? 'orange' : 'accent'} sub={t('Certificates to renew')} />
      </div>
      <Toolbar>
        <Segmented options={[{ value: 'all', label: t('All') }, { value: 'expiring', label: t('Expiring') }, { value: 'expired', label: t('Expired') }]} value={state} onChange={setState} />
        <SearchInput value={q} onChange={setQ} placeholder={t('Search domains, registrars…')} />
        <Select value={sort} onChange={(e) => setSort(e.target.value)} options={[{ value: 'expires', label: t('Expiry date') }, { value: 'name', label: t('Name') }, { value: 'created', label: t('Recently added') }]} aria-label={t('Sort')} />
      </Toolbar>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={3} h={80} /> : data.length === 0 ? (
        <EmptyState icon={Globe} title={t('No domains here')} text={state !== 'all' || q ? t('Nothing matches these filters.') : t('Track your domains to get renewal and SSL expiry alerts.')} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('Add domain')}</Button>} />
      ) : (
        <DataTable columns={columns} rows={data} onRowClick={editor.edit}
          actions={(d) => (
            <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
              <button type="button" className="icon-btn" title={t('Check SSL now')} onClick={() => checkSsl(d)} aria-label={t('Check SSL')}>{checking === d.id ? <RefreshCw size={15} className="spin" /> : <ShieldCheck size={16} />}</button>
              <Menu items={[
                { label: t('Edit'), icon: Pencil, onClick: () => editor.edit(d) },
                { label: t('Check SSL'), icon: ShieldCheck, onClick: () => checkSsl(d) },
                { label: t('Delete'), icon: Trash2, danger: true, onClick: () => remove(d, d.name) },
              ]} />
            </div>
          )} />
      )}
      {data?.length > 0 && <p className="muted small" style={{ marginTop: 12 }}><Badge tone="muted">{t('Tip')}</Badge> {t('SSL expiry dates refresh automatically once a day when the cron job runs.')}</p>}
      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? t('Add domain') : t('Edit domain')} fields={fields(projects)} initial={editor.editing}
        onSubmit={(v) => save(v, editor.isNew ? null : editor.editing.id)} />
    </>
  );
}
