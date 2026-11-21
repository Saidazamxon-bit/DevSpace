<?php

declare(strict_types=1);

use App\Core\Database;
use App\Services\Crypto;

/**
 * Optional sample data (installer checkbox or `php bin/console.php seed:demo EMAIL`).
 * Dates are relative to "today" so the dashboard always looks alive.
 * Monitoring history is NOT faked — real checks start once cron runs.
 */
final class DemoSeeder
{
    public static function run(int $uid): void
    {
        $d = static fn (string $mod) => date('Y-m-d', strtotime($mod));
        $dt = static fn (string $mod) => date('Y-m-d H:i:s', strtotime($mod));

        $projects = [
            ['Nebula Commerce', 'Headless storefront for a boutique retailer — Laravel API + React frontend.', 'https://nebula.example.com', 'https://github.com/example/nebula-commerce', 'Laravel, React, MySQL, Redis', 'active', 'high', $d('-40 days'), $d('+9 days'), '#B8FF65'],
            ['Pulse Analytics', 'Self-hosted product analytics dashboard with event ingestion.', 'https://pulse.example.com', 'https://github.com/example/pulse', 'PHP, Chart.js, MariaDB', 'active', 'critical', $d('-25 days'), $d('+3 days'), '#FF9F2E'],
            ['Atlas CRM', 'Lightweight CRM for a local agency.', null, 'https://github.com/example/atlas-crm', 'Vue, Node, PostgreSQL', 'planning', 'medium', $d('+5 days'), $d('+60 days'), '#6EA8FE'],
            ['Portfolio v3', 'Personal portfolio rebuild with case studies.', 'https://portfolio.example.com', null, 'Astro, Tailwind', 'completed', 'low', $d('-90 days'), $d('-20 days'), '#C084FC'],
            ['Telegram Bot Kit', 'Reusable PHP toolkit for Telegram bots.', null, 'https://github.com/example/tg-kit', 'PHP, Webhooks', 'paused', 'medium', $d('-60 days'), null, '#F472B6'],
        ];
        $pid = [];
        foreach ($projects as [$name, $desc, $url, $repo, $tech, $status, $prio, $start, $deadline, $color]) {
            $pid[] = Database::insert('projects', [
                'user_id' => $uid, 'name' => $name, 'description' => $desc, 'url' => $url, 'repo_url' => $repo,
                'technologies' => $tech, 'status' => $status, 'priority' => $prio, 'start_date' => $start,
                'deadline' => $deadline, 'color' => $color, 'notes' => "## Notes\n- Client contact via email\n- Weekly sync on Mondays",
                'created_at' => $dt('-30 days'),
            ]);
        }

        $tasks = [
            [0, 'Checkout flow: integrate Payme', 'in_progress', 'critical', 'Backend', $d('today'), '15:00'],
            [0, 'Product filters UI polish', 'review', 'medium', 'Frontend', $d('+1 day'), null],
            [0, 'Write API docs for orders endpoint', 'todo', 'low', 'Docs', $d('+6 days'), null],
            [0, 'Fix cart rounding bug', 'done', 'high', 'Bugfix', $d('-2 days'), null],
            [0, 'Set up staging deploy', 'done', 'medium', 'DevOps', $d('-4 days'), null],
            [1, 'Event ingestion batching', 'in_progress', 'high', 'Backend', $d('+2 days'), '11:00'],
            [1, 'Retention cohort chart', 'todo', 'medium', 'Frontend', $d('+3 days'), null],
            [1, 'Load test ingestion endpoint', 'todo', 'high', 'DevOps', $d('-1 day'), null],
            [1, 'Dashboard date-range picker', 'done', 'medium', 'Frontend', $d('-1 day'), null],
            [1, 'Migrate to partitioned tables', 'done', 'high', 'Database', $d('-3 days'), null],
            [2, 'Gather requirements with client', 'todo', 'medium', 'Planning', $d('+5 days'), '10:30'],
            [2, 'Draft data model', 'todo', 'low', 'Planning', $d('+8 days'), null],
            [null, 'Renew SSL wildcard for agency', 'todo', 'high', 'Ops', $d('today'), '18:00'],
            [null, 'Update PHP to 8.3 on VPS', 'todo', 'medium', 'Ops', $d('+4 days'), null],
            [null, 'Review monthly expenses', 'done', 'low', 'Admin', $d('-5 days'), null],
            [4, 'Inline keyboard helpers', 'done', 'medium', 'Backend', $d('-6 days'), null],
        ];
        $pos = 1;
        foreach ($tasks as $i => [$p, $title, $status, $prio, $cat, $due, $time]) {
            $completed = $status === 'done' ? $dt('-' . ($i % 6) . ' days 1' . ($i % 8) . ':20') : null;
            Database::insert('tasks', [
                'user_id' => $uid, 'project_id' => $p !== null ? $pid[$p] : null, 'title' => $title, 'status' => $status,
                'priority' => $prio, 'category' => $cat, 'due_date' => $due, 'due_time' => $time, 'position' => $pos++,
                'completed_at' => $completed, 'created_at' => $dt('-10 days'),
                'updated_at' => $completed ?? $dt('-' . ($i % 5) . ' days'),
            ]);
            if ($completed) {
                Database::insert('activity_logs', ['user_id' => $uid, 'action' => 'completed', 'entity_type' => 'task', 'entity_id' => null, 'description' => "Completed task “{$title}”", 'created_at' => $completed]);
            }
        }

        $domains = [
            ['nebula.example.com', 'Namecheap', $d('-340 days'), $d('+25 days'), 12.98, 'USD', 0, 'Cloudflare', $d('+48 days')],
            ['pulse.example.com', 'Porkbun', $d('-200 days'), $d('+165 days'), 10.37, 'USD', 1, 'Cloudflare', $d('+9 days')],
            ['devspace.uz', 'Uzinfocom', $d('-360 days'), $d('+6 days'), 120000, 'UZS', 0, 'Self-hosted', $d('+70 days')],
            ['portfolio.example.com', 'Cloudflare', $d('-700 days'), $d('+300 days'), 9.15, 'USD', 1, 'Cloudflare', $d('+80 days')],
        ];
        foreach ($domains as $i => [$name, $reg, $regAt, $exp, $price, $cur, $auto, $dns, $ssl]) {
            Database::insert('domains', [
                'user_id' => $uid, 'project_id' => $pid[$i] ?? null, 'name' => $name, 'registrar' => $reg, 'registered_at' => $regAt,
                'expires_at' => $exp, 'renewal_price' => $price, 'currency' => $cur, 'auto_renew' => $auto,
                'dns_provider' => $dns, 'ssl_expires_at' => $ssl, 'ssl_checked_at' => now(),
            ]);
        }

        $servers = [
            ['prod-web-01', 'Hetzner', '203.0.113.10', 'Ubuntu 24.04 LTS', 'Falkenstein, DE', '4 vCPU', '8 GB', '160 GB NVMe', 'online', 14.4, 'EUR', [0, 1]],
            ['db-primary', 'DigitalOcean', '203.0.113.24', 'Debian 12', 'Frankfurt, DE', '2 vCPU', '4 GB', '80 GB SSD', 'online', 24, 'USD', [0, 1]],
            ['staging-box', 'Vultr', '198.51.100.7', 'Ubuntu 22.04 LTS', 'Amsterdam, NL', '1 vCPU', '2 GB', '55 GB SSD', 'maintenance', 10, 'USD', [0]],
            ['uz-shared', 'Ahost.uz', '198.51.100.42', 'CloudLinux 8', 'Tashkent, UZ', 'Shared', '2 GB', '20 GB', 'online', 95000, 'UZS', [3]],
        ];
        $sid = [];
        foreach ($servers as [$name, $prov, $ip, $os, $loc, $cpu, $ram, $disk, $status, $cost, $cur, $links]) {
            $id = Database::insert('servers', [
                'user_id' => $uid, 'name' => $name, 'provider' => $prov, 'ip_address' => $ip, 'os' => $os, 'location' => $loc,
                'cpu' => $cpu, 'ram' => $ram, 'storage' => $disk, 'status' => $status, 'monthly_cost' => $cost, 'currency' => $cur,
            ]);
            $sid[] = $id;
            foreach ($links as $l) {
                Database::query('INSERT INTO server_projects (server_id, project_id) VALUES (?, ?)', [$id, $pid[$l]]);
            }
        }

        foreach ([
            ['Example.com', 'https://example.com', 0, 0],
            ['GitHub status', 'https://www.githubstatus.com', null, null],
            ['Wikipedia', 'https://www.wikipedia.org', 1, 1],
        ] as [$name, $url, $p, $s]) {
            Database::insert('websites', [
                'user_id' => $uid, 'project_id' => $p !== null ? $pid[$p] : null, 'server_id' => $s !== null ? $sid[$s] : null,
                'name' => $name, 'url' => $url, 'method' => 'GET', 'check_interval' => 5, 'timeout_seconds' => 10, 'next_check_at' => now(),
            ]);
        }

        foreach ([
            ['Stripe', 'Live secret key', 'sk_live_demo_51Hxxxxxxxxxxxxxxxx9f3A', 0, $d('+180 days'), 'payments,production'],
            ['OpenWeather', 'Default API key', 'demo_owm_0c8a4f1e2b7d9a3c5e6f', 1, null, 'weather'],
            ['Telegram', 'Bot token @tgkit_bot', '123456789:AAH-demo-token-value-xyz', 4, $d('+10 days'), 'bot'],
        ] as [$provider, $name, $secret, $p, $exp, $tags]) {
            Database::insert('api_credentials', [
                'user_id' => $uid, 'project_id' => $pid[$p], 'provider' => $provider, 'name' => $name,
                'secret_encrypted' => Crypto::encrypt($secret), 'secret_hint' => substr($secret, -4), 'expires_at' => $exp, 'tags' => $tags,
            ]);
        }

        $cats = [];
        foreach (Database::all('SELECT id, name FROM expense_categories WHERE user_id = ?', [$uid]) as $c) {
            $cats[$c['name']] = $c['id'];
        }
        $expenses = [
            ['Hetzner VPS', 'Hetzner', 14.4, 'EUR', 'Hosting', 0, $d('first day of this month'), 1],
            ['DigitalOcean droplet', 'DigitalOcean', 24, 'USD', 'Hosting', 1, $d('first day of this month +2 days'), 1],
            ['GitHub Copilot', 'GitHub', 10, 'USD', 'Software & SaaS', null, $d('-8 days'), 1],
            ['nebula domain renewal', 'Namecheap', 12.98, 'USD', 'Domains', 0, $d('-35 days'), 0],
            ['Shared hosting', 'Ahost.uz', 95000, 'UZS', 'Hosting', 3, $d('-12 days'), 1],
            ['Mechanical keyboard', 'Local store', 850000, 'UZS', 'Hardware', null, $d('-50 days'), 0],
            ['Figma Pro', 'Figma', 15, 'USD', 'Software & SaaS', null, $d('-65 days'), 0],
            ['OpenAI API usage', 'OpenAI', 18.4, 'USD', 'APIs', 1, $d('-3 days'), 0],
            ['Telegram ads test', 'Telegram', 40, 'USD', 'Marketing', 4, $d('-95 days'), 0],
            ['JetBrains All Products', 'JetBrains', 289, 'USD', 'Software & SaaS', null, $d('-140 days'), 0],
            ['Hetzner VPS', 'Hetzner', 14.4, 'EUR', 'Hosting', 0, $d('first day of last month'), 0],
            ['DigitalOcean droplet', 'DigitalOcean', 24, 'USD', 'Hosting', 1, $d('first day of last month +2 days'), 0],
        ];
        foreach ($expenses as [$title, $vendor, $amount, $cur, $cat, $p, $date, $recurring]) {
            Database::insert('expenses', [
                'user_id' => $uid, 'project_id' => $p !== null ? $pid[$p] : null, 'category_id' => $cats[$cat] ?? null,
                'title' => $title, 'vendor' => $vendor, 'amount' => $amount, 'currency' => $cur, 'spent_at' => $date,
                'is_recurring' => $recurring, 'recurrence' => $recurring ? 'monthly' : null,
                'next_occurrence' => $recurring ? date('Y-m-d', strtotime($date . ' +1 month')) : null,
            ]);
        }

        $snippets = [
            ['PDO connection helper', 'php', 'Database', 'pdo,mysql', "<?php\n\$pdo = new PDO(\n    'mysql:host=localhost;dbname=app;charset=utf8mb4',\n    \$user,\n    \$pass,\n    [\n        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n        PDO::ATTR_EMULATE_PREPARES => false,\n    ]\n);", 1],
            ['Debounce hook', 'javascript', 'React', 'react,hooks', "import { useEffect, useState } from 'react';\n\nexport function useDebounce(value, delay = 300) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const t = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(t);\n  }, [value, delay]);\n  return debounced;\n}", 1],
            ['Nginx PHP-FPM location', 'nginx', 'DevOps', 'nginx,php', "location ~ \\.php$ {\n    include fastcgi_params;\n    fastcgi_pass unix:/run/php/php8.3-fpm.sock;\n    fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;\n}", 0],
            ['Find slow MySQL queries', 'sql', 'Database', 'mysql,performance', "SELECT digest_text, count_star, avg_timer_wait / 1e9 AS avg_ms\nFROM performance_schema.events_statements_summary_by_digest\nORDER BY avg_timer_wait DESC\nLIMIT 10;", 0],
            ['Backup a database', 'bash', 'DevOps', 'mysql,backup', "#!/usr/bin/env bash\nmysqldump --single-transaction -u \"\$DB_USER\" -p \"\$DB_NAME\" | gzip > \"backup-\$(date +%F).sql.gz\"", 0],
        ];
        foreach ($snippets as [$title, $lang, $cat, $tags, $code, $fav]) {
            Database::insert('code_snippets', ['user_id' => $uid, 'title' => $title, 'language' => $lang, 'category' => $cat, 'tags' => $tags, 'code' => $code, 'is_favorite' => $fav]);
        }

        // A little recent history so the activity views aren't empty.
        $history = [
            ['-6 days 10:12', 'updated', 'project', 0, 'Updated project “Nebula Commerce”'],
            ['-5 days 14:40', 'created', 'snippet', null, 'Created snippet “Debounce hook”'],
            ['-4 days 09:05', 'updated', 'project', 1, 'Updated project “Pulse Analytics”'],
            ['-3 days 16:30', 'created', 'domain', null, 'Created domain “devspace.uz”'],
            ['-2 days 11:15', 'updated', 'server', null, 'Updated server “staging-box”'],
            ['-1 days 17:45', 'updated', 'project', 1, 'Updated project “Pulse Analytics”'],
            ['today 09:10', 'created', 'task', null, 'Created task “Renew SSL wildcard for agency”'],
            ['today 10:25', 'updated', 'project', 0, 'Updated project “Nebula Commerce”'],
        ];
        foreach ($history as [$when, $action, $type, $p, $desc]) {
            $at = $dt($when);
            if ($at > now()) {
                continue;
            }
            Database::insert('activity_logs', ['user_id' => $uid, 'action' => $action, 'entity_type' => $type, 'entity_id' => $p !== null ? $pid[$p] : null, 'description' => $desc, 'created_at' => $at]);
        }
    }
}
