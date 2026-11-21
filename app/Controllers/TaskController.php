<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Validator;
use App\Models\Task;
use App\Services\ActivityLogger;

final class TaskController extends ResourceController
{
    protected string $model = Task::class;

    protected function listWhere(Request $request): array
    {
        return match ($request->query('due')) {
            'overdue' => ["t.status <> 'done' AND t.due_date < CURDATE()"],
            'today' => ['t.due_date = CURDATE()'],
            'week' => ['t.due_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY'],
            'open' => ["t.status <> 'done'"],
            default => [],
        };
    }

    protected function prepare(array $data, Request $request, ?array $existing): array
    {
        if (isset($data['status'])) {
            $wasDone = ($existing['status'] ?? null) === 'done';
            if ($data['status'] === 'done' && !$wasDone) {
                $data['completed_at'] = now();
            } elseif ($data['status'] !== 'done') {
                $data['completed_at'] = null;
            }
        }
        if ($existing === null && !isset($data['position'])) {
            $data['position'] = (int) Database::value('SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE user_id = ?', [$request->userId()]);
        }
        return $data;
    }

    protected function log(Request $request, string $action, array $row): void
    {
        if ($action === 'updated' && $row['status'] === 'done' && $row['completed_at'] && strtotime($row['completed_at']) >= time() - 2) {
            ActivityLogger::log($request->userId(), 'completed', 'task', (int) $row['id'], 'Completed task “' . $row['title'] . '”');
            return;
        }
        parent::log($request, $action, $row);
    }

    /** Persist kanban ordering: [{id, status, position}, ...] */
    public function reorder(Request $request): array
    {
        $uid = $request->userId();
        $items = $request->input('items', []);
        if (!is_array($items) || count($items) > 1000) {
            return ['ok' => false];
        }
        Database::transaction(function () use ($items, $uid, $request) {
            foreach ($items as $item) {
                $clean = Validator::validate((array) $item, [
                    'id' => 'required|int',
                    'status' => 'required|in:todo,in_progress,review,done',
                    'position' => 'required|int',
                ]);
                $existing = Task::find($clean['id'], $uid);
                if ($existing === null) {
                    continue;
                }
                $data = ['status' => $clean['status'], 'position' => $clean['position']];
                if ($clean['status'] !== $existing['status']) {
                    $data['completed_at'] = $clean['status'] === 'done' ? now() : null;
                    if ($clean['status'] === 'done') {
                        ActivityLogger::log($uid, 'completed', 'task', $existing['id'], 'Completed task “' . $existing['title'] . '”');
                    } else {
                        ActivityLogger::log($uid, 'updated', 'task', $existing['id'], 'Moved task “' . $existing['title'] . '” to ' . str_replace('_', ' ', $clean['status']));
                    }
                }
                Task::update($existing['id'], $uid, $data);
            }
        });
        return ['ok' => true];
    }

    public function stats(Request $request): array
    {
        $uid = $request->userId();
        $byStatus = Database::all('SELECT status, COUNT(*) AS n FROM tasks WHERE user_id = ? GROUP BY status', [$uid]);
        $counts = ['todo' => 0, 'in_progress' => 0, 'review' => 0, 'done' => 0];
        foreach ($byStatus as $r) {
            $counts[$r['status']] = (int) $r['n'];
        }
        return ['data' => [
            'by_status' => $counts,
            'overdue' => (int) Database::value("SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status <> 'done' AND due_date < CURDATE()", [$uid]),
            'completed_week' => (int) Database::value('SELECT COUNT(*) FROM tasks WHERE user_id = ? AND completed_at >= CURDATE() - INTERVAL 6 DAY', [$uid]),
            'completed_month' => (int) Database::value('SELECT COUNT(*) FROM tasks WHERE user_id = ? AND completed_at >= CURDATE() - INTERVAL 29 DAY', [$uid]),
            'categories' => array_column(Database::all('SELECT DISTINCT category FROM tasks WHERE user_id = ? AND category IS NOT NULL AND category <> "" ORDER BY category', [$uid]), 'category'),
        ]];
    }
}
