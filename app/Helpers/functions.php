<?php

declare(strict_types=1);

use App\Core\Env;

/** Read an environment value with an optional default. */
function env(string $key, mixed $default = null): mixed
{
    return Env::get($key, $default);
}

/** Read a configuration value using dot notation, e.g. config('app.name'). */
function config(string $key, mixed $default = null): mixed
{
    static $cache = [];
    [$file, $path] = array_pad(explode('.', $key, 2), 2, null);
    if (!array_key_exists($file, $cache)) {
        $filePath = BASE_PATH . '/config/' . $file . '.php';
        $cache[$file] = is_file($filePath) ? require $filePath : [];
    }
    $value = $cache[$file];
    if ($path === null) {
        return $value;
    }
    foreach (explode('.', $path) as $segment) {
        if (!is_array($value) || !array_key_exists($segment, $value)) {
            return $default;
        }
        $value = $value[$segment];
    }
    return $value;
}

/** HTML-escape a value for safe output in server-rendered views. */
function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

function today(): string
{
    return date('Y-m-d');
}

function storage_path(string $path = ''): string
{
    return BASE_PATH . '/storage' . ($path !== '' ? '/' . ltrim($path, '/') : '');
}

function is_cli(): bool
{
    return PHP_SAPI === 'cli';
}

/** Mask a secret for display: keeps only the last 4 characters. */
function mask_secret(?string $hint): string
{
    return '••••••••••••' . ($hint ?? '');
}

/** Returns the base URL path the app is mounted under (e.g. "" or "/devspace"). */
function base_path_url(): string
{
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    $dir = rtrim(dirname($script), '/');
    // When served through the root .htaccess, SCRIPT_NAME is /public/index.php — strip /public.
    if (str_ends_with($dir, '/public')) {
        $dir = substr($dir, 0, -7);
    }
    return $dir === '/' ? '' : $dir;
}
