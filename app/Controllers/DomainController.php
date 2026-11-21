<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HttpException;
use App\Core\Request;
use App\Models\Domain;
use App\Services\RateLimiter;
use App\Services\SslChecker;

final class DomainController extends ResourceController
{
    protected string $model = Domain::class;

    protected function listWhere(Request $request): array
    {
        return match ($request->query('state')) {
            'expiring' => ['t.expires_at BETWEEN CURDATE() AND CURDATE() + INTERVAL 30 DAY'],
            'expired' => ['t.expires_at < CURDATE()'],
            default => [],
        };
    }

    public function store(Request $request): array
    {
        $this->ensureUnique($request, null);
        return parent::store($request);
    }

    public function update(Request $request, bool $partial = false): array
    {
        $this->ensureUnique($request, $request->id());
        return parent::update($request, $partial);
    }

    private function ensureUnique(Request $request, ?int $ignoreId): void
    {
        $name = strtolower(trim((string) preg_replace('#^https?://#i', '', rtrim((string) $request->input('name', ''), '/'))));
        if ($name === '') {
            return;
        }
        $exists = \App\Core\Database::value(
            'SELECT id FROM domains WHERE user_id = ? AND name = ?' . ($ignoreId ? ' AND id <> ' . (int) $ignoreId : ''),
            [$request->userId(), $name]
        );
        if ($exists) {
            throw HttpException::validation(['name' => 'This domain is already in your list.']);
        }
    }

    /** Live-check the SSL certificate expiry for a domain. */
    public function checkSsl(Request $request): array
    {
        $uid = $request->userId();
        $domain = Domain::findOrFail($request->id(), $uid);
        RateLimiter::enforce("ssl:$uid", 20, 600);
        $expires = SslChecker::expiry($domain['name']);
        if ($expires === null) {
            throw new HttpException(422, 'Could not read an SSL certificate from ' . $domain['name'] . ':443.');
        }
        Domain::update($domain['id'], $uid, ['ssl_expires_at' => $expires, 'ssl_checked_at' => now()]);
        return ['data' => Domain::findOrFail($domain['id'], $uid)];
    }
}
