<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\HttpException;

/** Fixed-window rate limiter stored in MySQL (works on shared hosting without Redis). */
final class RateLimiter
{
    public static function tooManyAttempts(string $key, int $maxAttempts): bool
    {
        $row = Database::first('SELECT hits, reset_at FROM rate_limits WHERE `key` = ?', [self::hashKey($key)]);
        if ($row === null || strtotime($row['reset_at']) <= time()) {
            return false;
        }
        return (int) $row['hits'] >= $maxAttempts;
    }

    public static function hit(string $key, int $decaySeconds): void
    {
        $hash = self::hashKey($key);
        $reset = date('Y-m-d H:i:s', time() + $decaySeconds);
        Database::query(
            'INSERT INTO rate_limits (`key`, hits, reset_at) VALUES (:k, 1, :r)
             ON DUPLICATE KEY UPDATE
               hits = IF(reset_at <= NOW(), 1, hits + 1),
               reset_at = IF(reset_at <= NOW(), VALUES(reset_at), reset_at)',
            ['k' => $hash, 'r' => $reset]
        );
    }

    public static function clear(string $key): void
    {
        Database::query('DELETE FROM rate_limits WHERE `key` = ?', [self::hashKey($key)]);
    }

    public static function availableIn(string $key): int
    {
        $reset = Database::value('SELECT reset_at FROM rate_limits WHERE `key` = ?', [self::hashKey($key)]);
        return $reset ? max(0, strtotime($reset) - time()) : 0;
    }

    /** Throw a 429 if the limit is exceeded, otherwise record a hit. */
    public static function enforce(string $key, int $maxAttempts, int $decaySeconds): void
    {
        if (self::tooManyAttempts($key, $maxAttempts)) {
            $minutes = max(1, (int) ceil(self::availableIn($key) / 60));
            throw new HttpException(429, "Too many attempts. Try again in $minutes minute(s).");
        }
        self::hit($key, $decaySeconds);
    }

    public static function cleanup(): void
    {
        Database::query('DELETE FROM rate_limits WHERE reset_at < NOW()');
    }

    private static function hashKey(string $key): string
    {
        return hash('sha256', $key);
    }
}
