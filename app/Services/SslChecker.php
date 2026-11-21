<?php

declare(strict_types=1);

namespace App\Services;

/** Reads the TLS certificate of a host and returns its expiry date (Y-m-d) or null. */
final class SslChecker
{
    public static function expiry(string $host, int $timeout = 8): ?string
    {
        $host = strtolower(trim($host));
        if (!preg_match('/^[a-z0-9.-]+$/', $host)) {
            return null;
        }
        $ctx = stream_context_create(['ssl' => [
            'capture_peer_cert' => true,
            'verify_peer' => false,
            'verify_peer_name' => false,
            'SNI_enabled' => true,
            'peer_name' => $host,
        ]]);
        $client = @stream_socket_client("ssl://$host:443", $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $ctx);
        if ($client === false) {
            return null;
        }
        $params = stream_context_get_params($client);
        fclose($client);
        $cert = $params['options']['ssl']['peer_certificate'] ?? null;
        if (!$cert) {
            return null;
        }
        $info = openssl_x509_parse($cert);
        return isset($info['validTo_time_t']) ? date('Y-m-d', (int) $info['validTo_time_t']) : null;
    }
}
