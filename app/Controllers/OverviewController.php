<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Services\Settings;

/** Everything the Overview page needs, computed from real database records. */
final class OverviewController
{
    public function index(Request $request): array
    {
        $uid = $request->userId();
        return ['data' => [
            'stats' => $this->stats($uid),
            'timeline' => $this->timeline($uid),
            'weekly' => $this->weekly($uid),
            'insights' => $this->insights($uid),
            'generated_at' => now(),
        ]];
    }

    private function stats(int $uid): array
    {
        $p = Database::first(
            "SELECT COUNT(*) AS total,
                SUM(status = 'active') AS active, SUM(status = 'completed') AS completed,
                SUM(status = 'planning') AS planning, SUM(status = 'paused') AS paused
             FROM projects WHERE user_id = ? AND archived_at IS NULL",
            [$uid]
        );
        $projectProgress = Database::all(
            "SELECT p.id, p.name, p.status,
                (SELECT COUNT(*) FROM tasks k WHERE k.project_id = p.id) AS total,
                (SELECT COUNT(*) FROM tasks k WHERE k.project_id = p.id AND k.status = 'done') AS done
             FROM projects p WHERE p.user_id = ? AND p.archived_at IS NULL AND p.status IN ('active','planning')",
            [$uid]
        );
        $sumTotal = array_sum(array_column($projectProgress, 'total'));
        $sumDone = array_sum(array_column($projectProgress, 'done'));

        $servers = Database::all("SELECT id, name, status FROM servers WHERE user_id = ? ORDER BY FIELD(status,'offline','maintenance','online'), name", [$uid]);
        $counts = ['online' => 0, 'maintenance' => 0, 'offline' => 0];
        foreach ($servers as $s) {
            $counts[$s['status']]++;
        }

        $t = Database::first(
            "SELECT SUM(status <> 'done') AS pending, SUM(status = 'done') AS done, COUNT(*) AS total,
                SUM(status <> 'done' AND due_date < CURDATE()) AS overdue,
                SUM(status <> 'done' AND due_date = CURDATE()) AS due_today,
                SUM(status = 'in_progress') AS in_progress,
                SUM(completed_at >= CURDATE() - INTERVAL 6 DAY) AS done_week
             FROM tasks WHERE user_id = ?",
            [$uid]
        );

        $days = (int) Settings::get($uid, 'domain_alert_days');
        $domains = Database::all(
            'SELECT id, name, expires_at, DATEDIFF(expires_at, CURDATE()) AS days_left FROM domains WHERE user_id = ?
             ORDER BY expires_at IS NULL, expires_at ASC',
            [$uid]
        );
        $dState = static fn ($d) => $d['days_left'] === null ? 'unknown' : ((int) $d['days_left'] < 0 ? 'expired' : ((int) $d['days_left'] <= $days ? 'expiring' : 'active'));
        $domainItems = array_map(static fn ($d) => ['id' => (int) $d['id'], 'name' => $d['name'], 'state' => $dState($d), 'days_left' => $d['days_left'] !== null ? (int) $d['days_left'] : null], $domains);
        $stateCounts = array_count_values(array_column($domainItems, 'state'));

        $sites = Database::first("SELECT COUNT(*) AS total, SUM(last_state = 'up') AS up, SUM(last_state = 'down') AS down FROM websites WHERE user_id = ? AND is_active = 1", [$uid]);

        return [
            'projects' => [
                'total' => (int) $p['total'],
                'active' => (int) $p['active'],
                'completed' => (int) $p['completed'],
                'planning' => (int) $p['planning'],
                'paused' => (int) $p['paused'],
                'tasks_total' => (int) $sumTotal,
                'tasks_done' => (int) $sumDone,
                'progress' => $sumTotal > 0 ? (int) round($sumDone / $sumTotal * 100) : 0,
            ],
            'servers' => [
                'total' => count($servers),
                'online' => $counts['online'],
                'maintenance' => $counts['maintenance'],
                'offline' => $counts['offline'],
                'items' => array_slice($servers, 0, 7),
                'websites_up' => (int) $sites['up'],
                'websites_down' => (int) $sites['down'],
                'websites_total' => (int) $sites['total'],
            ],
            'tasks' => [
                'pending' => (int) $t['pending'],
                'done' => (int) $t['done'],
                'total' => (int) $t['total'],
                'overdue' => (int) $t['overdue'],
                'due_today' => (int) $t['due_today'],
                'in_progress' => (int) $t['in_progress'],
                'done_week' => (int) $t['done_week'],
            ],
            'domains' => [
                'total' => count($domainItems),
                'active' => $stateCounts['active'] ?? 0,
                'expiring' => $stateCounts['expiring'] ?? 0,
                'expired' => $stateCounts['expired'] ?? 0,
                'next' => $domainItems[0] ?? null,
                'items' => array_slice($domainItems, 0, 6),
            ],
        ];
    }

