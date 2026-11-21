<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\HttpException;
use App\Core\Request;
use App\Models\ExpenseCategory;

final class ExpenseCategoryController extends ResourceController
{
    protected string $model = ExpenseCategory::class;

    protected function prepare(array $data, Request $request, ?array $existing): array
    {
        if (isset($data['name'])) {
            $dup = Database::value(
                'SELECT id FROM expense_categories WHERE user_id = ? AND name = ? AND id <> ?',
                [$request->userId(), $data['name'], (int) ($existing['id'] ?? 0)]
            );
            if ($dup) {
                throw HttpException::validation(['name' => 'A category with this name already exists.']);
            }
        }
        return $data;
    }
}
