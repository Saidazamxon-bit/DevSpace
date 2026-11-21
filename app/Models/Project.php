<?php

declare(strict_types=1);

namespace App\Models;

final class Project extends Model
{
    public const TABLE = 'projects';
    public const ENTITY = 'project';

    public static function rules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:5000',
            'url' => 'nullable|url|max:255',
            'repo_url' => 'nullable|url|max:255',
            'technologies' => 'nullable|string|max:500',
            'status' => 'required|in:planning,active,paused,completed',
            'priority' => 'required|in:low,medium,high,critical',
            'start_date' => 'nullable|date',
            'deadline' => 'nullable|date|after_or_equal:start_date',
            'color' => 'nullable|color',
            'notes' => 'nullable|string|max:50000',
        ];
    }

    public static function searchable(): array
    {
        return ['t.name', 't.description', 't.technologies'];
    }

    public static function filters(): array
    {
        return ['status' => 't.status', 'priority' => 't.priority'];
    }

    public static function sorts(): array
    {
        return [
            'updated' => 't.updated_at DESC',
            'deadline' => 't.deadline IS NULL, t.deadline ASC',
            'name' => 't.name ASC',
            'priority' => "FIELD(t.priority,'critical','high','medium','low')",
        ];
    }

    public static function select(): string
    {
        return "SELECT t.*,
            (SELECT COUNT(*) FROM tasks k WHERE k.project_id = t.id) AS tasks_total,
            (SELECT COUNT(*) FROM tasks k WHERE k.project_id = t.id AND k.status = 'done') AS tasks_done
            FROM projects t";
    }

    public static function transform(array $row): array
    {
        $row['tasks_total'] = (int) ($row['tasks_total'] ?? 0);
        $row['tasks_done'] = (int) ($row['tasks_done'] ?? 0);
        $row['progress'] = $row['tasks_total'] > 0 ? (int) round($row['tasks_done'] / $row['tasks_total'] * 100) : 0;
        $row['archived'] = $row['archived_at'] !== null;
        return $row;
    }
}
