<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Services\AlertService;

final class NotificationController
{
    public function index(Request $request): array
    {
        $uid = $request->userId();
        // Make alerts work even if cron isn't configured yet (throttled to once per hour).
        AlertService::runIfStale($uid);
        return [
            'data' => Database::all('SELECT id, type, level, title, body, link, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50', [$uid]),
            'unread' => (int) Database::value('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL', [$uid]),
        ];
    }

    public function read(Request $request): array
    {
        Database::query('UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL', [$request->id(), $request->userId()]);
        return ['ok' => true];
    }

    public function readAll(Request $request): array
    {
        Database::query('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [$request->userId()]);
        return ['ok' => true];
    }

    public function destroy(Request $request): array
    {
        Database::query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [$request->id(), $request->userId()]);
        return ['ok' => true];
    }

    public function clearRead(Request $request): array
    {
        Database::query('DELETE FROM notifications WHERE user_id = ? AND read_at IS NOT NULL', [$request->userId()]);
        return ['ok' => true];
    }
}
