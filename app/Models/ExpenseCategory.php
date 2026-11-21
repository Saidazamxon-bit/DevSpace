<?php

declare(strict_types=1);

namespace App\Models;

final class ExpenseCategory extends Model
{
    public const TABLE = 'expense_categories';
    public const ENTITY = 'expense category';

    public static function rules(): array
    {
        return [
            'name' => 'required|string|max:60',
            'color' => 'nullable|color',
        ];
    }

    public static function sorts(): array
    {
        return ['name' => 't.name ASC'];
    }

    public static function select(): string
    {
        return 'SELECT t.*, (SELECT COUNT(*) FROM expenses e WHERE e.category_id = t.id) AS expenses_count FROM expense_categories t';
    }

    public static function transform(array $row): array
    {
        $row['expenses_count'] = (int) $row['expenses_count'];
        return $row;
    }
}
