<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\HttpException;

final class UserService
{
    public const DEFAULT_CATEGORIES = [
        // Colors follow a colorblind-validated categorical order (adjacent slots stay distinguishable).
        ['Hosting', '#3987E5'], ['Domains', '#D95926'], ['Software & SaaS', '#199E70'],
        ['APIs', '#C98500'], ['Hardware', '#D55181'], ['Marketing', '#0CA30C'], ['Other', '#9085E9'],
    ];

    public static function create(string $name, string $email, string $password, string $role = 'admin'): int
    {
        $email = strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw HttpException::validation(['email' => 'Enter a valid email address.']);
        }
        if (mb_strlen($password) < 10) {
            throw HttpException::validation(['password' => 'Password must be at least 10 characters.']);
        }
        if (Database::value('SELECT id FROM users WHERE email = ?', [$email])) {
            throw HttpException::validation(['email' => 'A user with this email already exists.']);
        }
        $id = Database::insert('users', [
            'name' => trim($name) ?: 'Developer',
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'role' => $role,
        ]);
        foreach (self::DEFAULT_CATEGORIES as [$cat, $color]) {
            Database::query('INSERT IGNORE INTO expense_categories (user_id, name, color) VALUES (?, ?, ?)', [$id, $cat, $color]);
        }
        ActivityLogger::log($id, 'created', 'account', $id, 'Account created');
        return $id;
    }
}
