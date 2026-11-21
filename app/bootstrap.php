<?php

declare(strict_types=1);

/*
 | DEVSPACE bootstrap — shared by the web front controller, cron jobs and CLI.
 */

define('BASE_PATH', dirname(__DIR__));
define('DEVSPACE_VERSION', '1.0.0');

if (PHP_VERSION_ID < 80200) {
    http_response_code(500);
    exit('DEVSPACE requires PHP 8.2 or newer. Current version: ' . PHP_VERSION);
}

require BASE_PATH . '/app/Helpers/functions.php';

spl_autoload_register(static function (string $class): void {
    if (!str_starts_with($class, 'App\\')) {
        return;
    }
    $file = BASE_PATH . '/app/' . str_replace('\\', '/', substr($class, 4)) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

App\Core\Env::load(BASE_PATH . '/.env');

date_default_timezone_set((string) config('app.timezone', 'UTC'));
mb_internal_encoding('UTF-8');

error_reporting(E_ALL);
ini_set('display_errors', config('app.debug') ? '1' : '0');
ini_set('log_errors', '1');
ini_set('error_log', BASE_PATH . '/storage/logs/php-error.log');

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});
