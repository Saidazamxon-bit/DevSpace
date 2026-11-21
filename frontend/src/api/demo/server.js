// In-browser stand-in for the PHP API, used only by the static demo build (VITE_DEMO=true).
// Data lives in localStorage so changes survive reloads; "Reset demo" restores the sample data.
import { at, day, iso, isoDT, seed } from './seed';
import { lang } from '../../i18n';

const KEY = 'devspace-demo-v1';
let db;
function load() {
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db || db.version !== 2 || db.lang !== lang) db = seed();
}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* private mode */ } };
export function resetDemo() { db = seed(); db.loggedIn = true; persist(); }
load();

class DemoError extends Error {
  constructor(status, message, fields = {}) { super(message); this.status = status; this.fields = fields; }
}
const notFound = (what = 'Resource') => new DemoError(404, `${what} not found.`);
const needsBackend = (what) => new DemoError(422, `${what} needs the PHP backend — this is a static demo.`);

const nowDT = () => isoDT(new Date());
const today = () => iso(new Date());
const daysLeft = (d) => (d ? Math.round((new Date(`${d}T00:00:00`) - new Date(`${today()}T00:00:00`)) / 86400000) : null);
const nextId = (rows) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const like = (q, ...vals) => vals.some((v) => v && String(v).toLowerCase().includes(q));
const PRIO = { critical: 0, high: 1, medium: 2, low: 3 };

function log(action, entity_type, entity_id, description) {
  db.activity.push({ id: nextId(db.activity), action, entity_type, entity_id, description, ip_address: null, created_at: nowDT() });
}

function required(body, fields) {
  const errors = {};
  fields.forEach((f) => { if (body[f] === undefined || body[f] === null || String(body[f]).trim() === '') errors[f] = `${f.replace(/_id$/, '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())} is required.`; });
  if (Object.keys(errors).length) throw new DemoError(422, 'Please correct the highlighted fields.', errors);
}

const projectName = (id) => db.projects.find((p) => p.id === Number(id));

/* ---------- transforms (mirror the PHP models) ---------- */

