<?php

declare(strict_types=1);

namespace App\Models;

final class Snippet extends Model
{
    public const TABLE = 'code_snippets';
    public const ENTITY = 'snippet';
    public const LABEL = 'title';

    public const LANGUAGES = 'plaintext,php,javascript,typescript,jsx,html,css,scss,sql,bash,python,json,yaml,go,rust,java,csharp,cpp,c,ruby,kotlin,swift,dart,nginx,apache,dockerfile,markdown,xml,ini';

    public static function rules(): array
    {
        return [
            'title' => 'required|string|max:160',
            'language' => 'required|in:' . self::LANGUAGES,
            'category' => 'nullable|string|max:60',
            'tags' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'code' => 'required|string|max:200000',
            'is_favorite' => 'bool',
        ];
    }

    public static function searchable(): array
    {
        return ['t.title', 't.description', 't.tags', 't.category', 't.code'];
    }

    public static function filters(): array
    {
        return ['language' => 't.language', 'category' => 't.category', 'favorite' => 't.is_favorite'];
    }

    public static function sorts(): array
    {
        return ['updated' => 't.is_favorite DESC, t.updated_at DESC', 'title' => 't.title ASC', 'created' => 't.created_at DESC'];
    }

    public static function transform(array $row): array
    {
        self::toBool($row, ['is_favorite']);
        $row['lines'] = substr_count((string) $row['code'], "\n") + 1;
        return $row;
    }
}
