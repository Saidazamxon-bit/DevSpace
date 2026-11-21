<?php

declare(strict_types=1);

/*
 | Uptime monitoring worker. Schedule every minute in cPanel → Cron Jobs:
 |   * * * * * /usr/local/bin/php /home/USER/devspace/cron/monitor.php >/dev/null 2>&1
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\Logger;
use App\Services\MonitorService;

$lock = fopen(storage_path('cache/monitor.lock'), 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) {
    exit(0); // previous run still in progress
}

try {
    $count = MonitorService::runDue();
    touch(storage_path('cache/cron_monitor.stamp'));
    if ($count > 0 && in_array('-v', $argv, true)) {
        echo "Checked $count website(s).\n";
    }
} catch (Throwable $e) {
    Logger::error('Monitor cron failed: ' . $e->getMessage());
    exit(1);
} finally {
    flock($lock, LOCK_UN);
}
