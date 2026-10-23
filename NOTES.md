# Tega Oil × Vevil — Sorteo

Sitio estático (HTML/CSS/JS vanilla) para GitHub Pages.
**Todo el contenido se edita en `assets/js/config.js`.** Lo que esté vacío aparece en el sitio como `[PENDIENTE]`.

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

## Pendientes del cliente
- [ ] **N° de certificado de autorización CONAJZAR** (obligatorio en avisos)
- [ ] Hora y **lugar** del sorteo
- [ ] Modalidad (boletas físicas / bolillero electrónico)
- [ ] Cómo se registra la factura (¿urna en la estación? ¿se escribe nombre/CI/teléfono atrás?)
- [ ] Marca de las motos "CF 125" y del cuadriciclo (en el Anexo dice "CUACICLON AU200" — confirmar nombre) + fotos de los premios
- [ ] ¿Las 5 sucursales de exhibición son todas las estaciones participantes?
- [ ] WhatsApp, Instagram, Facebook
- [ ] Logo de Vevil en vector (SVG/PNG transparente)
- [ ] ¿La foto de la estación es real o un render?
- [ ] Licencia web de la tipografía Nexa (por ahora se usa Urbanist de Google Fonts)

## Marca
- Base: negro `#0B0A0D` + violeta neón `#9803FB` / `#B44DFF` (señalética de la estación) + morado manual `#44063E`
- Detalles Vevil: degradado `#BCE036 → #1EFBAB`
- Logo Tega extraído en vector del manual de marca (`assets/img/tega-logo*.svg`, `tega-iso.svg`)
