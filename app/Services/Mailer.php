<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;

/** Sends plain-text alert emails via PHP mail() (available on most shared hosts). */
final class Mailer
{
    public static function send(string $to, string $subject, string $body): bool
    {
        $from = (string) config('app.mail.from');
        if ($from === '' || !filter_var($to, FILTER_VALIDATE_EMAIL) || !function_exists('mail')) {
            return false;
        }
        $subject = '=?UTF-8?B?' . base64_encode('[DEVSPACE] ' . str_replace(["\r", "\n"], '', $subject)) . '?=';
        $headers = implode("\r\n", [
            'From: DEVSPACE <' . $from . '>',
            'Content-Type: text/plain; charset=UTF-8',
            'X-Mailer: DEVSPACE',
        ]);
        try {
            return @mail($to, $subject, $body, $headers);
        } catch (\Throwable $e) {
            Logger::warning('Mail send failed', ['message' => $e->getMessage()]);
            return false;
        }
    }
}
