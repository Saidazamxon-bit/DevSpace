import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, onUnauthorized, post, put, setCsrf } from '../api/client';
import { syncServerTime } from '../lib/format';

const AuthContext = createContext(null);

function applyTheme(theme) {
  const dark = theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme !== 'light';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#090909' : '#f4f4f1');
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, settings: null, ready: false });

  const refresh = useCallback(async () => {
    try {
      const res = await get('/auth/session');
      setCsrf(res.csrf);
      syncServerTime(res.server_time);
      setState({ user: res.user, settings: res.settings, ready: true });
    } catch {
      setState({ user: null, settings: null, ready: true });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => onUnauthorized(() => setState((s) => ({ ...s, user: null }))), []);

  useEffect(() => {
    const theme = state.settings?.theme || 'dark';
    applyTheme(theme);
    if (theme !== 'system') return undefined;
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => applyTheme('system');
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }, [state.settings?.theme]);

  const login = useCallback(async (email, password) => {
    const res = await post('/auth/login', { email, password });
    syncServerTime(res.server_time);
    setState({ user: res.user, settings: res.settings, ready: true });
  }, []);

  const logout = useCallback(async () => {
    try { await post('/auth/logout'); } finally { setState({ user: null, settings: null, ready: true }); }
  }, []);

  const updatePreferences = useCallback(async (values) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...values } })); // optimistic
    const res = await put('/settings/preferences', values);
    setState((s) => ({ ...s, settings: res.data }));
    return res.data;
  }, []);

  const setUser = useCallback((user) => setState((s) => ({ ...s, user })), []);

  const value = useMemo(() => ({ ...state, login, logout, refresh, updatePreferences, setUser }), [state, login, logout, refresh, updatePreferences, setUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
