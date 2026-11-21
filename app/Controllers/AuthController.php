<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\HttpException;
use App\Core\Request;
use App\Core\Session;
use App\Core\Validator;
use App\Services\ActivityLogger;
use App\Services\RateLimiter;
use App\Services\Settings;

final class AuthController
{
    /** Public: returns the current user (if any) and a CSRF token for the SPA. */
    public function session(Request $request): array
    {
        $userId = (int) ($_SESSION['user_id'] ?? 0);
        $user = $userId ? Database::first('SELECT id, name, email, role, title, created_at FROM users WHERE id = ?', [$userId]) : null;
        return [
            'user' => $user,
            'settings' => $user ? Settings::forClient((int) $user['id']) : null,
            'csrf' => Session::csrfToken(),
            'app' => ['name' => config('app.name'), 'version' => DEVSPACE_VERSION],
            'server_time' => now(),
        ];
    }

    public function login(Request $request): array
    {
        $data = Validator::validate($request->input(), [
            'email' => 'required|email|max:190',
            'password' => 'required|string|max:200',
        ]);
        $email = strtolower($data['email']);
        $ipKey = 'login-ip:' . $request->ip();
        $userKey = 'login:' . $email . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($userKey, 5) || RateLimiter::tooManyAttempts($ipKey, 30)) {
            $wait = max(RateLimiter::availableIn($userKey), RateLimiter::availableIn($ipKey));
            throw new HttpException(429, 'Too many login attempts. Try again in ' . max(1, (int) ceil($wait / 60)) . ' minute(s).');
        }

        $user = Database::first('SELECT * FROM users WHERE email = ?', [$email]);
        // Always run password_verify to keep timing uniform when the user doesn't exist.
        $hash = $user['password_hash'] ?? '$2y$10$fv90IsZkiiKeAZm5xgvSHOz27fLnn29WN9CCv0sMp5T6NXpXzoyz6';
        if (!password_verify($data['password'], $hash) || $user === null) {
            RateLimiter::hit($userKey, 900);
            RateLimiter::hit($ipKey, 900);
            throw new HttpException(422, 'These credentials do not match our records.', ['email' => 'Invalid email or password.']);
        }

        RateLimiter::clear($userKey);
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            Database::update('users', ['password_hash' => password_hash($data['password'], PASSWORD_DEFAULT)], 'id = :id', ['id' => $user['id']]);
        }
        Session::regenerate();
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['login_at'] = time();
        Database::update('users', ['last_login_at' => now()], 'id = :id', ['id' => $user['id']]);
        ActivityLogger::log((int) $user['id'], 'login', 'auth', null, 'Signed in from ' . $request->ip());

        return $this->session($request);
    }

    public function logout(Request $request): array
    {
        if (!empty($_SESSION['user_id'])) {
            ActivityLogger::log((int) $_SESSION['user_id'], 'logout', 'auth', null, 'Signed out');
        }
        Session::destroy();
        Session::start();
        return ['ok' => true, 'csrf' => Session::csrfToken()];
    }
}
