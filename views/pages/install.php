<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Install DEVSPACE</title>
    <style>
        *{box-sizing:border-box}
        body{margin:0;background:#090909;color:#f5f5f5;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Inter,sans-serif;padding:32px 16px}
        .wrap{max-width:720px;margin:0 auto}
        .brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;letter-spacing:.04em;margin-bottom:6px}
        .brand i{width:28px;height:28px;border-radius:8px;background:#b8ff65;display:grid;place-items:center;color:#0a0a0a;font-style:normal;font-size:14px}
        .sub{color:#999;margin:0 0 24px}
        .card{background:#1d1d1d;border:1px solid #303030;border-radius:16px;padding:22px;margin-bottom:16px}
        h2{font-size:15px;margin:0 0 14px}
        .req{display:grid;grid-template-columns:1fr auto;gap:6px 12px;font-size:13px}
        .ok{color:#b8ff65}.bad{color:#ff6b6b}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media (max-width:560px){.grid{grid-template-columns:1fr}}
        label{display:block;font-size:12px;color:#999;margin-bottom:5px}
        input,select{width:100%;height:42px;background:#242424;border:1px solid #303030;border-radius:10px;color:#f5f5f5;padding:0 12px;font:inherit}
        input:focus,select:focus{outline:none;border-color:#b8ff65}
        .check{display:flex;gap:10px;align-items:center}.check input{width:18px;height:18px}
        button{height:46px;padding:0 22px;border-radius:12px;border:0;background:#b8ff65;color:#0a0a0a;font-weight:600;font-size:14px;cursor:pointer;width:100%}
        .errors{background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.35);color:#ffb3b3;border-radius:12px;padding:12px 16px;margin-bottom:16px}
        .errors li{margin:2px 0}
        a{color:#b8ff65}
        code{background:#242424;padding:2px 6px;border-radius:6px;font-size:12px}
    </style>
</head>
<body>
<div class="wrap">
    <div class="brand"><i>◆</i> DEVSPACE</div>
    <p class="sub">Personal Developer Command Center — installation</p>

<?php if ($success): ?>
    <div class="card">
        <h2 class="ok">Installation complete ✓</h2>
        <p>Your admin account has been created and the database is ready.</p>
        <p>Next steps:</p>
        <ul>
            <li>Add the cron jobs described in <code>README.md</code> (monitoring every minute, maintenance hourly).</li>
            <li>For extra safety, delete <code>public/install.php</code>.</li>
        </ul>
        <p><a href="<?= e(base_path_url()) ?>/login">Open DEVSPACE →</a></p>
    </div>
<?php else: ?>
    <?php if ($errors): ?>
        <div class="errors"><ul><?php foreach ($errors as $err): ?><li><?= e($err) ?></li><?php endforeach; ?></ul></div>
    <?php endif; ?>

    <div class="card">
        <h2>1 · Server requirements</h2>
        <div class="req">
            <?php foreach ($requirements as $label => $ok): ?>
                <span><?= e($label) ?></span><span class="<?= $ok ? 'ok' : 'bad' ?>"><?= $ok ? 'OK' : 'Missing' ?></span>
            <?php endforeach; ?>
        </div>
    </div>

    <form method="post" autocomplete="off">
        <input type="hidden" name="_token" value="<?= e($_SESSION['install_csrf']) ?>">
        <div class="card">
            <h2>2 · MySQL database</h2>
            <div class="grid">
                <div><label>Host</label><input name="db_host" value="<?= e($old['db_host']) ?>" required></div>
                <div><label>Port</label><input name="db_port" value="<?= e($old['db_port']) ?>" inputmode="numeric" required></div>
                <div><label>Database name</label><input name="db_name" value="<?= e($old['db_name']) ?>" required></div>
                <div><label>Username</label><input name="db_user" value="<?= e($old['db_user']) ?>" required></div>
                <div><label>Password</label><input type="password" name="db_pass"></div>
            </div>
        </div>
        <div class="card">
            <h2>3 · Application</h2>
            <div class="grid">
                <div><label>App URL</label><input name="app_url" value="<?= e($old['app_url']) ?>" required></div>
                <div><label>Timezone</label>
                    <select name="timezone"><?php foreach (timezone_identifiers_list() as $tz): ?><option <?= $tz === $old['timezone'] ? 'selected' : '' ?>><?= e($tz) ?></option><?php endforeach; ?></select>
                </div>
            </div>
        </div>
        <div class="card">
            <h2>4 · Admin account</h2>
            <div class="grid">
                <div><label>Name</label><input name="name" value="<?= e($old['name']) ?>" required></div>
                <div><label>Email</label><input type="email" name="email" value="<?= e($old['email']) ?>" required></div>
                <div><label>Password (min 10, letters + numbers)</label><input type="password" name="password" minlength="10" required></div>
                <div><label>Confirm password</label><input type="password" name="password_confirmation" minlength="10" required></div>
            </div>
            <p class="check" style="margin-top:14px"><input type="checkbox" id="demo" name="demo" value="1" <?= $old['demo'] ? 'checked' : '' ?>><label for="demo" style="margin:0;color:#f5f5f5">Load sample data so I can explore the dashboard</label></p>
        </div>
        <button type="submit" <?= $requirementsOk ? '' : 'disabled' ?>>Install DEVSPACE</button>
    </form>
<?php endif; ?>
</div>
</body>
</html>
