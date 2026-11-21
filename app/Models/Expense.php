<?php

declare(strict_types=1);

namespace App\Models;

final class Expense extends Model
{
    public const TABLE = 'expenses';
    public const ENTITY = 'expense';
    public const LABEL = 'title';

    public static function rules(): array
    {
        return [
            'title' => 'required|string|max:160',
            'vendor' => 'nullable|string|max:120',
            'amount' => 'required|numeric|min:0.01|max:99999999999999',
            'currency' => 'required|in:UZS,USD,EUR',
            'spent_at' => 'required|date',
            'category_id' => 'nullable|owned:expense_categories',
            'project_id' => 'nullable|owned:projects',
            'is_recurring' => 'bool',
            'recurrence' => 'nullable|in:monthly,yearly',
            'notes' => 'nullable|string|max:5000',
        ];
    }

    public static function searchable(): array
    {
        return ['t.title', 't.vendor', 't.notes'];
    }

    public static function filters(): array
    {
        return ['category_id' => 't.category_id', 'project_id' => 't.project_id', 'currency' => 't.currency', 'recurring' => 't.is_recurring'];
    }

    public static function sorts(): array
    {
        return ['date' => 't.spent_at DESC, t.id DESC', 'amount' => 't.amount DESC', 'created' => 't.created_at DESC'];
    }

    public static function select(): string
    {
        return 'SELECT t.*, c.name AS category_name, c.color AS category_color, p.name AS project_name
            FROM expenses t
            LEFT JOIN expense_categories c ON c.id = t.category_id
            LEFT JOIN projects p ON p.id = t.project_id';
    }

    public static function transform(array $row): array
    {
        self::toFloat($row, ['amount']);
        self::toBool($row, ['is_recurring']);
        return $row;
    }
}
