<?php

declare(strict_types=1);

use App\Controllers\ActivityController;
use App\Controllers\AuthController;
use App\Controllers\CredentialController;
use App\Controllers\DomainController;
use App\Controllers\ExpenseCategoryController;
use App\Controllers\ExpenseController;
use App\Controllers\NotificationController;
use App\Controllers\OverviewController;
use App\Controllers\ProjectController;
use App\Controllers\SearchController;
use App\Controllers\ServerController;
use App\Controllers\SettingsController;
use App\Controllers\SnippetController;
use App\Controllers\TaskController;
use App\Controllers\WebsiteController;
use App\Core\Router;
use App\Middleware\AdminMiddleware;
use App\Middleware\AuthMiddleware;
use App\Middleware\CsrfMiddleware;

/** @var Router $router */

// Public (CSRF still enforced on POST).
$router->group([CsrfMiddleware::class], function (Router $r) {
    $r->get('/api/auth/session', [AuthController::class, 'session']);
    $r->post('/api/auth/login', [AuthController::class, 'login']);
    $r->post('/api/auth/logout', [AuthController::class, 'logout']);
});

// Authenticated API.
$router->group([AuthMiddleware::class, CsrfMiddleware::class], function (Router $r) {
    $r->get('/api/overview', [OverviewController::class, 'index']);
    $r->get('/api/search', [SearchController::class, 'index']);

    $r->post('/api/projects/{id}/archive', [ProjectController::class, 'archive']);
    $r->resource('/api/projects', ProjectController::class);

    $r->get('/api/tasks/stats', [TaskController::class, 'stats']);
    $r->post('/api/tasks/reorder', [TaskController::class, 'reorder']);
    $r->resource('/api/tasks', TaskController::class);

    $r->post('/api/domains/{id}/ssl-check', [DomainController::class, 'checkSsl']);
    $r->resource('/api/domains', DomainController::class);

    $r->resource('/api/servers', ServerController::class);

    $r->get('/api/monitoring/incidents', [WebsiteController::class, 'incidents']);
    $r->post('/api/monitoring/{id}/check', [WebsiteController::class, 'checkNow']);
    $r->resource('/api/monitoring', WebsiteController::class);

    $r->post('/api/credentials/{id}/reveal', [CredentialController::class, 'reveal']);
    $r->resource('/api/credentials', CredentialController::class);

    $r->get('/api/expenses/stats', [ExpenseController::class, 'stats']);
    $r->get('/api/expenses/export', [ExpenseController::class, 'export']);
    $r->resource('/api/expenses', ExpenseController::class);
    $r->resource('/api/expense-categories', ExpenseCategoryController::class);

    $r->post('/api/snippets/{id}/favorite', [SnippetController::class, 'favorite']);
    $r->resource('/api/snippets', SnippetController::class);

    $r->get('/api/activity', [ActivityController::class, 'index']);

    $r->get('/api/notifications', [NotificationController::class, 'index']);
    $r->post('/api/notifications/read-all', [NotificationController::class, 'readAll']);
    $r->post('/api/notifications/clear-read', [NotificationController::class, 'clearRead']);
    $r->post('/api/notifications/{id}/read', [NotificationController::class, 'read']);
    $r->delete('/api/notifications/{id}', [NotificationController::class, 'destroy']);

    $r->get('/api/settings', [SettingsController::class, 'show']);
    $r->put('/api/settings/profile', [SettingsController::class, 'updateProfile']);
    $r->put('/api/settings/password', [SettingsController::class, 'updatePassword']);
    $r->put('/api/settings/preferences', [SettingsController::class, 'updatePreferences']);
    $r->get('/api/settings/export', [SettingsController::class, 'export']);

    $r->group([AdminMiddleware::class], function (Router $r) {
        $r->get('/api/backups', [SettingsController::class, 'backups']);
        $r->post('/api/backups', [SettingsController::class, 'createBackup']);
        $r->get('/api/backups/{name}', [SettingsController::class, 'downloadBackup']);
        $r->delete('/api/backups/{name}', [SettingsController::class, 'deleteBackup']);
    });
});
