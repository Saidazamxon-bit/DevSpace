<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;

/** Per-user preferences stored as key/value rows. */
final class Settings
{
    public const DEFAULTS = [
        'theme' => 'dark',               // dark | light | system
        'currency' => 'USD',             // default reporting currency
        'rate_usd' => '12650',           // UZS per 1 USD (editable)
        'rate_eur' => '13700',           // UZS per 1 EUR (editable)
        'domain_alert_days' => '30',
        'notify_domains' => '1',
        'notify_tasks' => '1',
        'notify_monitoring' => '1',
        'notify_credentials' => '1',
        'notify_email' => '0',
        'sidebar_collapsed' => '0',
    ];

    public const RULES = [
        'theme' => 'in:dark,light,system',
        'currency' => 'in:UZS,USD,EUR',
        'rate_usd' => 'numeric|min:1|max:10000000',
        'rate_eur' => 'numeric|min:1|max:10000000',
        'domain_alert_days' => 'int|min:1|max:180',
        'notify_domains' => 'bool',
        'notify_tasks' => 'bool',
        'notify_monitoring' => 'bool',
        'notify_credentials' => 'bool',
        'notify_email' => 'bool',
        'sidebar_collapsed' => 'bool',
    ];

    private static array $cache = [];

    public static function all(int $userId): array
    {
        if (!isset(self::$cache[$userId])) {
            $rows = Database::all('SELECT `key`, `value` FROM settings WHERE user_id = ?', [$userId]);
            $values = self::DEFAULTS;
            foreach ($rows as $r) {
                if (array_key_exists($r['key'], $values)) {
                    $values[$r['key']] = $r['value'];
                }
            }
            self::$cache[$userId] = $values;
        }
        return self::$cache[$userId];
    }

    public static function get(int $userId, string $key): string
    {
        return (string) (self::all($userId)[$key] ?? self::DEFAULTS[$key] ?? '');
    }

    public static function bool(int $userId, string $key): bool
    {
        return self::get($userId, $key) === '1';
    }

    /** Typed values for the frontend. */
    public static function forClient(int $userId): array
    {
        $out = [];
        foreach (self::all($userId) as $k => $v) {
            $rule = self::RULES[$k] ?? '';
            $out[$k] = match (true) {
                str_contains($rule, 'bool') => $v === '1',
                str_contains($rule, 'numeric'), str_contains($rule, 'int') => (float) $v,
                default => $v,
            };
        }
        return $out;
    }

    public static function set(int $userId, array $values): void
    {
        foreach ($values as $key => $value) {
            if (!array_key_exists($key, self::DEFAULTS)) {
                continue;
            }
            Database::query(
                'INSERT INTO settings (user_id, `key`, `value`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
                [$userId, $key, (string) $value]
            );
        }
        unset(self::$cache[$userId]);
    }
}
