<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\HttpException;
use App\Core\Request;
use App\Core\Validator;
use App\Models\Credential;
use App\Services\ActivityLogger;
use App\Services\Crypto;
use App\Services\RateLimiter;

/**
 * API Vault. Secrets are encrypted with libsodium before they touch the database,
 * are never included in list/detail responses, and are only revealed after the
 * user re-enters their password (rate limited + logged).
 */
final class CredentialController extends ResourceController
{
    protected string $model = Credential::class;

    protected function prepare(array $data, Request $request, ?array $existing): array
    {
        $secretRule = $existing === null ? 'required|string|max:10000' : 'nullable|string|max:10000';
        $secret = Validator::validate(['secret' => $request->input('secret')], ['secret' => $secretRule])['secret'];
        if ($secret !== null && $secret !== '') {
            $data['secret_encrypted'] = Crypto::encrypt($secret);
            $data['secret_hint'] = mb_strlen($secret) >= 12 ? mb_substr($secret, -4) : null;
        }
        return $data;
    }

    public function reveal(Request $request): array
    {
        $uid = $request->userId();
        $cred = Credential::findOrFail($request->id(), $uid);
        RateLimiter::enforce("reveal:$uid", 10, 600);

        $password = (string) $request->input('password', '');
        $hash = (string) Database::value('SELECT password_hash FROM users WHERE id = ?', [$uid]);
        if (!password_verify($password, $hash)) {
            throw HttpException::validation(['password' => 'Incorrect password.']);
        }
        $encrypted = (string) Database::value('SELECT secret_encrypted FROM api_credentials WHERE id = ? AND user_id = ?', [$cred['id'], $uid]);
        try {
            $secret = Crypto::decrypt($encrypted);
        } catch (\Throwable $e) {
            throw new HttpException(500, 'This secret could not be decrypted. Check APP_KEY.');
        }
        Database::update('api_credentials', ['last_revealed_at' => now()], 'id = :id', ['id' => $cred['id']]);
        ActivityLogger::log($uid, 'revealed', 'credential', $cred['id'], 'Revealed secret “' . $cred['name'] . '” (' . $cred['provider'] . ')');
        return ['secret' => $secret];
    }
}