const tProject = (p) => {
  const tasks = db.tasks.filter((t) => t.project_id === p.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  return { ...p, tasks_total: tasks.length, tasks_done: done, progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0, archived: !!p.archived_at };
};
const tTask = (t) => { const p = projectName(t.project_id); return { ...t, project_name: p?.name ?? null, project_color: p?.color ?? null, overdue: t.status !== 'done' && !!t.due_date && t.due_date < today() }; };
const tDomain = (d) => {
  const dl = daysLeft(d.expires_at);
  return { ...d, project_name: projectName(d.project_id)?.name ?? null, days_left: dl, ssl_days_left: daysLeft(d.ssl_expires_at), state: dl === null ? 'unknown' : dl < 0 ? 'expired' : dl <= 30 ? 'expiring' : 'active' };
};
const tServer = (s) => {
  const projects = db.projects.filter((p) => s.project_ids.includes(p.id)).map((p) => ({ id: p.id, name: p.name, color: p.color }));
  return { ...s, projects, project_ids: projects.map((p) => p.id), websites_count: db.websites.filter((w) => w.server_id === s.id).length };
};

// Deterministic pseudo-random series per site so charts look plausible in the demo.
const rand = (seedN) => { const x = Math.sin(seedN * 9301 + 49297) * 233280; return x - Math.floor(x); };
function checksFor(w, hours, stepMin) {
  const out = [];
  const end = Date.now();
  for (let t = end - hours * 3600000; t <= end; t += stepMin * 60000) {
    const k = Math.floor(t / 60000) + w.id * 1000;
    const inIncident = db.incidents.some((i) => i.website_id === w.id && new Date(i.started_at.replace(' ', 'T')).getTime() <= t && (!i.resolved_at || new Date(i.resolved_at.replace(' ', 'T')).getTime() >= t));
    out.push({ t, up: !inIncident, ms: inIncident ? null : Math.round(w.base_ms * (0.7 + rand(k) * 0.6)) });
  }
  return out;
}
const uptime = (checks) => (checks.length ? Math.round((checks.filter((c) => c.up).length / checks.length) * 10000) / 100 : null);
const tWebsite = (w) => {
  const day1 = checksFor(w, 24, 5);
  const ups = day1.filter((c) => c.ms !== null);
  return {
    ...w, project_name: projectName(w.project_id)?.name ?? null, server_name: db.servers.find((s) => s.id === w.server_id)?.name ?? null,
    uptime_24h: uptime(day1), uptime_30d: uptime(checksFor(w, 720, 60)),
    avg_response_24h: ups.length ? Math.round(ups.reduce((a, c) => a + c.ms, 0) / ups.length) : null,
    open_incidents: db.incidents.filter((i) => i.website_id === w.id && !i.resolved_at).length,
  };
};
const tCred = (c) => {
  const { secret, ...rest } = c;
  return { ...rest, masked: `••••••••••••${secret.length >= 12 ? secret.slice(-4) : ''}`, project_name: projectName(c.project_id)?.name ?? null, days_left: daysLeft(c.expires_at) };
};
const tExpense = (e) => { const c = db.categories.find((x) => x.id === e.category_id); return { ...e, category_name: c?.name ?? null, category_color: c?.color ?? null, project_name: projectName(e.project_id)?.name ?? null }; };
const tSnippet = (s) => ({ ...s, lines: s.code.split('\n').length });
const tIncident = (i) => {
  const w = db.websites.find((x) => x.id === i.website_id);
  const end = i.resolved_at ? new Date(i.resolved_at.replace(' ', 'T')) : new Date();
  return { ...i, website_name: w?.name, url: w?.url, open: !i.resolved_at, duration_seconds: Math.max(0, Math.round((end - new Date(i.started_at.replace(' ', 'T'))) / 1000)) };
};

/* ---------- currency ---------- */

const rates = () => ({ UZS: 1, USD: Number(db.settings.rate_usd) || 1, EUR: Number(db.settings.rate_eur) || 1 });
const convert = (amount, from, to = db.settings.currency) => { const r = rates(); return (amount * r[from]) / r[to]; };

/* ---------- generic resource helpers ---------- */

function crud(collection, { entity, label = 'name', transform, prepare = (b) => b, requiredFields }) {
  const rows = () => db[collection];
  const find = (id) => rows().find((r) => r.id === Number(id)) || (() => { throw notFound(entity.replace(/^\w/, (c) => c.toUpperCase())); })();
  return {
    find,
    show: (id) => ({ data: transform(find(id)) }),
    store(body) {
      required(body, requiredFields);
      const row = { id: nextId(rows()), created_at: nowDT(), updated_at: nowDT(), ...prepare(body, null) };
      rows().push(row);
      log('created', entity, row.id, `Created ${entity} “${row[label]}”`);
      return { data: transform(row) };
    },
    update(id, body, partial) {
      const row = find(id);
      if (!partial) required(body, requiredFields);
      Object.assign(row, prepare(body, row), { updated_at: nowDT() });
      log('updated', entity, row.id, `Updated ${entity} “${row[label]}”`);
      return { data: transform(row) };
    },
    destroy(id) {
      const row = find(id);
      db[collection] = rows().filter((r) => r !== row);
      log('deleted', entity, row.id, `Deleted ${entity} “${row[label]}”`);
      return { ok: true };
    },
  };
}

const intOrNull = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

const R = {
  projects: crud('projects', { entity: 'project', transform: tProject, requiredFields: ['name', 'status', 'priority'], prepare: (b) => ({ ...b }) }),
  tasks: crud('tasks', {
    entity: 'task', label: 'title', transform: tTask, requiredFields: ['title', 'status', 'priority'],
    prepare: (b, old) => {
      const out = { ...b };
      if ('project_id' in b) out.project_id = intOrNull(b.project_id);
      if (b.status) out.completed_at = b.status === 'done' ? (old?.status === 'done' ? old.completed_at : nowDT()) : null;
      if (!old) out.position = nextId(db.tasks);
      return out;
    },
  }),
  domains: crud('domains', {
    entity: 'domain', transform: tDomain, requiredFields: ['name', 'currency'],
    prepare: (b) => {
      const out = { ...b };
      if (b.name) {
        out.name = String(b.name).toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(out.name)) throw new DemoError(422, 'Please correct the highlighted fields.', { name: 'Must be a valid domain name (e.g. example.com).' });
      }
      if ('project_id' in b) out.project_id = intOrNull(b.project_id);
      if ('renewal_price' in b) out.renewal_price = num(b.renewal_price);
      out.auto_renew = !!b.auto_renew;
      return out;
    },
  }),
  servers: crud('servers', {
    entity: 'server', transform: tServer, requiredFields: ['name', 'status', 'currency'],
    prepare: (b, old) => ({ ...b, project_ids: (b.project_ids ?? old?.project_ids ?? []).map(Number), monthly_cost: 'monthly_cost' in b ? num(b.monthly_cost) : old?.monthly_cost ?? null }),
  }),
  monitoring: crud('websites', {
    entity: 'monitor', transform: tWebsite, requiredFields: ['name', 'url'],
    prepare: (b, old) => {
      const out = { ...b };
      ['project_id', 'server_id', 'expected_status'].forEach((k) => { if (k in b) out[k] = intOrNull(b[k]); });
      if ('check_interval' in b) out.check_interval = Number(b.check_interval);
      if ('is_active' in b) out.is_active = !!b.is_active;
      if (!old) Object.assign(out, { last_state: 'unknown', base_ms: 250, last_status_code: null, last_response_ms: null, last_error: null, last_checked_at: null, method: b.method || 'GET', timeout_seconds: Number(b.timeout_seconds) || 10 });
      return out;
    },
  }),
  credentials: crud('credentials', {
    entity: 'credential', transform: tCred, requiredFields: ['provider', 'name'],
    prepare: (b, old) => {
      if (!old && !b.secret) throw new DemoError(422, 'Please correct the highlighted fields.', { secret: 'Secret is required.' });
      const out = { ...b };
      if (!b.secret) delete out.secret;
      if ('project_id' in b) out.project_id = intOrNull(b.project_id);
      if (!old) out.last_revealed_at = null;
      return out;
    },
  }),
  expenses: crud('expenses', {
    entity: 'expense', label: 'title', transform: tExpense, requiredFields: ['title', 'amount', 'currency', 'spent_at'],
    prepare: (b) => {
      const out = { ...b, amount: Number(b.amount ?? 0) };
      ['project_id', 'category_id'].forEach((k) => { if (k in b) out[k] = intOrNull(b[k]); });
      out.is_recurring = !!b.is_recurring;
      out.recurrence = out.is_recurring ? (b.recurrence || 'monthly') : null;
      if (!(out.amount > 0)) throw new DemoError(422, 'Please correct the highlighted fields.', { amount: 'Amount must be at least 0.01.' });
      return out;
    },
  }),
  'expense-categories': crud('categories', { entity: 'expense category', transform: (c) => ({ ...c, expenses_count: db.expenses.filter((e) => e.category_id === c.id).length }), requiredFields: ['name'] }),
  snippets: crud('snippets', { entity: 'snippet', label: 'title', transform: tSnippet, requiredFields: ['title', 'language', 'code'], prepare: (b) => ({ ...b, is_favorite: !!b.is_favorite }) }),
};

