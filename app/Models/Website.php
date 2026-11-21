<?php

declare(strict_types=1);

namespace App\Models;

final class Website extends Model
{
    public const TABLE = 'websites';
    public const ENTITY = 'monitor';

    public static function rules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'url' => 'required|url|max:500',
            'method' => 'required|in:GET,HEAD',
            'expected_status' => 'nullable|int|min:100|max:599',
            'check_interval' => 'required|in:1,5,10,15,30,60',
            'timeout_seconds' => 'required|int|min:2|max:30',
            'project_id' => 'nullable|owned:projects',
            'server_id' => 'nullable|owned:servers',
            'is_active' => 'bool',
        ];
    }

    public static function searchable(): array
    {
        return ['t.name', 't.url'];
    }

    public static function filters(): array
    {
        return ['state' => 't.last_state', 'project_id' => 't.project_id'];
    }

    public static function sorts(): array
    {
        return ['name' => 't.name ASC', 'state' => "FIELD(t.last_state,'down','unknown','up'), t.name", 'created' => 't.created_at DESC'];
    }

    public static function select(): string
    {
        return "SELECT t.*, p.name AS project_name, s.name AS server_name,
            (SELECT ROUND(AVG(c.is_up) * 100, 2) FROM monitoring_checks c WHERE c.website_id = t.id AND c.checked_at >= NOW() - INTERVAL 1 DAY) AS uptime_24h,
            (SELECT ROUND(AVG(c.is_up) * 100, 2) FROM monitoring_checks c WHERE c.website_id = t.id AND c.checked_at >= NOW() - INTERVAL 30 DAY) AS uptime_30d,
            (SELECT ROUND(AVG(c.response_ms)) FROM monitoring_checks c WHERE c.website_id = t.id AND c.is_up = 1 AND c.checked_at >= NOW() - INTERVAL 1 DAY) AS avg_response_24h,
            (SELECT COUNT(*) FROM monitoring_incidents i WHERE i.website_id = t.id AND i.resolved_at IS NULL) AS open_incidents
            FROM websites t
            LEFT JOIN projects p ON p.id = t.project_id
            LEFT JOIN servers s ON s.id = t.server_id";
    }

    public static function transform(array $row): array
    {
        self::toFloat($row, ['uptime_24h', 'uptime_30d']);
        self::toBool($row, ['is_active']);
        $row['avg_response_24h'] = $row['avg_response_24h'] !== null ? (int) $row['avg_response_24h'] : null;
        $row['open_incidents'] = (int) $row['open_incidents'];
        $row['check_interval'] = (int) $row['check_interval'];
        return $row;
    }
}
