# Tega Oil × Vevil — Sorteo

Sitio estático (HTML/CSS/JS vanilla) para GitHub Pages.
**Todo el contenido se edita en `assets/js/config.js`.** Lo que esté vacío aparece en el sitio como `[PENDIENTE]`.

## Cómo pasar al modo "ganadores"
1. Subir las fotos a `assets/img/ganadores/` (cuadradas, ~800×800, JPG).
2. Completar `ganadores: [...]` en `config.js` (y `videoSorteo` si hay video).
3. Push. Apenas hay al menos un ganador, el sitio cambia solo: el hero dice "¡Ya tenemos ganadores!", se muestra la galería y se oculta "Cómo participar" y la cuenta regresiva.

## Pendientes del cliente
- [ ] Nombre oficial de la promoción y eslogan
- [ ] Fecha de inicio, cierre de participación, fecha/hora y **lugar** del sorteo
- [ ] Modalidad del sorteo (boletas físicas / bolillero electrónico / escribano)
- [ ] Requisito para obtener el cupón (monto de carga, producto Vevil, etc.)
- [ ] Premios: marca, modelo, cantidad, características + fotos
- [ ] Razón social, RUC, domicilio, teléfono
- [ ] N° de autorización DNIT
- [ ] Estaciones participantes (nombre + dirección)
- [ ] WhatsApp, Instagram, Facebook
- [ ] Bases y condiciones firmadas (el texto del sitio es un **borrador** según las 8 cláusulas DNIT — debe revisarlo el abogado/escribano)
- [ ] Logo de Vevil en vector (SVG/PNG transparente) — el actual está recortado de una imagen JPG
- [ ] ¿La foto de la estación es real o un render?
- [ ] Licencia web de la tipografía Nexa (por ahora se usa Urbanist de Google Fonts)

## Marca
- Base: negro `#0B0A0D` + violeta neón `#9803FB` / `#B44DFF` (señalética de la estación) + morado manual `#44063E`
- Detalles Vevil: degradado `#BCE036 → #1EFBAB`
- Logo Tega extraído en vector del manual de marca (`assets/img/tega-logo*.svg`, `tega-iso.svg`)
