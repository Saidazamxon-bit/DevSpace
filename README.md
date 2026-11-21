# DEVSPACE — Personal Developer Command Center

A self-hosted dashboard for developers: projects, tasks (kanban), domains & SSL, servers,
real HTTP uptime monitoring, an encrypted API-key vault, multi-currency expenses (UZS / USD / EUR),
a code-snippet library, a complete activity history and notifications.

**Stack:** React 18 (compiled to static files) · PHP 8.2+ · MySQL / MariaDB · Apache `.htaccess`.
It runs on **ordinary shared PHP hosting (cPanel)**. You don't need Node.js, Docker or any long-running process on the server.

---

## Contents

1. [Architecture](#architecture)
2. [Requirements](#requirements)
3. [Install on cPanel (step by step)](#install-on-cpanel-step-by-step)
4. [Cron jobs](#cron-jobs)
5. [HTTPS](#https)
6. [Configuration reference (.env)](#configuration-reference-env)
7. [Security model](#security-model)
8. [Local development](#local-development)
9. [Updating](#updating)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

```
/app
  /Controllers     JSON API controllers (ResourceController = generic, user-scoped CRUD)
  /Core            Router, Request, Response, Database (PDO), Validator, Session, Logger
  /Middleware      AuthMiddleware, CsrfMiddleware, AdminMiddleware
  /Models          One class per table: validation rules, search, filters, sorting
  /Services        MonitorService, AlertService, Crypto, RateLimiter, BackupService, Currency …
  /Helpers         functions.php (env(), config(), e() …)
  bootstrap.php
/config            app.php, database.php (read values from .env)
/cron              monitor.php (every minute), daily.php (hourly/daily maintenance)
/bin/console.php   CLI: migrate, key:generate, user:create, seed:demo
/database
  /migrations      001_initial_schema.sql
  /seeds           DemoSeeder.php (optional sample data)
/frontend          React source (Vite). Only needed if you want to change the UI.
/public            ← web root
  index.php        front controller: /api/* → PHP, everything else → React app shell
  install.php      web installer (locks itself after use)
  /app             compiled React build (committed, ready to upload)
  .htaccess
/routes/api.php    every API endpoint
/storage           logs, backups, cache, sessions (never web-accessible)
/views             PHP templates (SPA shell, installer, error page)
.htaccess          used when the document root is the project root (public_html)
```

The browser loads the compiled React app. The app talks to `/api/*` (same origin, session cookie +
CSRF header). PHP renders no user data; it only serves JSON.

---

## Requirements

| Requirement | Notes |
|---|---|
| PHP **8.2+** | 8.3 recommended |
| Extensions | `pdo_mysql`, `sodium`, `curl`, `openssl`, `mbstring`, `zlib`, `json` (all standard on cPanel) |
| MySQL 5.7+ / MariaDB 10.3+ | utf8mb4 |
| Apache with `mod_rewrite` | LiteSpeed works too (reads `.htaccess`) |
| Cron jobs | For monitoring and alerts (cPanel → Cron Jobs) |

The installer checks all of these for you.

---

## Install on cPanel (step by step)

### 1. Create the database

cPanel → **MySQL® Databases**:

1. Create a database, e.g. `cpuser_devspace`.
2. Create a user, e.g. `cpuser_devspace`, with a strong password.
3. **Add user to database** → grant **ALL PRIVILEGES**.

### 2. Upload the files

Download the repository as a ZIP. Upload it with **File Manager → Upload**, then **Extract**.

Choose **one** of the two layouts:

**A. Recommended: subdomain pointing at `/public`**

1. Upload the project to `/home/CPANELUSER/devspace` (outside `public_html`).
2. cPanel → **Domains** → create `devspace.yourdomain.com` and set its **Document Root** to
   `/home/CPANELUSER/devspace/public`.

Only the `public` folder is reachable from the web. This is the most secure option.

**B. Main domain / `public_html`**

Upload **the whole project** into `public_html` (so you have `public_html/app`,
`public_html/public`, `public_html/.htaccess` …). The root `.htaccess` routes every request into `/public`
and blocks `app/`, `config/`, `storage/`, `database/` and the other private folders.

> Sub-directories work too (e.g. `example.com/devspace`). Asset paths and the router adapt automatically.

### 3. Set permissions

In File Manager, make sure these are writable by PHP (usually `755` for folders is enough on cPanel, since PHP runs as your user):

- `storage/` and everything inside it (`logs`, `backups`, `cache`, `sessions`)
- the project root, **only during installation**, so the installer can create `.env`

### 4. Run the installer

Open `https://devspace.yourdomain.com/install.php` (or `https://yourdomain.com/install.php`).

1. Check that every requirement shows **OK**.
2. Enter the database host (`localhost`), name, user and password.
3. Choose your timezone (default `Asia/Tashkent`).
4. Create the **admin account**: name, email, and a password of 10+ characters with letters and numbers.
5. Optional: tick **Load sample data** to explore with demo content.

The installer:

- writes `.env` with a freshly generated `APP_KEY`, the vault encryption key
- runs the migrations
- creates your admin user and the default expense categories
- writes `storage/installed.lock`, which disables the installer

Then **delete `public/install.php`** for extra safety, and sign in at `/login`.

> **Back up your `.env`** (especially `APP_KEY`) somewhere safe. If you lose `APP_KEY`, the secrets
> stored in the API Vault can never be decrypted again.

#### Manual installation (SSH / no installer)

```bash
cp .env.example .env            # then edit DB_* values
php bin/console.php key:generate
php bin/console.php migrate
php bin/console.php user:create  # interactive
php bin/console.php install:lock
# optional demo data:
php bin/console.php seed:demo you@example.com
```

Or import `database/migrations/001_initial_schema.sql` with **phpMyAdmin → Import**, then run
`user:create` and `install:lock`.

---

## Cron jobs

cPanel → **Cron Jobs**. Replace the PHP path and the project path with yours. cPanel shows the PHP binary path; it's usually `/usr/local/bin/php`, or for a specific version something like `/opt/cpanel/ea-php83/root/usr/bin/php`.

| Schedule | Command | Purpose |
|---|---|---|
| `* * * * *` (every minute) | `/usr/local/bin/php /home/CPANELUSER/devspace/cron/monitor.php >/dev/null 2>&1` | Uptime checks. Each monitor runs at its own interval (1–60 min). Up to 100 sites per run, checked in parallel. |
| `15 * * * *` (hourly) | `/usr/local/bin/php /home/CPANELUSER/devspace/cron/daily.php >/dev/null 2>&1` | Alerts (domains, SSL, tasks, deadlines, API key expiry), recurring expenses, SSL refresh, pruning, optional nightly backup |

- Both scripts refuse to run from a browser (CLI only), and `monitor.php` uses a lock file so runs never overlap.
- Some hosts only allow cron every 5 minutes. That works too; checks just run less often.
- **Settings → Data & backup → System** shows when each cron job last ran. The Monitoring page warns you if checks have stopped.
- Without cron, notifications are still generated when you open the app (throttled to once per hour), and **Check now** still works. Scheduled uptime checks do need cron.

---

## HTTPS

1. cPanel → **SSL/TLS Status** → run **AutoSSL** (free Let's Encrypt / Sectigo) for your domain or subdomain.
2. Force HTTPS: uncomment the three `RewriteCond`/`RewriteRule` lines under *Force HTTPS* in `public/.htaccess`.
3. Session cookies become `Secure` automatically on HTTPS (`SESSION_SECURE=auto`). Behind HTTPS, an HSTS header is also sent.

---

## Configuration reference (.env)

| Key | Default | Description |
|---|---|---|
| `APP_ENV` | `production` | |
| `APP_DEBUG` | `false` | **Keep false in production.** When true, error details are returned. |
| `APP_URL` | | Public URL (informational) |
| `APP_TIMEZONE` | `Asia/Tashkent` | All dates and cron schedules use this timezone |
| `APP_KEY` | | `base64:` 32-byte key for vault encryption. Generate with `php bin/console.php key:generate` |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | | MySQL connection |
| `SESSION_SECURE` | `auto` | `true`, `false` or `auto` (secure when HTTPS) |
| `SESSION_LIFETIME` | `480` | Idle timeout in minutes |
| `MAIL_FROM` | | Sender for email alerts via PHP `mail()`. Empty disables email. |
| `BACKUP_DAILY` | `false` | Nightly gzip SQL backup from `cron/daily.php` |
| `MONITOR_RETENTION_DAYS` | `90` | How long individual uptime checks are kept |

`.env` is in `.gitignore`. **Never commit it.**

---

## Security model

- **Passwords:** `password_hash()` / `password_verify()` (bcrypt), with automatic rehash.
- **Sessions:** strict mode, HttpOnly, SameSite=Lax, Secure on HTTPS, ID regenerated at login and on password change, idle timeout.
- **CSRF:** every POST/PUT/PATCH/DELETE needs an `X-CSRF-Token` header matching the session token (checked with `hash_equals`).
- **SQL:** PDO prepared statements everywhere, with native prepares (no emulation). Sort and filter keys come from per-model whitelists.
- **Authorization:** every query is scoped by `user_id`, and linked records (project, server, category) are checked for ownership. Backups are admin-only.
- **Validation:** a server-side validator on every write, mirrored by client-side validation in the forms. Unknown fields are ignored, so mass assignment isn't possible.
- **XSS:** React escapes all output. Code snippets are escaped by highlight.js. PHP views use `e()`. A strict **Content-Security-Policy** is sent (`script-src 'self'`, `frame-ancestors 'none'`), along with `X-Frame-Options`, `nosniff` and a Referrer-Policy.
- **Rate limiting** (MySQL-backed, works on shared hosting):
  - login: 5 attempts per 15 min per email+IP, 30 per IP
  - revealing a secret: 10 per 10 min
  - password change: 5 per 15 min
  - manual monitor checks, SSL checks, backups
- **API Vault:** secrets are encrypted with libsodium `crypto_secretbox` (XSalsa20-Poly1305) using `APP_KEY` from `.env`.
  - The ciphertext column is never selected for list or detail responses, and only a masked hint (last 4 characters, for long secrets) is shown.
  - Revealing a secret requires re-entering your account password, is rate limited and is written to the activity log.
  - Secrets are excluded from data exports and are never logged.
- **Private files:** `storage/`, `app/`, `config/` and the other private folders are blocked by `.htaccess`. Backups live in `storage/backups` and download only through an authenticated admin endpoint.
- **File uploads:** the app accepts no file uploads, so that attack surface doesn't exist.
- **Monitoring:** outbound requests are restricted to `http`/`https` (including redirects), verify TLS and only read the first 64 KB of the body.
- **After install:** the installer is locked by `storage/installed.lock`. Delete `public/install.php` afterwards anyway.

---

## Local development

```bash
# 1. Backend (PHP built-in server)
cp .env.example .env    # set DB_* and APP_DEBUG=true
php bin/console.php key:generate && php bin/console.php migrate
php bin/console.php user:create && php bin/console.php install:lock
php -S 127.0.0.1:8000 -t public public/index.php

# 2. Frontend with hot reload (proxies /api to :8000)
cd frontend
npm install
npm run dev             # http://localhost:5173

# 3. Production build → public/app (commit it, then upload it)
npm run build
```

You only need Node.js on your own computer, to rebuild the UI. The server never needs it.

Run the monitor manually with `php cron/monitor.php -v`, and the maintenance job with `php cron/daily.php -v`.

---

## Updating

1. Back up your database (**Settings → Data & backup → Create backup**) and your `.env`.
2. Upload the new files. Don't overwrite `.env` or `storage/`.
3. Run pending migrations with `php bin/console.php migrate`, or import any new SQL files from `database/migrations` in phpMyAdmin.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank page or "Frontend build not found" | Make sure `public/app/index.html` was uploaded |
| 500 error | Check `storage/logs/app-YYYY-MM-DD.log` and `storage/logs/php-error.log`. Temporarily set `APP_DEBUG=true`. |
| "Your session has expired" on every action | The `storage/sessions` folder must be writable. Clear the browser's cookies for the site. |
| Every page returns 404 | `mod_rewrite` must be enabled, and the `.htaccess` files must be uploaded (they're hidden files, so enable "Show hidden files" in File Manager) |
| Monitors stay "Pending" | The cron job isn't running. Check the path to PHP and to `cron/monitor.php`. |
| Vault: "could not be decrypted" | `APP_KEY` in `.env` was changed or lost. Restore the original key. |
