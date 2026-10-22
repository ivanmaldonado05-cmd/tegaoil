(function () {
  const C = window.SORTEO;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Valor o marcador [PENDIENTE]
  const P = (val, label) => (val ? esc(val) : `<span class="pend">[PENDIENTE: ${label}]</span>`);

  const fmtDate = (iso, withTime = true) => {
    if (!iso) return null;
    const d = new Date(iso);
    const opts = { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Asuncion" };
    if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit", hour12: false });
    const s = d.toLocaleString("es-PY", opts);
    return s.charAt(0).toUpperCase() + s.slice(1) + (withTime ? " hs" : "");
  };
  const D = (iso, label, t = true) => (iso ? esc(fmtDate(iso, t)) : P("", label));

  // ---------- Estado: pre-sorteo o ganadores ----------
  const hasWinners = Array.isArray(C.ganadores) && C.ganadores.length > 0;
  document.body.classList.add(hasWinners ? "is-winners" : "is-pre");

  // ---------- Hero ----------
  document.title = C.nombre;
  $("#heroTitle").innerHTML = hasWinners
    ? `¡Ya tenemos <span class="grad">ganadores!</span>`
    : esc(C.nombre).replace("×", '<span class="x">×</span>').replace(/(Vevil)/, '<span class="grad-green">$1</span>');
  $("#heroLead").textContent = hasWinners
    ? "Gracias a todos los que participaron. Conocé a los afortunados del sorteo."
    : C.eslogan;
  $("#heroEyebrow").textContent = hasWinners ? "Sorteo realizado" : "Sorteo oficial";
  $("#heroDate").innerHTML = `Sorteo: ${D(C.fechaSorteo, "fecha y hora del sorteo")}`;

  // ---------- Cuenta regresiva ----------
  if (!hasWinners) {
    const nums = {};
    document.querySelectorAll(".cd__n").forEach((n) => (nums[n.dataset.u] = n));
    const target = C.fechaSorteo ? new Date(C.fechaSorteo).getTime() : null;
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      if (!target) return;
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      const vals = { d: pad(d), h: pad(h), m: pad(m), s: pad(s) };
      for (const k in vals) if (nums[k].textContent !== vals[k]) {
        nums[k].textContent = vals[k];
        nums[k].classList.remove("flip"); void nums[k].offsetWidth; nums[k].classList.add("flip");
      }
      if (target - Date.now() <= 0) {
        clearInterval(timer);
        $("#countdown").classList.add("is-live");
        $("#heroDate").innerHTML = `<strong>¡El sorteo es hoy!</strong> Muy pronto publicamos a los ganadores.`;
      }
    };
    const timer = setInterval(tick, 1000);
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
        <span class="prize__rank">${esc(p.puesto)}</span>
        <h3>${P(p.titulo, "premio")}</h3>
        <p>${P(p.detalle, "marca, modelo y características")}</p>
      </div>
    </article>`).join("");

  // ---------- Pasos ----------
  $("#stepReq").innerHTML = `Obtené un cupón ${P(C.requisito, "requisito para obtener el cupón")} en estaciones Tega Oil participantes.`;

  // ---------- Fechas ----------
  const events = [
    { t: "Inicio de la promoción", v: D(C.inicio, "fecha de inicio", false) },
    { t: "Cierre de participación", v: D(C.cierre, "fecha de cierre") },
    { t: "Gran sorteo", v: `${D(C.fechaSorteo, "fecha y hora")}<br><small>${P(C.lugarSorteo, "lugar del sorteo")}</small>` },
    { t: "Retiro de premios", v: "Hasta 60 días después del sorteo" }
  ];
  const now = Date.now();
  const doneFlags = [C.inicio, C.cierre, C.fechaSorteo, null].map((d) => d && new Date(d).getTime() < now);
  $("#timeline").innerHTML = events.map((e, i) => `
    <div class="tl ${doneFlags[i] ? "is-done" : ""}">
      <span class="tl__dot"></span>
      <p class="tl__t">${e.t}</p>
      <p class="tl__v">${e.v}</p>
    </div>`).join("");

  // ---------- Bases y condiciones (estructura DNIT) ----------
  const E = C.empresa;
  const sucursales = C.sucursales.length
    ? `<ul>${C.sucursales.map((s) => `<li><strong>${esc(s.nombre)}</strong>${s.direccion ? " — " + esc(s.direccion) : ""}</li>`).join("")}</ul>`
    : `<p>${P("", "listado de estaciones participantes")}</p>`;
  const bases = [
    ["1. Empresa organizadora y vigencia", `
      <p>La promoción <strong>“${esc(C.nombre)}”</strong> es organizada por ${P(E.razonSocial, "razón social")}, RUC ${P(E.ruc, "RUC")}, con domicilio en ${P(E.domicilio, "domicilio")}, teléfono ${P(E.telefono, "teléfono")}, en conjunto con la marca Vevil.</p>
      <p>Vigencia: desde el ${D(C.inicio, "inicio", false)} hasta el ${D(C.cierre, "cierre")}.</p>`],
    ["2. Quiénes pueden participar", `
      <p>Pueden participar personas físicas <strong>mayores de 18 años</strong>, residentes en la República del Paraguay, que cumplan con la mecánica descrita en estas bases.</p>
      <p><strong>No pueden participar</strong> menores de 18 años, ni el personal de la empresa organizadora, de Vevil o de las estaciones participantes, ni sus familiares hasta el segundo grado de consanguinidad o afinidad.</p>
      <p>Estaciones participantes:</p>${sucursales}`],
    ["3. Mecánica y modalidad del sorteo", `
      <p>Por cada ${P(C.requisito, "requisito")} el cliente recibirá un cupón, que deberá completar con sus datos (nombre, cédula de identidad y teléfono) y depositar en la urna habilitada en la estación.</p>
      <p>Modalidad del sorteo: ${P(C.modalidad, "boletas físicas / bolillero electrónico / ante escribano")}. Cupones ilegibles, incompletos o adulterados serán anulados.</p>`],
    ["4. Premios", `
      <ul>${C.premios.map((p) => `<li><strong>${esc(p.puesto)}:</strong> ${P(p.titulo, "premio")} — ${P(p.detalle, "marca, modelo, cantidad y características")}</li>`).join("")}</ul>
      <p>Los premios no son canjeables por dinero ni por otros bienes. En el caso de bienes registrables (rodados, inmuebles) se aplicará lo dispuesto en el Art. 18 de la Ley N° 1016/97.</p>`],
    ["5. Calendario y lugar del sorteo", `
      <p>El sorteo se realizará el ${D(C.fechaSorteo, "fecha y hora")} en ${P(C.lugarSorteo, "lugar del sorteo")}. Los ganadores serán contactados telefónicamente y publicados en este sitio y en las redes oficiales de Tega Oil.</p>`],
    ["6. Plazo para retirar los premios", `
      <p>Los ganadores dispondrán de un plazo de <strong>60 (sesenta) días</strong> desde la fecha del sorteo para retirar su premio, conforme al Art. 19 de la Ley N° 1016/97, presentando su cédula de identidad.</p>
      <p>Los premios no retirados dentro de dicho plazo serán destinados al financiamiento del FONARESS, conforme a lo establecido en la Ley N° 6703/20.</p>`],
    ["7. Otras cláusulas", `
      <p>La participación implica la aceptación total de estas bases. Los ganadores autorizan el uso de su nombre e imagen con fines de difusión de la promoción, sin derecho a compensación.</p>
      <p>Los datos personales serán utilizados exclusivamente para la gestión de la promoción. Cualquier situación no prevista será resuelta por el organizador conforme a la legislación de Juegos de Azar vigente y sus reglamentaciones.</p>`],
    ["8. Autorización", `
      <p>Promoción autorizada por la Dirección Nacional de Ingresos Tributarios (DNIT) — ${P(E.autorizacionDNIT, "N° de autorización")}. Las bases completas, firmadas por el representante legal, se encuentran disponibles en las estaciones participantes.</p>`]
  ];
  $("#dnitNum").innerHTML = P(E.autorizacionDNIT, "N° de autorización");

  const faq = [
    ["¿Cuántas veces puedo participar?", "Todas las que quieras: cada cupón es una chance más de ganar, siempre que cumplas con el requisito de participación."],
    ["¿Dónde consigo los cupones?", "En caja, al momento de pagar, en cualquier estación Tega Oil participante."],
    ["¿Cómo sé si gané?", "Te llamamos al teléfono que escribiste en el cupón. Además, publicamos a los ganadores en este sitio y en nuestras redes."],
    ["¿Qué necesito para retirar mi premio?", "Tu cédula de identidad. Tenés 60 días desde el sorteo para retirarlo."]
  ];

  const renderAcc = (items, el) => {
    el.innerHTML = items.map(([q, a], i) => `
      <div class="acc">
        <button class="acc__q" aria-expanded="false" aria-controls="${el.id}-${i}">${q}<span class="acc__ic" aria-hidden="true"></span></button>
        <div class="acc__a" id="${el.id}-${i}" role="region"><div class="acc__inner">${a.startsWith("<") ? a : `<p>${a}</p>`}</div></div>
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
    w.href = `https://wa.me/${K.whatsapp}?text=${encodeURIComponent("Hola! Tengo una consulta sobre el sorteo " + C.nombre)}`;
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
  document.querySelectorAll(".section__head, .prize, .step, .tl, .acc, .winner").forEach((el) => {
    el.classList.add("reveal");
    io ? io.observe(el) : el.classList.add("in");
  });
})();
