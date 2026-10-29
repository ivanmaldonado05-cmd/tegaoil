-- Tega Oil — Sorteo "Vevil Premia tu Preferencia" · esquema MySQL / MariaDB

-- Cada fila es una factura registrada = una participación (si se aprueba)
CREATE TABLE IF NOT EXISTS tg_entries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  apellido VARCHAR(80) NOT NULL,
  ci VARCHAR(12) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  email VARCHAR(120) NOT NULL DEFAULT '',
  sucursal VARCHAR(80) NOT NULL,
  fecha DATE NOT NULL,                       -- día de la carga (hora de Paraguay): 1 carga por cédula por día
  foto VARCHAR(120) NOT NULL,                -- ruta relativa dentro de server/data/facturas
  foto_hash CHAR(64) NOT NULL,
  estado ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  motivo VARCHAR(200) NOT NULL DEFAULT '',
  nro_factura VARCHAR(40) NOT NULL DEFAULT '', -- lo carga el admin al revisar (ayuda a detectar facturas repetidas)
  ip VARCHAR(45) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  reviewed_by VARCHAR(40) NOT NULL DEFAULT '',
  UNIQUE KEY uq_ci_fecha (ci, fecha),
  KEY idx_estado (estado),
  KEY idx_ci (ci),
  KEY idx_hash (foto_hash),
  KEY idx_nro (nro_factura)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lista cerrada para el sorteo (una sola fila)
CREATE TABLE IF NOT EXISTS tg_draw (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  sealed_at TIMESTAMP NULL DEFAULT NULL,
  sealed_by VARCHAR(40) NOT NULL DEFAULT '',
  total INT UNSIGNED NOT NULL DEFAULT 0,
  hash CHAR(64) NOT NULL DEFAULT '',
  snapshot LONGTEXT NOT NULL                 -- JSON: [[id, ci], ...] en el orden en que se calculó la huella
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resultados: ganador + 2 suplentes por premio
CREATE TABLE IF NOT EXISTS tg_results (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  prize_id VARCHAR(40) NOT NULL,
  rol ENUM('ganador','suplente1','suplente2') NOT NULL,
  entry_id INT UNSIGNED NOT NULL,
  ci VARCHAR(12) NOT NULL,
  pool INT UNSIGNED NOT NULL,                -- participaciones habilitadas en ese giro
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(40) NOT NULL DEFAULT '',
  UNIQUE KEY uq_prize_rol (prize_id, rol),
  KEY idx_ci (ci)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro de auditoría (aprobaciones, cierre de lista, giros, reinicios)
CREATE TABLE IF NOT EXISTS tg_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user VARCHAR(40) NOT NULL DEFAULT '',
  action VARCHAR(40) NOT NULL,
  detail TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario administrador (una cuenta; si no existe se usa la de config.php)
CREATE TABLE IF NOT EXISTS tg_admin (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  user VARCHAR(40) NOT NULL,
  pass_hash VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Intentos (login fallido / registros por IP) — protección contra fuerza bruta y bots
CREATE TABLE IF NOT EXISTS tg_attempts (
  kind VARCHAR(12) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kind_ip_at (kind, ip, at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
