<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;

/** Materialises recurring expenses (monthly / yearly) when their next occurrence is due. */
final class RecurringExpenseService
{
    public static function nextDate(string $from, string $recurrence): string
    {
        $d = new \DateTimeImmutable($from);
        $day = (int) $d->format('d');
        $next = $recurrence === 'yearly' ? $d->modify('first day of +12 months') : $d->modify('first day of next month');
        $last = (int) $next->format('t');
        return $next->setDate((int) $next->format('Y'), (int) $next->format('m'), min($day, $last))->format('Y-m-d');
    }

    public static function run(?int $userId = null): int
    {
        $sql = "SELECT * FROM expenses WHERE is_recurring = 1 AND recurrence IS NOT NULL AND next_occurrence IS NOT NULL AND next_occurrence <= CURDATE()";
        $params = [];
        if ($userId !== null) {
            $sql .= ' AND user_id = ?';
            $params[] = $userId;
        }
        $created = 0;
        foreach (Database::all($sql, $params) as $e) {
            $next = $e['next_occurrence'];
            // Catch up on any missed periods (max 24 to stay safe).
            for ($i = 0; $i < 24 && $next <= today(); $i++) {
                Database::insert('expenses', [
                    'user_id' => $e['user_id'],
                    'project_id' => $e['project_id'],
                    'category_id' => $e['category_id'],
                    'parent_id' => $e['id'],
                    'title' => $e['title'],
                    'vendor' => $e['vendor'],
                    'amount' => $e['amount'],
                    'currency' => $e['currency'],
                    'spent_at' => $next,
                    'is_recurring' => 0,
                    'notes' => 'Auto-generated from recurring expense #' . $e['id'],
                ]);
                $created++;
                $next = self::nextDate($next, $e['recurrence']);
            }
            Database::update('expenses', ['next_occurrence' => $next], 'id = :id', ['id' => $e['id']]);
        }
        return $created;
    }
}
