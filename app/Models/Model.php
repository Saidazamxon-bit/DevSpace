<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use App\Core\HttpException;

/**
 * Base model: every row is owned by a user, and every query is scoped by user_id.
 * Subclasses declare their table, validation rules, searchable columns and filters.
 */
abstract class Model
{
    /** @var string DB table name */
    public const TABLE = '';
    /** @var string human-readable entity name used in activity logs */
    public const ENTITY = '';
    /** @var string column used as the record's label */
    public const LABEL = 'name';

    /** Validation rules keyed by column. */
    abstract public static function rules(): array;

    /** Columns searched by ?q= */
    public static function searchable(): array
    {
        return [];
    }

    /** Allowed ?filter=value query params mapped to SQL columns. */
    public static function filters(): array
    {
        return [];
    }

    /** Allowed sort keys mapped to SQL expressions. */
    public static function sorts(): array
    {
        return ['created' => 't.created_at DESC'];
    }

    /** Base SELECT (table is aliased as "t"). Override to join related data. */
    public static function select(): string
    {
        return 'SELECT t.* FROM `' . static::TABLE . '` t';
    }

    /** Cast/shape a DB row for JSON output. */
    public static function transform(array $row): array
    {
        return $row;
    }

    public static function list(int $userId, array $query = [], array $extraWhere = []): array
    {
        $where = ['t.user_id = :uid'];
        $params = ['uid' => $userId];

        $q = trim((string) ($query['q'] ?? ''));
        if ($q !== '' && static::searchable() !== []) {
            $parts = [];
            foreach (static::searchable() as $i => $col) {
                $parts[] = "$col LIKE :q$i";
                $params["q$i"] = '%' . addcslashes($q, '%_\\') . '%';
            }
            $where[] = '(' . implode(' OR ', $parts) . ')';
        }

        foreach (static::filters() as $param => $column) {
            $value = $query[$param] ?? null;
            if ($value === null || $value === '' || $value === 'all') {
                continue;
            }
            $key = 'f_' . $param;
            $where[] = "$column = :$key";
            $params[$key] = is_numeric($value) && !str_contains((string) $value, '.') ? (int) $value : (string) $value;
        }

        foreach ($extraWhere as $clause => $value) {
            if (is_int($clause)) {
                $where[] = $value;
            } else {
                $where[] = $clause;
                $params += $value;
            }
        }

        $sorts = static::sorts();
        $order = $sorts[$query['sort'] ?? ''] ?? reset($sorts);
        $limit = min(500, max(1, (int) ($query['limit'] ?? 500)));

        $sql = static::select() . ' WHERE ' . implode(' AND ', $where) . " ORDER BY $order LIMIT $limit";
        return array_map([static::class, 'transform'], Database::all($sql, $params));
    }

    public static function find(int $id, int $userId): ?array
    {
        $row = Database::first(static::select() . ' WHERE t.id = :id AND t.user_id = :uid', ['id' => $id, 'uid' => $userId]);
        return $row ? static::transform($row) : null;
    }

    public static function findOrFail(int $id, int $userId): array
    {
        return static::find($id, $userId) ?? throw HttpException::notFound(ucfirst(static::ENTITY) . ' not found.');
    }

    public static function create(int $userId, array $data): int
    {
        $data['user_id'] = $userId;
        return Database::insert(static::TABLE, $data);
    }

    public static function update(int $id, int $userId, array $data): void
    {
        Database::update(static::TABLE, $data, 'id = :id AND user_id = :uid', ['id' => $id, 'uid' => $userId]);
    }

    public static function delete(int $id, int $userId): void
    {
        Database::query('DELETE FROM `' . static::TABLE . '` WHERE id = ? AND user_id = ?', [$id, $userId]);
    }

    protected static function toFloat(array &$row, array $cols): void
    {
        foreach ($cols as $c) {
            if (isset($row[$c])) {
                $row[$c] = (float) $row[$c];
            }
        }
    }

    protected static function toBool(array &$row, array $cols): void
    {
        foreach ($cols as $c) {
            if (array_key_exists($c, $row)) {
                $row[$c] = (bool) $row[$c];
            }
        }
    }
}