/* ---------- lists with filters ---------- */

function sortBy(rows, fn) { return [...rows].sort(fn); }

const lists = {
  projects(q) {
    let rows = db.projects.filter((p) => (q.archived === '1' ? p.archived_at : !p.archived_at));
    if (q.status) rows = rows.filter((p) => p.status === q.status);
    if (q.priority) rows = rows.filter((p) => p.priority === q.priority);
    if (q.q) rows = rows.filter((p) => like(q.q.toLowerCase(), p.name, p.description, p.technologies));
    const s = { deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'), name: (a, b) => a.name.localeCompare(b.name), priority: (a, b) => PRIO[a.priority] - PRIO[b.priority] }[q.sort] || ((a, b) => b.updated_at.localeCompare(a.updated_at));
    return sortBy(rows, s).map(tProject);
  },
  tasks(q) {
    let rows = db.tasks;
    ['status', 'priority', 'category'].forEach((k) => { if (q[k]) rows = rows.filter((t) => t[k] === q[k]); });
    if (q.project_id) rows = rows.filter((t) => t.project_id === Number(q.project_id));
    if (q.q) rows = rows.filter((t) => like(q.q.toLowerCase(), t.title, t.description, t.category));
    const td = today(); const wk = day(7);
    if (q.due === 'overdue') rows = rows.filter((t) => t.status !== 'done' && t.due_date && t.due_date < td);
    if (q.due === 'today') rows = rows.filter((t) => t.due_date === td);
    if (q.due === 'week') rows = rows.filter((t) => t.due_date && t.due_date >= td && t.due_date <= wk);
    if (q.due === 'open') rows = rows.filter((t) => t.status !== 'done');
    const s = q.sort === 'board' ? (a, b) => a.position - b.position || b.id - a.id : (a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999');
    return sortBy(rows, s).map(tTask);
  },
  domains(q) {
    let rows = db.domains.map(tDomain);
    if (q.q) rows = rows.filter((d) => like(q.q.toLowerCase(), d.name, d.registrar, d.dns_provider));
    if (q.state === 'expiring') rows = rows.filter((d) => d.days_left !== null && d.days_left >= 0 && d.days_left <= 30);
    if (q.state === 'expired') rows = rows.filter((d) => d.days_left !== null && d.days_left < 0);
    if (q.project_id) rows = rows.filter((d) => d.project_id === Number(q.project_id));
    const s = q.sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : q.sort === 'created' ? (a, b) => b.id - a.id : (a, b) => (a.expires_at || '9999').localeCompare(b.expires_at || '9999');
    return sortBy(rows, s);
  },
  servers(q) {
    let rows = db.servers;
    if (q.status) rows = rows.filter((s) => s.status === q.status);
    if (q.q) rows = rows.filter((s) => like(q.q.toLowerCase(), s.name, s.provider, s.ip_address, s.location, s.os));
    const order = { offline: 0, maintenance: 1, online: 2 };
    return sortBy(rows, (a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name)).map(tServer);
  },
  monitoring(q) {
    let rows = db.websites;
    if (q.state) rows = rows.filter((w) => w.last_state === q.state);
    if (q.q) rows = rows.filter((w) => like(q.q.toLowerCase(), w.name, w.url));
    if (q.project_id) rows = rows.filter((w) => w.project_id === Number(q.project_id));
    const order = { down: 0, unknown: 1, up: 2 };
    return sortBy(rows, (a, b) => order[a.last_state] - order[b.last_state] || a.name.localeCompare(b.name)).map(tWebsite);
  },
  credentials(q) {
    let rows = db.credentials;
    if (q.project_id) rows = rows.filter((c) => c.project_id === Number(q.project_id));
    if (q.q) rows = rows.filter((c) => like(q.q.toLowerCase(), c.provider, c.name, c.description, c.tags));
    return sortBy(rows, (a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name)).map(tCred);
  },
  expenses(q) {
    let rows = db.expenses;
    if (q.category_id) rows = rows.filter((e) => e.category_id === Number(q.category_id));
    if (q.project_id) rows = rows.filter((e) => e.project_id === Number(q.project_id));
    if (q.currency) rows = rows.filter((e) => e.currency === q.currency);
    if (q.from) rows = rows.filter((e) => e.spent_at >= q.from);
    if (q.to) rows = rows.filter((e) => e.spent_at <= q.to);
    if (q.q) rows = rows.filter((e) => like(q.q.toLowerCase(), e.title, e.vendor, e.notes));
    return sortBy(rows, (a, b) => b.spent_at.localeCompare(a.spent_at) || b.id - a.id).map(tExpense);
  },
  'expense-categories': () => sortBy(db.categories, (a, b) => a.name.localeCompare(b.name)).map((c) => ({ ...c, expenses_count: db.expenses.filter((e) => e.category_id === c.id).length })),
  snippets(q) {
    let rows = db.snippets;
    if (q.language) rows = rows.filter((s) => s.language === q.language);
    if (q.category) rows = rows.filter((s) => s.category === q.category);
    if (q.favorite === '1') rows = rows.filter((s) => s.is_favorite);
    if (q.q) rows = rows.filter((s) => like(q.q.toLowerCase(), s.title, s.description, s.tags, s.category, s.code));
    return sortBy(rows, (a, b) => Number(b.is_favorite) - Number(a.is_favorite) || b.updated_at.localeCompare(a.updated_at)).map(tSnippet);
  },
};

/* ---------- special endpoints ---------- */

function entityLink(type, id) {
  return ({ project: id ? `/projects/${id}` : '/projects', task: '/tasks', domain: '/domains', server: '/servers', monitor: id ? `/monitoring/${id}` : '/monitoring', credential: '/vault', expense: '/expenses', 'expense category': '/expenses', snippet: '/snippets' })[type] || null;
}

function overview() {
  const td = today();
  const active = db.projects.filter((p) => !p.archived_at);
  const open = active.filter((p) => ['active', 'planning'].includes(p.status)).map(tProject);
  const tasksTotal = open.reduce((a, p) => a + p.tasks_total, 0);
  const tasksDone = open.reduce((a, p) => a + p.tasks_done, 0);
  const order = { offline: 0, maintenance: 1, online: 2 };
  const servers = sortBy(db.servers, (a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  const cnt = (arr, f) => arr.filter(f).length;
  const T = db.tasks;
  const weekAgo = day(-6);
  const alertDays = Number(db.settings.domain_alert_days) || 30;
  const domains = sortBy(db.domains.map(tDomain), (a, b) => (a.expires_at || '9999').localeCompare(b.expires_at || '9999'))
    .map((d) => ({ id: d.id, name: d.name, days_left: d.days_left, state: d.days_left === null ? 'unknown' : d.days_left < 0 ? 'expired' : d.days_left <= alertDays ? 'expiring' : 'active' }));
  const sites = db.websites.filter((w) => w.is_active);

  const stats = {
    projects: { total: active.length, active: cnt(active, (p) => p.status === 'active'), completed: cnt(active, (p) => p.status === 'completed'), planning: cnt(active, (p) => p.status === 'planning'), paused: cnt(active, (p) => p.status === 'paused'), tasks_total: tasksTotal, tasks_done: tasksDone, progress: tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0 },
    servers: { total: servers.length, online: cnt(servers, (s) => s.status === 'online'), maintenance: cnt(servers, (s) => s.status === 'maintenance'), offline: cnt(servers, (s) => s.status === 'offline'), items: servers.slice(0, 7).map(({ id, name, status }) => ({ id, name, status })), websites_up: cnt(sites, (w) => w.last_state === 'up'), websites_down: cnt(sites, (w) => w.last_state === 'down'), websites_total: sites.length },
    tasks: { pending: cnt(T, (t) => t.status !== 'done'), done: cnt(T, (t) => t.status === 'done'), total: T.length, overdue: cnt(T, (t) => t.status !== 'done' && t.due_date && t.due_date < td), due_today: cnt(T, (t) => t.status !== 'done' && t.due_date === td), in_progress: cnt(T, (t) => t.status === 'in_progress'), done_week: cnt(T, (t) => t.completed_at && t.completed_at >= weekAgo) },
    domains: { total: domains.length, active: cnt(domains, (d) => d.state === 'active'), expiring: cnt(domains, (d) => d.state === 'expiring'), expired: cnt(domains, (d) => d.state === 'expired'), next: domains[0] || null, items: domains.slice(0, 6) },
  };

  // Timeline
  const titles = { created: (a) => `New ${a.entity_type}`, updated: (a) => `${a.entity_type[0].toUpperCase()}${a.entity_type.slice(1)} updated`, deleted: (a) => `${a.entity_type[0].toUpperCase()}${a.entity_type.slice(1)} removed`, completed: () => 'Task completed', incident: () => 'Incident', recovered: () => 'Recovered', revealed: () => 'Secret revealed', archived: () => 'Project archived', restored: () => 'Project restored' };
  const timeline = [];
  db.activity.filter((a) => a.created_at >= td && a.entity_type !== 'auth').slice(-10).forEach((a) => timeline.push({ kind: a.action === 'incident' ? 'incident' : 'activity', title: (titles[a.action] || (() => a.action))(a), subtitle: a.description, at: a.created_at, all_day: false, link: entityLink(a.entity_type, a.entity_id), level: a.action === 'incident' ? 'critical' : a.action === 'completed' ? 'success' : 'info' }));
  const in14 = day(14);
  T.filter((t) => t.status !== 'done' && t.due_date && t.due_date >= td && t.due_date <= in14).slice(0, 12).forEach((t) => timeline.push({ kind: 'task', title: t.title, subtitle: `${projectName(t.project_id) ? `${projectName(t.project_id).name} · ` : ''}${t.priority[0].toUpperCase()}${t.priority.slice(1)} priority`, at: `${t.due_date} ${t.due_time ? `${t.due_time}:00` : '23:59:00'}`, all_day: !t.due_time, link: '/tasks', level: ['high', 'critical'].includes(t.priority) ? 'warning' : 'info' }));
  active.filter((p) => p.status !== 'completed' && p.deadline && p.deadline >= td && p.deadline <= in14).forEach((p) => timeline.push({ kind: 'deadline', title: `${p.name} deadline`, subtitle: 'Project deadline', at: `${p.deadline} 23:59:00`, all_day: true, link: `/projects/${p.id}`, level: 'warning' }));
  db.domains.forEach((d) => {
    if (d.expires_at && d.expires_at >= td && d.expires_at <= day(30)) timeline.push({ kind: 'domain', title: `${d.name} expires`, subtitle: 'Domain renewal due', at: `${d.expires_at} 23:59:00`, all_day: true, link: '/domains', level: 'warning' });
    if (d.ssl_expires_at && d.ssl_expires_at >= td && d.ssl_expires_at <= in14) timeline.push({ kind: 'domain', title: `SSL · ${d.name}`, subtitle: 'Certificate expires', at: `${d.ssl_expires_at} 23:59:00`, all_day: true, link: '/domains', level: 'warning' });
  });
  timeline.sort((a, b) => a.at.localeCompare(b.at));

  // Weekly
  const days = Array.from({ length: 7 }, (_, i) => day(i - 6)).map((date) => ({
    date,
    tasks_completed: cnt(T, (t) => t.completed_at && t.completed_at.slice(0, 10) === date),
    activity: cnt(db.activity, (a) => a.entity_type !== 'auth' && a.created_at.slice(0, 10) === date),
    active_projects: new Set([
      ...db.activity.filter((a) => a.entity_type === 'project' && a.created_at.slice(0, 10) === date).map((a) => a.entity_id),
      ...T.filter((t) => t.project_id && t.updated_at.slice(0, 10) === date).map((t) => t.project_id),
    ]).size,
  }));
  const prevStart = day(-13);
  const totals = { tasks_completed: days.reduce((a, d) => a + d.tasks_completed, 0), activity: days.reduce((a, d) => a + d.activity, 0), active_projects: new Set([...db.activity.filter((a) => a.entity_type === 'project' && a.created_at >= weekAgo).map((a) => a.entity_id), ...T.filter((t) => t.project_id && t.updated_at >= weekAgo).map((t) => t.project_id)]).size };
  const busiest = days.reduce((b, d) => (d.tasks_completed > 0 && (!b || d.tasks_completed > b.tasks_completed) ? d : b), null);
  const dueWindow = T.filter((t) => t.due_date && t.due_date >= weekAgo && t.due_date <= day(7));
  const weekly = {
    days, totals,
    previous: { tasks_completed: cnt(T, (t) => t.completed_at && t.completed_at >= prevStart && t.completed_at < weekAgo), activity: cnt(db.activity, (a) => a.created_at >= prevStart && a.created_at < weekAgo) },
    due_window: { total: dueWindow.length, done: cnt(dueWindow, (t) => t.status === 'done') },
    busiest_day: busiest?.date ?? null,
    avg_per_day: Math.round((totals.tasks_completed / 7) * 10) / 10,
  };

  // Insights
  const monthAgo = day(-30);
  const deadlines = sortBy([
    ...T.filter((t) => t.status !== 'done' && t.due_date && t.due_date >= monthAgo).map((t) => ({ kind: 'task', id: t.id, name: t.title, date: t.due_date })),
    ...active.filter((p) => p.status !== 'completed' && p.deadline && p.deadline >= monthAgo).map((p) => ({ kind: 'project', id: p.id, name: p.name, date: p.deadline })),
  ], (a, b) => a.date.localeCompare(b.date)).slice(0, 5).map((x) => ({ ...x, days_left: daysLeft(x.date) }));
  const serverWarnings = [
    ...db.servers.filter((s) => s.status !== 'online').map((s) => ({ kind: 'server', id: s.id, name: s.name, detail: s.status[0].toUpperCase() + s.status.slice(1), level: s.status === 'offline' ? 'critical' : 'warning', link: '/servers' })),
    ...sites.filter((w) => w.last_state === 'down').map((w) => ({ kind: 'website', id: w.id, name: w.name, detail: `Down · ${w.last_error || 'unreachable'}`, level: 'critical', link: `/monitoring/${w.id}` })),
  ];
  const expiring = sortBy([
    ...db.domains.filter((d) => d.expires_at && daysLeft(d.expires_at) <= alertDays).map((d) => ({ kind: 'domain', id: d.id, name: d.name, expires_at: d.expires_at, days_left: daysLeft(d.expires_at) })),
    ...db.domains.filter((d) => d.ssl_expires_at && daysLeft(d.ssl_expires_at) <= 14).map((d) => ({ kind: 'ssl', id: d.id, name: d.name, expires_at: d.ssl_expires_at, days_left: daysLeft(d.ssl_expires_at) })),
  ], (a, b) => a.days_left - b.days_left).slice(0, 5);
  const openTasks = T.filter((t) => t.status !== 'done');
  const insights = {
    deadlines, server_warnings: serverWarnings, expiring,
    incomplete: {
      total: openTasks.length, urgent: cnt(openTasks, (t) => ['high', 'critical'].includes(t.priority)), overdue: cnt(openTasks, (t) => t.due_date && t.due_date < td),
      in_progress: cnt(openTasks, (t) => t.status === 'in_progress'), undated: cnt(openTasks, (t) => !t.due_date),
      top: sortBy(openTasks, (a, b) => PRIO[a.priority] - PRIO[b.priority] || (a.due_date || '9999').localeCompare(b.due_date || '9999')).slice(0, 3).map((t) => ({ id: t.id, title: t.title, priority: t.priority, due_date: t.due_date, project_name: projectName(t.project_id)?.name ?? null })),
    },
    recent: [...db.activity].filter((a) => a.entity_type !== 'auth').reverse().slice(0, 5).map((a) => ({ ...a, link: entityLink(a.entity_type, a.entity_id) })),
  };
  return { data: { stats, timeline, weekly, insights, generated_at: nowDT() } };
}

function expenseStats() {
  const cur = db.settings.currency;
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 11 + i); return iso(d).slice(0, 7); });
  const from = `${months[0]}-01`;
  const recent = db.expenses.filter((e) => e.spent_at >= from);
  const monthly = months.map((m) => ({ month: m, total: Math.round(recent.filter((e) => e.spent_at.startsWith(m)).reduce((a, e) => a + convert(e.amount, e.currency), 0) * 100) / 100 }));
  const byCat = {};
  recent.forEach((e) => {
    const c = db.categories.find((x) => x.id === e.category_id);
    const name = c?.name || 'Uncategorized';
    byCat[name] ??= { name, color: c?.color || null, total: 0 };
    byCat[name].total += convert(e.amount, e.currency);
  });
  const thisMonth = months[11];
  const byCur = {};
  db.expenses.filter((e) => e.spent_at.startsWith(thisMonth)).forEach((e) => { byCur[e.currency] ??= { currency: e.currency, total: 0, count: 0 }; byCur[e.currency].total += e.amount; byCur[e.currency].count += 1; });
  const recurring = db.expenses.filter((e) => e.is_recurring);
  const r2 = (v) => Math.round(v * 100) / 100;
  return { data: {
    currency: cur, rates: rates(), monthly,
    by_category: Object.values(byCat).sort((a, b) => b.total - a.total).map((c) => ({ ...c, total: r2(c.total) })),
    this_month_by_currency: Object.values(byCur),
    this_month: monthly[11].total, last_month: monthly[10].total, year_total: r2(monthly.reduce((a, m) => a + m.total, 0)),
    recurring_monthly: r2(recurring.reduce((a, e) => a + convert(e.amount, e.currency) / (e.recurrence === 'yearly' ? 12 : 1), 0)), recurring_count: recurring.length,
  } };
}

function monitorShow(id, range = '24h') {
  const w = R.monitoring.find(id);
  const t = tWebsite(w);
  const cfg = { '24h': [24, 10], '7d': [168, 60], '30d': [720, 360] }[range] || [24, 10];
  const series = checksFor(w, cfg[0], cfg[1]).map((c) => ({ t: isoDT(new Date(c.t)), ms: c.ms, up: c.up }));
  const recent = checksFor(w, 2, 5).reverse().slice(0, 20).map((c, i) => ({ id: i + 1, is_up: c.up, status_code: c.up ? 200 : (w.last_status_code || 500), response_ms: c.ms, error: c.up ? null : w.last_error, checked_at: isoDT(new Date(c.t)) }));
  return { data: { ...t, series, range, uptime_7d: uptime(checksFor(w, 168, 30)), checks_total: 30 * 288, recent_checks: recent, incidents: db.incidents.filter((i) => i.website_id === w.id).map(tIncident).reverse() } };
}

function search(qs) {
  const q = (qs || '').toLowerCase().trim();
  if (q.length < 2) return { data: [] };
  const out = [];
  const add = (type, rows, title, meta, link) => rows.filter((r) => like(q, r[title], r[meta])).slice(0, 5).forEach((r) => out.push({ type, id: r.id, title: r[title], meta: r[meta], link: link.replace('{id}', r.id) }));
  add('project', db.projects, 'name', 'technologies', '/projects/{id}');
  add('task', db.tasks, 'title', 'category', '/tasks?open={id}');
  add('domain', db.domains, 'name', 'registrar', '/domains');
  add('server', db.servers, 'name', 'ip_address', '/servers');
  add('monitor', db.websites, 'name', 'url', '/monitoring/{id}');
  add('credential', db.credentials, 'name', 'provider', '/vault');
  add('snippet', db.snippets, 'title', 'tags', '/snippets?open={id}');
  add('expense', db.expenses, 'title', 'vendor', '/expenses');
  return { data: out };
}

function activityList(q) {
  let rows = [...db.activity].reverse();
  if (q.type) rows = rows.filter((a) => a.entity_type === q.type);
  if (q.q) rows = rows.filter((a) => like(q.q.toLowerCase(), a.description));
  const page = Math.max(1, Number(q.page) || 1);
  const per = 40;
  const since = day(-83);
  const heat = {};
  db.activity.filter((a) => a.created_at >= since && a.entity_type !== 'auth').forEach((a) => { const d = a.created_at.slice(0, 10); heat[d] = (heat[d] || 0) + 1; });
  return { data: rows.slice((page - 1) * per, page * per), meta: { page, pages: Math.max(1, Math.ceil(rows.length / per)), total: rows.length, types: [...new Set(db.activity.map((a) => a.entity_type))].sort(), heatmap: Object.entries(heat).map(([date, count]) => ({ date, count })) } };
}

function session() {
  return { user: db.loggedIn ? db.user : null, settings: db.loggedIn ? db.settings : null, csrf: 'demo', app: { name: 'DEVSPACE', version: '1.0.0-demo' }, server_time: nowDT(), demo: true };
}

/* ---------- router ---------- */

function route(method, path, body, q) {
  const parts = path.split('/').filter(Boolean);
  const [res, id, action] = parts;

  if (res === 'auth') {
    if (id === 'session') return session();
    if (id === 'login') {
      if (String(body.email).toLowerCase() !== db.user.email || body.password !== db.password) throw new DemoError(422, 'These credentials do not match our records.', { email: 'Invalid email or password.' });
      db.loggedIn = true; return session();
    }
    if (id === 'logout') { db.loggedIn = false; return { ok: true, csrf: 'demo' }; }
  }
  if (!db.loggedIn) throw new DemoError(401, 'Authentication required.');

  switch (res) {
    case 'overview': return overview();
    case 'search': return search(q.q);
    case 'activity': return activityList(q);
    case 'notifications':
      if (method === 'GET') return { data: [...db.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at)), unread: db.notifications.filter((n) => !n.read_at).length };
      if (id === 'read-all') { db.notifications.forEach((n) => { n.read_at ??= nowDT(); }); return { ok: true }; }
      if (id === 'clear-read') { db.notifications = db.notifications.filter((n) => !n.read_at); return { ok: true }; }
      if (action === 'read') { const n = db.notifications.find((x) => x.id === Number(id)); if (n) n.read_at = nowDT(); return { ok: true }; }
      if (method === 'DELETE') { db.notifications = db.notifications.filter((x) => x.id !== Number(id)); return { ok: true }; }
      break;
    case 'settings':
      if (method === 'GET' && !id) return { data: { profile: db.user, preferences: db.settings, system: { version: '1.0.0-demo', php: '— (static demo)', mysql: '— (static demo)', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, cron_monitor_last_run: null, cron_daily_last_run: null, is_admin: false, mail_configured: false } } };
      if (id === 'profile') { required(body, ['name', 'email']); Object.assign(db.user, { name: body.name, email: String(body.email).toLowerCase(), title: body.title || null }); log('updated', 'settings', null, 'Updated profile'); return { data: db.user }; }
      if (id === 'password') {
        if (body.current_password !== db.password) throw new DemoError(422, 'Please correct the highlighted fields.', { current_password: 'Current password is incorrect.' });
        db.password = body.password; log('updated', 'settings', null, 'Changed account password'); return { ok: true, csrf: 'demo' };
      }
      if (id === 'preferences') { Object.assign(db.settings, body); return { data: db.settings }; }
      break;
    case 'backups': throw needsBackend('Database backups');
    case 'tasks':
      if (id === 'stats') {
        const by = { todo: 0, in_progress: 0, review: 0, done: 0 };
        db.tasks.forEach((t) => { by[t.status] += 1; });
        return { data: { by_status: by, overdue: db.tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today()).length, completed_week: db.tasks.filter((t) => t.completed_at && t.completed_at >= day(-6)).length, completed_month: db.tasks.filter((t) => t.completed_at && t.completed_at >= day(-29)).length, categories: [...new Set(db.tasks.map((t) => t.category).filter(Boolean))].sort() } };
      }
      if (id === 'reorder') {
        (body.items || []).forEach((it) => {
          const t = db.tasks.find((x) => x.id === Number(it.id));
          if (!t) return;
          if (t.status !== it.status) {
            log(it.status === 'done' ? 'completed' : 'updated', 'task', t.id, it.status === 'done' ? `Completed task “${t.title}”` : `Moved task “${t.title}” to ${it.status.replace('_', ' ')}`);
            t.completed_at = it.status === 'done' ? nowDT() : null;
          }
          Object.assign(t, { status: it.status, position: Number(it.position), updated_at: nowDT() });
        });
        return { ok: true };
      }
      break;
    case 'projects':
      if (action === 'archive') {
        const p = R.projects.find(id);
        p.archived_at = p.archived_at ? null : nowDT();
        log(p.archived_at ? 'archived' : 'restored', 'project', p.id, `${p.archived_at ? 'Archived' : 'Restored'} project “${p.name}”`);
        return { data: tProject(p) };
      }
      if (id && method === 'GET') {
        const p = tProject(R.projects.find(id));
        const exp = lists.expenses({ project_id: p.id });
        return { data: {
          ...p, tasks: lists.tasks({ project_id: p.id, sort: 'board' }), domains: lists.domains({ project_id: p.id }), websites: lists.monitoring({ project_id: p.id }),
          credentials: lists.credentials({ project_id: p.id }), expenses: exp,
          expenses_total: { amount: Math.round(exp.reduce((a, e) => a + convert(e.amount, e.currency), 0) * 100) / 100, currency: db.settings.currency },
          servers: db.servers.filter((s) => s.project_ids.includes(p.id)).map(({ id: sid, name, status, ip_address }) => ({ id: sid, name, status, ip_address })),
          activity: [...db.activity].reverse().filter((a) => a.entity_type === 'project' && a.entity_id === p.id).slice(0, 15),
        } };
      }
      break;
    case 'domains':
      if (action === 'ssl-check') throw needsBackend('Live SSL checking');
      break;
    case 'monitoring':
      if (id === 'incidents') return { data: [...db.incidents].reverse().map(tIncident) };
      if (action === 'check') throw needsBackend('Live HTTP checks');
      if (id && method === 'GET') return monitorShow(id, q.range);
      if (!id && method === 'GET') {
        const rows = lists.monitoring(q);
        const up = rows.filter((w) => w.uptime_30d !== null);
        return { data: rows, meta: { up: rows.filter((w) => w.last_state === 'up').length, down: rows.filter((w) => w.last_state === 'down').length, avg_uptime_30d: up.length ? Math.round((up.reduce((a, w) => a + w.uptime_30d, 0) / up.length) * 100) / 100 : null, cron_last_run: nowDT() } };
      }
      break;
    case 'credentials':
      if (action === 'reveal') {
        const c = R.credentials.find(id);
        if (body.password !== db.password) throw new DemoError(422, 'Please correct the highlighted fields.', { password: 'Incorrect password.' });
        c.last_revealed_at = nowDT();
        log('revealed', 'credential', c.id, `Revealed secret “${c.name}” (${c.provider})`);
        return { secret: c.secret };
      }
      break;
    case 'expenses':
      if (id === 'stats') return expenseStats();
      break;
    case 'snippets':
      if (action === 'favorite') { const s = R.snippets.find(id); s.is_favorite = !s.is_favorite; return { data: tSnippet(s) }; }
      if (!id && method === 'GET') {
        const langs = {};
        db.snippets.forEach((s) => { langs[s.language] = (langs[s.language] || 0) + 1; });
        return { data: lists.snippets(q), meta: { languages: Object.entries(langs).map(([language, n]) => ({ language, n })).sort((a, b) => b.n - a.n), categories: [...new Set(db.snippets.map((s) => s.category).filter(Boolean))].sort() } };
      }
      break;
    default:
  }

  const r = R[res];
  if (!r) throw new DemoError(404, 'Endpoint not found.');
  if (method === 'GET') return id ? r.show(id) : { data: lists[res](q) };
  if (method === 'POST' && !id) return r.store(body);
  if (method === 'PUT') return r.update(id, body, false);
  if (method === 'PATCH') return r.update(id, body, true);
  if (method === 'DELETE') return r.destroy(id);
  throw new DemoError(405, 'Method not allowed.');
}