    /** Today's events (past & upcoming) plus what's coming in the next 14 days. */
    private function timeline(int $uid): array
    {
        $items = [];

        foreach (Database::all(
            "SELECT id, action, entity_type, entity_id, description, created_at FROM activity_logs
             WHERE user_id = ? AND created_at >= CURDATE() AND entity_type <> 'auth' ORDER BY created_at DESC LIMIT 10",
            [$uid]
        ) as $a) {
            $items[] = [
                'kind' => in_array($a['action'], ['incident'], true) ? 'incident' : 'activity',
                'title' => $this->activityTitle($a),
                'subtitle' => $a['description'],
                'at' => $a['created_at'],
                'all_day' => false,
                'link' => $this->entityLink($a['entity_type'], $a['entity_id']),
                'level' => $a['action'] === 'incident' ? 'critical' : ($a['action'] === 'completed' ? 'success' : 'info'),
            ];
        }

        foreach (Database::all(
            "SELECT t.id, t.title, t.due_date, t.due_time, t.priority, p.name AS project_name FROM tasks t
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.user_id = ? AND t.status <> 'done' AND t.due_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 14 DAY
             ORDER BY t.due_date, t.due_time LIMIT 12",
            [$uid]
        ) as $t) {
            $items[] = [
                'kind' => 'task',
                'title' => $t['title'],
                'subtitle' => trim(($t['project_name'] ? $t['project_name'] . ' · ' : '') . ucfirst($t['priority']) . ' priority'),
                'at' => $t['due_date'] . ' ' . ($t['due_time'] ?? '23:59:00'),
                'all_day' => $t['due_time'] === null,
                'link' => '/tasks',
                'level' => in_array($t['priority'], ['high', 'critical'], true) ? 'warning' : 'info',
            ];
        }

        foreach (Database::all(
            "SELECT id, name, deadline FROM projects WHERE user_id = ? AND archived_at IS NULL AND status <> 'completed'
             AND deadline BETWEEN CURDATE() AND CURDATE() + INTERVAL 14 DAY",
            [$uid]
        ) as $p) {
            $items[] = ['kind' => 'deadline', 'title' => $p['name'] . ' deadline', 'subtitle' => 'Project deadline', 'at' => $p['deadline'] . ' 23:59:00', 'all_day' => true, 'link' => '/projects/' . $p['id'], 'level' => 'warning'];
        }

        foreach (Database::all(
            'SELECT id, name, expires_at, ssl_expires_at FROM domains WHERE user_id = ?
             AND (expires_at BETWEEN CURDATE() AND CURDATE() + INTERVAL 30 DAY OR ssl_expires_at BETWEEN CURDATE() AND CURDATE() + INTERVAL 14 DAY)',
            [$uid]
        ) as $d) {
            if ($d['expires_at'] && $d['expires_at'] <= date('Y-m-d', strtotime('+30 days'))) {
                $items[] = ['kind' => 'domain', 'title' => $d['name'] . ' expires', 'subtitle' => 'Domain renewal due', 'at' => $d['expires_at'] . ' 23:59:00', 'all_day' => true, 'link' => '/domains', 'level' => 'warning'];
            }
            if ($d['ssl_expires_at'] && $d['ssl_expires_at'] <= date('Y-m-d', strtotime('+14 days'))) {
                $items[] = ['kind' => 'domain', 'title' => 'SSL · ' . $d['name'], 'subtitle' => 'Certificate expires', 'at' => $d['ssl_expires_at'] . ' 23:59:00', 'all_day' => true, 'link' => '/domains', 'level' => 'warning'];
            }
        }

        foreach (Database::all(
            'SELECT i.id, i.started_at, i.error, w.id AS wid, w.name FROM monitoring_incidents i JOIN websites w ON w.id = i.website_id
             WHERE w.user_id = ? AND i.resolved_at IS NULL',
            [$uid]
        ) as $i) {
            if ($i['started_at'] >= today()) {
                continue; // already shown via the activity log entry
            }
            $items[] = ['kind' => 'incident', 'title' => $i['name'] . ' is down', 'subtitle' => $i['error'] ?? 'Unreachable', 'at' => $i['started_at'], 'all_day' => false, 'link' => '/monitoring/' . $i['wid'], 'level' => 'critical', 'ongoing' => true];
        }

        usort($items, static fn ($a, $b) => strcmp($a['at'], $b['at']));
        return $items;
    }

