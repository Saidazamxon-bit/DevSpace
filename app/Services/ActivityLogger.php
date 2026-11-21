<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\Logger;

final class ActivityLogger
{
    public static function log(int $userId, string $action, string $entityType, ?int $entityId, string $description): void
    {
        try {
            Database::insert('activity_logs', [
                'user_id' => $userId ?: null,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'description' => mb_substr($description, 0, 255),
                'ip_address' => is_cli() ? null : substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Logger::error('Activity log failed', ['message' => $e->getMessage()]);
        }
    }
}
