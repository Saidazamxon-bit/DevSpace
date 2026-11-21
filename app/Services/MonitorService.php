<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\Logger;

/**
 * Real HTTP uptime monitoring. Run by cron (cron/monitor.php) every minute;
 * checks every active website whose next_check_at is due, in parallel via curl_multi.
 */
final class MonitorService
{
    public const MAX_PER_RUN = 100;
    public const BATCH = 10;

    /** Check every due website. Returns number of checks performed. */
    public static function runDue(): int
    {
        $sites = Database::all(
            'SELECT * FROM websites WHERE is_active = 1 AND (next_check_at IS NULL OR next_check_at <= NOW())
             ORDER BY next_check_at IS NOT NULL, next_check_at ASC LIMIT ' . self::MAX_PER_RUN
        );
        $done = 0;
        foreach (array_chunk($sites, self::BATCH) as $batch) {
            $results = self::probe($batch);
            foreach ($batch as $site) {
                self::record($site, $results[$site['id']]);
                $done++;
            }
        }
        return $done;
    }

    /** Check one website immediately (used by the "Check now" button). */
    public static function checkNow(array $site): array
    {
        $result = self::probe([$site])[$site['id']];
        self::record($site, $result);
        return $result;
    }

    /** @return array<int, array{is_up:bool, status_code:?int, response_ms:?int, error:?string}> */
    private static function probe(array $sites): array
    {
        $multi = curl_multi_init();
        $handles = [];
        foreach ($sites as $site) {
            $ch = curl_init($site['url']);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_NOBODY => $site['method'] === 'HEAD',
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 5,
                CURLOPT_CONNECTTIMEOUT => min(10, (int) $site['timeout_seconds']),
                CURLOPT_TIMEOUT => (int) $site['timeout_seconds'],
                CURLOPT_USERAGENT => (string) config('app.monitoring.user_agent'),
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
                CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
                CURLOPT_HTTPHEADER => ['Cache-Control: no-cache'],
                // Only read the first 64 KB of the body — we only care about status & timing.
                CURLOPT_BUFFERSIZE => 16384,
                CURLOPT_NOPROGRESS => false,
                CURLOPT_PROGRESSFUNCTION => static fn ($ch, $dlTotal, $dl, $ulTotal, $ul) => $dl > 65536 ? 1 : 0,
            ]);
            curl_multi_add_handle($multi, $ch);
            $handles[(int) $site['id']] = [$ch, $site];
        }

        // With curl_multi, per-handle result codes are only available via curl_multi_info_read().
        $codes = [];
        do {
            $status = curl_multi_exec($multi, $running);
            while ($info = curl_multi_info_read($multi)) {
                $codes[spl_object_id($info['handle'])] = (int) $info['result'];
            }
            if ($running) {
                curl_multi_select($multi, 1.0);
            }
        } while ($running && $status === CURLM_OK);
        while ($info = curl_multi_info_read($multi)) {
            $codes[spl_object_id($info['handle'])] = (int) $info['result'];
        }

        $results = [];
        foreach ($handles as $id => [$ch, $site]) {
            $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $errno = $codes[spl_object_id($ch)] ?? curl_errno($ch);
            $error = $errno ? curl_strerror($errno) : null;
            if ($error === null && $code === 0) {
                $error = 'No response';
            }
            // Aborted on purpose after 64 KB — not an error.
            if ($errno === CURLE_ABORTED_BY_CALLBACK && $code > 0) {
                $error = null;
            }
            $ms = (int) round(curl_getinfo($ch, CURLINFO_TOTAL_TIME) * 1000);
            $expected = $site['expected_status'] !== null ? (int) $site['expected_status'] : null;
            $isUp = $error === null && $code > 0 && ($expected !== null ? $code === $expected : ($code >= 200 && $code < 400));
            if ($error === null && !$isUp) {
                $error = $expected !== null ? "Expected HTTP $expected, got $code" : "HTTP $code";
            }
            $results[$id] = [
                'is_up' => $isUp,
                'status_code' => $code ?: null,
                'response_ms' => $code > 0 ? $ms : null,
                'error' => $error ? mb_substr($error, 0, 255) : null,
            ];
            curl_multi_remove_handle($multi, $ch);
            curl_close($ch);
        }
        curl_multi_close($multi);
        return $results;
    }

    private static function record(array $site, array $r): void
    {
        $now = now();
        $id = (int) $site['id'];
        $userId = (int) $site['user_id'];
        try {
            Database::insert('monitoring_checks', [
                'website_id' => $id,
                'is_up' => $r['is_up'] ? 1 : 0,
                'status_code' => $r['status_code'],
                'response_ms' => $r['response_ms'],
                'error' => $r['error'],
                'checked_at' => $now,
            ]);
            Database::update('websites', [
                'last_state' => $r['is_up'] ? 'up' : 'down',
                'last_status_code' => $r['status_code'],
                'last_response_ms' => $r['response_ms'],
                'last_error' => $r['error'],
                'last_checked_at' => $now,
                'next_check_at' => date('Y-m-d H:i:s', time() + (int) $site['check_interval'] * 60 - 5),
            ], 'id = :id', ['id' => $id]);

            $open = Database::first('SELECT id, started_at FROM monitoring_incidents WHERE website_id = ? AND resolved_at IS NULL', [$id]);
            $notify = Settings::bool($userId, 'notify_monitoring');
            if (!$r['is_up'] && $open === null) {
                $incidentId = Database::insert('monitoring_incidents', [
                    'website_id' => $id,
                    'started_at' => $now,
                    'status_code' => $r['status_code'],
                    'error' => $r['error'],
                ]);
                ActivityLogger::log($userId, 'incident', 'monitor', $id, "{$site['name']} is down: " . ($r['error'] ?? 'unreachable'));
                if ($notify) {
                    Notifier::notify($userId, 'monitoring', 'critical', "{$site['name']} is down", ($r['error'] ?? 'No response') . ' — ' . $site['url'], '/monitoring/' . $id, "incident:$incidentId:down", true);
                }
            } elseif ($r['is_up'] && $open !== null) {
                Database::update('monitoring_incidents', ['resolved_at' => $now], 'id = :id', ['id' => $open['id']]);
                $mins = max(1, (int) round((time() - strtotime($open['started_at'])) / 60));
                ActivityLogger::log($userId, 'recovered', 'monitor', $id, "{$site['name']} recovered after {$mins} min");
                if ($notify) {
                    Notifier::notify($userId, 'monitoring', 'success', "{$site['name']} is back up", "Downtime lasted about {$mins} minute(s).", '/monitoring/' . $id, "incident:{$open['id']}:up", true);
                }
            }
        } catch (\Throwable $e) {
            Logger::error('Monitor record failed', ['website' => $id, 'message' => $e->getMessage()]);
        }
    }

    public static function prune(): void
    {
        $days = max(7, (int) config('app.monitoring.retention_days'));
        Database::query('DELETE FROM monitoring_checks WHERE checked_at < NOW() - INTERVAL ' . $days . ' DAY');
    }
}
