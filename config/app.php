<?php

return [
    'name' => env('APP_NAME', 'DEVSPACE'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => rtrim((string) env('APP_URL', ''), '/'),
    'timezone' => env('APP_TIMEZONE', 'Asia/Tashkent'),
    // 32-byte key, base64 encoded ("base64:...") — used to encrypt API Vault secrets.
    'key' => env('APP_KEY', ''),
    'session' => [
        'name' => env('SESSION_NAME', 'devspace_session'),
        'lifetime' => (int) env('SESSION_LIFETIME', 480), // minutes of inactivity
        'secure' => env('SESSION_SECURE', 'auto'),       // true | false | auto (detect HTTPS)
    ],
    'mail' => [
        'from' => env('MAIL_FROM', ''),
    ],
    'monitoring' => [
        'retention_days' => (int) env('MONITOR_RETENTION_DAYS', 90),
        'user_agent' => 'DEVSPACE-Monitor/1.0',
    ],
];
