<?php

declare(strict_types=1);

/*
 | DEVSPACE front controller.
 |  - /api/*  → JSON API (PHP controllers)
 |  - else   → React single-page app shell (pre-built static assets in /public/app)
 */

use App\Core\HttpException;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Core\Session;

// PHP built-in dev server: let it serve static files directly.
if (PHP_SAPI === 'cli-server' && is_file(__DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

require dirname(__DIR__) . '/app/bootstrap.php';

// Not installed yet → send to the installer.
if (!is_file(BASE_PATH . '/.env') || !is_file(storage_path('installed.lock'))) {
    header('Location: ' . base_path_url() . '/install.php');
    exit;
}

$request = Request::capture();
Response::securityHeaders();

try {
    Session::start();

    if ($request->isApi()) {
        $router = new Router();
        require BASE_PATH . '/routes/api.php';
        $router->dispatch($request);
    }

    require BASE_PATH . '/views/layouts/app.php';
} catch (HttpException $e) {
    Response::error($e->status, $e->getMessage(), $e->fields);
} catch (PDOException $e) {
    Logger::error('Database error', ['message' => $e->getMessage(), 'path' => $request->path]);
    Response::error(500, config('app.debug') ? $e->getMessage() : 'A database error occurred.');
} catch (Throwable $e) {
    Logger::error(get_class($e) . ': ' . $e->getMessage(), ['file' => $e->getFile() . ':' . $e->getLine(), 'path' => $request->path]);
    if ($request->isApi()) {
        Response::error(500, config('app.debug') ? $e->getMessage() : 'Something went wrong. The error has been logged.');
    }
    http_response_code(500);
    require BASE_PATH . '/views/pages/error.php';
}
