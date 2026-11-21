<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Models\Snippet;

final class SnippetController extends ResourceController
{
    protected string $model = Snippet::class;

    public function index(Request $request): array
    {
        $uid = $request->userId();
        return [
            'data' => Snippet::list($uid, $_GET),
            'meta' => [
                'languages' => Database::all('SELECT language, COUNT(*) AS n FROM code_snippets WHERE user_id = ? GROUP BY language ORDER BY n DESC', [$uid]),
                'categories' => array_column(Database::all('SELECT DISTINCT category FROM code_snippets WHERE user_id = ? AND category IS NOT NULL AND category <> "" ORDER BY category', [$uid]), 'category'),
            ],
        ];
    }

    public function favorite(Request $request): array
    {
        $uid = $request->userId();
        $snippet = Snippet::findOrFail($request->id(), $uid);
        Snippet::update($snippet['id'], $uid, ['is_favorite' => $snippet['is_favorite'] ? 0 : 1]);
        return ['data' => Snippet::findOrFail($snippet['id'], $uid)];
    }
}
