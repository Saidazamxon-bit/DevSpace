<?php

declare(strict_types=1);

/*
 | DEVSPACE CLI
 |   php bin/console.php key:generate         Write a new APP_KEY into .env (only if empty)
 |   php bin/console.php migrate              Run pending migrations
 |   php bin/console.php user:create          Create an admin user (interactive)
 |   php bin/console.php seed:demo EMAIL      Load demo data for an existing user
 |   php bin/console.php install:lock         Mark the app as installed
 */

if (PHP_SAPI !== 'cli') {
    exit('CLI only.');
}

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\Database;
use App\Services\Crypto;
use App\Services\Migrator;
use App\Services\UserService;

$cmd = $argv[1] ?? 'help';

switch ($cmd) {
    case 'key:generate':
        $envFile = BASE_PATH . '/.env';
        if (!is_file($envFile)) {
            copy(BASE_PATH . '/.env.example', $envFile);
        }
        $env = (string) file_get_contents($envFile);
        if (preg_match('/^APP_KEY=\S+/m', $env) && !in_array('--force', $argv, true)) {
            exit("APP_KEY already set. Use --force to overwrite (existing vault secrets become unreadable!).\n");
        }
        $key = Crypto::generateKey();
        $env = preg_match('/^APP_KEY=.*$/m', $env) ? preg_replace('/^APP_KEY=.*$/m', 'APP_KEY=' . $key, $env) : $env . "\nAPP_KEY=$key\n";
        file_put_contents($envFile, $env);
        echo "APP_KEY generated.\n";
        break;

    case 'migrate':
        $ran = Migrator::run(Database::pdo());
        echo $ran ? 'Migrated: ' . implode(', ', $ran) . "\n" : "Nothing to migrate.\n";
        break;

    case 'user:create':
        $name = readline('Name: ');
        $email = readline('Email: ');
        echo 'Password (min 10 chars): ';
        system('stty -echo');
        $password = trim((string) fgets(STDIN));
        system('stty echo');
        echo "\n";
        $id = UserService::create((string) $name, (string) $email, $password);
        echo "User #$id created.\n";
        break;

    case 'seed:demo':
        $email = $argv[2] ?? '';
        $uid = (int) Database::value('SELECT id FROM users WHERE email = ?', [strtolower($email)]);
        if (!$uid) {
            exit("User not found: $email\n");
        }
        require BASE_PATH . '/database/seeds/DemoSeeder.php';
        DemoSeeder::run($uid);
        echo "Demo data loaded for $email.\n";
        break;

    case 'install:lock':
        file_put_contents(storage_path('installed.lock'), date('c'));
        echo "Installed lock written.\n";
        break;

    default:
        echo "Commands: key:generate | migrate | user:create | seed:demo EMAIL | install:lock\n";
}
