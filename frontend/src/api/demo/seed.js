// Sample data for the static demo build (VITE_DEMO=true). Dates are relative to "now".
import { lang } from '../../i18n';

const L = (en, uz) => (lang === 'uz' ? uz : en);

const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isoDT = (d) => `${iso(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return iso(d); };
export const at = (offsetDays, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); d.setHours(h, m, 0, 0); return isoDT(d); };
const monthStart = (offsetMonths, plusDays = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offsetMonths); d.setDate(1 + plusDays); return iso(d); };

export const DEMO_USER = { id: 1, name: L('Demo Developer', 'Demo dasturchi'), email: 'demo@devspace.app', role: 'admin', title: L('Full-stack developer', 'Full-stack dasturchi'), created_at: at(-60, 10) };
export const DEMO_PASSWORD = 'demo12345';

export function seed() {
  const projects = [
    ['Nebula Commerce', L('Headless storefront for a boutique retailer — Laravel API + React frontend.', "Butik do'kon uchun onlayn savdo tizimi — Laravel API va React frontend."), 'https://nebula.example.com', 'https://github.com/example/nebula-commerce', 'Laravel, React, MySQL, Redis', 'active', 'high', day(-40), day(9), '#B8FF65'],
    ['Pulse Analytics', L('Self-hosted product analytics dashboard with event ingestion.', "O'z serverida ishlaydigan mahsulot analitikasi paneli va hodisalarni yig'ish."), 'https://pulse.example.com', 'https://github.com/example/pulse', 'PHP, Chart.js, MariaDB', 'active', 'critical', day(-25), day(3), '#FF9F2E'],
    ['Atlas CRM', L('Lightweight CRM for a local agency.', 'Mahalliy agentlik uchun yengil CRM tizimi.'), null, 'https://github.com/example/atlas-crm', 'Vue, Node, PostgreSQL', 'planning', 'medium', day(5), day(60), '#6EA8FE'],
    ['Portfolio v3', L('Personal portfolio rebuild with case studies.', 'Shaxsiy portfolio saytini loyihalar tavsifi bilan qayta yaratish.'), 'https://portfolio.example.com', null, 'Astro, Tailwind', 'completed', 'low', day(-90), day(-20), '#C084FC'],
    ['Telegram Bot Kit', L('Reusable PHP toolkit for Telegram bots.', 'Telegram botlar uchun qayta ishlatiladigan PHP kutubxona.'), null, 'https://github.com/example/tg-kit', 'PHP, Webhooks', 'paused', 'medium', day(-60), null, '#F472B6'],
  ].map(([name, description, url, repo_url, technologies, status, priority, start_date, deadline, color], i) => ({
    id: i + 1, name, description, url, repo_url, technologies, status, priority, start_date, deadline, color,
    notes: L('## Notes\n- Client contact via email\n- Weekly sync on Mondays', "## Eslatmalar\n- Mijoz bilan email orqali aloqa\n- Har dushanba haftalik uchrashuv"), archived_at: null, created_at: at(-30, 10), updated_at: at(-i, 12),
  }));

  const tasks = [
    [1, L('Checkout flow: integrate Payme', "To'lov sahifasi: Payme integratsiyasi"), 'in_progress', 'critical', 'Backend', day(0), '15:00'],
    [1, L('Product filters UI polish', 'Mahsulot filtrlari dizaynini sayqallash'), 'review', 'medium', L('Frontend', 'Frontend'), day(1), null],
    [1, L('Write API docs for orders endpoint', 'Buyurtmalar API uchun hujjat yozish'), 'todo', 'low', L('Docs', 'Hujjatlar'), day(6), null],
    [1, L('Fix cart rounding bug', 'Savatdagi yaxlitlash xatosini tuzatish'), 'done', 'high', L('Bugfix', 'Xatolar'), day(-2), null],
    [1, L('Set up staging deploy', 'Staging serverga deployni sozlash'), 'done', 'medium', 'DevOps', day(-4), null],
    [2, L('Event ingestion batching', "Hodisalarni guruhlab yig'ish"), 'in_progress', 'high', 'Backend', day(2), '11:00'],
    [2, L('Retention cohort chart', 'Foydalanuvchilarni ushlab qolish grafigi'), 'todo', 'medium', L('Frontend', 'Frontend'), day(3), null],
    [2, L('Load test ingestion endpoint', "Hodisa qabul qiluvchi API ni yuklama sinovidan o'tkazish"), 'todo', 'high', 'DevOps', day(-1), null],
    [2, L('Dashboard date-range picker', 'Panel uchun sana oralig‘ini tanlash'), 'done', 'medium', L('Frontend', 'Frontend'), day(-1), null],
    [2, L('Migrate to partitioned tables', "Jadvallarni bo'laklarga ajratishga o'tish"), 'done', 'high', 'Database', day(-3), null],
    [3, L('Gather requirements with client', "Mijoz bilan talablarni yig'ish"), 'todo', 'medium', L('Planning', 'Rejalash'), day(5), '10:30'],
    [3, L('Draft data model', "Ma'lumotlar modelini loyihalash"), 'todo', 'low', L('Planning', 'Rejalash'), day(8), null],
    [null, L('Renew SSL wildcard for agency', 'Agentlik uchun wildcard SSL ni yangilash'), 'todo', 'high', 'Ops', day(0), '18:00'],
    [null, L('Update PHP to 8.3 on VPS', 'VPS da PHP ni 8.3 ga yangilash'), 'todo', 'medium', 'Ops', day(4), null],
    [null, L('Review monthly expenses', 'Oylik xarajatlarni tahlil qilish'), 'done', 'low', L('Admin', "Ma'muriy"), day(-5), null],
    [5, L('Inline keyboard helpers', 'Inline klaviatura yordamchilari'), 'done', 'medium', 'Backend', day(-6), null],
  ].map(([project_id, title, status, priority, category, due_date, due_time], i) => ({
    id: i + 1, project_id, title, description: null, status, priority, category, due_date, due_time, position: i + 1,
    completed_at: status === 'done' ? at(-(i % 6), 10 + (i % 8), 20) : null, created_at: at(-10, 9), updated_at: at(-(i % 5), 14),
  }));

  const domains = [
    ['nebula.example.com', 'Namecheap', day(-340), day(25), 12.98, 'USD', 0, 'Cloudflare', day(48), 1],
    ['pulse.example.com', 'Porkbun', day(-200), day(165), 10.37, 'USD', 1, 'Cloudflare', day(9), 2],
    ['devspace.uz', 'Uzinfocom', day(-360), day(6), 120000, 'UZS', 0, 'Self-hosted', day(70), null],
    ['portfolio.example.com', 'Cloudflare', day(-700), day(300), 9.15, 'USD', 1, 'Cloudflare', day(80), 4],
  ].map(([name, registrar, registered_at, expires_at, renewal_price, currency, auto_renew, dns_provider, ssl_expires_at, project_id], i) => ({
    id: i + 1, name, registrar, registered_at, expires_at, renewal_price, currency, auto_renew: !!auto_renew, dns_provider, ssl_expires_at,
    project_id, notes: null, created_at: at(-20, 10), updated_at: at(-3, 10),
  }));

  const servers = [
    ['prod-web-01', 'Hetzner', '203.0.113.10', 'Ubuntu 24.04 LTS', 'Falkenstein, DE', '4 vCPU', '8 GB', '160 GB NVMe', 'online', 14.4, 'EUR', [1, 2]],
    ['db-primary', 'DigitalOcean', '203.0.113.24', 'Debian 12', 'Frankfurt, DE', '2 vCPU', '4 GB', '80 GB SSD', 'online', 24, 'USD', [1, 2]],
    ['staging-box', 'Vultr', '198.51.100.7', 'Ubuntu 22.04 LTS', 'Amsterdam, NL', '1 vCPU', '2 GB', '55 GB SSD', 'maintenance', 10, 'USD', [1]],
    ['uz-shared', 'Ahost.uz', '198.51.100.42', 'CloudLinux 8', 'Tashkent, UZ', 'Shared', '2 GB', '20 GB', 'online', 95000, 'UZS', [4]],
  ].map(([name, provider, ip_address, os, location, cpu, ram, storage, status, monthly_cost, currency, project_ids], i) => ({
    id: i + 1, name, provider, ip_address, os, location, cpu, ram, storage, status, monthly_cost, currency, project_ids, notes: null, created_at: at(-30, 10), updated_at: at(-2, 10),
  }));

  const websites = [
    [L('Nebula storefront', "Nebula do'koni"), 'https://nebula.example.com', 1, 1, 'up', 180],
    ['Pulse API health', 'https://pulse.example.com/health', 2, 2, 'up', 240],
    ['Portfolio', 'https://portfolio.example.com', 4, 4, 'up', 320],
    [L('Atlas CRM staging', 'Atlas CRM (staging)'), 'https://staging.atlas.example.com', 3, 3, 'down', null],
  ].map(([name, url, project_id, server_id, last_state, base], i) => ({
    id: i + 1, name, url, project_id, server_id, method: 'GET', expected_status: null, check_interval: 5, timeout_seconds: 10, is_active: true,
    last_state, base_ms: base || 400, last_status_code: last_state === 'up' ? 200 : 500, last_response_ms: base, last_error: last_state === 'down' ? 'HTTP 500' : null,
    last_checked_at: isoDT(new Date(Date.now() - 90 * 1000)), created_at: at(-30, 10), updated_at: at(0, 8),
  }));

  const incidents = [
    { id: 1, website_id: 4, started_at: isoDT(new Date(Date.now() - 47 * 60 * 1000)), resolved_at: null, status_code: 500, error: 'HTTP 500' },
    { id: 2, website_id: 2, started_at: at(-2, 3, 12), resolved_at: at(-2, 3, 26), status_code: null, error: 'Operation timed out' },
    { id: 3, website_id: 1, started_at: at(-6, 22, 5), resolved_at: at(-6, 22, 9), status_code: 502, error: 'HTTP 502' },
  ];

  const credentials = [
    ['Stripe', L('Live secret key', 'Asosiy maxfiy kalit'), 'sk_live_demo_51Hxxxxxxxxxxxxxxxx9f3A', 1, day(180), 'payments,production'],
    ['OpenWeather', L('Default API key', 'Asosiy API kalit'), 'demo_owm_0c8a4f1e2b7d9a3c5e6f', 2, null, 'weather'],
    ['Telegram', 'Bot token @tgkit_bot', '123456789:AAH-demo-token-value-xyz', 5, day(10), 'bot'],
  ].map(([provider, name, secret, project_id, expires_at, tags], i) => ({
    id: i + 1, provider, name, secret, project_id, expires_at, tags, description: null, last_revealed_at: null, created_at: at(-15, 11), updated_at: at(-15, 11),
  }));

  const categories = [
    ['Hosting', '#3987E5', 'Hosting'], ['Domains', '#D95926', 'Domenlar'], ['Software & SaaS', '#199E70', 'Dasturlar va SaaS'], ['APIs', '#C98500', 'API xizmatlar'],
    ['Hardware', '#D55181', 'Qurilmalar'], ['Marketing', '#0CA30C', 'Marketing'], ['Other', '#9085E9', 'Boshqa'],
  ].map(([key, color, uzName], i) => ({ id: i + 1, key, name: L(key, uzName), color, created_at: at(-60, 10) }));
  const cat = (n) => categories.find((c) => c.key === n).id;

  const expenses = [
    ['Hetzner VPS', 'Hetzner', 14.4, 'EUR', 'Hosting', 1, monthStart(0), 1],
    ['DigitalOcean droplet', 'DigitalOcean', 24, 'USD', 'Hosting', 2, monthStart(0, 2), 1],
    ['GitHub Copilot', 'GitHub', 10, 'USD', 'Software & SaaS', null, day(-8), 1],
    [L('nebula domain renewal', 'nebula domenini yangilash'), 'Namecheap', 12.98, 'USD', 'Domains', 1, day(-35), 0],
    [L('Shared hosting', 'Hosting xizmati'), 'Ahost.uz', 95000, 'UZS', 'Hosting', 4, day(-12), 1],
    [L('Mechanical keyboard', 'Mexanik klaviatura'), L('Local store', "Mahalliy do'kon"), 850000, 'UZS', 'Hardware', null, day(-50), 0],
    ['Figma Pro', 'Figma', 15, 'USD', 'Software & SaaS', null, day(-65), 0],
    [L('OpenAI API usage', 'OpenAI API dan foydalanish'), 'OpenAI', 18.4, 'USD', 'APIs', 2, day(-3), 0],
    [L('Telegram ads test', 'Telegram reklama sinovi'), 'Telegram', 40, 'USD', 'Marketing', 5, day(-95), 0],
    ['JetBrains All Products', 'JetBrains', 289, 'USD', 'Software & SaaS', null, day(-140), 0],
    ['Hetzner VPS', 'Hetzner', 14.4, 'EUR', 'Hosting', 1, monthStart(-1), 0],
    ['DigitalOcean droplet', 'DigitalOcean', 24, 'USD', 'Hosting', 2, monthStart(-1, 2), 0],
    ['Hetzner VPS', 'Hetzner', 14.4, 'EUR', 'Hosting', 1, monthStart(-2), 0],
    ['DigitalOcean droplet', 'DigitalOcean', 24, 'USD', 'Hosting', 2, monthStart(-2, 2), 0],
  ].map(([title, vendor, amount, currency, c, project_id, spent_at, recurring], i) => ({
    id: i + 1, title, vendor, amount, currency, category_id: cat(c), project_id, spent_at, is_recurring: !!recurring,
    recurrence: recurring ? 'monthly' : null, parent_id: null, notes: null, created_at: at(-10, 10), updated_at: at(-10, 10),
  }));

  const snippets = [
    [L('PDO connection helper', 'PDO ulanish yordamchisi'), 'php', L('Database', "Ma'lumotlar bazasi"), 'pdo,mysql', "<?php\n$pdo = new PDO(\n    'mysql:host=localhost;dbname=app;charset=utf8mb4',\n    $user,\n    $pass,\n    [\n        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n        PDO::ATTR_EMULATE_PREPARES => false,\n    ]\n);", true],
    [L('Debounce hook', 'Debounce hook'), 'javascript', 'React', 'react,hooks', "import { useEffect, useState } from 'react';\n\nexport function useDebounce(value, delay = 300) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const t = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(t);\n  }, [value, delay]);\n  return debounced;\n}", true],
    [L('Nginx PHP-FPM location', 'Nginx PHP-FPM sozlamasi'), 'nginx', 'DevOps', 'nginx,php', 'location ~ \\.php$ {\n    include fastcgi_params;\n    fastcgi_pass unix:/run/php/php8.3-fpm.sock;\n    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;\n}', false],
    [L('Find slow MySQL queries', 'Sekin MySQL so‘rovlarini topish'), 'sql', L('Database', "Ma'lumotlar bazasi"), 'mysql,performance', 'SELECT digest_text, count_star, avg_timer_wait / 1e9 AS avg_ms\nFROM performance_schema.events_statements_summary_by_digest\nORDER BY avg_timer_wait DESC\nLIMIT 10;', false],
    [L('Backup a database', 'Bazaning zaxira nusxasini olish'), 'bash', 'DevOps', 'mysql,backup', '#!/usr/bin/env bash\nmysqldump --single-transaction -u "$DB_USER" -p "$DB_NAME" | gzip > "backup-$(date +%F).sql.gz"', false],
  ].map(([title, language, category, tags, code, is_favorite], i) => ({
    id: i + 1, title, language, category, tags, code, is_favorite, description: null, created_at: at(-20 + i, 10), updated_at: at(-5 + i, 10),
  }));

  const activity = [];
  let aid = 0;
  const log = (created_at, action, entity_type, entity_id, description) => activity.push({ id: ++aid, action, entity_type, entity_id, description, ip_address: null, created_at });
  tasks.filter((t) => t.completed_at).forEach((t) => log(t.completed_at, 'completed', 'task', t.id, `Completed task “${t.title}”`));
  [
    [-13, 11, 'updated', 'project', 2, 'Updated project “Pulse Analytics”'],
    [-10, 15, 'created', 'expense', null, `Created expense “${L('OpenAI API usage', 'OpenAI API dan foydalanish')}”`],
    [-9, 10, 'updated', 'project', 1, 'Updated project “Nebula Commerce”'],
    [-6, 10, 'updated', 'project', 1, 'Updated project “Nebula Commerce”'],
    [-6, 22, 'incident', 'monitor', 1, `${websites[0].name} is down: HTTP 502`],
    [-5, 14, 'created', 'snippet', 2, `Created snippet “${L('Debounce hook', 'Debounce hook')}”`],
    [-4, 9, 'updated', 'project', 2, 'Updated project “Pulse Analytics”'],
    [-3, 16, 'created', 'domain', 3, 'Created domain “devspace.uz”'],
    [-2, 3, 'incident', 'monitor', 2, 'Pulse API health is down: Operation timed out'],
    [-2, 11, 'updated', 'server', 3, 'Updated server “staging-box”'],
    [-1, 17, 'updated', 'project', 2, 'Updated project “Pulse Analytics”'],
    [0, 0, 'created', 'task', 13, `Created task “${tasks[12].title}”`],
  ].forEach(([d, h, ...rest]) => log(at(d, h, 10), ...rest));
  log(isoDT(new Date(Date.now() - 47 * 60 * 1000)), 'incident', 'monitor', 4, `${websites[3].name} is down: HTTP 500`);
  activity.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const notifications = [
    ['monitoring', 'critical', `${websites[3].name} is down`, 'HTTP 500 — https://staging.atlas.example.com', '/monitoring/4'],
    ['domain', 'critical', 'Domain devspace.uz expires in 6 days', `Expiration date: ${day(6)}`, '/domains'],
    ['project', 'warning', 'Project deadline: Pulse Analytics', `Due in 3 day(s) — ${day(3)}`, '/projects/2'],
    ['ssl', 'warning', 'SSL for pulse.example.com expires in 9 days', `Certificate valid until ${day(9)}`, '/domains'],
    ['task', 'warning', `Overdue: ${tasks[7].title}`, `Due date: ${day(-1)}`, '/tasks'],
    ['credential', 'warning', 'API key “Bot token @tgkit_bot” (Telegram) expires soon', `Expiration date: ${day(10)}`, '/vault'],
  ].map(([type, level, title, body, link], i) => ({ id: i + 1, type, level, title, body, link, read_at: null, created_at: isoDT(new Date(Date.now() - (i + 1) * 37 * 60 * 1000)) }));

  return {
    version: 2, lang, loggedIn: false, user: { ...DEMO_USER }, password: DEMO_PASSWORD,
    settings: { theme: 'dark', currency: 'USD', rate_usd: 12650, rate_eur: 13700, domain_alert_days: 30, notify_domains: true, notify_tasks: true, notify_monitoring: true, notify_credentials: true, notify_email: false, sidebar_collapsed: false },
    projects, tasks, domains, servers, websites, incidents, credentials, categories, expenses, snippets, activity, notifications,
  };
}
