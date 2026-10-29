<?php
/**
 * Tega Oil — Sorteo · configuración del servidor.
 * 1) Copiá este archivo como config.php (config.php NO se sube a GitHub).
 * 2) Completá los datos de la base MySQL creada en hPanel (Hostinger → Bases de datos).
 * 3) Generá el hash de la contraseña del panel con /server/install.php?key=... (te lo muestra).
 */
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'u000000000_tegaoil',
        'user' => 'u000000000_tega',
        'pass' => 'CAMBIAR',
        'charset' => 'utf8mb4',
    ],

    // Usuario del panel (/admin)
    'admin_user' => 'admin',
    'admin_pass_hash' => '', // pegá acá el hash generado

    // Clave para correr install.php (mín. 12 caracteres). Después de instalar dejala vacía ('') para deshabilitarlo.
    'install_key' => 'CAMBIAR-ESTA-CLAVE',

    // Período de registro (hora de Paraguay). Fuera de este rango el formulario no acepta cargas.
    'registro_desde' => '2026-11-10 00:00:00',
    'registro_hasta' => '2027-03-31 23:59:59',

    // Límite de subida de la foto de la factura (MB)
    'max_upload_mb' => 8,
];
