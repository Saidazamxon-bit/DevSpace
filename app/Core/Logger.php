<?php

declare(strict_types=1);

namespace App\Core;

/** File logger (storage/logs). Never pass secrets or passwords to it. */
final class Logger
{
    public static function log(string $level, string $message, array $context = []): void
    {
        $dir = storage_path('logs');
        if (!is_dir($dir)) {
            @mkdir($dir, 0750, true);
        }
        // Strip anything that looks like a credential before writing.
        foreach (['password', 'secret', 'token', 'api_key', 'key'] as $sensitive) {
            if (array_key_exists($sensitive, $context)) {
                $context[$sensitive] = '[redacted]';
            }
        }
        $line = sprintf(
            "[%s] %s: %s%s\n",
            date('Y-m-d H:i:s'),
            strtoupper($level),
            $message,
            $context ? ' ' . json_encode($context, JSON_UNESCAPED_SLASHES) : ''
        );
        @file_put_contents($dir . '/app-' . date('Y-m-d') . '.log', $line, FILE_APPEND | LOCK_EX);
    }

    public static function error(string $message, array $context = []): void { self::log('error', $message, $context); }
    public static function info(string $message, array $context = []): void { self::log('info', $message, $context); }
    public static function warning(string $message, array $context = []): void { self::log('warning', $message, $context); }
}
