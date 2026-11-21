<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>DEVSPACE — Error</title>
    <style>
        body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090909;color:#f5f5f5;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;padding:16px}
        .card{max-width:440px;background:#1d1d1d;border:1px solid #303030;border-radius:16px;padding:28px}
        h1{font-size:18px;margin:0 0 8px}p{color:#999;margin:0}b{color:#b8ff65}
    </style>
</head>
<body>
<div class="card">
    <h1><b>DEVSPACE</b> · Something went wrong</h1>
    <p><?= e($message ?? 'An unexpected error occurred. It has been logged — please try again.') ?></p>
</div>
</body>
</html>
