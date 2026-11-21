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
import { t, tr } from '../i18n';
import { LANGS, lang, setLang } from '../i18n';

const TABS = [
  { id: 'profile', label: t('Profile'), icon: User },
  { id: 'security', label: t('Password'), icon: Lock },
  { id: 'appearance', label: t('Theme'), icon: Palette },
  { id: 'notifications', label: t('Notifications'), icon: Bell },
  { id: 'currency', label: t('Currency'), icon: Wallet },
  { id: 'data', label: t('Data & backup'), icon: Database },
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
      <div className="card-head"><h3>{t('Profile')}</h3></div>
      <div className="form-grid">
        <Field label={t('Full name')} error={f.errors.name} required><Input {...f.bind('name')} required /></Field>
        <Field label={t('Job title')} error={f.errors.title}><Input {...f.bind('title')} placeholder={t('Full-stack developer')} /></Field>
        <Field label={t('Email')} error={f.errors.email} span={2} required><Input type="email" {...f.bind('email')} required /></Field>
      </div>
      <div className="form-actions"><Button variant="primary" type="submit" loading={f.saving}>{t('Save profile')}</Button></div>
    </form>
  );
}

function Password() {
  const { toast } = useUI();
  const f = useForm({ current_password: '', password: '', password_confirmation: '' });
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.values.password.length < 10) errs.password = t('At least 10 characters.');
    else if (!/[A-Za-z]/.test(f.values.password) || !/\d/.test(f.values.password)) errs.password = t('Use letters and numbers.');
    if (f.values.password !== f.values.password_confirmation) errs.password_confirmation = t('Passwords do not match.');
    if (Object.keys(errs).length) { f.setErrors(errs); return; }
    f.setSaving(true);
    try { const r = await put('/settings/password', f.values); if (r.csrf) setCsrf(r.csrf); toast(t('Password changed')); f.setValues({ current_password: '', password: '', password_confirmation: '' }); } catch (err) { f.setErrors(err.fields || {}); toast(err.message, 'error'); } finally { f.setSaving(false); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head"><h3>{t('Change password')}</h3></div>
      <div className="form-grid">
        <Field label={t('Current password')} error={f.errors.current_password} span={2}><Input type="password" autoComplete="current-password" {...f.bind('current_password')} /></Field>
        <Field label={t('New password')} error={f.errors.password} hint={t('Minimum 10 characters, letters and numbers')}><Input type="password" autoComplete="new-password" {...f.bind('password')} /></Field>
        <Field label={t('Confirm new password')} error={f.errors.password_confirmation}><Input type="password" autoComplete="new-password" {...f.bind('password_confirmation')} /></Field>
      </div>
      <div className="form-actions"><Button variant="primary" type="submit" loading={f.saving}>{t('Update password')}</Button></div>
    </form>
  );
}

