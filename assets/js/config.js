/* ==========================================================
   CONFIGURACIÓN DEL SORTEO — editar solo este archivo
   Campos vacíos ("") simplemente no se muestran en el sitio.
   Horario de Paraguay: UTC-03:00
   Fuente: Anexo I CONAJZAR firmado (Res. CONAJZAR N° 21/2011)
   ========================================================== */
window.SORTEO = {
  nombre: "Vevil Premia tu Preferencia",
  eslogan: "Comprá desde Gs. 100.000 en estaciones Tega Oil y participá por 4 motos y un cuadriciclo.",
  alcance: "Nacional",

  // Fechas (AAAA-MM-DD)
  inicio: "2026-11-10",
  cierre: "2027-03-31",
  fechaSorteo: "2027-03-31",
  horaSorteo: "",            // ej.: "19:00" — si está vacío, la cuenta regresiva apunta al inicio del día
  listaGanadores: "2027-04-02",
  lugarSorteo: "",           // lugar del sorteo
  modalidad: "",             // ej.: "boletas físicas en urna" / "bolillero electrónico"

  // Empresa organizadora
  empresa: {
    razonSocial: "VEVIL EAS",
    ruc: "80161517-8",
    domicilio: "Alas Paraguayas N° 631, Asunción",
    telefono: "0991 895 589",
    autorizacionCONAJZAR: ""   // N° de certificado de autorización
  },

  // Mecánica (punto 5° del Anexo I)
  montoMinimo: "Gs. 100.000",
  documentoValido: "factura física",
  comoSeRegistra: "el cliente registra cada factura en este sitio web, cargando nombre, apellido, número de cédula, teléfono, sucursal y una foto legible de la factura. Se permite una carga por cédula por día. Cada factura registrada y aprobada por el organizador equivale a una participación. El ganador deberá presentar la factura física original y su cédula de identidad para retirar el premio",        // cómo entra la factura al sorteo (urna, cupón, carga online…)

  // Sucursales donde se exhiben los premios (punto 4.3)
  sucursales: [
    { nombre: "San Lorenzo", direccion: "Avda. Manuel Ortiz Guerrero esq. Puerto Rosario" },
    { nombre: "Barcequillo – San Lorenzo", direccion: "Avda. Pratt Gill esq. Capitolio" },
    { nombre: "Tramo Luque – San Bernardino", direccion: "Calle Vergel Luqueño, Barrio Marín Kaaguy" },
    { nombre: "Ypacaraí", direccion: "Iturbe esq. Paraguay, Barrio Santa Rosa" },
    { nombre: "Coronel Oviedo", direccion: "Dr. Blas Garay esq. Las Residentas, Ruta 8" }
  ],

  // Premios (punto 4.1)
  premios: [
    { etiqueta: "Año 2026", titulo: "Cuadriciclo AU200", detalle: "Color blanco / naranja · Año 2026", imagen: "assets/img/premios/cuadriciclo-au200.jpg" },
    { etiqueta: "Año 2025", titulo: "Moto CF 125", detalle: "Color gris · Año 2025", imagen: "assets/img/premios/moto-cf125-gris.jpg" },
    { etiqueta: "Año 2025", titulo: "Moto CF 125", detalle: "Color blanco · Año 2025", imagen: "assets/img/premios/moto-cf125-blanca.jpg" },
    { etiqueta: "Año 2025", titulo: "Moto CF 125", detalle: "Color blanco · Año 2025", imagen: "assets/img/premios/moto-cf125-blanca.jpg" },
    { etiqueta: "Año 2025", titulo: "Moto CF 125", detalle: "Color negro · Año 2025", imagen: "assets/img/premios/moto-cf125-negra.jpg" }
  ],

  contacto: {
    whatsapp: "",          // solo números, ej.: "595991895589"
    instagram: "",         // URL completa
    facebook: ""           // URL completa
  },

  /* --------------------------------------------------------
     GANADORES — completar después del sorteo.
     Apenas haya al menos un ganador, el sitio cambia solo
     al modo "ganadores".
     -------------------------------------------------------- */
  ganadores: [
    // { premio: "Cuadriciclo AU200", nombre: "Juan P.", ciudad: "Asunción", foto: "assets/img/ganadores/1.jpg" }
  ],
  videoSorteo: ""          // URL de YouTube/Instagram del sorteo en vivo (opcional)
};
