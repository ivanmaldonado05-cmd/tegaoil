(function () {
  const C = window.SORTEO;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Valor o marcador [PENDIENTE]
  const P = (val, label) => (val ? esc(val) : `<span class="pend">[PENDIENTE: ${label}]</span>`);

  // "2027-03-31" (+ "19:00") → Date en horario de Paraguay
  const toDate = (day, time) => new Date(`${day}T${time || "00:00"}:00-03:00`);
  const fmtDay = (day) => {
    const s = toDate(day, "12:00").toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Asuncion" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const D = (day, label) => (day ? esc(fmtDay(day)) : P("", label));
  const drawWhen = () => `${D(C.fechaSorteo, "fecha del sorteo")}${C.horaSorteo ? `, ${esc(C.horaSorteo)} hs` : ` · ${P("", "hora")}`}`;

  const E = C.empresa;
  const authNum = P(E.autorizacionCONAJZAR, "N° de certificado CONAJZAR");

  // ---------- Estado: pre-sorteo o ganadores ----------
  const hasWinners = Array.isArray(C.ganadores) && C.ganadores.length > 0;
  document.body.classList.add(hasWinners ? "is-winners" : "is-pre");

  // ---------- Hero ----------
  $("#heroTitle").innerHTML = hasWinners
    ? `¡Ya tenemos <span class="grad">ganadores!</span>`
    : esc(C.nombre).replace(/^(Vevil)/, '<span class="grad-green">$1</span>').replace(/(Preferencia)$/, '<span class="grad">$1</span>');
  $("#heroLead").textContent = hasWinners
    ? "Gracias a todos los que participaron. Conocé a los afortunados del sorteo."
    : C.eslogan;
  $("#heroEyebrow").textContent = hasWinners ? "Sorteo realizado" : "Sorteo oficial · Tega Oil";
  $("#heroDate").innerHTML = `Sorteo: ${drawWhen()}`;

  // ---------- Cuenta regresiva ----------
  if (!hasWinners) {
    const nums = {};
    document.querySelectorAll(".cd__n").forEach((n) => (nums[n.dataset.u] = n));
    const target = C.fechaSorteo ? toDate(C.fechaSorteo, C.horaSorteo).getTime() : null;
    const pad = (n) => String(n).padStart(2, "0");
    let timer;
    const tick = () => {
      if (!target) return;
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      const vals = { d: d > 99 ? String(d) : pad(d), h: pad(h), m: pad(m), s: pad(s) };
      for (const k in vals) if (nums[k].textContent !== vals[k]) {
        nums[k].textContent = vals[k];
        nums[k].classList.remove("flip"); void nums[k].offsetWidth; nums[k].classList.add("flip");
      }
      if (target - Date.now() <= 0) {
        clearInterval(timer);
        $("#countdown").classList.add("is-live");
        $("#heroDate").innerHTML = `<strong>¡El sorteo es hoy!</strong> La lista de ganadores se publica el ${D(C.listaGanadores, "fecha")}.`;
      }
    };
    timer = setInterval(tick, 1000);
    tick();
    if (!target) $("#countdown").classList.add("is-pending");
  }

  // ---------- Premios ----------
  $("#prizesGrid").innerHTML = C.premios.map((p, i) => `
    <article class="prize ${i === 0 ? "prize--main" : ""}">
      <div class="prize__media">
        ${p.imagen ? `<img src="${esc(p.imagen)}" alt="${esc(p.titulo)}" loading="lazy">`
                   : `<img src="assets/img/tega-iso.svg" alt="" class="prize__ph">`}
      </div>
      <div class="prize__body">
        <span class="prize__rank">${esc(p.etiqueta)}</span>
        <h3>${P(p.titulo, "premio")}</h3>
        <p>${P(p.detalle, "características")}</p>
      </div>
    </article>`).join("");

  // ---------- Pasos ----------
  $("#stepReg").innerHTML = C.comoSeRegistra
    ? esc(C.comoSeRegistra)
    : `Con tu factura física participás automáticamente. ${P("", "cómo se registra la factura")}`;
  $("#stepDraw").innerHTML = `El sorteo es el ${D(C.fechaSorteo, "fecha")} y la lista de ganadores se publica el ${D(C.listaGanadores, "fecha")}.`;

  // ---------- Fechas ----------
  const events = [
    { t: "Inicio de la promoción", d: C.inicio, v: D(C.inicio, "fecha de inicio") },
    { t: "Cierre de la promoción", d: C.cierre, v: D(C.cierre, "fecha de cierre") },
    { t: "Gran sorteo", d: C.fechaSorteo, v: `${drawWhen()}<br><small>${P(C.lugarSorteo, "lugar del sorteo")}</small>` },
    { t: "Lista de ganadores", d: C.listaGanadores, v: `${D(C.listaGanadores, "fecha")}<br><small>Retiro de premios: hasta 60 días</small>` }
  ];
  $("#timeline").innerHTML = events.map((e) => `
    <div class="tl ${e.d && toDate(e.d, "23:59") < new Date() ? "is-done" : ""}">
      <span class="tl__dot"></span>
      <p class="tl__t">${e.t}</p>
      <p class="tl__v">${e.v}</p>
    </div>`).join("");

  // ---------- Sucursales ----------
  const mapUrl = (s) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Tega Oil ${s.direccion}, ${s.nombre}, Paraguay`)}`;
  $("#branches").innerHTML = C.sucursales.map((s, i) => `
    <a class="branch" href="${s.mapa ? esc(s.mapa) : mapUrl(s)}" target="_blank" rel="noopener">
      <span class="branch__n">${String(i + 1).padStart(2, "0")}</span>
      <span class="branch__body">
        <strong>${esc(s.nombre)}</strong>
        <span>${esc(s.direccion)}</span>
      </span>
      <span class="branch__go" aria-hidden="true">↗</span>
    </a>`).join("");

  // ---------- Bases y condiciones (Anexo I CONAJZAR) ----------
  const sucList = `<ul>${C.sucursales.map((s) => `<li>${esc(s.direccion)} – ${esc(s.nombre)}</li>`).join("")}</ul>`;
  const bases = [
    ["1. Organizador, denominación y vigencia", `
      <p>La promoción <strong>“${esc(C.nombre)}”</strong> es organizada por <strong>${esc(E.razonSocial)}</strong>, RUC ${esc(E.ruc)}, con domicilio en ${esc(E.domicilio)}, teléfono ${esc(E.telefono)}, y se realiza en las estaciones de servicio Tega Oil.</p>
      <p>Alcance: ${esc(C.alcance)}. Vigencia: desde el ${D(C.inicio, "inicio")} hasta el ${D(C.cierre, "cierre")}.</p>`],
    ["2. Reconocimiento de la CONAJZAR", `
      <p>El organizador reconoce y acepta a la Comisión Nacional de Juegos de Azar (CONAJZAR) como institución encargada de la supervisión, auditoría y control del desarrollo y gestión de esta promoción.</p>
      <p>Toda situación no prevista en estas bases que pudiera derivar en un conflicto entre el organizador y los participantes podrá ser resuelta a pedido de las partes por la CONAJZAR, quedando expedita la vía jurisdiccional en caso de que los interesados así lo consideren para la mejor defensa de sus derechos.</p>
      <p>Certificado de autorización CONAJZAR: ${authNum}.</p>`],
    ["3. Quiénes pueden participar", `
      <p>Pueden participar personas físicas <strong>mayores de 18 años</strong> que cumplan con la mecánica descrita en estas bases. <strong>No pueden participar menores de 18 años.</strong></p>`],
    ["4. Mecánica del juego", `
      <p>El cliente accede a participar del sorteo con la <strong>compra de ${esc(C.montoMinimo)}</strong> de cualquiera de los productos comercializados por la estación de servicio. El documento válido será la <strong>${esc(C.documentoValido)}</strong>.</p>
      <p>Registro de la participación: ${P(C.comoSeRegistra, "cómo se registra la factura")}.</p>
      <p>Modalidad del sorteo: ${P(C.modalidad, "boletas físicas / bolillero electrónico")}.</p>`],
    ["5. Premios", `
      <p>Serán sorteados los siguientes bienes:</p>
      <ul>${C.premios.map((p) => `<li>1 ${esc(p.titulo)} – ${esc(p.detalle)}</li>`).join("")}</ul>
      <p>Los bienes serán depositados para su exhibición en las sucursales de:</p>${sucList}
      <p>Conforme al Art. 18 de la Ley N° 1016/1997, todos los premios son de propiedad del organizador o éste acredita la facultad suficiente para transferir el dominio. En los casos de premios cuya transferencia de dominio deba efectuarse por escritura pública, el organizador realizará la transferencia de la propiedad dentro del plazo máximo de siete (7) días de la fecha del sorteo, sin cargo para el beneficiario.</p>`],
    ["6. Fecha y lugar del sorteo", `
      <p>Fecha del sorteo: <strong>${drawWhen()}</strong>.</p>
      <p>Lugar: ${P(C.lugarSorteo, "lugar del sorteo")}.</p>
      <p>Fecha de entrega de la lista de ganadores: <strong>${D(C.listaGanadores, "fecha")}</strong>. Los ganadores serán publicados en este sitio y en las redes oficiales.</p>`],
    ["7. Plazo para retirar los premios", `
      <p>Los ganadores dispondrán del plazo establecido en el <strong>Art. 19 de la Ley N° 1016/97</strong> (60 días) para retirar su premio, presentando su cédula de identidad y la factura física ganadora.</p>
      <p>Los premios no entregados por no presentarse el ganador dentro de dicho plazo serán destinados al financiamiento del FONARESS, conforme lo establece la Ley N° 4392/11 y su modificación, la Ley N° 6703/20.</p>`],
    ["8. Marco legal", `
      <p>Esta promoción se rige por la Ley N° 1016/1997 de Juegos de Azar —en especial sus Arts. 17, 18 y 19— y sus reglamentaciones. La explotación de juegos de azar no autorizados es sancionada conforme al Art. 17, numeral 1° de la Ley N° 4716/12.</p>
      <p>La participación implica la aceptación total de estas bases y condiciones.</p>`]
  ];
  $("#authNum").innerHTML = authNum;
  $("#footerLegal").innerHTML = `Promoción “${esc(C.nombre)}” organizada por ${esc(E.razonSocial)} (RUC ${esc(E.ruc)}). Autorizada por la CONAJZAR — Certificado N° ${authNum}. Arts. 17, 18 y 19 de la Ley N° 1016/1997. Prohibida la participación de menores de 18 años.`;

  const faq = [
    ["¿Cuánto tengo que comprar para participar?", `Desde ${esc(C.montoMinimo)} en cualquier producto de las estaciones Tega Oil: combustible, lubricantes o tienda.`],
    ["¿Cuántas veces puedo participar?", "Todas las que quieras: cada compra que cumpla con el monto mínimo es una nueva chance de ganar."],
    ["¿Qué comprobante necesito?", "La factura física de tu compra. Es el único documento válido, así que guardala hasta después del sorteo."],
    ["¿Cuándo es el sorteo?", `El ${D(C.fechaSorteo, "fecha")}. La lista de ganadores se publica el ${D(C.listaGanadores, "fecha")}.`],
    ["¿Dónde puedo ver los premios?", "Están en exhibición en nuestras sucursales de San Lorenzo, Barcequillo, Tramo Luque – San Bernardino, Ypacaraí y Coronel Oviedo."],
    ["¿Cuánto tiempo tengo para retirar mi premio?", "60 días desde el sorteo, presentando tu cédula y la factura ganadora."]
  ];

  const renderAcc = (items, el) => {
    el.innerHTML = items.map(([q, a], i) => `
      <div class="acc">
        <button class="acc__q" aria-expanded="false" aria-controls="${el.id}-${i}">${q}<span class="acc__ic" aria-hidden="true"></span></button>
        <div class="acc__a" id="${el.id}-${i}" role="region"><div class="acc__inner">${a.trim().startsWith("<") ? a : `<p>${a}</p>`}</div></div>
      </div>`).join("");
    el.addEventListener("click", (e) => {
      const btn = e.target.closest(".acc__q");
      if (!btn) return;
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      btn.parentElement.classList.toggle("is-open", !open);
    });
  };
  renderAcc(bases, $("#basesList"));
  renderAcc(faq, $("#faqList"));

  // ---------- Ganadores ----------
  if (hasWinners) {
    $("#winnersSub").innerHTML = `Sorteo realizado el ${D(C.fechaSorteo, "fecha")}${C.lugarSorteo ? " en " + esc(C.lugarSorteo) : ""}.`;
    $("#winnersGrid").innerHTML = C.ganadores.map((g) => `
      <article class="winner">
        <div class="winner__photo">${g.foto ? `<img src="${esc(g.foto)}" alt="${esc(g.nombre)}" loading="lazy">` : `<img src="assets/img/tega-iso.svg" alt="" class="prize__ph">`}</div>
        <span class="prize__rank">${esc(g.premio)}</span>
        <h3>${esc(g.nombre)}</h3>
        ${g.ciudad ? `<p>${esc(g.ciudad)}</p>` : ""}
      </article>`).join("");
    if (C.videoSorteo) {
      const yt = C.videoSorteo.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);
      const v = $("#videoWrap");
      v.hidden = false;
      v.innerHTML = yt
        ? `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="Video del sorteo" allowfullscreen loading="lazy"></iframe>`
        : `<a class="btn btn--ghost" href="${esc(C.videoSorteo)}" target="_blank" rel="noopener">Ver el video del sorteo</a>`;
      if (!yt) v.classList.add("video--link");
    }
  }

  // ---------- Contacto ----------
  const K = C.contacto;
  const social = [];
  if (K.instagram) social.push(`<a href="${esc(K.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
  if (K.facebook) social.push(`<a href="${esc(K.facebook)}" target="_blank" rel="noopener">Facebook</a>`);
  if (K.whatsapp) social.push(`<a href="https://wa.me/${esc(K.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>`);
  $("#social").innerHTML = social.length ? social.join("") : P("", "redes y WhatsApp");
  if (K.whatsapp) {
    const w = $("#waFloat");
    w.href = `https://wa.me/${K.whatsapp}?text=${encodeURIComponent("Hola! Tengo una consulta sobre la promo " + C.nombre)}`;
    w.hidden = false;
  }
  $("#year").textContent = new Date().getFullYear();

  // ---------- Nav ----------
  const nav = $("#nav"), toggle = $("#navToggle"), links = $("#navLinks");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.tagName === "A") { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }
  });

  // ---------- Reveal ----------
  const io = "IntersectionObserver" in window && new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".section__head, .prize, .step, .tl, .acc, .winner, .branch").forEach((el) => {
    el.classList.add("reveal");
    io ? io.observe(el) : el.classList.add("in");
  });
})();