function Appearance() {
  const { settings, updatePreferences } = useAuth();
  const { toast } = useUI();
  const set = async (values) => { try { await updatePreferences(values); } catch (e) { toast(e.message, 'error'); } };
  return (
    <section className="card">
      <div className="card-head"><h3>{t('Theme')}</h3></div>
      <div className="theme-cards">
        {['dark', 'light', 'system'].map((tk) => (
          <button key={tk} type="button" className={`theme-card${settings.theme === tk ? ' active' : ''}`} onClick={() => set({ theme: tk })} aria-pressed={settings.theme === tk}>
            <span className={`theme-preview ${tk}`}><b /><b /></span>
            <span>{t({ dark: 'Dark', light: 'Light', system: 'System' }[tk])}</span>
          </button>
        ))}
      </div>
      <div className="setting-row" style={{ marginTop: 10 }}>
        <div><h4>{t('Language')}</h4><p>{t('Interface language.')}</p></div>
        <Select value={lang} onChange={(e) => setLang(e.target.value)} options={LANGS} className="w-auto" aria-label={t('Language')} />
      </div>
      <div className="setting-row">
        <div><h4>{t('Compact sidebar')}</h4><p>{t('Show only icons in the desktop sidebar.')}</p></div>
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
    ['notify_domains', t('Domain & SSL expiry'), t('Alert when domains or certificates are about to expire.')],
    ['notify_tasks', t('Tasks & deadlines'), t('Due-today, overdue tasks and project deadlines within 3 days.')],
    ['notify_monitoring', t('Monitoring incidents'), t('When a monitored site goes down or recovers.')],
    ['notify_credentials', t('API key expiry'), t('When a vault credential expires within 14 days.')],
    ['notify_email', t('Email critical alerts'), system.mail_configured ? t('Send downtime and urgent expiry alerts by email.') : t('Set MAIL_FROM in .env to enable email delivery.')],
  ];
  return (
    <section className="card">
      <div className="card-head"><h3>{t('Notifications')}</h3></div>
      {rows.map(([key, title, text]) => (
        <div className="setting-row" key={key}>
          <div><h4>{title}</h4><p>{text}</p></div>
          <Switch checked={settings[key]} onChange={(v) => set({ [key]: v })} />
        </div>
      ))}
      <div className="setting-row">
        <div><h4>{t('Domain alert window')}</h4><p>{t('Days before expiry to start warning.')}</p></div>
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
    ['rate_usd', 'rate_eur'].forEach((k) => { if (!(Number(f.values[k]) > 0)) errs[k] = t('Enter a positive number.'); });
    if (Object.keys(errs).length) { f.setErrors(errs); return; }
    f.setSaving(true);
    try { await updatePreferences({ currency: f.values.currency, rate_usd: Number(f.values.rate_usd), rate_eur: Number(f.values.rate_eur) }); toast('Currency settings saved'); } catch (err) { f.setErrors(err.fields || {}); toast(err.message, 'error'); } finally { f.setSaving(false); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head"><h3>{t('Currency')}</h3></div>
      <div className="form-grid">
        <Field label={t('Reporting currency')} span={2} hint={t('Totals and charts are converted to this currency.')}><Select options={CURRENCIES} {...f.bind('currency')} /></Field>
        <Field label={t('1 USD in UZS')} error={f.errors.rate_usd}><Input type="number" step="any" min="1" {...f.bind('rate_usd')} /></Field>
        <Field label={t('1 EUR in UZS')} error={f.errors.rate_eur}><Input type="number" step="any" min="1" {...f.bind('rate_eur')} /></Field>
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>{t('Exchange rates are entered manually so your reports never depend on an external service.')}</p>
      <div className="form-actions"><Button variant="primary" type="submit" loading={f.saving}>{t('Save')}</Button></div>
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
    if (!(await confirm({ title: t('Delete backup?'), message: b.name, danger: true, confirmLabel: t('Delete') }))) return;
    try { await del(`/backups/${b.name}`); toast('Backup deleted'); backups.reload({ silent: true }); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <>
      <section className="card">
        <div className="card-head"><h3>{t('Export your data')}</h3></div>
        <p className="muted small" style={{ marginBottom: 14 }}>{t('Download everything (projects, tasks, domains, servers, monitors, expenses, snippets, activity) as JSON. API secrets are never included.')}</p>
        <div className="row-wrap">
          <a className="btn btn-secondary btn-md" href={downloadUrl('/settings/export')} download><Download size={17} /><span>{t('Export JSON')}</span></a>
          <a className="btn btn-secondary btn-md" href={downloadUrl('/expenses/export')} download><Download size={17} /><span>{t('Expenses CSV')}</span></a>
        </div>
      </section>
      {system.is_admin && (
        <section className="card">
          <div className="card-head"><h3><HardDriveDownload size={16} />{t('Database backups')}</h3><Button size="sm" variant="primary" icon={Plus} loading={creating} onClick={create}>{t('Create backup')}</Button></div>
          <p className="muted small" style={{ marginBottom: 10 }}>{t('Full gzip SQL dumps stored in storage/backups (not web-accessible). The 20 most recent are kept. Set BACKUP_DAILY=true for nightly backups via cron.')}</p>
          {backups.error ? <ErrorState error={backups.error} /> : !backups.data ? <Spinner /> : backups.data.length === 0 ? <p className="muted small">{t('No backups yet.')}</p> : (
            <div className="related-list">
              {backups.data.map((b) => (
                <div key={b.name} className="related-item">
                  <span className="grow truncate mono small">{b.name}</span>
                  <span className="muted small nowrap">{formatBytes(b.size)}</span>
                  <span className="muted small nowrap">{timeAgo(b.created_at)}</span>
                  <a className="icon-btn sm" href={downloadUrl(`/backups/${b.name}`)} download aria-label={t('Download backup')}><Download size={14} /></a>
                  <button type="button" className="icon-btn sm" onClick={() => remove(b)} aria-label={t('Delete backup')}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <section className="card">
        <div className="card-head"><h3>{t('System')}</h3></div>
        <dl className="sys-grid">
          <div><dt>DEVSPACE</dt><dd>v{system.version}</dd></div>
          <div><dt>{t('PHP / MySQL')}</dt><dd>{system.php} / {system.mysql}</dd></div>
          <div><dt>{t('Timezone')}</dt><dd>{system.timezone}</dd></div>
          <div><dt>{t('Monitoring cron')}</dt><dd className={system.cron_monitor_last_run ? '' : 'c-orange'}>{system.cron_monitor_last_run ? t('Last run {when}', { when: formatDateTime(system.cron_monitor_last_run) }) : t('Not configured')}</dd></div>
          <div><dt>{t('Maintenance cron')}</dt><dd className={system.cron_daily_last_run ? '' : 'c-orange'}>{system.cron_daily_last_run ? t('Last run {when}', { when: formatDateTime(system.cron_daily_last_run) }) : t('Not configured')}</dd></div>
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
      <PageHeader title={t('Settings')} subtitle={t('Your account, preferences, notifications and data.')} />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label={t('Settings sections')}>
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
