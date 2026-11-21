<?php

declare(strict_types=1);

namespace App\Services;

/** Converts between UZS / USD / EUR using the user's configured exchange rates. */
final class Currency
{
    public const SUPPORTED = ['UZS', 'USD', 'EUR'];

    public static function rates(int $userId): array
    {
        return [
            'UZS' => 1.0,
            'USD' => max(1.0, (float) Settings::get($userId, 'rate_usd')),
            'EUR' => max(1.0, (float) Settings::get($userId, 'rate_eur')),
        ];
    }

    public static function convert(float $amount, string $from, string $to, array $rates): float
    {
        if ($from === $to) {
            return $amount;
        }
        $inUzs = $amount * ($rates[$from] ?? 1.0);
        return $inUzs / ($rates[$to] ?? 1.0);
    }

    /** Sum rows (amount + currency) in the user's default currency. */
    public static function sumConverted(int $userId, array $rows, string $amountKey = 'amount'): array
    {
        $target = Settings::get($userId, 'currency');
        $rates = self::rates($userId);
        $total = 0.0;
        foreach ($rows as $row) {
            $total += self::convert((float) $row[$amountKey], (string) $row['currency'], $target, $rates);
        }
        return ['amount' => round($total, 2), 'currency' => $target];
    }
}
