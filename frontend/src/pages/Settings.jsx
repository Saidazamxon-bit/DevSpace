import { useEffect, useState } from 'react';
import { Bell, Database, Download, HardDriveDownload, Lock, Palette, Plus, Trash2, User, Wallet } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { del, downloadUrl, post, put, setCsrf } from '../api/client';
import Button from '../components/ui/Button';
import { Field, Input, Select, Switch } from '../components/ui/Fields';
import { ErrorState, PageHeader, Spinner } from '../components/ui/Misc';
import { CURRENCIES } from '../lib/constants';
import { formatBytes, formatDateTime, timeAgo } from '../lib/format';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Password', icon: Lock },
  { id: 'appearance', label: 'Theme', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'currency', label: 'Currency', icon: Wallet },
  { id: 'data', label: 'Data & backup', icon: Database },
];

function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValues(initial); }, [JSON.stringify(initial)]); // eslint-disable-line react-hooks/exhaustive-deps
  const bind = (name) => ({ value: values[name] ?? '', onChange: (e) => { setValues((v) => ({ ...v, [name]: e.target.value })); setErrors((x) => ({ ...x, [name]: undefined })); } });
  return { values, setValues, errors, setErrors, saving, setSaving, bind };
}

function Profile({ profile }) {
  const { setUser } = useAuth();
  const { toast } = useUI();
  const f = useForm({ name: profile.name, email: profile.email, title: profile.title || '' });
  const submit = async (e) => {
    e.preventDefault(); f.setSaving(true);
    try { const r = await put('/settings/profile', f.values); setUser(r.data); toast('Profile saved'); } catch (err) { f.setErrors(err.fields || {}); toast(err.message, 'error'); } finally { f.setSaving(false); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head"><h3>Profile</h3></div>
      <div className="form-grid">
        <Field label="Full name" error={f.errors.name} required><Input {...f.bind('name')} required /></Field>
        <Field label="Job title" error={f.errors.title}><Input {...f.bind('title')} placeholder="Full-stack developer" /></Field>
        <Field label="Email" error={f.errors.email} span={2} required><Input type="email" {...f.bind('email')} required /></Field>
      </div>
      <div className="form-actions"><Button variant="primary" type="submit" loading={f.saving}>Save profile</Button></div>
    </form>
  );
}

function Password() {
  const { toast } = useUI();
  const f = useForm({ current_password: '', password: '', password_confirmation: '' });
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.values.password.length < 10) errs.password = 'At least 10 characters.';
    else if (!/[A-Za-z]/.test(f.values.password) || !/\d/.test(f.values.password)) errs.password = 'Use letters and numbers.';
    if (f.values.password !== f.values.password_confirmation) errs.password_confirmation = 'Passwords do not match.';
    if (Object.keys(errs).length) { f.setErrors(errs); return; }
    f.setSaving(true);
    try { const r = await put('/settings/password', f.values); if (r.csrf) setCsrf(r.csrf); toast('Password changed'); f.setValues({ current_password: '', password: '', password_confirmation: '' }); } catch (err) { f.setErrors(err.fields || {}); toast(err.message, 'error'); } finally { f.setSaving(false); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head"><h3>Change password</h3></div>
      <div className="form-grid">
        <Field label="Current password" error={f.errors.current_password} span={2}><Input type="password" autoComplete="current-password" {...f.bind('current_password')} /></Field>
        <Field label="New password" error={f.errors.password} hint="Minimum 10 characters, letters and numbers"><Input type="password" autoComplete="new-password" {...f.bind('password')} /></Field>
        <Field label="Confirm new password" error={f.errors.password_confirmation}><Input type="password" autoComplete="new-password" {...f.bind('password_confirmation')} /></Field>
      </div>
      <div className="form-actions"><Button variant="primary" type="submit" loading={f.saving}>Update password</Button></div>
    </form>
  );
}

