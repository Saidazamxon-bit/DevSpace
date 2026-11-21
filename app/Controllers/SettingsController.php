<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Core\Validator;
use App\Services\ActivityLogger;
use App\Services\BackupService;
use App\Services\RateLimiter;
use App\Services\Settings;

final class SettingsController
{
    public function show(Request $request): array
    {
        $uid = $request->userId();
        $stamp = static fn (string $f) => is_file($p = storage_path("cache/$f")) ? date('Y-m-d H:i:s', (int) filemtime($p)) : null;
        return ['data' => [
            'profile' => $request->user,
            'preferences' => Settings::forClient($uid),
            'system' => [
                'version' => DEVSPACE_VERSION,
                'php' => PHP_VERSION,
                'mysql' => (string) Database::value('SELECT VERSION()'),
                'timezone' => date_default_timezone_get(),
                'cron_monitor_last_run' => $stamp('cron_monitor.stamp'),
                'cron_daily_last_run' => $stamp('cron_daily.stamp'),
                'is_admin' => $request->user['role'] === 'admin',
                'mail_configured' => (string) config('app.mail.from') !== '',
            ],
        ]];
    }

    public function updateProfile(Request $request): array
    {
        $uid = $request->userId();
        $data = Validator::validate($request->input(), [
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'title' => 'nullable|string|max:120',
        ]);
        $data['email'] = strtolower($data['email']);
        if (Database::value('SELECT id FROM users WHERE email = ? AND id <> ?', [$data['email'], $uid])) {
            throw HttpException::validation(['email' => 'This email is already in use.']);
        }
        Database::update('users', $data, 'id = :id', ['id' => $uid]);
        ActivityLogger::log($uid, 'updated', 'settings', null, 'Updated profile');
        return ['data' => Database::first('SELECT id, name, email, role, title, created_at FROM users WHERE id = ?', [$uid])];
    }

    public function updatePassword(Request $request): array
    {
        $uid = $request->userId();
        RateLimiter::enforce("password:$uid", 5, 900);
        $data = Validator::validate($request->input(), [
            'current_password' => 'required|string|max:200',
            'password' => 'required|string|min:10|max:200',
            'password_confirmation' => 'required|string|max:200',
        ]);
        $hash = (string) Database::value('SELECT password_hash FROM users WHERE id = ?', [$uid]);
        if (!password_verify($data['current_password'], $hash)) {
            throw HttpException::validation(['current_password' => 'Current password is incorrect.']);
        }
        if ($data['password'] !== $data['password_confirmation']) {
            throw HttpException::validation(['password_confirmation' => 'Passwords do not match.']);
        }
        if (!preg_match('/[A-Za-z]/', $data['password']) || !preg_match('/\d/', $data['password'])) {
            throw HttpException::validation(['password' => 'Use at least one letter and one number.']);
        }
        Database::update('users', ['password_hash' => password_hash($data['password'], PASSWORD_DEFAULT)], 'id = :id', ['id' => $uid]);
        Session::regenerate();
        ActivityLogger::log($uid, 'updated', 'settings', null, 'Changed account password');
        return ['ok' => true, 'csrf' => Session::csrfToken()];
    }

    public function updatePreferences(Request $request): array
    {
        $uid = $request->userId();
        $rules = [];
        foreach (Settings::RULES as $key => $rule) {
            $rules[$key] = 'nullable|' . $rule;
        }
        $data = Validator::validate($request->input(), $rules, $uid, true);
        $data = array_filter($data, static fn ($v) => $v !== null);
        Settings::set($uid, $data);
        if (array_diff(array_keys($data), ['sidebar_collapsed', 'theme']) !== []) {
            ActivityLogger::log($uid, 'updated', 'settings', null, 'Updated preferences');
        }
        return ['data' => Settings::forClient($uid)];
    }

    /** Download all of the user's data as JSON (API secrets are excluded). */
    public function export(Request $request): void
    {
        $uid = $request->userId();
        $tables = [
            'projects' => 'SELECT * FROM projects WHERE user_id = ?',
            'tasks' => 'SELECT * FROM tasks WHERE user_id = ?',
            'domains' => 'SELECT * FROM domains WHERE user_id = ?',
            'servers' => 'SELECT * FROM servers WHERE user_id = ?',
            'server_projects' => 'SELECT sp.* FROM server_projects sp JOIN servers s ON s.id = sp.server_id WHERE s.user_id = ?',
            'websites' => 'SELECT * FROM websites WHERE user_id = ?',
            'monitoring_incidents' => 'SELECT i.* FROM monitoring_incidents i JOIN websites w ON w.id = i.website_id WHERE w.user_id = ?',
            'api_credentials' => 'SELECT id, project_id, provider, name, description, expires_at, tags, created_at, updated_at FROM api_credentials WHERE user_id = ?',
            'expense_categories' => 'SELECT * FROM expense_categories WHERE user_id = ?',
            'expenses' => 'SELECT * FROM expenses WHERE user_id = ?',
            'code_snippets' => 'SELECT * FROM code_snippets WHERE user_id = ?',
            'activity_logs' => 'SELECT id, action, entity_type, entity_id, description, created_at FROM activity_logs WHERE user_id = ?',
            'settings' => 'SELECT `key`, `value` FROM settings WHERE user_id = ?',
        ];
        $export = ['app' => 'DEVSPACE', 'version' => DEVSPACE_VERSION, 'exported_at' => date('c'), 'note' => 'API secrets are intentionally excluded.'];
        foreach ($tables as $name => $sql) {
            $export[$name] = Database::all($sql, [$uid]);
        }
        ActivityLogger::log($uid, 'exported', 'settings', null, 'Exported account data');
        Response::download(json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'devspace-export-' . date('Y-m-d') . '.json', 'application/json');
    }

    public function backups(Request $request): array
    {
        return ['data' => BackupService::list()];
    }

    public function createBackup(Request $request): array
    {
        RateLimiter::enforce('backup:' . $request->userId(), 5, 3600);
        $file = BackupService::create();
        ActivityLogger::log($request->userId(), 'created', 'backup', null, 'Created database backup ' . $file['name']);
        return ['data' => $file];
    }

    public function downloadBackup(Request $request): void
    {
        $path = BackupService::path($request->param('name'));
        ActivityLogger::log($request->userId(), 'downloaded', 'backup', null, 'Downloaded backup ' . basename($path));
        Response::download((string) file_get_contents($path), basename($path), 'application/gzip');
    }

    public function deleteBackup(Request $request): array
    {
        $path = BackupService::path($request->param('name'));
        unlink($path);
        ActivityLogger::log($request->userId(), 'deleted', 'backup', null, 'Deleted backup ' . basename($path));
        return ['ok' => true];
    }
}
