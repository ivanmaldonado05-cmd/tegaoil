/* ==========================================================
   CONFIGURACIÓN DEL SORTEO — editar solo este archivo
   Campos vacíos ("") se muestran en el sitio como [PENDIENTE].
   Horario de Paraguay: UTC-03:00
   ========================================================== */
window.SORTEO = {
  nombre: "Gran Sorteo Tega Oil × Vevil",          // [PENDIENTE] nombre oficial de la promo
  eslogan: "Cargá, participá y ganá",               // [PENDIENTE] eslogan oficial

  // Fechas (formato AAAA-MM-DDTHH:MM:00-03:00)
  inicio: "",            // inicio de la promoción
  cierre: "",            // cierre de participación
  fechaSorteo: "",       // fecha y hora del sorteo → alimenta la cuenta regresiva
  lugarSorteo: "",       // lugar del sorteo (exigido por DNIT)
  modalidad: "",         // ej.: "boletas físicas en urna, ante escribano público"

  // Empresa organizadora (exigido por DNIT)
  empresa: {
    razonSocial: "",
    ruc: "",
    domicilio: "",
    telefono: "",
    autorizacionDNIT: ""   // N° de resolución / autorización
  },

  // Requisito para obtener un cupón
  requisito: "",           // ej.: "por cada carga de Gs. 150.000 o compra de un producto Vevil"

  sucursales: [
    // { nombre: "Tega Oil Centro", direccion: "", mapa: "" }
  ],

  // Premios — se muestran en orden
  premios: [
    { puesto: "1er premio", titulo: "", detalle: "", imagen: "" },
    { puesto: "2do premio", titulo: "", detalle: "", imagen: "" },
    { puesto: "3er premio", titulo: "", detalle: "", imagen: "" }
  ],

  contacto: {
    whatsapp: "",          // solo números, ej.: "595981000000"
    instagram: "",         // URL completa
    facebook: ""           // URL completa
  },

  /* --------------------------------------------------------
     GANADORES — completar después del sorteo.
     Apenas haya al menos un ganador, el sitio cambia solo
     al modo "ganadores".
     -------------------------------------------------------- */
  ganadores: [
    // { premio: "1er premio", nombre: "Juan P.", ciudad: "Asunción", foto: "assets/img/ganadores/1.jpg" }
  ],
  videoSorteo: ""          // URL de YouTube/Instagram del sorteo en vivo (opcional)
};
