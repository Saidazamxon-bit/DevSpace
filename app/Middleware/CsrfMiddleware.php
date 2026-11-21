<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Core\Session;

/** Requires a valid X-CSRF-Token header on every state-changing request. */
final class CsrfMiddleware
{
    public function handle(Request $request): void
    {
        if (in_array($request->method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }
        if (!Session::verifyCsrf($request->header('X-CSRF-Token'))) {
            Response::error(419, 'Your session has expired. Please reload the page.');
        }
    }
}
