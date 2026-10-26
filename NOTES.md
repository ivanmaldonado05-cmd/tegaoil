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
- No hay foto de la moto **negra**: usa la misma foto que la gris (`moto-cf125-gris.jpg`). Reemplazar si llega.

El cliente confirmó (24/10/2026) que no hay más datos. Campos opcionales en `config.js` (hora, lugar, modalidad, N° CONAJZAR, redes) quedan vacíos y no se muestran; si llegan, se completan ahí y aparecen solos.

## Marca
- Base: negro `#0B0A0D` + violeta neón `#9803FB` / `#B44DFF` (señalética de la estación) + morado manual `#44063E`
- Detalles Vevil: degradado `#BCE036 → #1EFBAB`
- Logo Tega extraído en vector del manual de marca (`assets/img/tega-logo*.svg`, `tega-iso.svg`)
