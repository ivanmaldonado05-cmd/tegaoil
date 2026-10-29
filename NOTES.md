# Tega Oil × Vevil — Sorteo

Sitio HTML/CSS/JS vanilla + backend PHP/MySQL (registro, panel y sorteo) para Hostinger. **LIVE: https://veviltegaoil.com** (Hostinger, deploy desde GitHub main).
**Todo el contenido se edita en `assets/js/config.js`.** Los campos opcionales vacíos no se muestran.

## Cómo pasar al modo "ganadores"
1. Subir las fotos a `assets/img/ganadores/` (cuadradas, ~800×800, JPG).
2. Completar `ganadores: [...]` en `config.js` (y `videoSorteo` si hay video).
3. Push. Apenas hay al menos un ganador, el sitio cambia solo: el hero dice "¡Ya tenemos ganadores!", se muestra la galería y se oculta "Cómo participar" y la cuenta regresiva.

## Datos cargados (Anexo I CONAJZAR firmado)
- Promo: **Vevil Premia tu Preferencia** — alcance nacional — 10/11/2026 al 31/03/2027
- Organizador: VEVIL EAS, RUC 80161517-8, Alas Paraguayas N° 631, Asunción, 0991 895 589
- Mecánica: compra de Gs. 100.000 en cualquier producto de la EESS; documento válido: factura física
- Premios: 4 Motos CF 125 (gris, blanco, blanco, negro — 2025) + 1 Cuadriciclo AU200 (blanco/naranja — 2026)
- Sorteo: 31/03/2027 — Lista de ganadores: 02/04/2027
- Exhibición: 5 sucursales (San Lorenzo, Barcequillo, Tramo Luque–San Bernardino, Ypacaraí, Cnel. Oviedo)
- No se publican la CI ni el nombre de la representante legal.

## Fotos de premios
- Recortadas desde las imágenes del cliente → `assets/img/premios/` (motos CFMOTO Papio, cuadriciclo blanco/naranja)
- Asignación confirmada por el cliente (Vero, Tega Oil): blancas = Papio SS blanca (x2), gris = Papio blanca/negra, negra = Papio negra/amarilla

El cliente confirmó (24/10/2026) que no hay más datos. Campos opcionales en `config.js` (hora, lugar, modalidad, N° CONAJZAR, redes) quedan vacíos y no se muestran; si llegan, se completan ahí y aparecen solos.

## Marca
- Base: negro `#0B0A0D` + violeta neón `#9803FB` / `#B44DFF` (señalética de la estación) + morado manual `#44063E`
- Detalles Vevil: degradado `#BCE036 → #1EFBAB`
- Logo Tega extraído en vector del manual de marca (`assets/img/tega-logo*.svg`, `tega-iso.svg`)

## Registro online + sorteo en vivo (desarrollado 29/10/2026 — PHP sin probar en servidor real)
**Hosting:** Hostinger de Ivan, dominio propio, PHP + MySQL (mismo esquema que UG Collection: `server/` + `admin/`, config.php fuera de Git).

**Formulario de registro**
- Campos: nombre, apellido, N° de cédula, teléfono (WhatsApp), sucursal (lista), foto de la factura, email opcional.
- Checkboxes: mayor de 18 · acepto bases · autorizo uso de datos para el sorteo.
- Sin foto de cédula. Sin N° ni fecha de factura (se ven en la foto; el admin los verifica).
- Cada factura ≥ Gs. 100.000 = 1 participación. **Límite: 1 carga por cédula por día** (hora de Paraguay).
- Foto comprimida en el navegador; carpeta de fotos privada (no accesible por URL); anti-bots; muestra N° de participación al final.
- Aclarar que el ganador debe presentar la factura física original.

**Panel /admin**
- Buscar por cédula/nombre, ver foto, aprobar/rechazar factura (motivo), exportar Excel.
- Detectar fotos repetidas (hash) como ayuda anti-trampa.

**Sorteo en vivo /admin/sorteo** — estilo **ruleta + tómbola de nombres** (nombres pasan rápido en el centro y frenan en el ganador)
- Entradas = facturas aprobadas. **1 premio por persona**: al ganar, sus otras facturas salen del sorteo.
- **2 suplentes por premio.**
- Ganador elegido en el servidor con azar criptográfico; la animación solo lo muestra.
- Antes de girar: total de participaciones + huella (hash) de la lista cerrada.
- Registro de cada giro (fecha/hora/resultado) + acta exportable (PDF/Excel) para escribano y lista de ganadores (02/04/2027).
- En pantalla: nombre + CI parcialmente oculta (4.***.064).
- Orden de premios: a definir.
- ⚠️ Cliente debe confirmar con CONAJZAR que el registro online y el "bolillero electrónico" están aceptados (y si va escribano/fiscal).

### Archivos
- `server/` — API PHP (`api.php`), funciones (`lib.php`), tablas (`schema.sql`), instalador (`install.php`), `config.sample.php`.
- `server/data/facturas/` — fotos de facturas (privadas, `.htaccess` deny; fuera de Git).
- `admin/index.html` — panel de revisión · `admin/sorteo.html` — sorteo en vivo · `admin/acta.html` — acta imprimible.
- `assets/js/registro.js` + `assets/css/registro.css` — formulario público.
- `_dev/mock-server.mjs` — servidor de prueba local (simula la API en memoria). `node tega-oil/_dev/mock-server.mjs 5088 --seed 300` → panel `admin` / `admin12345`.

