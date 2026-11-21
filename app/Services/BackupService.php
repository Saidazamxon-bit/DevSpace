<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\HttpException;
use PDO;

/** Pure-PHP gzip SQL dumps (no mysqldump binary needed on shared hosting). */
final class BackupService
{
    private const PATTERN = '/^devspace-\d{8}-\d{6}\.sql\.gz$/';

    public static function dir(): string
    {
        $dir = storage_path('backups');
        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }
        return $dir;
    }

    public static function create(): array
    {
        $name = 'devspace-' . date('Ymd-His') . '.sql.gz';
        $path = self::dir() . '/' . $name;
        $gz = gzopen($path, 'wb6');
        $pdo = Database::pdo();
        gzwrite($gz, "-- DEVSPACE backup " . date('c') . "\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n");

        $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        foreach ($tables as $table) {
            if ($table === 'rate_limits') {
                continue;
            }
            $create = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_NUM)[1];
            gzwrite($gz, "DROP TABLE IF EXISTS `$table`;\n$create;\n\n");
            $stmt = $pdo->query("SELECT * FROM `$table`");
            $batch = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $batch[] = '(' . implode(',', array_map(static fn ($v) => $v === null ? 'NULL' : $pdo->quote((string) $v), $row)) . ')';
                if (count($batch) >= 200) {
                    gzwrite($gz, "INSERT INTO `$table` VALUES\n" . implode(",\n", $batch) . ";\n");
                    $batch = [];
                }
            }
            if ($batch) {
                gzwrite($gz, "INSERT INTO `$table` VALUES\n" . implode(",\n", $batch) . ";\n");
            }
            gzwrite($gz, "\n");
        }
        gzwrite($gz, "SET FOREIGN_KEY_CHECKS = 1;\n");
        gzclose($gz);
        chmod($path, 0640);
        self::rotate();
        return self::info($path);
    }

    public static function list(): array
    {
        $files = glob(self::dir() . '/devspace-*.sql.gz') ?: [];
        rsort($files);
        return array_map([self::class, 'info'], $files);
    }

    public static function path(string $name): string
    {
        if (!preg_match(self::PATTERN, $name)) {
            throw HttpException::notFound('Backup not found.');
        }
        $path = self::dir() . '/' . $name;
        if (!is_file($path)) {
            throw HttpException::notFound('Backup not found.');
        }
        return $path;
    }

    /** Keep the 20 most recent backups. */
    public static function rotate(int $keep = 20): void
    {
        $files = glob(self::dir() . '/devspace-*.sql.gz') ?: [];
        rsort($files);
        foreach (array_slice($files, $keep) as $old) {
            @unlink($old);
        }
    }

    private static function info(string $path): array
    {
        return ['name' => basename($path), 'size' => filesize($path), 'created_at' => date('Y-m-d H:i:s', (int) filemtime($path))];
    }
}
