<?php
/**
 * Tega Oil — Sorteo · instalación.
 *   /server/install.php?key=<install_key de config.php>
 * - Crea las tablas (schema.sql) y la carpeta privada de fotos.
 * - Genera el hash de la contraseña del panel para config.php.
 * Después de instalar, dejá install_key vacía en config.php: el instalador queda deshabilitado.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
$cfg = tg_config();
$key = (string)($_GET['key'] ?? '');
$ik = (string)($cfg['install_key'] ?? '');
if (strlen($ik) < 12 || $ik === 'CAMBIAR-ESTA-CLAVE' || !hash_equals($ik, $key)) {
    http_response_code(403);
    exit('Acceso denegado. Configurá install_key en config.php y pasala como ?key=...');
}

$out = [];
$hash = null;
try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['pass'])) {
        $p = (string)$_POST['pass'];
        if (strlen($p) < 10) $out[] = '⚠️ Usá una contraseña de al menos 10 caracteres.';
        else $hash = password_hash($p, PASSWORD_DEFAULT);
    }
    $db = tg_db();
    foreach (array_filter(array_map('trim', explode(';', preg_replace('/^--.*$/m', '', (string)file_get_contents(__DIR__ . '/schema.sql'))))) as $sql) $db->exec($sql);
    $out[] = '✔ Tablas creadas / verificadas.';
    if (!is_dir(TG_DATA_DIR)) mkdir(TG_DATA_DIR, 0750, true);
    $out[] = is_writable(TG_DATA_DIR) ? '✔ Carpeta de fotos lista (server/data/facturas).' : '✖ La carpeta server/data/facturas no tiene permiso de escritura.';
    $out[] = is_file(__DIR__ . '/data/.htaccess') ? '✔ Carpeta de fotos protegida (.htaccess).' : '✖ Falta server/data/.htaccess: las fotos quedarían accesibles.';
    $out[] = 'ℹ Participaciones registradas: ' . (int)$db->query('SELECT COUNT(*) FROM tg_entries')->fetchColumn();
} catch (Throwable $e) {
    $out[] = '✖ Error: ' . htmlspecialchars($e->getMessage());
}
?>
<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Instalación — Sorteo Tega Oil</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0a0d;color:#f5f3f7;max-width:680px;margin:40px auto;padding:0 16px;line-height:1.6}code,textarea{font-family:ui-monospace,monospace}li{margin:6px 0}form{background:#1d1924;padding:20px;border-radius:14px;margin-top:24px}input{padding:10px;border:1px solid #444;border-radius:8px;width:100%;box-sizing:border-box;background:#0b0a0d;color:#fff}button{margin-top:10px;padding:10px 18px;border:0;border-radius:999px;background:#9803fb;color:#fff;cursor:pointer}textarea{width:100%;box-sizing:border-box;height:70px;background:#0b0a0d;color:#1efbab}.warn{background:#5a1d6e;padding:12px 16px;border-radius:10px}</style></head>
<body>
<h1>Instalación — Sorteo Tega Oil</h1>
<ul><?php foreach ($out as $l) echo '<li>' . $l . '</li>'; ?></ul>
<form method="post">
  <h2>Contraseña del panel</h2>
  <p>Escribí la contraseña del panel. Copiá el hash en <code>admin_pass_hash</code> de <code>server/config.php</code>.</p>
  <input type="password" name="pass" autocomplete="new-password" placeholder="Contraseña (mín. 10 caracteres)">
  <button>Generar hash</button>
  <?php if ($hash): ?><p><b>Hash:</b></p><textarea readonly onclick="this.select()"><?= htmlspecialchars($hash) ?></textarea><?php endif; ?>
</form>
<p class="warn">Cuando termines, dejá <code>install_key</code> vacía en <code>config.php</code> para deshabilitar este instalador.</p>
</body></html>
