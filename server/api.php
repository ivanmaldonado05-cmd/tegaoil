<?php
/**
 * Tega Oil — Sorteo · API.
 * Públicas: info, register, check.
 * Panel (sesión + header X-CSRF en escrituras): login, logout, session, entries, photo, review, export, draw.*.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

tg_session();
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    /* ================= Públicas ================= */
    if ($action === 'info') {
        tg_json(['ok' => true, 'registro' => tg_registro_abierto(), 'sucursales' => TG_SUCURSALES]);
    }

    if ($action === 'register' && $method === 'POST') {
        $reg = tg_registro_abierto();
        if (!$reg['open']) tg_json(['ok' => false, 'error' => $reg['state'] === 'pronto' ? 'El registro todavía no está habilitado.' : 'El registro ya está cerrado.'], 403);
        // anti-bots: campo trampa + tiempo mínimo para completar el formulario + límite por IP
        if (!empty($_POST['website'])) tg_json(['ok' => false, 'error' => 'No se pudo registrar.'], 400);
        $elapsed = time() - (int)($_POST['t'] ?? 0);
        if ($elapsed < 4) tg_json(['ok' => false, 'error' => 'Revisá los datos y volvé a intentar.'], 400);
        if (tg_attempts('reg', 60) >= 150) tg_json(['ok' => false, 'error' => 'Demasiados registros desde esta conexión. Probá más tarde.'], 429);

        $nombre = tg_str($_POST['nombre'] ?? '', 80);
        $apellido = tg_str($_POST['apellido'] ?? '', 80);
        $ci = tg_digits($_POST['ci'] ?? '', 12);
        $tel = tg_digits($_POST['telefono'] ?? '', 15);
        $email = tg_str($_POST['email'] ?? '', 120);
        $suc = tg_str($_POST['sucursal'] ?? '', 120);
        $nameRe = '/^[\p{L}][\p{L} \'.-]{0,79}$/u';
        if (!preg_match($nameRe, $nombre)) throw new InvalidArgumentException('Escribí tu nombre.');
        if (!preg_match($nameRe, $apellido)) throw new InvalidArgumentException('Escribí tu apellido.');
        if (strlen($ci) < 5 || strlen($ci) > 9) throw new InvalidArgumentException('Número de cédula inválido.');
        if (strlen($tel) < 9) throw new InvalidArgumentException('Número de teléfono inválido (ej. 0981 123 456).');
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('El email no es válido.');
        if (!in_array($suc, TG_SUCURSALES, true)) throw new InvalidArgumentException('Elegí la sucursal donde compraste.');
        foreach (['mayor' => 'Tenés que ser mayor de 18 años.', 'bases' => 'Tenés que aceptar las bases y condiciones.', 'datos' => 'Tenés que autorizar el uso de tus datos para el sorteo.'] as $k => $msg) {
            if (empty($_POST[$k])) throw new InvalidArgumentException($msg);
        }

        $db = tg_db();
        $hoy = date('Y-m-d');
        $q = $db->prepare('SELECT COUNT(*) FROM tg_entries WHERE ci = ? AND fecha = ?');
        $q->execute([$ci, $hoy]);
        if ((int)$q->fetchColumn() > 0) tg_json(['ok' => false, 'code' => 'daily', 'error' => 'Ya registraste una factura hoy con esta cédula. Podés cargar la siguiente mañana.'], 409);

        [$foto, $hash] = tg_save_photo($_FILES['foto'] ?? []);
        try {
            $db->prepare('INSERT INTO tg_entries (nombre, apellido, ci, telefono, email, sucursal, fecha, foto, foto_hash, ip) VALUES (?,?,?,?,?,?,?,?,?,?)')
               ->execute([$nombre, $apellido, $ci, $tel, $email, $suc, $hoy, $foto, $hash, tg_client_ip()]);
        } catch (PDOException $e) {
            @unlink(TG_DATA_DIR . '/' . $foto);
            if ($e->getCode() === '23000') tg_json(['ok' => false, 'code' => 'daily', 'error' => 'Ya registraste una factura hoy con esta cédula. Podés cargar la siguiente mañana.'], 409);
            throw $e;
        }
        $id = (int)$db->lastInsertId(); // leerlo antes de cualquier otro INSERT
        tg_log_attempt('reg');
        tg_json(['ok' => true, 'numero' => tg_numero($id), 'nombre' => $nombre]);
    }

    if ($action === 'check' && $method === 'POST') {
        // Consulta de participaciones propias: cédula + teléfono
        if (tg_attempts('chk', 15) >= 15) tg_json(['ok' => false, 'error' => 'Demasiadas consultas. Probá en unos minutos.'], 429);
        tg_log_attempt('chk');
        $b = tg_body();
        $ci = tg_digits($b['ci'] ?? '', 12);
        $tel = tg_digits($b['telefono'] ?? '', 15);
        $q = tg_db()->prepare('SELECT id, fecha, sucursal, estado, motivo FROM tg_entries WHERE ci = ? AND telefono = ? ORDER BY id DESC LIMIT 200');
        $q->execute([$ci, $tel]);
        $rows = array_map(function ($r) {
            return ['numero' => tg_numero((int)$r['id']), 'fecha' => $r['fecha'], 'sucursal' => $r['sucursal'], 'estado' => $r['estado'], 'motivo' => $r['estado'] === 'rechazada' ? $r['motivo'] : ''];
        }, $q->fetchAll());
        tg_json(['ok' => true, 'entries' => $rows]);
    }

    if ($action === 'draw.public') {
        // Sorteo visible en tiempo real en el sitio (bases: "visualizado en tiempo real en la página web")
        $s = tg_draw_state();
        $prizes = array_map(function ($p) {
            return ['id' => $p['id'], 'titulo' => $p['titulo'], 'detalle' => $p['detalle'], 'next' => $p['next'],
                'results' => array_map(function ($r) {
                    return ['rol' => $r['rol'], 'numero' => $r['numero'], 'nombre' => $r['nombre'], 'ci_mask' => $r['ci_mask'], 'sucursal' => explode(' — ', $r['sucursal'])[0], 'at' => $r['at']];
                }, $p['results'])];
        }, $s['prizes']);
        $reel = [];
        if ($s['sealed']) {
            $snap = json_decode((string)tg_draw_row()['snapshot'], true) ?: [];
            $n = count($snap);
            $ids = [];
            for ($i = 0; $i < min(30, $n); $i++) $ids[] = (int)$snap[random_int(0, $n - 1)][0];
            if ($ids) {
                $q = tg_db()->prepare('SELECT id, nombre, apellido FROM tg_entries WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')');
                $q->execute($ids);
                foreach ($q->fetchAll() as $r) $reel[] = tg_short_name($r['nombre'], $r['apellido']);
            }
        }
        $count = 0;
        foreach ($prizes as $p) $count += count($p['results']);
        tg_json(['ok' => true, 'draw' => ['sealed' => $s['sealed'], 'sealed_at' => $s['sealed_at'], 'total' => $s['total'], 'hash' => $s['hash'],
            'eligible' => $s['eligible'], 'count' => $count, 'prizes' => $prizes], 'reel' => $reel]);
    }

    /* ================= Sesión del panel ================= */
    if ($action === 'session') {
        tg_json(['ok' => true, 'auth' => tg_is_auth(), 'csrf' => $_SESSION['csrf'], 'user' => $_SESSION['user'] ?? null]);
    }

    if ($action === 'login' && $method === 'POST') {
        tg_require_csrf();
        if (tg_attempts('login', 15) >= 8) tg_json(['ok' => false, 'error' => 'Demasiados intentos. Esperá 15 minutos.'], 429);
        $b = tg_body();
        $user = tg_str($b['user'] ?? '', 40);
        $pass = (string)($b['pass'] ?? '');
        $acc = null;
        try { $acc = tg_db()->query('SELECT user, pass_hash FROM tg_admin WHERE id = 1')->fetch(); } catch (Throwable $e) {}
        if (!$acc || $acc['pass_hash'] === '') $acc = ['user' => (string)tg_config()['admin_user'], 'pass_hash' => (string)tg_config()['admin_pass_hash']];
        if ($acc['pass_hash'] === '' || !hash_equals($acc['user'], $user) || !password_verify($pass, $acc['pass_hash'])) {
            tg_log_attempt('login');
            usleep(700000);
            tg_json(['ok' => false, 'error' => 'Usuario o contraseña incorrectos.'], 401);
        }
        session_regenerate_id(true);
        $_SESSION['auth'] = true;
        $_SESSION['user'] = $user;
        $_SESSION['seen'] = time();
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        tg_json(['ok' => true, 'csrf' => $_SESSION['csrf'], 'user' => $user]);
    }

    /* ================= Requieren sesión ================= */
    tg_require_auth();
    $db = tg_db();

    if ($action === 'entries') {
        $estado = (string)($_GET['estado'] ?? '');
        $qtxt = tg_str($_GET['q'] ?? '', 80);
        $page = max(1, (int)($_GET['page'] ?? 1));
        $per = 50;
        $where = [];
        $args = [];
        if (in_array($estado, ['pendiente', 'aprobada', 'rechazada'], true)) { $where[] = 'estado = ?'; $args[] = $estado; }
        if ($qtxt !== '') {
            $d = tg_digits($qtxt);
            $num = ltrim(str_replace('#', '', $qtxt), '0');
            $where[] = '(CONCAT(nombre, " ", apellido) LIKE ? OR ci = ? OR telefono LIKE ? OR nro_factura = ? OR id = ?)';
            array_push($args, "%$qtxt%", $d, $d !== '' ? "%$d%" : '-', $qtxt, ctype_digit($num) ? (int)$num : 0);
        }
        $w = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $count = $db->prepare("SELECT COUNT(*) FROM tg_entries $w");
        $count->execute($args);
        $total = (int)$count->fetchColumn();
        $list = $db->prepare("SELECT e.*,
              (SELECT COUNT(*) FROM tg_entries x WHERE x.foto_hash = e.foto_hash AND x.id <> e.id) AS dup_foto,
              (SELECT COUNT(*) FROM tg_entries y WHERE e.nro_factura <> '' AND y.nro_factura = e.nro_factura AND y.id <> e.id) AS dup_nro,
              (SELECT COUNT(*) FROM tg_entries z WHERE z.ci = e.ci) AS cargas_ci
            FROM tg_entries e $w ORDER BY e.id DESC LIMIT $per OFFSET " . (($page - 1) * $per));
        $list->execute($args);
        $rows = array_map(function ($r) {
            unset($r['foto'], $r['foto_hash'], $r['ip']);
            $r['numero'] = tg_numero((int)$r['id']);
            return $r;
        }, $list->fetchAll());
        $counts = $db->query('SELECT estado, COUNT(*) n FROM tg_entries GROUP BY estado')->fetchAll(PDO::FETCH_KEY_PAIR);
        $people = (int)$db->query("SELECT COUNT(DISTINCT ci) FROM tg_entries WHERE estado = 'aprobada'")->fetchColumn();
        tg_json(['ok' => true, 'entries' => $rows, 'total' => $total, 'page' => $page, 'per' => $per,
            'counts' => ['pendiente' => (int)($counts['pendiente'] ?? 0), 'aprobada' => (int)($counts['aprobada'] ?? 0), 'rechazada' => (int)($counts['rechazada'] ?? 0), 'personas' => $people],
            'registro' => tg_registro_abierto()]);
    }

    if ($action === 'photo') {
        $q = $db->prepare('SELECT foto FROM tg_entries WHERE id = ?');
        $q->execute([(int)($_GET['id'] ?? 0)]);
        $f = $q->fetchColumn();
        $path = $f ? realpath(TG_DATA_DIR . '/' . $f) : false;
        if (!$path || strpos($path, realpath(TG_DATA_DIR)) !== 0) { http_response_code(404); exit; }
        $types = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
        header('Content-Type: ' . ($types[pathinfo($path, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
        header('Cache-Control: private, max-age=3600');
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    }

    if ($action === 'export') {
        $estado = (string)($_GET['estado'] ?? '');
        $sql = 'SELECT id, created_at, nombre, apellido, ci, telefono, email, sucursal, estado, motivo, nro_factura FROM tg_entries';
        $args = [];
        if (in_array($estado, ['pendiente', 'aprobada', 'rechazada'], true)) { $sql .= ' WHERE estado = ?'; $args[] = $estado; }
        $q = $db->prepare($sql . ' ORDER BY id');
        $q->execute($args);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="participaciones-' . ($estado ?: 'todas') . '-' . date('Ymd-Hi') . '.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // BOM para que Excel lea los acentos
        fputcsv($out, ['N° participación', 'Fecha de carga', 'Nombre', 'Apellido', 'Cédula', 'Teléfono', 'Email', 'Sucursal', 'Estado', 'Motivo', 'N° factura'], ';');
        while ($r = $q->fetch()) {
            fputcsv($out, [tg_numero((int)$r['id']), $r['created_at'], $r['nombre'], $r['apellido'], $r['ci'], $r['telefono'], $r['email'], $r['sucursal'], $r['estado'], $r['motivo'], $r['nro_factura']], ';');
        }
        exit;
    }

    if ($action === 'draw.state') {
        tg_json(['ok' => true, 'draw' => tg_draw_state()]);
    }

    if ($action === 'draw.list') {
        // Lista cerrada completa (para el escribano): mismo orden que la huella
        $d = tg_draw_row();
        if (!$d['sealed_at']) tg_json(['ok' => false, 'error' => 'La lista todavía no está cerrada.'], 409);
        $snap = json_decode((string)$d['snapshot'], true) ?: [];
        $names = $db->query('SELECT id, nombre, apellido, sucursal FROM tg_entries')->fetchAll(PDO::FETCH_UNIQUE);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="lista-cerrada-sorteo.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, ['Lista cerrada el ' . $d['sealed_at'] . ' — ' . $d['total'] . ' participaciones — huella SHA-256: ' . $d['hash']], ';');
        fputcsv($out, ['N° participación', 'Nombre', 'Apellido', 'Cédula', 'Sucursal'], ';');
        foreach ($snap as [$id, $ci]) {
            $n = $names[$id] ?? ['nombre' => '', 'apellido' => '', 'sucursal' => ''];
            fputcsv($out, [tg_numero((int)$id), $n['nombre'], $n['apellido'], $ci, $n['sucursal']], ';');
        }
        exit;
    }

    if ($action === 'draw.acta') {
        // Datos completos (sin enmascarar) para el acta del escribano
        $d = tg_draw_row();
        $rows = $db->query('SELECT r.prize_id, r.rol, r.pool, r.created_at, r.created_by, e.id, e.nombre, e.apellido, e.ci, e.telefono, e.sucursal
            FROM tg_results r JOIN tg_entries e ON e.id = r.entry_id ORDER BY r.id')->fetchAll();
        $results = array_map(function ($r) {
            $p = tg_prize($r['prize_id']) ?? ['titulo' => $r['prize_id'], 'detalle' => ''];
            return ['prize_id' => $r['prize_id'], 'premio' => $p['titulo'], 'detalle' => $p['detalle'], 'rol' => $r['rol'],
                'numero' => tg_numero((int)$r['id']), 'nombre' => $r['nombre'] . ' ' . $r['apellido'], 'ci' => $r['ci'],
                'telefono' => $r['telefono'], 'sucursal' => $r['sucursal'], 'pool' => (int)$r['pool'], 'at' => $r['created_at'], 'by' => $r['created_by']];
        }, $rows);
        tg_json(['ok' => true, 'acta' => [
            'sealed_at' => $d['sealed_at'], 'sealed_by' => $d['sealed_by'], 'total' => (int)$d['total'], 'hash' => $d['hash'],
            'prizes' => TG_PRIZES, 'results' => $results, 'generated_at' => date('Y-m-d H:i:s'),
        ]]);
    }

    if ($action === 'log') {
        $rows = $db->query('SELECT at, user, action, detail FROM tg_log ORDER BY id DESC LIMIT 300')->fetchAll();
        tg_json(['ok' => true, 'log' => $rows]);
    }

    if ($method !== 'POST') tg_json(['ok' => false, 'error' => 'Método no permitido'], 405);
    tg_require_csrf();

    switch ($action) {
        case 'logout':
            $_SESSION = [];
            session_destroy();
            tg_json(['ok' => true]);

        case 'review': {
            $b = tg_body();
            $id = (int)($b['id'] ?? 0);
            $estado = (string)($b['estado'] ?? '');
            if (!in_array($estado, ['pendiente', 'aprobada', 'rechazada'], true)) throw new InvalidArgumentException('Estado inválido.');
            if (tg_draw_row()['sealed_at']) throw new InvalidArgumentException('La lista del sorteo ya está cerrada: no se pueden cambiar participaciones.');
            $motivo = $estado === 'rechazada' ? tg_str($b['motivo'] ?? '', 200) : '';
            if ($estado === 'rechazada' && $motivo === '') throw new InvalidArgumentException('Indicá el motivo del rechazo.');
            $nro = tg_str($b['nro_factura'] ?? '', 40);
            $db->prepare('UPDATE tg_entries SET estado = ?, motivo = ?, nro_factura = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?')
               ->execute([$estado, $motivo, $nro, tg_user(), $id]);
            tg_log('review', ['id' => $id, 'estado' => $estado, 'motivo' => $motivo, 'nro_factura' => $nro]);
            tg_json(['ok' => true]);
        }

        case 'draw.seal': {
            if (tg_draw_row()['sealed_at']) throw new InvalidArgumentException('La lista ya está cerrada.');
            $snap = array_map(function ($r) { return [(int)$r['id'], (string)$r['ci']]; },
                $db->query("SELECT id, ci FROM tg_entries WHERE estado = 'aprobada' ORDER BY id")->fetchAll());
            if (!$snap) throw new InvalidArgumentException('No hay participaciones aprobadas.');
            $hash = tg_list_hash($snap);
            $db->prepare('REPLACE INTO tg_draw (id, sealed_at, sealed_by, total, hash, snapshot) VALUES (1, NOW(), ?, ?, ?, ?)')
               ->execute([tg_user(), count($snap), $hash, json_encode($snap)]);
            tg_log('draw.seal', ['total' => count($snap), 'hash' => $hash]);
            tg_json(['ok' => true, 'draw' => tg_draw_state()]);
        }

        case 'draw.spin': {
            $prizeId = (string)(tg_body()['prize_id'] ?? '');
            $prize = tg_prize($prizeId);
            if (!$prize) throw new InvalidArgumentException('Premio inválido.');
            $d = tg_draw_row();
            if (!$d['sealed_at']) throw new InvalidArgumentException('Primero cerrá la lista de participantes.');

            $db->beginTransaction();
            $done = $db->prepare('SELECT COUNT(*) FROM tg_results WHERE prize_id = ? FOR UPDATE');
            $done->execute([$prizeId]);
            $rol = TG_ROLES[(int)$done->fetchColumn()] ?? null;
            if (!$rol) { $db->rollBack(); throw new InvalidArgumentException('Este premio ya tiene ganador y suplente.'); }

            // 1 premio por persona: quien ya salió (ganador o suplente) no vuelve a participar
            $drawn = array_flip($db->query('SELECT DISTINCT ci FROM tg_results')->fetchAll(PDO::FETCH_COLUMN));
            $pool = array_values(array_filter(json_decode((string)$d['snapshot'], true) ?: [], function ($r) use ($drawn) { return !isset($drawn[$r[1]]); }));
            if (!$pool) { $db->rollBack(); throw new InvalidArgumentException('No quedan participantes habilitados.'); }

            $pick = $pool[random_int(0, count($pool) - 1)]; // azar criptográficamente seguro
            $db->prepare('INSERT INTO tg_results (prize_id, rol, entry_id, ci, pool, created_by) VALUES (?,?,?,?,?,?)')
               ->execute([$prizeId, $rol, $pick[0], $pick[1], count($pool), tg_user()]);
            $db->commit();

            $e = $db->prepare('SELECT id, nombre, apellido, ci, sucursal FROM tg_entries WHERE id = ?');
            $e->execute([$pick[0]]);
            $w = $e->fetch();
            tg_log('draw.spin', ['prize' => $prizeId, 'rol' => $rol, 'entry' => $pick[0], 'pool' => count($pool)]);

            // nombres para la animación de la tómbola (al azar, abreviados)
            $sample = [];
            $n = count($pool);
            for ($i = 0; $i < min(40, $n); $i++) $sample[] = (int)$pool[random_int(0, $n - 1)][0];
            $reel = [];
            if ($sample) {
                $in = implode(',', array_fill(0, count(array_unique($sample)), '?'));
                $q = $db->prepare("SELECT id, nombre, apellido FROM tg_entries WHERE id IN ($in)");
                $q->execute(array_values(array_unique($sample)));
                $map = $q->fetchAll(PDO::FETCH_UNIQUE);
                foreach ($sample as $id) if (isset($map[$id])) $reel[] = tg_short_name($map[$id]['nombre'], $map[$id]['apellido']);
            }

            tg_json(['ok' => true, 'result' => [
                'prize' => $prize, 'rol' => $rol, 'numero' => tg_numero((int)$w['id']),
                'nombre' => $w['nombre'] . ' ' . $w['apellido'], 'short' => tg_short_name($w['nombre'], $w['apellido']),
                'ci_mask' => tg_mask_ci($w['ci']), 'sucursal' => $w['sucursal'], 'pool' => count($pool),
            ], 'reel' => $reel, 'draw' => tg_draw_state()]);
        }

        case 'draw.reset': {
            // Para el sorteo de ensayo: borra resultados y reabre la lista. Requiere escribir REINICIAR.
            if ((string)(tg_body()['confirm'] ?? '') !== 'REINICIAR') throw new InvalidArgumentException('Escribí REINICIAR para confirmar.');
            $db->exec('DELETE FROM tg_results');
            $db->exec('DELETE FROM tg_draw');
            tg_log('draw.reset', 'Sorteo reiniciado');
            tg_json(['ok' => true, 'draw' => tg_draw_state()]);
        }

        case 'password': {
            $b = tg_body();
            $new = (string)($b['new'] ?? '');
            if (strlen($new) < 10) throw new InvalidArgumentException('La contraseña nueva debe tener al menos 10 caracteres.');
            $acc = $db->query('SELECT user, pass_hash FROM tg_admin WHERE id = 1')->fetch() ?: ['user' => tg_config()['admin_user'], 'pass_hash' => tg_config()['admin_pass_hash']];
            if (!password_verify((string)($b['current'] ?? ''), (string)$acc['pass_hash'])) throw new InvalidArgumentException('La contraseña actual no es correcta.');
            $db->prepare('REPLACE INTO tg_admin (id, user, pass_hash) VALUES (1, ?, ?)')->execute([$acc['user'], password_hash($new, PASSWORD_DEFAULT)]);
            tg_log('password', 'Contraseña cambiada');
            tg_json(['ok' => true]);
        }
    }

    tg_json(['ok' => false, 'error' => 'Acción desconocida'], 404);
} catch (InvalidArgumentException $e) {
    tg_json(['ok' => false, 'error' => $e->getMessage()], 422);
} catch (Throwable $e) {
    error_log('[tegaoil] ' . $e->getMessage());
    tg_json(['ok' => false, 'error' => 'Error del servidor. Probá de nuevo en un momento.'], 500);
}
