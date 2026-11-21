<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;

/** Global search across modules (top bar). Secrets are never searched or returned. */
final class SearchController
{
    public function index(Request $request): array
    {
        $uid = $request->userId();
        $q = mb_substr(trim((string) $request->query('q', '')), 0, 100);
        if (mb_strlen($q) < 2) {
            return ['data' => []];
        }
        $like = '%' . addcslashes($q, '%_\\') . '%';
        $sources = [
            ['project', 'SELECT id, name AS title, status AS meta FROM projects WHERE user_id = :u AND (name LIKE :q OR technologies LIKE :q2) LIMIT 5', '/projects/{id}'],
            ['task', 'SELECT id, title, status AS meta FROM tasks WHERE user_id = :u AND (title LIKE :q OR category LIKE :q2) LIMIT 5', '/tasks?open={id}'],
            ['domain', 'SELECT id, name AS title, expires_at AS meta FROM domains WHERE user_id = :u AND (name LIKE :q OR registrar LIKE :q2) LIMIT 5', '/domains'],
            ['server', 'SELECT id, name AS title, ip_address AS meta FROM servers WHERE user_id = :u AND (name LIKE :q OR ip_address LIKE :q2 OR provider LIKE :q2b) LIMIT 5', '/servers'],
            ['monitor', 'SELECT id, name AS title, url AS meta FROM websites WHERE user_id = :u AND (name LIKE :q OR url LIKE :q2) LIMIT 5', '/monitoring/{id}'],
            ['credential', 'SELECT id, name AS title, provider AS meta FROM api_credentials WHERE user_id = :u AND (name LIKE :q OR provider LIKE :q2) LIMIT 5', '/vault'],
            ['snippet', 'SELECT id, title, language AS meta FROM code_snippets WHERE user_id = :u AND (title LIKE :q OR tags LIKE :q2) LIMIT 5', '/snippets?open={id}'],
            ['expense', 'SELECT id, title, spent_at AS meta FROM expenses WHERE user_id = :u AND (title LIKE :q OR vendor LIKE :q2) LIMIT 5', '/expenses'],
        ];
        $results = [];
        foreach ($sources as [$type, $sql, $link]) {
            $params = ['u' => $uid, 'q' => $like, 'q2' => $like];
            if (str_contains($sql, ':q2b')) {
                $params['q2b'] = $like;
            }
            foreach (Database::all($sql, $params) as $row) {
                $results[] = [
                    'type' => $type,
                    'id' => (int) $row['id'],
                    'title' => $row['title'],
                    'meta' => $row['meta'],
                    'link' => str_replace('{id}', (string) $row['id'], $link),
                ];
            }
        }
        return ['data' => $results];
    }
}