### Instalación en Hostinger (una vez)
1. hPanel → Sitios → dominio → **Git**: repo `ivanmaldonado05-cmd/tegaoil`, rama `main`, directorio `public_html` (deploy automático al hacer push). No usar "Deploy as static": necesita PHP.
2. hPanel → **Bases de datos MySQL**: crear base + usuario.
3. Administrador de archivos → `public_html/server/`: copiar `config.sample.php` como `config.php` y completar `db`, `install_key` (clave larga) y fechas de registro.
4. Abrir `https://veviltegaoil.com/server/install.php?key=LA-INSTALL-KEY` → crea tablas, verifica carpeta de fotos y genera el hash de contraseña → pegarlo en `admin_pass_hash`.
5. Dejar `install_key` vacía en `config.php` (deshabilita el instalador).
6. Verificar: `https://veviltegaoil.com/server/data/facturas/` debe dar **403**; registrar una factura de prueba; revisarla en `/admin/`.
7. Activar SSL (https) en hPanel.

### Uso
- **Revisión:** `/admin/` → Pendientes → abrir → **A** aprueba, **R** rechaza (con motivo), ← → navega. Foto repetida / N° de factura repetido aparecen marcados.
- **Ensayo:** en `/admin/sorteo.html` → cerrar lista → girar → "Reiniciar (ensayo)" escribiendo REINICIAR (queda en el historial). En producción, antes del sorteo real, revisar todas las pendientes.
- **Día del sorteo:** cerrar lista (cierra también el registro público) → elegir premio → GIRAR (o barra espaciadora) ×3 por premio (ganador, suplente 1, suplente 2). **P** o "Pantalla completa" = modo presentación.
- **Después:** `/admin/acta.html` → imprimir/PDF + Excel de resultados + Excel de la lista cerrada (para el escribano y la lista de ganadores del 02/04/2027). Luego Fase 2 del presupuesto: cargar ganadores en `assets/js/config.js`.

### Pendiente
- Probar el PHP en Hostinger (no hay PHP local; se probó todo con el servidor de prueba).
- Cliente: confirmar con CONAJZAR registro online + bolillero electrónico; orden de los premios.

## Ajustes por las Bases y Condiciones oficiales (29/10/2026)
Fuente: `Bases y Condiciones CONAJZAR.docx` del cliente (transcriptas en el sitio, cláusulas 1–19 + Anexo + disposiciones del Anexo I).
- Lugar del sorteo: Avda. Manuel Ortiz Guerrero esq. Puerto Rosario – San Lorenzo.
- Modalidad: cupones y bolillero electrónico **visualizado en tiempo real en la web** → página pública `/en-vivo.html` (consulta `draw.public` cada 2,5 s y anima cada resultado).
- **1 suplente por premio** (antes 2). `TG_ROLES` en `server/lib.php`.
- Retiro: 60 días **hábiles**, único documento: **cédula** (se quitó "presentar la factura").
- Publicación de ganadores: nombre, apellido y **3 últimos dígitos** de la CI (`*.***.064`).
- Aviso de privacidad en el formulario + página `/condiciones.html` (condiciones de uso de la plataforma + privacidad, cláusulas 14 y 17). **Borrador: que lo revise el abogado del cliente.**
- Panel: botón "Borrar datos de prueba" (solo antes del 10/11/2026, escribiendo BORRAR TODO).

### A confirmar con el cliente
- Bases dicen "personas físicas [o jurídicas]" (corchete de plantilla): en el sitio quedó "personas físicas".
- "CUACICLON AU200" en las bases → en el sitio "Cuadriciclo AU200". ¿Cuatriciclo?
- Hora del sorteo y N° de certificado CONAJZAR (los avisos deben incluirlo).

### Caché
Hostinger/CDN guarda JS/CSS 7 días. Todos los `<script>`/`<link>` llevan `?v=AAAAMMDDHHMM`: **al cambiar cualquier JS/CSS, actualizar la versión** (comando en el historial de commits: sed sobre index/en-vivo/condiciones/admin/*.html). Las páginas .html se sirven con `no-cache`.

## Premio por sucursal + panel unificado (29/10/2026)
- **Cada premio se sortea solo entre los cupones de su sucursal.** 1 premio por persona (si ya salió en una, queda afuera de las demás).
- Asignación (se edita en **dos lugares**: `server/lib.php` → `TG_PRIZES[...]['sucursal']` con el texto exacto de `TG_SUCURSALES`, y `assets/js/config.js` → `premios[].sucursal` con el nombre corto):
  - Cuadriciclo AU200 → Tramo Luque – San Bernardino
  - Moto gris → San Lorenzo (Ortiz Guerrero)
  - Moto blanca → Coronel Oviedo
  - Moto blanca → Ypacaraí (confirmado con foto)
  - Moto negra → Barcequillo (Pratt Gill)
  - Un premio sin sucursal no se puede sortear (botón bloqueado).
- La lista cerrada guarda [id, cédula, sucursal]; la huella es SHA-256 de "id|cédula|sucursal".
- Al revisar una factura, el panel permite **corregir la sucursal** (queda en el historial).
- **3 links:** sitio `veviltegaoil.com` · público en vivo `/en-vivo.html` · panel `/admin/` (pestañas Participaciones / Sorteo; `admin/sorteo.html` redirige a `/admin/#sorteo`). Acta: botón dentro de la pestaña Sorteo.
- Bases y Condiciones (docx del cliente, todavía NO presentado a CONAJZAR) actualizadas 29/10/2026 con la regla por sucursal: cláusula 5 (párrafo nuevo), 6 (sucursal de cada premio), 7.c (sorteo por sucursal) y Anexo. Original guardado como "Bases y Condiciones CONAJZAR (original).docx" en Descargas.
