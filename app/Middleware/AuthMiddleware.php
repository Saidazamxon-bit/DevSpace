<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

/** Rejects unauthenticated requests and attaches the current user to the request. */
final class AuthMiddleware
{
    public function handle(Request $request): void
    {
        $userId = (int) ($_SESSION['user_id'] ?? 0);
        if ($userId <= 0) {
            Response::error(401, 'Authentication required.');
        }
        $user = Database::first('SELECT id, name, email, role, title, created_at FROM users WHERE id = ?', [$userId]);
        if ($user === null) {
            $_SESSION = [];
            Response::error(401, 'Authentication required.');
        }
        $request->user = $user;
    }
}
