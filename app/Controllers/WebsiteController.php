<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Models\Website;
use App\Services\MonitorService;
use App\Services\RateLimiter;

final class WebsiteController extends ResourceController
{
    protected string $model = Website::class;

    protected function prepare(array $data, Request $request, ?array $existing): array
    {
        // New or re-targeted monitors are checked on the next cron tick.
        if ($existing === null || (isset($data['url']) && $data['url'] !== $existing['url'])) {
            $data['next_check_at'] = now();
            if ($existing !== null) {
                $data['last_state'] = 'unknown';
            }
        }
        if (isset($data['check_interval'])) {
            $data['check_interval'] = (int) $data['check_interval'];
        }
        return $data;
    }

    public function index(Request $request): array
    {
        $uid = $request->userId();
        $sites = Website::list($uid, $_GET);
        $cron = storage_path('cache/cron_monitor.stamp');
        return [
            'data' => $sites,
            'meta' => [
                'up' => count(array_filter($sites, static fn ($s) => $s['last_state'] === 'up')),
                'down' => count(array_filter($sites, static fn ($s) => $s['last_state'] === 'down')),
                'avg_uptime_30d' => ($u = array_filter(array_column($sites, 'uptime_30d'), static fn ($v) => $v !== null)) ? round(array_sum($u) / count($u), 2) : null,
                'cron_last_run' => is_file($cron) ? date('Y-m-d H:i:s', (int) filemtime($cron)) : null,
            ],
        ];
    }

    public function show(Request $request): array
    {
        $uid = $request->userId();
        $site = Website::findOrFail($request->id(), $uid);
        $range = in_array($request->query('range'), ['24h', '7d', '30d'], true) ? $request->query('range') : '24h';
        $interval = ['24h' => '1 DAY', '7d' => '7 DAY', '30d' => '30 DAY'][$range];

        if ($range === '24h') {
            $series = Database::all(
                "SELECT checked_at AS t, response_ms AS ms, is_up AS up FROM monitoring_checks
                 WHERE website_id = ? AND checked_at >= NOW() - INTERVAL $interval ORDER BY checked_at ASC",
                [$site['id']]
            );
        } else {
            // Hourly / 6-hourly buckets for longer ranges.
            $bucket = $range === '7d' ? 3600 : 21600;
            $series = Database::all(
                "SELECT FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(checked_at) / $bucket) * $bucket) AS t,
                        ROUND(AVG(response_ms)) AS ms, MIN(is_up) AS up
                 FROM monitoring_checks WHERE website_id = ? AND checked_at >= NOW() - INTERVAL $interval
                 GROUP BY FLOOR(UNIX_TIMESTAMP(checked_at) / $bucket) ORDER BY t ASC",
                [$site['id']]
            );
        }
        $site['series'] = array_map(static fn ($r) => ['t' => $r['t'], 'ms' => $r['ms'] !== null ? (int) $r['ms'] : null, 'up' => (bool) $r['up']], $series);
        $site['range'] = $range;
        $site['uptime_7d'] = ($v = Database::value('SELECT ROUND(AVG(is_up) * 100, 2) FROM monitoring_checks WHERE website_id = ? AND checked_at >= NOW() - INTERVAL 7 DAY', [$site['id']])) !== null ? (float) $v : null;
        $site['checks_total'] = (int) Database::value('SELECT COUNT(*) FROM monitoring_checks WHERE website_id = ?', [$site['id']]);
        $site['recent_checks'] = Database::all('SELECT id, is_up, status_code, response_ms, error, checked_at FROM monitoring_checks WHERE website_id = ? ORDER BY checked_at DESC LIMIT 20', [$site['id']]);
        $site['incidents'] = $this->incidentRows($uid, $site['id']);
        return ['data' => $site];
    }

    public function checkNow(Request $request): array
    {
        $uid = $request->userId();
        $site = Website::findOrFail($request->id(), $uid);
        RateLimiter::enforce("monitor-check:$uid", 30, 600);
        $raw = Database::first('SELECT * FROM websites WHERE id = ?', [$site['id']]);
        $result = MonitorService::checkNow($raw);
        return ['data' => Website::findOrFail($site['id'], $uid), 'result' => $result];
    }

    public function incidents(Request $request): array
    {
        return ['data' => $this->incidentRows($request->userId(), null)];
    }

    private function incidentRows(int $uid, ?int $siteId): array
    {
        $rows = Database::all(
            'SELECT i.*, w.name AS website_name, w.url,
                    TIMESTAMPDIFF(SECOND, i.started_at, COALESCE(i.resolved_at, NOW())) AS duration_seconds
             FROM monitoring_incidents i JOIN websites w ON w.id = i.website_id
             WHERE w.user_id = ?' . ($siteId ? ' AND w.id = ' . (int) $siteId : '') . '
             ORDER BY i.started_at DESC LIMIT 50',
            [$uid]
        );
        return array_map(static function ($r) {
            $r['duration_seconds'] = (int) $r['duration_seconds'];
            $r['open'] = $r['resolved_at'] === null;
            return $r;
        }, $rows);
    }
}
