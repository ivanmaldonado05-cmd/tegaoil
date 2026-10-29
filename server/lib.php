<?php
/**
 * Tega Oil — Sorteo · funciones compartidas del backend (PHP 7.4+).
 */
declare(strict_types=1);

date_default_timezone_set('America/Asuncion');

if (!is_file(__DIR__ . '/config.php')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Falta server/config.php (copiá config.sample.php).']);
    exit;
}

const TG_DATA_DIR = __DIR__ . '/data/facturas';

// Premios (deben coincidir con assets/js/config.js). El orden del sorteo se elige en la pantalla del sorteo.
const TG_PRIZES = [
    ['id' => 'cuadriciclo',   'titulo' => 'Cuadriciclo AU200', 'detalle' => 'Color blanco / naranja · Año 2026'],
    ['id' => 'moto-gris',     'titulo' => 'Moto CF 125',       'detalle' => 'Color gris · Año 2025'],
    ['id' => 'moto-blanca-1', 'titulo' => 'Moto CF 125',       'detalle' => 'Color blanco · Año 2025'],
    ['id' => 'moto-blanca-2', 'titulo' => 'Moto CF 125',       'detalle' => 'Color blanco · Año 2025'],
    ['id' => 'moto-negra',    'titulo' => 'Moto CF 125',       'detalle' => 'Color negro · Año 2025'],
];
// Bases: un ganador y un suplente por premio
const TG_ROLES = ['ganador', 'suplente1'];

const TG_SUCURSALES = [
    'San Lorenzo — Avda. Manuel Ortiz Guerrero esq. Puerto Rosario',
    'Barcequillo — Avda. Pratt Gill esq. Capitolio',
    'Tramo Luque – San Bernardino — Calle Vergel Luqueño',
    'Ypacaraí — Iturbe esq. Paraguay',
    'Coronel Oviedo — Dr. Blas Garay esq. Las Residentas',
];

function tg_config(): array
{
    static $cfg = null;
    if ($cfg === null) $cfg = require __DIR__ . '/config.php';
    return $cfg;
}

function tg_db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = tg_config()['db'];
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $c['host'], $c['name'], $c['charset'] ?? 'utf8mb4');
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        // Paraguay: UTC-3 todo el año
        $pdo->exec("SET time_zone = '-03:00'");
    }
    return $pdo;
}

/* ---------- Sesión y seguridad ---------- */
function tg_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('tgadmin');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function tg_is_auth(): bool
{
    tg_session();
    if (empty($_SESSION['auth'])) return false;
    if (time() - ($_SESSION['seen'] ?? 0) > 8 * 3600) { $_SESSION = []; return false; }
    $_SESSION['seen'] = time();
    return true;
}

function tg_user(): string
{
    return (string)($_SESSION['user'] ?? '');
}

function tg_require_auth(): void
{
    if (!tg_is_auth()) tg_json(['ok' => false, 'error' => 'No autorizado'], 401);
}

function tg_require_csrf(): void
{
    $sent = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!is_string($sent) || !hash_equals($_SESSION['csrf'] ?? '', $sent)) tg_json(['ok' => false, 'error' => 'Token inválido, recargá la página.'], 419);
}

function tg_client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

/** Cuenta intentos recientes de un tipo para la IP actual. */
function tg_attempts(string $kind, int $minutes): int
{
    $db = tg_db();
    $db->prepare('DELETE FROM tg_attempts WHERE at < (NOW() - INTERVAL 1 DAY)')->execute();
    $q = $db->prepare('SELECT COUNT(*) FROM tg_attempts WHERE kind = ? AND ip = ? AND at > (NOW() - INTERVAL ? MINUTE)');
    $q->execute([$kind, tg_client_ip(), $minutes]);
    return (int)$q->fetchColumn();
}

function tg_log_attempt(string $kind): void
{
    tg_db()->prepare('INSERT INTO tg_attempts (kind, ip) VALUES (?, ?)')->execute([$kind, tg_client_ip()]);
}

function tg_log(string $action, $detail): void
{
    tg_db()->prepare('INSERT INTO tg_log (user, action, detail) VALUES (?, ?, ?)')
        ->execute([tg_user(), $action, is_string($detail) ? $detail : json_encode($detail, JSON_UNESCAPED_UNICODE)]);
}

