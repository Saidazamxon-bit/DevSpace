<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

/** Restricts an endpoint to admin accounts (e.g. full database backups). Must run after AuthMiddleware. */
final class AdminMiddleware
{
    public function handle(Request $request): void
    {
        if (($request->user['role'] ?? '') !== 'admin') {
            Response::error(403, 'Administrator access required.');
        }
    }
}