export async function demoRequest(method, path, body = {}, query = {}) {
  await new Promise((res) => setTimeout(res, 120)); // feel like a network call
  const [p, qs] = path.split('?');
  const q = { ...Object.fromEntries(new URLSearchParams(qs || '')), ...Object.fromEntries(Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all').map(([k, v]) => [k, String(v)])) };
  const result = route(method, p, body || {}, q);
  if (method !== 'GET') persist();
  return JSON.parse(JSON.stringify(result));
}
export { DemoError };

/* ---------- file downloads (CSV / JSON) as blob URLs ---------- */

export function demoDownloadUrl(path, query = {}) {
  if (!db.loggedIn) return '#';
  if (path.startsWith('/expenses/export')) {
    const esc = (v) => { const s = v == null ? '' : String(v); const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe; };
    const rows = lists.expenses(Object.fromEntries(Object.entries(query).map(([k, v]) => [k, v == null ? '' : String(v)])));
    const csv = [['Date', 'Title', 'Vendor', 'Category', 'Project', 'Amount', 'Currency', 'Recurring', 'Notes'], ...rows.map((e) => [e.spent_at, e.title, e.vendor, e.category_name, e.project_name, e.amount.toFixed(2), e.currency, e.is_recurring ? e.recurrence : 'no', e.notes])].map((r) => r.map(esc).join(',')).join('\n');
    return URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv' }));
  }
  if (path.startsWith('/settings/export')) {
    const { password, credentials, ...rest } = db;
    const data = { app: 'DEVSPACE (demo)', exported_at: new Date().toISOString(), note: 'API secrets are intentionally excluded.', ...rest, api_credentials: credentials.map(({ secret, ...c }) => c) };
    return URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  }
  return '#';
}

export const demoInfo = { email: 'demo@devspace.app', password: 'demo12345', at, day };