/* ---------- Respuestas ---------- */
function tg_json(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function tg_body(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($data) ? $data : [];
}

/* ---------- Saneamiento ---------- */
function tg_str($v, int $max = 200): string
{
    $s = trim(is_scalar($v) ? (string)$v : '');
    $s = preg_replace('/[\x00-\x1F\x7F]/u', '', $s) ?? '';
    $s = preg_replace('/\s+/u', ' ', $s) ?? '';
    return mb_substr($s, 0, $max);
}

function tg_digits($v, int $max = 15): string
{
    return substr(preg_replace('/\D+/', '', is_scalar($v) ? (string)$v : '') ?? '', 0, $max);
}

/** "Juan Pérez" → "Juan P." (para la tómbola pública) */
function tg_short_name(string $nombre, string $apellido): string
{
    $first = explode(' ', trim($nombre))[0] ?? '';
    $ini = mb_strtoupper(mb_substr(trim($apellido), 0, 1));
    return trim($first . ($ini !== '' ? " $ini." : ''));
}

/** "4301064" → "*.***.064" (las bases publican solo los tres últimos dígitos) */
function tg_mask_ci(string $ci): string
{
    $d = preg_replace('/\D+/', '', $ci) ?? '';
    if (strlen($d) <= 3) return str_repeat('*', strlen($d));
    $masked = str_repeat('*', strlen($d) - 3) . substr($d, -3);
    // puntos de miles: *.***.064
    return strrev(implode('.', str_split(strrev($masked), 3)));
}

function tg_numero(int $id): string
{
    return '#' . str_pad((string)$id, 6, '0', STR_PAD_LEFT);
}

function tg_prize(string $id): ?array
{
    foreach (TG_PRIZES as $p) if ($p['id'] === $id) return $p;
    return null;
}

/* ---------- Registro ---------- */
function tg_registro_abierto(): array
{
    $c = tg_config();
    $now = new DateTimeImmutable('now');
    $desde = new DateTimeImmutable($c['registro_desde'] ?? '2026-11-10 00:00:00');
    $hasta = new DateTimeImmutable($c['registro_hasta'] ?? '2027-03-31 23:59:59');
    $sealed = (bool)tg_db()->query('SELECT sealed_at IS NOT NULL FROM tg_draw WHERE id = 1')->fetchColumn();
    return [
        'open' => !$sealed && $now >= $desde && $now <= $hasta,
        'desde' => $desde->format(DATE_ATOM),
        'hasta' => $hasta->format(DATE_ATOM),
        'state' => $sealed ? 'cerrado' : ($now < $desde ? 'pronto' : ($now > $hasta ? 'cerrado' : 'abierto')),
    ];
}

/** Valida y guarda la foto subida. Devuelve [ruta relativa, sha256]. */
function tg_save_photo(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new InvalidArgumentException('Subí la foto de la factura.');
    $max = (int)(tg_config()['max_upload_mb'] ?? 8) * 1024 * 1024;
    if ((int)$file['size'] > $max) throw new InvalidArgumentException('La foto es demasiado pesada.');
    $info = @getimagesize($file['tmp_name']);
    $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
    if (!$info || !isset($types[$info[2]])) throw new InvalidArgumentException('La foto debe ser una imagen JPG, PNG o WEBP.');
    if ($info[0] < 300 || $info[1] < 300) throw new InvalidArgumentException('La foto es muy chica: sacala más de cerca y con buena luz.');
    $dir = date('Y-m');
    if (!is_dir(TG_DATA_DIR . "/$dir") && !mkdir(TG_DATA_DIR . "/$dir", 0750, true)) throw new RuntimeException('No se pudo crear la carpeta de fotos.');
    $name = $dir . '/' . bin2hex(random_bytes(12)) . '.' . $types[$info[2]];
    if (!move_uploaded_file($file['tmp_name'], TG_DATA_DIR . '/' . $name)) throw new RuntimeException('No se pudo guardar la foto.');
    return [$name, hash_file('sha256', TG_DATA_DIR . '/' . $name)];
}

/* ---------- Sorteo ---------- */
function tg_draw_row(): array
{
    $row = tg_db()->query('SELECT * FROM tg_draw WHERE id = 1')->fetch();
    return $row ?: ['sealed_at' => null, 'total' => 0, 'hash' => '', 'snapshot' => '[]', 'sealed_by' => ''];
}

/** Huella de la lista: SHA-256 de "id|ci" por línea, ordenado por id. */
function tg_list_hash(array $snapshot): string
{
    return hash('sha256', implode("\n", array_map(function ($r) { return $r[0] . '|' . $r[1]; }, $snapshot)));
}

function tg_draw_state(): array
{
    $db = tg_db();
    $d = tg_draw_row();
    $results = $db->query('SELECT r.prize_id, r.rol, r.entry_id, r.pool, r.created_at, e.nombre, e.apellido, e.ci, e.sucursal
        FROM tg_results r JOIN tg_entries e ON e.id = r.entry_id ORDER BY r.id')->fetchAll();
    $byPrize = [];
    foreach ($results as $r) {
        $byPrize[$r['prize_id']][] = [
            'rol' => $r['rol'], 'numero' => tg_numero((int)$r['entry_id']),
            'nombre' => $r['nombre'] . ' ' . $r['apellido'], 'ci_mask' => tg_mask_ci($r['ci']),
            'sucursal' => $r['sucursal'], 'pool' => (int)$r['pool'], 'at' => $r['created_at'],
        ];
    }
    $prizes = array_map(function ($p) use ($byPrize) {
        $res = $byPrize[$p['id']] ?? [];
        return $p + ['results' => $res, 'next' => TG_ROLES[count($res)] ?? null];
    }, TG_PRIZES);

    $counts = $db->query("SELECT estado, COUNT(*) n FROM tg_entries GROUP BY estado")->fetchAll(PDO::FETCH_KEY_PAIR);
    $snap = json_decode((string)$d['snapshot'], true) ?: [];
    $drawn = $db->query('SELECT DISTINCT ci FROM tg_results')->fetchAll(PDO::FETCH_COLUMN);
    $eligible = $d['sealed_at'] ? count(array_filter($snap, function ($r) use ($drawn) { return !in_array($r[1], $drawn, true); })) : 0;

    return [
        'sealed' => (bool)$d['sealed_at'], 'sealed_at' => $d['sealed_at'], 'sealed_by' => $d['sealed_by'],
        'total' => (int)$d['total'], 'hash' => $d['hash'], 'eligible' => $eligible,
        'pending' => (int)($counts['pendiente'] ?? 0), 'approved' => (int)($counts['aprobada'] ?? 0),
        'prizes' => $prizes,
    ];
}
