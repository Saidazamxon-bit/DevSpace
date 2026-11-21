<?php

declare(strict_types=1);

namespace App\Models;

final class Task extends Model
{
    public const TABLE = 'tasks';
    public const ENTITY = 'task';
    public const LABEL = 'title';

    public static function rules(): array
    {
        return [
            'title' => 'required|string|max:200',
            'description' => 'nullable|string|max:10000',
            'project_id' => 'nullable|owned:projects',
            'status' => 'required|in:todo,in_progress,review,done',
            'priority' => 'required|in:low,medium,high,critical',
            'category' => 'nullable|string|max:60',
            'due_date' => 'nullable|date',
            'due_time' => 'nullable|time',
            'position' => 'nullable|int',
        ];
    }

    public static function searchable(): array
    {
        return ['t.title', 't.description', 't.category'];
    }

    public static function filters(): array
    {
        return ['status' => 't.status', 'priority' => 't.priority', 'project_id' => 't.project_id', 'category' => 't.category'];
    }

    public static function sorts(): array
    {
        return [
            'board' => 't.position ASC, t.id DESC',
            'due' => 't.due_date IS NULL, t.due_date ASC, t.due_time ASC',
            'priority' => "FIELD(t.priority,'critical','high','medium','low'), t.due_date ASC",
            'created' => 't.created_at DESC',
            'updated' => 't.updated_at DESC',
        ];
    }

    public static function select(): string
    {
        return 'SELECT t.*, p.name AS project_name, p.color AS project_color FROM tasks t LEFT JOIN projects p ON p.id = t.project_id';
    }

    public static function transform(array $row): array
    {
        if ($row['due_time'] !== null) {
            $row['due_time'] = substr((string) $row['due_time'], 0, 5);
        }
        $row['overdue'] = $row['status'] !== 'done' && $row['due_date'] !== null && $row['due_date'] < today();
        return $row;
    }
}
