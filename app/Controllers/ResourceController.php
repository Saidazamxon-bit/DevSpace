<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Validator;
use App\Models\Model;
use App\Services\ActivityLogger;

/**
 * Generic, user-scoped CRUD controller. Subclasses set $model and may override hooks:
 *  - prepare(): mutate validated data before saving
 *  - afterSave(): persist relations (pivots etc.)
 */
abstract class ResourceController
{
    /** @var class-string<Model> */
    protected string $model;

    protected function prepare(array $data, Request $request, ?array $existing): array
    {
        return $data;
    }

    protected function afterSave(int $id, Request $request, bool $created): void
    {
    }

    protected function listWhere(Request $request): array
    {
        return [];
    }

    public function index(Request $request): array
    {
        $m = $this->model;
        return ['data' => $m::list($request->userId(), $_GET, $this->listWhere($request))];
    }

    public function show(Request $request): array
    {
        $m = $this->model;
        return ['data' => $m::findOrFail($request->id(), $request->userId())];
    }

    public function store(Request $request): array
    {
        $m = $this->model;
        $data = Validator::validate($request->input(), $m::rules(), $request->userId());
        $data = $this->prepare($data, $request, null);
        $id = $m::create($request->userId(), $data);
        $this->afterSave($id, $request, true);
        $row = $m::findOrFail($id, $request->userId());
        $this->log($request, 'created', $row);
        return ['data' => $row];
    }

    public function update(Request $request, bool $partial = false): array
    {
        $m = $this->model;
        $existing = $m::findOrFail($request->id(), $request->userId());
        $input = $request->input();
        // For partial updates, merge with existing values so cross-field rules still work.
        $data = Validator::validate($partial ? $input + $existing : $input, $m::rules(), $request->userId(), false);
        if ($partial) {
            $data = array_intersect_key($data, $input);
        }
        $data = $this->prepare($data, $request, $existing);
        $m::update($request->id(), $request->userId(), $data);
        $this->afterSave($request->id(), $request, false);
        $row = $m::findOrFail($request->id(), $request->userId());
        $this->log($request, 'updated', $row);
        return ['data' => $row];
    }

    public function patch(Request $request): array
    {
        return $this->update($request, true);
    }

    public function destroy(Request $request): array
    {
        $m = $this->model;
        $row = $m::findOrFail($request->id(), $request->userId());
        $m::delete($request->id(), $request->userId());
        $this->log($request, 'deleted', $row);
        return ['ok' => true];
    }

    protected function log(Request $request, string $action, array $row): void
    {
        $m = $this->model;
        $label = (string) ($row[$m::LABEL] ?? ('#' . $row['id']));
        ActivityLogger::log(
            $request->userId(),
            $action,
            $m::ENTITY,
            (int) $row['id'],
            ucfirst($action) . ' ' . $m::ENTITY . ' “' . mb_substr($label, 0, 120) . '”'
        );
    }
}
