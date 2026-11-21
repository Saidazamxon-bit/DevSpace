<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;

/**
 * Generates notifications from real data: expiring domains & SSL, due/overdue tasks,
 * project deadlines and expiring API credentials. Idempotent thanks to dedupe keys.
 */
final class AlertService
{
    public static function runForAll(): int
    {
        $count = 0;
        foreach (Database::all('SELECT id FROM users') as $u) {
            $count += self::runForUser((int) $u['id']);
        }
        return $count;
    }

    /** Run at most once per hour per user when triggered lazily from the web UI. */
    public static function runIfStale(int $userId): void
    {
        $file = storage_path("cache/alerts_$userId.stamp");
        if (is_file($file) && filemtime($file) > time() - 3600) {
            return;
        }
        @touch($file);
        self::runForUser($userId);
    }

    public static function runForUser(int $userId): int
    {
        $n = 0;
        $days = max(1, (int) Settings::get($userId, 'domain_alert_days'));

        if (Settings::bool($userId, 'notify_domains')) {
            $rows = Database::all(
                'SELECT id, name, expires_at, DATEDIFF(expires_at, CURDATE()) AS d FROM domains
                 WHERE user_id = ? AND expires_at IS NOT NULL AND expires_at <= CURDATE() + INTERVAL ? DAY',
                [$userId, $days]
            );
            foreach ($rows as $r) {
                $d = (int) $r['d'];
                $bucket = $d < 0 ? 'expired' : ($d <= 7 ? '7' : 'window');
                $title = $d < 0 ? "Domain {$r['name']} has expired" : "Domain {$r['name']} expires in $d day" . ($d === 1 ? '' : 's');
                $n += (int) Notifier::notify($userId, 'domain', $d <= 7 ? 'critical' : 'warning', $title, 'Expiration date: ' . $r['expires_at'], '/domains', "domain:{$r['id']}:{$r['expires_at']}:$bucket", $d <= 7);
            }
            $ssl = Database::all(
                'SELECT id, name, ssl_expires_at, DATEDIFF(ssl_expires_at, CURDATE()) AS d FROM domains
                 WHERE user_id = ? AND ssl_expires_at IS NOT NULL AND ssl_expires_at <= CURDATE() + INTERVAL 14 DAY',
                [$userId]
            );
            foreach ($ssl as $r) {
                $d = (int) $r['d'];
                $title = $d < 0 ? "SSL certificate for {$r['name']} has expired" : "SSL for {$r['name']} expires in $d day" . ($d === 1 ? '' : 's');
                $n += (int) Notifier::notify($userId, 'ssl', $d <= 3 ? 'critical' : 'warning', $title, 'Certificate valid until ' . $r['ssl_expires_at'], '/domains', "ssl:{$r['id']}:{$r['ssl_expires_at']}:" . ($d <= 3 ? 'soon' : 'window'), $d <= 3);
            }
        }

        if (Settings::bool($userId, 'notify_tasks')) {
            $tasks = Database::all(
                "SELECT id, title, due_date FROM tasks WHERE user_id = ? AND status <> 'done' AND due_date IS NOT NULL AND due_date <= CURDATE()",
                [$userId]
            );
            foreach ($tasks as $t) {
                $overdue = $t['due_date'] < today();
                $n += (int) Notifier::notify($userId, 'task', $overdue ? 'warning' : 'info', ($overdue ? 'Overdue: ' : 'Due today: ') . $t['title'], 'Due date: ' . $t['due_date'], '/tasks', "task:{$t['id']}:{$t['due_date']}:" . ($overdue ? 'overdue' : 'today'));
            }
            $projects = Database::all(
                "SELECT id, name, deadline, DATEDIFF(deadline, CURDATE()) AS d FROM projects
                 WHERE user_id = ? AND archived_at IS NULL AND status <> 'completed' AND deadline BETWEEN CURDATE() AND CURDATE() + INTERVAL 3 DAY",
                [$userId]
            );
            foreach ($projects as $p) {
                $d = (int) $p['d'];
                $n += (int) Notifier::notify($userId, 'project', 'warning', "Project deadline: {$p['name']}", $d === 0 ? 'Due today' : "Due in $d day(s) — {$p['deadline']}", '/projects/' . $p['id'], "project:{$p['id']}:{$p['deadline']}");
            }
        }

        if (Settings::bool($userId, 'notify_credentials')) {
            $creds = Database::all(
                'SELECT id, provider, name, expires_at FROM api_credentials WHERE user_id = ? AND expires_at IS NOT NULL AND expires_at <= CURDATE() + INTERVAL 14 DAY',
                [$userId]
            );
            foreach ($creds as $c) {
                $n += (int) Notifier::notify($userId, 'credential', 'warning', "API key “{$c['name']}” ({$c['provider']}) expires soon", 'Expiration date: ' . $c['expires_at'], '/vault', "credential:{$c['id']}:{$c['expires_at']}");
            }
        }
        return $n;
    }
}
