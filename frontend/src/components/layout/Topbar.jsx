import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Code2, FolderKanban, Globe, KeyRound, ListChecks, Menu as MenuIcon, Plus, Search, Server, Activity, Wallet, X, Trash2,
} from 'lucide-react';
import { get, post, del } from '../../api/client';
import { useDebounce } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { humanize, initials, timeAgo } from '../../lib/format';
import { LogoMark } from './Logo';

const TYPE_ICONS = { project: FolderKanban, task: ListChecks, domain: Globe, server: Server, monitor: Activity, credential: KeyRound, snippet: Code2, expense: Wallet };

const QUICK = [
  { label: 'New task', icon: ListChecks, to: '/tasks?new=1' },
  { label: 'New project', icon: FolderKanban, to: '/projects?new=1' },
  { label: 'New domain', icon: Globe, to: '/domains?new=1' },
  { label: 'New monitor', icon: Activity, to: '/monitoring?new=1' },
  { label: 'New expense', icon: Wallet, to: '/expenses?new=1' },
  { label: 'New snippet', icon: Code2, to: '/snippets?new=1' },
];

function useOutside(ref, open, close) {
  useEffect(() => {
    if (!open) return undefined;
    const fn = (e) => { if (!ref.current?.contains(e.target)) close(); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', fn);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('keydown', esc); };
  }, [ref, open, close]);
}

function GlobalSearch({ mobileOpen, onCloseMobile }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebounce(q, 250);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  useOutside(ref, open, () => setOpen(false));

  useEffect(() => {
    if (debounced.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    get('/search', { q: debounced }).then((r) => { if (!cancelled) { setResults(r.data); setActive(0); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (mobileOpen) setTimeout(() => inputRef.current?.focus(), 50); }, [mobileOpen]);

  const go = (r) => { navigate(r.link); setQ(''); setOpen(false); onCloseMobile?.(); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === 'Enter' && results[active]) go(results[active]);
  };

  return (
    <div className={`global-search${mobileOpen ? ' mobile-open' : ''}`} ref={ref}>
      <Search size={17} className="gs-icon" />
      <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
        placeholder="Search projects, tasks, domains, snippets…" aria-label="Search everything" />
      <kbd className="gs-kbd">⌘K</kbd>
      {mobileOpen && <button type="button" className="icon-btn gs-close" onClick={onCloseMobile} aria-label="Close search"><X size={18} /></button>}
      {open && q.trim().length >= 2 && (
        <div className="popover search-pop">
          {results.length === 0 ? <p className="popover-empty">No results for “{q}”</p> : results.map((r, i) => {
            const Icon = TYPE_ICONS[r.type] || Search;
            return (
              <button key={`${r.type}-${r.id}`} type="button" className={`search-item${i === active ? ' active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => go(r)}>
                <span className="search-item-icon"><Icon size={15} /></span>
                <span className="search-item-text"><strong>{r.title}</strong><small>{humanize(r.type)}{r.meta ? ` · ${r.meta}` : ''}</small></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();
  useOutside(ref, open, () => setOpen(false));

  const load = () => get('/notifications').then((r) => { setItems(r.data); setUnread(r.unread); }).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const openItem = async (n) => {
    if (!n.read_at) { post(`/notifications/${n.id}/read`).catch(() => {}); setUnread((u) => Math.max(0, u - 1)); setItems((s) => s.map((x) => (x.id === n.id ? { ...x, read_at: 'now' } : x))); }
    if (n.link) { navigate(n.link); setOpen(false); }
  };
  const readAll = async () => { await post('/notifications/read-all'); setUnread(0); setItems((s) => s.map((x) => ({ ...x, read_at: x.read_at || 'now' }))); };
  const remove = async (n) => { await del(`/notifications/${n.id}`); setItems((s) => s.filter((x) => x.id !== n.id)); if (!n.read_at) setUnread((u) => Math.max(0, u - 1)); };

  return (
    <div className="notif" ref={ref}>
      <button type="button" className="round-btn" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} aria-expanded={open}>
        <Bell size={18} />
        {unread > 0 && <span className="round-btn-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="popover notif-pop">
          <div className="popover-head">
            <strong>Notifications</strong>
            {unread > 0 && <button type="button" className="link-btn" onClick={readAll}><CheckCheck size={14} /> Mark all read</button>}
          </div>
          <div className="notif-list">
            {items.length === 0 && <p className="popover-empty">You’re all caught up.</p>}
            {items.map((n) => (
              <div key={n.id} className={`notif-item level-${n.level}${n.read_at ? '' : ' unread'}`}>
                <button type="button" className="notif-main" onClick={() => openItem(n)}>
                  <i className="notif-dot" />
                  <span><strong>{n.title}</strong>{n.body && <small>{n.body}</small>}<em>{timeAgo(n.created_at)}</em></span>
                </button>
                <button type="button" className="icon-btn sm" onClick={() => remove(n)} aria-label="Delete notification"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAdd() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, open, () => setOpen(false));
  return (
    <div className="quick-add" ref={ref}>
      <button type="button" className="btn btn-primary btn-md quick-add-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Plus size={17} /><span>Quick add</span>
      </button>
      {open && (
        <div className="popover menu-pop quick-pop">
          {QUICK.map(({ label, icon: Icon, to }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}><Icon size={15} />{label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  const [mobileSearch, setMobileSearch] = useState(false);
  return (
    <header className="topbar">
      <button type="button" className="round-btn menu-btn" onClick={onMenu} aria-label="Open menu"><MenuIcon size={19} /></button>
      <Link to="/" className="topbar-logo" aria-label="DEVSPACE home"><LogoMark size={28} /><strong>DEVSPACE</strong></Link>
      <GlobalSearch mobileOpen={mobileSearch} onCloseMobile={() => setMobileSearch(false)} />
      <div className="topbar-right">
        <button type="button" className="round-btn search-btn" onClick={() => setMobileSearch(true)} aria-label="Search"><Search size={18} /></button>
        <Notifications />
        <QuickAdd />
        <Link to="/settings" className="avatar avatar-lg" title={user?.name}>{initials(user?.name)}</Link>
      </div>
    </header>
  );
}
