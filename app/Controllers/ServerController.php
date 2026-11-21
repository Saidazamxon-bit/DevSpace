<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Validator;
use App\Models\Server;

final class ServerController extends ResourceController
{
    protected string $model = Server::class;

    protected function afterSave(int $id, Request $request, bool $created): void
    {
        $input = $request->input();
        if (array_key_exists('project_ids', $input)) {
            $clean = Validator::validate(['project_ids' => $input['project_ids']], ['project_ids' => 'nullable|list']);
            Server::syncProjects($id, $request->userId(), $clean['project_ids']);
        }
    }
}
