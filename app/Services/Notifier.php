<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;

final class Notifier
{
    /**
     * Create a notification. If $dedupeKey is set, the same alert is never created twice.
     * Returns true when a new notification was created.
     */
    public static function notify(int $userId, string $type, string $level, string $title, ?string $body = null, ?string $link = null, ?string $dedupeKey = null, bool $email = false): bool
    {
        $stmt = Database::query(
            'INSERT IGNORE INTO notifications (user_id, type, level, title, body, link, dedupe_key, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$userId, $type, $level, mb_substr($title, 0, 200), $body ? mb_substr($body, 0, 500) : null, $link, $dedupeKey, now()]
        );
        $created = $stmt->rowCount() > 0;
        if ($created && $email && Settings::bool($userId, 'notify_email')) {
            $to = (string) Database::value('SELECT email FROM users WHERE id = ?', [$userId]);
            Mailer::send($to, $title, trim($title . "\n\n" . (string) $body));
        }
        return $created;
    }
}
