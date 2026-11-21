<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

/**
 * Authenticated encryption for API Vault secrets (libsodium XSalsa20-Poly1305).
 * The key lives only in .env (APP_KEY) — never in the database or the repository.
 */
final class Crypto
{
    private static function key(): string
    {
        $raw = (string) (env('APP_KEY') ?: config('app.key'));
        if (str_starts_with($raw, 'base64:')) {
            $raw = base64_decode(substr($raw, 7), true) ?: '';
        }
        if (strlen($raw) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) {
            throw new RuntimeException('APP_KEY is missing or invalid. Run: php bin/console.php key:generate');
        }
        return $raw;
    }

    public static function generateKey(): string
    {
        return 'base64:' . base64_encode(sodium_crypto_secretbox_keygen());
    }

    public static function encrypt(string $plaintext): string
    {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $cipher = sodium_crypto_secretbox($plaintext, $nonce, self::key());
        return 'v1:' . base64_encode($nonce . $cipher);
    }

    public static function decrypt(string $payload): string
    {
        if (!str_starts_with($payload, 'v1:')) {
            throw new RuntimeException('Unsupported ciphertext format.');
        }
        $data = base64_decode(substr($payload, 3), true);
        if ($data === false || strlen($data) < SODIUM_CRYPTO_SECRETBOX_NONCEBYTES + SODIUM_CRYPTO_SECRETBOX_MACBYTES) {
            throw new RuntimeException('Corrupted ciphertext.');
        }
        $nonce = substr($data, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $plain = sodium_crypto_secretbox_open(substr($data, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES), $nonce, self::key());
        if ($plain === false) {
            throw new RuntimeException('Unable to decrypt secret (wrong APP_KEY?).');
        }
        return $plain;
    }
}