function Appearance() {
  const { settings, updatePreferences } = useAuth();
  const { toast } = useUI();
  const set = async (values) => { try { await updatePreferences(values); } catch (e) { toast(e.message, 'error'); } };
  return (
    <section className="card">
      <div className="card-head"><h3>Theme</h3></div>
      <div className="theme-cards">
        {['dark', 'light', 'system'].map((t) => (
          <button key={t} type="button" className={`theme-card${settings.theme === t ? ' active' : ''}`} onClick={() => set({ theme: t })} aria-pressed={settings.theme === t}>
            <span className={`theme-preview ${t}`}><b /><b /></span>
            <span style={{ textTransform: 'capitalize' }}>{t}</span>
          </button>
        ))}
      </div>
      <div className="setting-row" style={{ marginTop: 10 }}>
        <div><h4>Compact sidebar</h4><p>Show only icons in the desktop sidebar.</p></div>
        <Switch checked={settings.sidebar_collapsed} onChange={(v) => set({ sidebar_collapsed: v })} />
      </div>
    </section>
  );
}

function Notifications({ system }) {
  const { settings, updatePreferences } = useAuth();
  const { toast } = useUI();
  const set = async (values) => { try { await updatePreferences(values); toast('Preferences saved'); } catch (e) { toast(e.message, 'error'); } };
  const rows = [
    ['notify_domains', 'Domain & SSL expiry', 'Alert when domains or certificates are about to expire.'],
    ['notify_tasks', 'Tasks & deadlines', 'Due-today, overdue tasks and project deadlines within 3 days.'],
    ['notify_monitoring', 'Monitoring incidents', 'When a monitored site goes down or recovers.'],
    ['notify_credentials', 'API key expiry', 'When a vault credential expires within 14 days.'],
    ['notify_email', 'Email critical alerts', system.mail_configured ? 'Send downtime and urgent expiry alerts by email.' : 'Set MAIL_FROM in .env to enable email delivery.'],
  ];
  return (
    <section className="card">
      <div className="card-head"><h3>Notifications</h3></div>
      {rows.map(([key, title, text]) => (
        <div className="setting-row" key={key}>
          <div><h4>{title}</h4><p>{text}</p></div>
          <Switch checked={settings[key]} onChange={(v) => set({ [key]: v })} />
        </div>
      ))}
      <div className="setting-row">
        <div><h4>Domain alert window</h4><p>Days before expiry to start warning.</p></div>
        <Select value={String(settings.domain_alert_days)} onChange={(e) => set({ domain_alert_days: Number(e.target.value) })} options={[7, 14, 30, 45, 60, 90].map((d) => ({ value: String(d), label: `${d} days` }))} className="w-auto" />
      </div>
    </section>
  );
}

function Currency() {
  const { settings, updatePreferences } = useAuth();
  const { toast } = useUI();
  const f = useForm({ currency: settings.currency, rate_usd: String(settings.rate_usd), rate_eur: String(settings.rate_eur) });
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    ['rate_usd', 'rate_eur'].forEach((k) => { if (!(Number(f.values[k]) > 0)) errs[k] = 'Enter a positive number.'; });
    if (Object.keys(errs).length) { f.setErrors(errs); return; }
    f.setSaving(true);
    try { await updatePreferences({ currency: f.values.currency, rate_usd: Number(f.values.rate_usd), rate_eur: Number(f.values.rate_eur) }); toast('Currency settings saved'); } catch (err) { f.setErrors(err.fields || {}); toast(err.message, 'error'); } finally { f.setSaving(false); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head"><h3>Currency</h3></div>
      <div className="form-grid">
        <Field label="Reporting currency" span={2} hint="Totals and charts are converted to this currency."><Select options={CURRENCIES} {...f.bind('currency')} /></Field>
        <Field label="1 USD in UZS" error={f.errors.rate_usd}><Input type="number" step="any" min="1" {...f.bind('rate_usd')} /></Field>
        <Field label="1 EUR in UZS" error={f.errors.rate_eur}><Input type="number" step="any" min="1" {...f.bind('rate_eur')} /></Field>
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>Exchange rates are entered manually so your reports never depend on an external service.</p>
      <div className="form-actions"><Button variant="primary" type="submit" loading={f.saving}>Save</Button></div>
    </form>
  );
}

