<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

/** Runs database/migrations/*.sql in order, tracking applied files in a `migrations` table. */
final class Migrator
{
    public static function run(PDO $pdo): array
    {
        $pdo->exec('CREATE TABLE IF NOT EXISTS migrations (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            migration VARCHAR(190) NOT NULL UNIQUE,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

        $applied = $pdo->query('SELECT migration FROM migrations')->fetchAll(PDO::FETCH_COLUMN);
        $files = glob(BASE_PATH . '/database/migrations/*.sql') ?: [];
        sort($files);
        $ran = [];
        foreach ($files as $file) {
            $name = basename($file);
            if (in_array($name, $applied, true)) {
                continue;
            }
            foreach (self::statements((string) file_get_contents($file)) as $sql) {
                $pdo->exec($sql);
            }
            $stmt = $pdo->prepare('INSERT INTO migrations (migration) VALUES (?)');
            $stmt->execute([$name]);
            $ran[] = $name;
        }
        return $ran;
    }

    /** Split a SQL file into statements (statements end with ";" at end of line). */
    private static function statements(string $sql): array
    {
        $sql = preg_replace('/^\s*--.*$/m', '', $sql);
        $parts = preg_split('/;\s*$/m', (string) $sql);
        return array_values(array_filter(array_map('trim', $parts), static fn ($s) => $s !== ''));
    }
}
