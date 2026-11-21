<?php

declare(strict_types=1);

/*
 | Daily maintenance. Schedule hourly (alerts are de-duplicated) or at least daily:
 |   15 * * * * /usr/local/bin/php /home/USER/devspace/cron/daily.php >/dev/null 2>&1
 |
 | - Generates notifications (domains, SSL, tasks, deadlines, API key expiry)
 | - Creates recurring expense entries
 | - Refreshes SSL expiry dates (once per day per domain)
 | - Prunes old monitoring checks & rate-limit rows
 | - Optional nightly database backup (BACKUP_DAILY=true in .env)
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\Database;
use App\Core\Logger;
use App\Services\AlertService;
use App\Services\BackupService;
use App\Services\MonitorService;
use App\Services\RateLimiter;
use App\Services\RecurringExpenseService;
use App\Services\SslChecker;

$verbose = in_array('-v', $argv, true);
$say = static function (string $m) use ($verbose) { if ($verbose) { echo $m . "\n"; } };

try {
    $say('Recurring expenses created: ' . RecurringExpenseService::run());

    $domains = Database::all('SELECT id, name FROM domains WHERE ssl_checked_at IS NULL OR ssl_checked_at < NOW() - INTERVAL 1 DAY LIMIT 50');
    foreach ($domains as $d) {
        $expiry = SslChecker::expiry($d['name'], 6);
        Database::update('domains', array_filter(['ssl_expires_at' => $expiry, 'ssl_checked_at' => now()], static fn ($v) => $v !== null), 'id = :id', ['id' => $d['id']]);
    }
    $say('SSL refreshed: ' . count($domains));

    $say('Notifications created: ' . AlertService::runForAll());
    MonitorService::prune();
    RateLimiter::cleanup();

    $stamp = storage_path('cache/cron_daily.stamp');
    $lastBackup = storage_path('cache/backup_daily.stamp');
    if (env('BACKUP_DAILY', false) && (!is_file($lastBackup) || filemtime($lastBackup) < time() - 86000)) {
        BackupService::create();
        touch($lastBackup);
        $say('Backup created.');
    }
    touch($stamp);
} catch (Throwable $e) {
    Logger::error('Daily cron failed: ' . $e->getMessage());
    exit(1);
}
