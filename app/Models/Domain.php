<?php

declare(strict_types=1);

namespace App\Models;

final class Domain extends Model
{
    public const TABLE = 'domains';
    public const ENTITY = 'domain';

    public static function rules(): array
    {
        return [
            'name' => 'required|domain|max:253',
            'registrar' => 'nullable|string|max:120',
            'registered_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:registered_at',
            'renewal_price' => 'nullable|numeric|min:0',
            'currency' => 'required|in:UZS,USD,EUR',
            'project_id' => 'nullable|owned:projects',
            'dns_provider' => 'nullable|string|max:120',
            'ssl_expires_at' => 'nullable|date',
            'auto_renew' => 'bool',
            'notes' => 'nullable|string|max:5000',
        ];
    }

    public static function searchable(): array
    {
        return ['t.name', 't.registrar', 't.dns_provider'];
    }

    public static function filters(): array
    {
        return ['project_id' => 't.project_id'];
    }

    public static function sorts(): array
    {
        return ['expires' => 't.expires_at IS NULL, t.expires_at ASC', 'name' => 't.name ASC', 'created' => 't.created_at DESC'];
    }

    public static function select(): string
    {
        return 'SELECT t.*, p.name AS project_name FROM domains t LEFT JOIN projects p ON p.id = t.project_id';
    }

    public static function transform(array $row): array
    {
        self::toFloat($row, ['renewal_price']);
        self::toBool($row, ['auto_renew']);
        $row['days_left'] = $row['expires_at'] ? (int) floor((strtotime($row['expires_at']) - strtotime(today())) / 86400) : null;
        $row['ssl_days_left'] = $row['ssl_expires_at'] ? (int) floor((strtotime($row['ssl_expires_at']) - strtotime(today())) / 86400) : null;
        $row['state'] = match (true) {
            $row['days_left'] === null => 'unknown',
            $row['days_left'] < 0 => 'expired',
            $row['days_left'] <= 30 => 'expiring',
            default => 'active',
        };
        return $row;
    }
}