    private function weekly(int $uid): array
    {
        $start = date('Y-m-d', strtotime('-6 days'));
        $prevStart = date('Y-m-d', strtotime('-13 days'));
        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $d = date('Y-m-d', strtotime("$start +$i days"));
            $days[$d] = ['date' => $d, 'tasks_completed' => 0, 'activity' => 0, 'active_projects' => 0];
        }

        foreach (Database::all('SELECT DATE(completed_at) AS d, COUNT(*) AS n FROM tasks WHERE user_id = ? AND completed_at >= ? GROUP BY d', [$uid, $start]) as $r) {
            if (isset($days[$r['d']])) {
                $days[$r['d']]['tasks_completed'] = (int) $r['n'];
            }
        }
        foreach (Database::all("SELECT DATE(created_at) AS d, COUNT(*) AS n FROM activity_logs WHERE user_id = ? AND created_at >= ? AND entity_type <> 'auth' GROUP BY d", [$uid, $start]) as $r) {
            if (isset($days[$r['d']])) {
                $days[$r['d']]['activity'] = (int) $r['n'];
            }
        }
        foreach (Database::all(
            "SELECT d, COUNT(DISTINCT pid) AS n FROM (
                SELECT DATE(created_at) AS d, entity_id AS pid FROM activity_logs WHERE user_id = :u1 AND entity_type = 'project' AND created_at >= :s1
                UNION ALL SELECT DATE(updated_at), project_id FROM tasks WHERE user_id = :u2 AND project_id IS NOT NULL AND updated_at >= :s2
                UNION ALL SELECT DATE(spent_at), project_id FROM expenses WHERE user_id = :u3 AND project_id IS NOT NULL AND spent_at >= :s3
             ) x WHERE pid IS NOT NULL GROUP BY d",
            ['u1' => $uid, 's1' => $start, 'u2' => $uid, 's2' => $start, 'u3' => $uid, 's3' => $start]
        ) as $r) {
            if (isset($days[$r['d']])) {
                $days[$r['d']]['active_projects'] = (int) $r['n'];
            }
        }

        $series = array_values($days);
        $totals = [
            'tasks_completed' => array_sum(array_column($series, 'tasks_completed')),
            'activity' => array_sum(array_column($series, 'activity')),
            'active_projects' => (int) Database::value(
                "SELECT COUNT(DISTINCT pid) FROM (
                    SELECT entity_id AS pid FROM activity_logs WHERE user_id = :u1 AND entity_type = 'project' AND created_at >= :s1
                    UNION SELECT project_id FROM tasks WHERE user_id = :u2 AND project_id IS NOT NULL AND updated_at >= :s2
                 ) x WHERE pid IS NOT NULL",
                ['u1' => $uid, 's1' => $start, 'u2' => $uid, 's2' => $start]
            ),
        ];
        $previous = [
            'tasks_completed' => (int) Database::value('SELECT COUNT(*) FROM tasks WHERE user_id = ? AND completed_at >= ? AND completed_at < ?', [$uid, $prevStart, $start]),
            'activity' => (int) Database::value("SELECT COUNT(*) FROM activity_logs WHERE user_id = ? AND entity_type <> 'auth' AND created_at >= ? AND created_at < ?", [$uid, $prevStart, $start]),
        ];

        // Workload due within the current week window (last 6 days through next 7).
        $due = Database::first(
            "SELECT COUNT(*) AS total, SUM(status = 'done') AS done FROM tasks
             WHERE user_id = ? AND due_date BETWEEN ? AND CURDATE() + INTERVAL 7 DAY",
            [$uid, $start]
        );
        $busiest = null;
        foreach ($series as $d) {
            if ($d['tasks_completed'] > 0 && ($busiest === null || $d['tasks_completed'] > $busiest['tasks_completed'])) {
                $busiest = $d;
            }
        }

        return [
            'days' => $series,
            'totals' => $totals,
            'previous' => $previous,
            'due_window' => ['total' => (int) $due['total'], 'done' => (int) $due['done']],
            'busiest_day' => $busiest ? $busiest['date'] : null,
            'avg_per_day' => round($totals['tasks_completed'] / 7, 1),
        ];
    }

    private function insights(int $uid): array
    {
        $days = (int) Settings::get($uid, 'domain_alert_days');
        $deadlines = Database::all(
            "(SELECT 'task' AS kind, id, title AS name, due_date AS date, DATEDIFF(due_date, CURDATE()) AS days_left FROM tasks
               WHERE user_id = :u1 AND status <> 'done' AND due_date IS NOT NULL AND due_date >= CURDATE() - INTERVAL 30 DAY)
             UNION ALL
             (SELECT 'project', id, name, deadline, DATEDIFF(deadline, CURDATE()) FROM projects
               WHERE user_id = :u2 AND archived_at IS NULL AND status <> 'completed' AND deadline IS NOT NULL AND deadline >= CURDATE() - INTERVAL 30 DAY)
             ORDER BY date ASC LIMIT 5",
            ['u1' => $uid, 'u2' => $uid]
        );

        $serverWarnings = [];
        foreach (Database::all("SELECT id, name, status FROM servers WHERE user_id = ? AND status <> 'online'", [$uid]) as $s) {
            $serverWarnings[] = ['kind' => 'server', 'id' => (int) $s['id'], 'name' => $s['name'], 'detail' => ucfirst($s['status']), 'level' => $s['status'] === 'offline' ? 'critical' : 'warning', 'link' => '/servers'];
        }
        foreach (Database::all(
            "SELECT w.id, w.name, w.last_state, w.last_error,
                (SELECT ROUND(AVG(c.response_ms)) FROM monitoring_checks c WHERE c.website_id = w.id AND c.is_up = 1 AND c.checked_at >= NOW() - INTERVAL 1 DAY) AS avg_ms
             FROM websites w WHERE w.user_id = ? AND w.is_active = 1",
            [$uid]
        ) as $w) {
            if ($w['last_state'] === 'down') {
                $serverWarnings[] = ['kind' => 'website', 'id' => (int) $w['id'], 'name' => $w['name'], 'detail' => 'Down · ' . ($w['last_error'] ?? 'unreachable'), 'level' => 'critical', 'link' => '/monitoring/' . $w['id']];
            } elseif ($w['avg_ms'] !== null && (int) $w['avg_ms'] > 1500) {
                $serverWarnings[] = ['kind' => 'website', 'id' => (int) $w['id'], 'name' => $w['name'], 'detail' => 'Slow · avg ' . (int) $w['avg_ms'] . ' ms (24h)', 'level' => 'warning', 'link' => '/monitoring/' . $w['id']];
            }
        }

        $expiring = Database::all(
            "SELECT id, name, expires_at, DATEDIFF(expires_at, CURDATE()) AS days_left, 'domain' AS kind FROM domains
              WHERE user_id = :u1 AND expires_at IS NOT NULL AND expires_at <= CURDATE() + INTERVAL $days DAY
             UNION ALL
             SELECT id, name, ssl_expires_at, DATEDIFF(ssl_expires_at, CURDATE()), 'ssl' FROM domains
              WHERE user_id = :u2 AND ssl_expires_at IS NOT NULL AND ssl_expires_at <= CURDATE() + INTERVAL 14 DAY
             ORDER BY days_left ASC LIMIT 5",
            ['u1' => $uid, 'u2' => $uid]
        );

        $open = Database::first(
            "SELECT COUNT(*) AS total, SUM(priority IN ('high','critical')) AS urgent, SUM(due_date < CURDATE()) AS overdue,
                SUM(status = 'in_progress') AS in_progress, SUM(due_date IS NULL) AS undated
             FROM tasks WHERE user_id = ? AND status <> 'done'",
            [$uid]
        );
        $urgentTasks = Database::all(
            "SELECT t.id, t.title, t.priority, t.due_date, p.name AS project_name FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.user_id = ? AND t.status <> 'done' ORDER BY FIELD(t.priority,'critical','high','medium','low'), t.due_date IS NULL, t.due_date LIMIT 3",
            [$uid]
        );

        $recent = Database::all(
            "SELECT id, action, entity_type, entity_id, description, created_at FROM activity_logs
             WHERE user_id = ? AND entity_type <> 'auth' ORDER BY created_at DESC LIMIT 5",
            [$uid]
        );

        $cast = static fn (array $rows) => array_map(static function ($r) {
            if (array_key_exists('days_left', $r) && $r['days_left'] !== null) {
                $r['days_left'] = (int) $r['days_left'];
            }
            return $r;
        }, $rows);

        return [
            'deadlines' => $cast($deadlines),
            'server_warnings' => $serverWarnings,
            'expiring' => $cast($expiring),
            'incomplete' => [
                'total' => (int) $open['total'],
                'urgent' => (int) $open['urgent'],
                'overdue' => (int) $open['overdue'],
                'in_progress' => (int) $open['in_progress'],
                'undated' => (int) $open['undated'],
                'top' => $urgentTasks,
            ],
            'recent' => array_map(fn ($r) => $r + ['link' => $this->entityLink($r['entity_type'], $r['entity_id'])], $recent),
        ];
    }

    private function activityTitle(array $a): string
    {
        $entity = ucfirst($a['entity_type']);
        return match ($a['action']) {
            'created' => "New $a[entity_type]",
            'updated' => "$entity updated",
            'deleted' => "$entity removed",
            'completed' => 'Task completed',
            'archived' => 'Project archived',
            'restored' => 'Project restored',
            'incident' => 'Incident',
            'recovered' => 'Recovered',
            'revealed' => 'Secret revealed',
            default => ucfirst($a['action']),
        };
    }

    private function entityLink(string $type, mixed $id): ?string
    {
        return match ($type) {
            'project' => $id ? "/projects/$id" : '/projects',
            'task' => '/tasks',
            'domain' => '/domains',
            'server' => '/servers',
            'monitor' => $id ? "/monitoring/$id" : '/monitoring',
            'credential' => '/vault',
            'expense', 'expense category' => '/expenses',
            'snippet' => '/snippets',
            default => null,
        };
    }
}
