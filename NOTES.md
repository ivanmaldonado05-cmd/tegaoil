# Tega Oil × Vevil — Sorteo

Sitio estático (HTML/CSS/JS vanilla) para GitHub Pages.
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

## Fase 2 — Registro online + sorteo en vivo (plan aprobado 28/10/2026, sin desarrollar aún)
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
