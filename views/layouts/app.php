<?php
/**
 * Serves the compiled React app (public/app/index.html) and injects the
 * <base href> for sub-directory installs. No user data is rendered server-side.
 */
$index = BASE_PATH . '/public/app/index.html';
if (!is_file($index)) {
    http_response_code(500);
    $message = 'Frontend build not found. Run "npm run build" inside /frontend (or upload public/app).';
    require BASE_PATH . '/views/pages/error.php';
    exit;
}
$base = base_path_url() . '/';
$html = (string) file_get_contents($index);
// Assets are built with relative URLs ("./assets/..."), so <base> points at /app/.
$html = str_replace('<head>', '<head>' . "\n    <base href=\"" . e($base . 'app/') . '">' . "\n    <meta name=\"app-base\" content=\"" . e(rtrim($base, '/')) . '">', $html);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
echo $html;
exit;