function DataBackup({ system }) {
  const { toast, confirm } = useUI();
  const backups = useApi('/backups', undefined, { enabled: system.is_admin });
  const [creating, setCreating] = useState(false);
  const create = async () => {
    setCreating(true);
    try { await post('/backups'); toast('Backup created'); backups.reload({ silent: true }); } catch (e) { toast(e.message, 'error'); } finally { setCreating(false); }
  };
  const remove = async (b) => {
    if (!(await confirm({ title: 'Delete backup?', message: b.name, danger: true, confirmLabel: 'Delete' }))) return;
    try { await del(`/backups/${b.name}`); toast('Backup deleted'); backups.reload({ silent: true }); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <>
      <section className="card">
        <div className="card-head"><h3>Export your data</h3></div>
        <p className="muted small" style={{ marginBottom: 14 }}>Download everything (projects, tasks, domains, servers, monitors, expenses, snippets, activity) as JSON. API secrets are never included.</p>
        <div className="row-wrap">
          <a className="btn btn-secondary btn-md" href={downloadUrl('/settings/export')} download><Download size={17} /><span>Export JSON</span></a>
          <a className="btn btn-secondary btn-md" href={downloadUrl('/expenses/export')} download><Download size={17} /><span>Expenses CSV</span></a>
        </div>
      </section>
      {system.is_admin && (
        <section className="card">
          <div className="card-head"><h3><HardDriveDownload size={16} />Database backups</h3><Button size="sm" variant="primary" icon={Plus} loading={creating} onClick={create}>Create backup</Button></div>
          <p className="muted small" style={{ marginBottom: 10 }}>Full gzip SQL dumps stored in <code className="mono">storage/backups</code> (not web-accessible). The 20 most recent are kept. Set <code className="mono">BACKUP_DAILY=true</code> for nightly backups via cron.</p>
          {backups.error ? <ErrorState error={backups.error} /> : !backups.data ? <Spinner /> : backups.data.length === 0 ? <p className="muted small">No backups yet.</p> : (
            <div className="related-list">
              {backups.data.map((b) => (
                <div key={b.name} className="related-item">
                  <span className="grow truncate mono small">{b.name}</span>
                  <span className="muted small nowrap">{formatBytes(b.size)}</span>
                  <span className="muted small nowrap">{timeAgo(b.created_at)}</span>
                  <a className="icon-btn sm" href={downloadUrl(`/backups/${b.name}`)} download aria-label="Download backup"><Download size={14} /></a>
                  <button type="button" className="icon-btn sm" onClick={() => remove(b)} aria-label="Delete backup"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <section className="card">
        <div className="card-head"><h3>System</h3></div>
        <dl className="sys-grid">
          <div><dt>DEVSPACE</dt><dd>v{system.version}</dd></div>
          <div><dt>PHP / MySQL</dt><dd>{system.php} / {system.mysql}</dd></div>
          <div><dt>Timezone</dt><dd>{system.timezone}</dd></div>
          <div><dt>Monitoring cron</dt><dd className={system.cron_monitor_last_run ? '' : 'c-orange'}>{system.cron_monitor_last_run ? `Last run ${formatDateTime(system.cron_monitor_last_run)}` : 'Not configured'}</dd></div>
          <div><dt>Maintenance cron</dt><dd className={system.cron_daily_last_run ? '' : 'c-orange'}>{system.cron_daily_last_run ? `Last run ${formatDateTime(system.cron_daily_last_run)}` : 'Not configured'}</dd></div>
        </dl>
      </section>
    </>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('profile');
  const { data, error, loading, reload } = useApi('/settings');
  const { user } = useAuth();
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <Spinner />;
  const profile = { ...data.profile, ...user };

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account, preferences, notifications and data." />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16} />{label}</button>
          ))}
        </nav>
        <div className="settings-section">
          {tab === 'profile' && <Profile profile={profile} />}
          {tab === 'security' && <Password />}
          {tab === 'appearance' && <Appearance />}
          {tab === 'notifications' && <Notifications system={data.system} />}
          {tab === 'currency' && <Currency />}
          {tab === 'data' && <DataBackup system={data.system} />}
        </div>
      </div>
    </>
  );
}
