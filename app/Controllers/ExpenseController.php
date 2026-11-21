<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Models\Expense;
use App\Services\Currency;
use App\Services\RecurringExpenseService;
use App\Services\Settings;

final class ExpenseController extends ResourceController
{
    protected string $model = Expense::class;

    protected function listWhere(Request $request): array
    {
        $where = [];
        $from = $request->query('from');
        $to = $request->query('to');
        if ($from && preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
            $where['t.spent_at >= :from'] = ['from' => $from];
        }
        if ($to && preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            $where['t.spent_at <= :to'] = ['to' => $to];
        }
        return $where;
    }

    protected function prepare(array $data, Request $request, ?array $existing): array
    {
        $recurring = (bool) ($data['is_recurring'] ?? $existing['is_recurring'] ?? false);
        $recurrence = $data['recurrence'] ?? $existing['recurrence'] ?? null;
        if ($recurring && $recurrence === null) {
            $data['recurrence'] = $recurrence = 'monthly';
        }
        if (!$recurring) {
            $data['recurrence'] = null;
            $data['next_occurrence'] = null;
        } else {
            $spent = $data['spent_at'] ?? $existing['spent_at'];
            $changed = $existing === null || !$existing['is_recurring'] || $spent !== $existing['spent_at'] || $recurrence !== $existing['recurrence'];
            if ($changed) {
                $data['next_occurrence'] = RecurringExpenseService::nextDate($spent, $recurrence);
            }
        }
        return $data;
    }

    protected function afterSave(int $id, Request $request, bool $created): void
    {
        RecurringExpenseService::run($request->userId());
    }

    public function stats(Request $request): array
    {
        $uid = $request->userId();
        $target = Settings::get($uid, 'currency');
        $rates = Currency::rates($uid);
        $convert = static fn ($amount, $cur) => Currency::convert((float) $amount, $cur, $target, $rates);

        $monthStart = date('Y-m-01');
        $from12 = date('Y-m-01', strtotime('-11 months', strtotime($monthStart)));
        $rows = Database::all(
            'SELECT DATE_FORMAT(spent_at, "%Y-%m") AS ym, currency, SUM(amount) AS total FROM expenses
             WHERE user_id = ? AND spent_at >= ? GROUP BY ym, currency',
            [$uid, $from12]
        );
        $monthly = [];
        for ($i = 0; $i < 12; $i++) {
            $monthly[date('Y-m', strtotime("+$i months", strtotime($from12)))] = 0.0;
        }
        foreach ($rows as $r) {
            if (isset($monthly[$r['ym']])) {
                $monthly[$r['ym']] += $convert($r['total'], $r['currency']);
            }
        }

        $catRows = Database::all(
            'SELECT COALESCE(c.name, "Uncategorized") AS name, c.color, e.currency, SUM(e.amount) AS total
             FROM expenses e LEFT JOIN expense_categories c ON c.id = e.category_id
             WHERE e.user_id = ? AND e.spent_at >= ? GROUP BY c.id, c.name, c.color, e.currency',
            [$uid, $from12]
        );
        $byCategory = [];
        foreach ($catRows as $r) {
            $byCategory[$r['name']] ??= ['name' => $r['name'], 'color' => $r['color'], 'total' => 0.0];
            $byCategory[$r['name']]['total'] += $convert($r['total'], $r['currency']);
        }
        usort($byCategory, static fn ($a, $b) => $b['total'] <=> $a['total']);

        $byCurrency = Database::all(
            'SELECT currency, SUM(amount) AS total, COUNT(*) AS n FROM expenses WHERE user_id = ? AND spent_at >= ? GROUP BY currency',
            [$uid, $monthStart]
        );
        $recurring = Database::all('SELECT amount, currency, recurrence FROM expenses WHERE user_id = ? AND is_recurring = 1', [$uid]);
        $monthlyCommitment = 0.0;
        foreach ($recurring as $r) {
            $monthlyCommitment += $convert($r['amount'], $r['currency']) / ($r['recurrence'] === 'yearly' ? 12 : 1);
        }

        $months = array_values($monthly);
        $thisMonth = end($months) ?: 0.0;
        $lastMonth = $months[count($months) - 2] ?? 0.0;

        return ['data' => [
            'currency' => $target,
            'rates' => $rates,
            'monthly' => array_map(static fn ($k, $v) => ['month' => $k, 'total' => round($v, 2)], array_keys($monthly), $months),
            'by_category' => array_map(static fn ($c) => ['name' => $c['name'], 'color' => $c['color'], 'total' => round($c['total'], 2)], $byCategory),
            'this_month_by_currency' => array_map(static fn ($r) => ['currency' => $r['currency'], 'total' => (float) $r['total'], 'count' => (int) $r['n']], $byCurrency),
            'this_month' => round($thisMonth, 2),
            'last_month' => round($lastMonth, 2),
            'year_total' => round(array_sum($months), 2),
            'recurring_monthly' => round($monthlyCommitment, 2),
            'recurring_count' => count($recurring),
        ]];
    }

    public function export(Request $request): void
    {
        $rows = Expense::list($request->userId(), $_GET + ['sort' => 'date'], $this->listWhere($request));
        $out = fopen('php://temp', 'r+');
        fputcsv($out, ['Date', 'Title', 'Vendor', 'Category', 'Project', 'Amount', 'Currency', 'Recurring', 'Notes']);
        $safe = static fn ($v) => is_string($v) && $v !== '' && in_array($v[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'" . $v : $v;
        foreach ($rows as $r) {
            fputcsv($out, array_map($safe, [
                $r['spent_at'], $r['title'], $r['vendor'], $r['category_name'], $r['project_name'],
                number_format($r['amount'], 2, '.', ''), $r['currency'], $r['is_recurring'] ? ($r['recurrence'] ?? 'yes') : 'no', $r['notes'],
            ]));
        }
        rewind($out);
        Response::download("\xEF\xBB\xBF" . stream_get_contents($out), 'devspace-expenses-' . date('Y-m-d') . '.csv', 'text/csv; charset=utf-8');
    }
}
