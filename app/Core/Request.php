<?php

declare(strict_types=1);

namespace App\Core;

final class Request
{
    private ?array $json = null;
    public array $params = [];
    public ?array $user = null;

    public function __construct(
        public readonly string $method,
        public readonly string $path,
    ) {
    }

    public static function capture(): self
    {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $base = base_path_url();
        if ($base !== '' && str_starts_with($uri, $base)) {
            $uri = substr($uri, strlen($base)) ?: '/';
        }
        if (str_starts_with($uri, '/public/')) {
            $uri = substr($uri, 7);
        }
        $path = '/' . trim(rawurldecode($uri), '/');
        return new self(strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'), $path);
    }

    /** JSON body (or form fields as a fallback). */
    public function input(?string $key = null, mixed $default = null): mixed
    {
        if ($this->json === null) {
            $raw = file_get_contents('php://input') ?: '';
            $decoded = $raw !== '' ? json_decode($raw, true) : null;
            $this->json = is_array($decoded) ? $decoded : $_POST;
        }
        if ($key === null) {
            return $this->json;
        }
        return $this->json[$key] ?? $default;
    }

    public function query(string $key, mixed $default = null): mixed
    {
        $value = $_GET[$key] ?? $default;
        return is_string($value) ? trim($value) : $value;
    }

    public function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return $_SERVER[$key] ?? null;
    }

    public function ip(): string
    {
        return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
    }

    public function param(string $key): string
    {
        return $this->params[$key] ?? '';
    }

    public function id(): int
    {
        return (int) ($this->params['id'] ?? 0);
    }

    public function userId(): int
    {
        return (int) ($this->user['id'] ?? 0);
    }

    public function isApi(): bool
    {
        return str_starts_with($this->path, '/api/') || $this->path === '/api';
    }
}
