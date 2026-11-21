import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, Globe, KeyRound, ListChecks, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Fields';
import Logo from '../components/layout/Logo';
import { DEMO } from '../api/client';
import { t, tr } from '../i18n';
import { lang, setLang } from '../i18n';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(DEMO ? 'demo@devspace.app' : '');
  const [password, setPassword] = useState(DEMO ? 'demo12345' : '');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError(t('Enter your email and password.')); return; }
    setLoading(true); setError('');
    try {
      await login(email.trim(), password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-side">
        <div className="auth-grid-bg" />
        <Logo />
        <div>
          <h2>{t('Your projects, servers and code —')} <span>{t('one command center.')}</span></h2>
          <p>{t('Track deadlines, watch uptime, keep API keys encrypted and see where your time and money go.')}</p>
        </div>
        <div className="auth-features">
          <div className="auth-feature"><ListChecks size={16} />{t('Kanban tasks & deadlines')}</div>
          <div className="auth-feature"><Activity size={16} />{t('Real HTTP uptime checks')}</div>
          <div className="auth-feature"><Globe size={16} />{t('Domain & SSL expiry alerts')}</div>
          <div className="auth-feature"><KeyRound size={16} />{t('Encrypted API vault')}</div>
        </div>
      </section>
      <main className="auth-main">
        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="auth-top"><div className="auth-mobile-logo"><Logo /></div><button type="button" className="link-btn lang-switch" onClick={() => setLang(lang === 'uz' ? 'en' : 'uz')}>{lang === 'uz' ? 'English' : "O'zbekcha"}</button></div>
          <h1>{t('Sign in')}</h1>
          <p>{t('Welcome back. Enter your credentials to continue.')}</p>
          {DEMO && <div className="demo-hint">{t('Demo account is pre-filled:')} <strong>demo@devspace.app</strong> / <strong>demo12345</strong></div>}
          {error && <div className="form-alert" role="alert">{error}</div>}
          <Field label={t('Email')} htmlFor="email">
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('you@example.com')} autoFocus />
          </Field>
          <Field label={t('Password')} htmlFor="password">
            <div className="pw-wrap">
              <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" />
              <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? t('Hide password') : t('Show password')}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </Field>
          <Button variant="primary" size="lg" type="submit" loading={loading} icon={LogIn}>{t('Sign in')}</Button>
        </form>
      </main>
    </div>
  );
}
