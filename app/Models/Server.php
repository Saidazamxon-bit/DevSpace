<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

final class Server extends Model
{
    public const TABLE = 'servers';
    public const ENTITY = 'server';

    public static function rules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'provider' => 'nullable|string|max:120',
            'ip_address' => 'nullable|ip',
            'os' => 'nullable|string|max:120',
            'location' => 'nullable|string|max:120',
            'cpu' => 'nullable|string|max:60',
            'ram' => 'nullable|string|max:60',
            'storage' => 'nullable|string|max:60',
            'status' => 'required|in:online,maintenance,offline',
            'monthly_cost' => 'nullable|numeric|min:0',
            'currency' => 'required|in:UZS,USD,EUR',
            'notes' => 'nullable|string|max:5000',
        ];
    }

    public static function searchable(): array
    {
        return ['t.name', 't.provider', 't.ip_address', 't.location', 't.os'];
    }

    public static function filters(): array
    {
        return ['status' => 't.status'];
    }

    public static function sorts(): array
    {
        return ['name' => 't.name ASC', 'created' => 't.created_at DESC', 'status' => "FIELD(t.status,'offline','maintenance','online')"];
    }

    public static function transform(array $row): array
    {
        self::toFloat($row, ['monthly_cost']);
        $row['projects'] = Database::all(
            'SELECT p.id, p.name, p.color FROM server_projects sp JOIN projects p ON p.id = sp.project_id WHERE sp.server_id = ? ORDER BY p.name',
            [$row['id']]
        );
        $row['project_ids'] = array_map(static fn ($p) => (int) $p['id'], $row['projects']);
        $row['websites_count'] = (int) Database::value('SELECT COUNT(*) FROM websites WHERE server_id = ?', [$row['id']]);
        return $row;
    }

    public static function syncProjects(int $serverId, int $userId, array $projectIds): void
    {
        Database::query('DELETE FROM server_projects WHERE server_id = ?', [$serverId]);
        foreach ($projectIds as $pid) {
            $owned = Database::value('SELECT COUNT(*) FROM projects WHERE id = ? AND user_id = ?', [$pid, $userId]);
            if ($owned) {
                Database::query('INSERT IGNORE INTO server_projects (server_id, project_id) VALUES (?, ?)', [$serverId, $pid]);
            }
        }
    }
}
