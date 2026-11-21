<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Models\Credential;
use App\Models\Domain;
use App\Models\Expense;
use App\Models\Project;
use App\Models\Task;
use App\Models\Website;
use App\Services\ActivityLogger;
use App\Services\Currency;

final class ProjectController extends ResourceController
{
    protected string $model = Project::class;

    protected function listWhere(Request $request): array
    {
        return $request->query('archived') === '1' ? ['t.archived_at IS NOT NULL'] : ['t.archived_at IS NULL'];
    }

    /** Project detail with related tasks, domains, servers, monitors, credentials and expenses. */
    public function show(Request $request): array
    {
        $uid = $request->userId();
        $project = Project::findOrFail($request->id(), $uid);
        $where = ['t.project_id = :pid' => ['pid' => $project['id']]];
        $expenses = Expense::list($uid, ['sort' => 'date'], $where);

        $project['tasks'] = Task::list($uid, ['sort' => 'board'], $where);
        $project['domains'] = Domain::list($uid, ['sort' => 'expires'], $where);
        $project['websites'] = Website::list($uid, ['sort' => 'name'], $where);
        $project['credentials'] = Credential::list($uid, ['sort' => 'provider'], $where);
        $project['expenses'] = $expenses;
        $project['expenses_total'] = Currency::sumConverted($uid, $expenses);
        $project['servers'] = Database::all(
            'SELECT s.id, s.name, s.status, s.ip_address FROM server_projects sp JOIN servers s ON s.id = sp.server_id
             WHERE sp.project_id = ? AND s.user_id = ? ORDER BY s.name',
            [$project['id'], $uid]
        );
        $project['activity'] = Database::all(
            "SELECT id, action, entity_type, description, created_at FROM activity_logs
             WHERE user_id = ? AND entity_type = 'project' AND entity_id = ? ORDER BY created_at DESC LIMIT 15",
            [$uid, $project['id']]
        );
        return ['data' => $project];
    }

    public function archive(Request $request): array
    {
        $uid = $request->userId();
        $project = Project::findOrFail($request->id(), $uid);
        $archive = !$project['archived'];
        Project::update($project['id'], $uid, ['archived_at' => $archive ? now() : null]);
        ActivityLogger::log($uid, $archive ? 'archived' : 'restored', 'project', $project['id'], ($archive ? 'Archived' : 'Restored') . ' project “' . $project['name'] . '”');
        return ['data' => Project::findOrFail($project['id'], $uid)];
    }
}
