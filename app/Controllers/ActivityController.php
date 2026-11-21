<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;

final class ActivityController
{
    public function index(Request $request): array
    {
        $uid = $request->userId();
        $page = max(1, (int) $request->query('page', 1));
        $per = 40;
        $where = ['user_id = :uid'];
        $params = ['uid' => $uid];

        $type = (string) $request->query('type', '');
        if ($type !== '' && $type !== 'all' && preg_match('/^[a-z ]+$/', $type)) {
            $where[] = 'entity_type = :type';
            $params['type'] = $type;
        }
        $q = (string) $request->query('q', '');
        if ($q !== '') {
            $where[] = 'description LIKE :q';
            $params['q'] = '%' . addcslashes($q, '%_\\') . '%';
        }
        $sqlWhere = implode(' AND ', $where);
        $total = (int) Database::value("SELECT COUNT(*) FROM activity_logs WHERE $sqlWhere", $params);
        $rows = Database::all(
            "SELECT id, action, entity_type, entity_id, description, ip_address, created_at FROM activity_logs
             WHERE $sqlWhere ORDER BY created_at DESC, id DESC LIMIT $per OFFSET " . (($page - 1) * $per),
            $params
        );
        $heat = Database::all(
            "SELECT DATE(created_at) AS d, COUNT(*) AS n FROM activity_logs WHERE user_id = ? AND entity_type <> 'auth'
             AND created_at >= CURDATE() - INTERVAL 83 DAY GROUP BY d",
            [$uid]
        );
        $types = array_column(Database::all('SELECT DISTINCT entity_type FROM activity_logs WHERE user_id = ? ORDER BY entity_type', [$uid]), 'entity_type');

        return [
            'data' => $rows,
            'meta' => [
                'page' => $page,
                'pages' => max(1, (int) ceil($total / $per)),
                'total' => $total,
                'types' => $types,
                'heatmap' => array_map(static fn ($r) => ['date' => $r['d'], 'count' => (int) $r['n']], $heat),
            ],
        ];
    }
}
