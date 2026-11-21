<?php

declare(strict_types=1);

namespace App\Models;

final class Credential extends Model
{
    public const TABLE = 'api_credentials';
    public const ENTITY = 'credential';

    public static function rules(): array
    {
        return [
            'provider' => 'required|string|max:120',
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:2000',
            'project_id' => 'nullable|owned:projects',
            'expires_at' => 'nullable|date',
            'tags' => 'nullable|string|max:255',
        ];
    }

    public static function searchable(): array
    {
        return ['t.provider', 't.name', 't.description', 't.tags'];
    }

    public static function filters(): array
    {
        return ['project_id' => 't.project_id', 'provider' => 't.provider'];
    }

    public static function sorts(): array
    {
        return ['created' => 't.created_at DESC', 'provider' => 't.provider ASC, t.name ASC', 'expires' => 't.expires_at IS NULL, t.expires_at ASC'];
    }

    /** The encrypted secret column is never selected for list/detail output. */
    public static function select(): string
    {
        return 'SELECT t.id, t.user_id, t.project_id, t.provider, t.name, t.description, t.secret_hint, t.expires_at, t.tags,
            t.last_revealed_at, t.created_at, t.updated_at, p.name AS project_name
            FROM api_credentials t LEFT JOIN projects p ON p.id = t.project_id';
    }

    public static function transform(array $row): array
    {
        $row['masked'] = mask_secret($row['secret_hint']);
        unset($row['secret_hint']);
        $row['days_left'] = $row['expires_at'] ? (int) floor((strtotime($row['expires_at']) - strtotime(today())) / 86400) : null;
        return $row;
    }
}
