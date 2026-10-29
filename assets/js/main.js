(function () {
  const C = window.SORTEO;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Valor opcional: si falta, no se muestra nada
  const P = (val) => (val ? esc(val) : "");

  // "2027-03-31" (+ "19:00") → Date en horario de Paraguay
  const toDate = (day, time) => new Date(`${day}T${time || "00:00"}:00-03:00`);
  const fmtDay = (day) => {
    const s = toDate(day, "12:00").toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Asuncion" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const D = (day, label) => (day ? esc(fmtDay(day)) : P("", label));
  const drawWhen = () => `${D(C.fechaSorteo, "fecha del sorteo")}${C.horaSorteo ? `, ${esc(C.horaSorteo)} hs` : ""}`;

  const E = C.empresa;
  const authNum = P(E.autorizacionCONAJZAR);

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
      <div class="prize__media${p.imagen ? " prize__media--photo" : ""}">
        ${p.imagen ? `<img src="${esc(p.imagen)}" alt="${esc(p.titulo + " — " + p.detalle)}" class="prize__photo" loading="lazy">`
                   : `<img src="assets/img/tega-iso.svg" alt="" class="prize__ph">`}
      </div>
      <div class="prize__body">
        <span class="prize__rank">${esc(p.etiqueta)}</span>
        <h3>${P(p.titulo, "premio")}</h3>
        <p>${P(p.detalle, "características")}</p>${p.sucursal ? `
        <p class="prize__where">Se sortea entre las compras de <strong>${esc(p.sucursal)}</strong></p>` : ""}
      </div>
    </article>`).join("");

  // ---------- Pasos ----------
  $("#stepDraw").innerHTML = `El sorteo es el ${D(C.fechaSorteo, "fecha")} y la lista de ganadores se publica el ${D(C.listaGanadores, "fecha")}.`;

  // ---------- Fechas ----------
  const events = [
    { t: "Inicio de la promoción", d: C.inicio, v: D(C.inicio, "fecha de inicio") },
    { t: "Cierre de la promoción", d: C.cierre, v: D(C.cierre, "fecha de cierre") },
    { t: "Gran sorteo", d: C.fechaSorteo, v: `${drawWhen()}${C.lugarSorteo ? `<br><small>${esc(C.lugarSorteo)}</small>` : ""}` },
    { t: "Lista de ganadores", d: C.listaGanadores, v: `${D(C.listaGanadores, "fecha")}<br><small>Retiro de premios: 60 días hábiles</small>` }
  ];
  $("#timeline").innerHTML = events.map((e) => `
    <div class="tl ${e.d && toDate(e.d, "23:59") < new Date() ? "is-done" : ""}">
      <span class="tl__dot"></span>
      <p class="tl__t">${e.t}</p>
      <p class="tl__v">${e.v}</p>
    </div>`).join("");

  // ---------- Sucursales ----------
  const prizeOf = (nombre) => { const p = C.premios.find((x) => x.sucursal === nombre); return p ? `${p.titulo} · ${p.detalle.split(" · ")[0]}` : ""; };
  const mapUrl = (s) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Tega Oil ${s.direccion}, ${s.nombre}, Paraguay`)}`;
  $("#branches").innerHTML = C.sucursales.map((s, i) => `
    <a class="branch" href="${s.mapa ? esc(s.mapa) : mapUrl(s)}" target="_blank" rel="noopener">
      <span class="branch__n">${String(i + 1).padStart(2, "0")}</span>
      <span class="branch__body">
        <strong>${esc(s.nombre)}</strong>
        <span>${esc(s.direccion)}</span>${prizeOf(s.nombre) ? `
        <em class="branch__prize">Premio: ${esc(prizeOf(s.nombre))}</em>` : ""}
      </span>
      <span class="branch__go" aria-hidden="true">↗</span>
    </a>`).join("");

  // ---------- Bases y condiciones oficiales (presentadas a la CONAJZAR) + cláusulas del Anexo I ----------
  const sucList = `<ul>${C.sucursales.map((s) => `<li>${esc(s.direccion)} – ${esc(s.nombre)}</li>`).join("")}</ul>`;
  const sucDe = (p) => { const s = C.sucursales.find((x) => x.nombre === p.sucursal); return s ? `${s.direccion} – ${s.nombre}` : ""; };
  const premiosList = `<ul>${C.premios.map((p) => `<li>1 ${esc(p.titulo)} – ${esc(p.detalle)}${sucDe(p) ? ` – <strong>Sucursal ${esc(sucDe(p))}</strong>` : ""}</li>`).join("")}</ul>`;
  const bases = [
    ["1. Organizador", `
      <p><strong>${esc(E.razonSocial)}</strong>, en adelante el ORGANIZADOR, con RUC N° ${esc(E.ruc)}, domicilio situado en la calle ${esc(E.domicilio)}, teléfono ${esc(E.telefono)}, realizará la promoción denominada <strong>${esc(C.nombre.toUpperCase())}</strong>, en adelante la PROMOCIÓN.</p>`],
    ["2. Vigencia", `
      <p>La PROMOCIÓN tendrá vigencia desde el <strong>${D(C.inicio, "inicio")}</strong> hasta el <strong>${D(C.cierre, "cierre")}</strong> y será válida para todo el territorio nacional.</p>`],
    ["3. Participantes", `
      <p>Podrán participar de la PROMOCIÓN todas las personas físicas que cumplan los requisitos establecidos en estas bases y condiciones.</p>`],
    ["4. Restricciones de participación", `
      <p>No podrán participar de la PROMOCIÓN, ni hacerse acreedores de los premios:</p>
      <ul>
        <li>Los menores de 18 años.</li>
        <li>Los prófugos de la justicia o con privación de libertad por mandato judicial.</li>
        <li>Los propietarios, accionistas, apoderados, directivos, gerentes, funcionarios o empleados del ORGANIZADOR, o sus familiares directos (padres, hijos, hermanos, cónyuges).</li>
      </ul>`],
    ["5. Sistema de participación", `
      <p>Participan de la promoción todos los clientes que hayan realizado compras por valor de <strong>${esc(C.montoMinimo)} (cien mil guaraníes)</strong>, en cualquiera de los productos comercializados por la Estación de Servicios y con <strong>${esc(C.documentoValido)}</strong>, durante la vigencia de la PROMOCIÓN.</p>
      <p>Para participar se debe rellenar el formulario de registro en la página web de la empresa (veviltegaoil.com), cargando los datos personales y la foto de la factura. Se permite una carga por cédula de identidad por día. Cada factura registrada y aprobada por el ORGANIZADOR genera un cupón con su número de participación.</p>
      <p>Cada cupón participa únicamente por el premio asignado a la Estación de Servicios donde se realizó la compra, conforme a la cláusula de Premios y al Anexo de estas bases y condiciones. La sucursal de compra es la que figura en la factura física.</p>`],
    ["6. Premios", `
      <p>Durante la PROMOCIÓN serán sorteados los siguientes premios:</p>${premiosList}
      <p>Los bienes serán depositados para su exhibición en las sucursales de:</p>${sucList}`],
    ["7. Sorteo", `
      <p>El sorteo será realizado en fecha <strong>${drawWhen()}</strong>${C.lugarSorteo ? ` en el local ubicado en <strong>${esc(C.lugarSorteo)}</strong>` : ""}.</p>${C.modalidad ? `
      <p>Como sistema de sorteo se empleará el uso de ${esc(C.modalidad)}.</p>` : ""}
      <p>Durante el sorteo de cada premio además se seleccionará un cupón que corresponderá al ganador suplente, quien será el acreedor del premio únicamente en caso que el ganador titular se encuentre inhabilitado, según las restricciones de participación de estas bases y condiciones.</p>
      <p>El sorteo de cada premio se realizará únicamente entre los cupones correspondientes a la sucursal a la que fue asignado dicho premio. El ganador suplente de cada premio se seleccionará entre los cupones de la misma sucursal.</p>`],
    ["8. Exclusión", `
      <p>En el caso en que el ORGANIZADOR constate que el potencial ganador se encuentra inhabilitado por hallarse dentro de las restricciones de participación establecidas en estas bases y condiciones, se procederá a la anulación del cupón seleccionado, dejando constancia del hecho mediante acta notarial donde se describirá en detalle el motivo. En este caso, el participante con el cupón suplente pasará a ser el acreedor del premio, lo cual se dejará constancia en la misma acta notarial.</p>`],
    ["9. Notificación", `
      <p>Los ganadores serán notificados vía telefónica en el transcurso de las 48 horas posteriores al sorteo. Además, el listado de ganadores (nombre, apellido y tres últimos dígitos del documento de identidad) será publicado en la página web del ORGANIZADOR y en sus redes sociales.</p>`],
    ["10. Retiro de premios", `
      <p>El ganador tendrá un plazo improrrogable de <strong>60 días hábiles</strong> posteriores a la fecha del sorteo para retirar el premio, y a tal efecto deberá presentarse en el lugar indicado por el ORGANIZADOR. <strong>El único documento válido para retirar el premio que deberá presentar el ganador es la cédula de identidad.</strong></p>`],
    ["11. Premios vacantes", `
      <p>Cumplido el plazo sin que se haya presentado el ganador, el valor del premio será destinado al financiamiento del FONARESS, conforme a lo establecido en la Ley N° 6703/20 y sus modificaciones.</p>`],
    ["12. Responsabilidad", `
      <p>El ORGANIZADOR no será responsable del uso o destino que el ganador otorgue a los premios recibidos.</p>`],
    ["13. Publicidad", `
      <p>El ganador, al momento de aceptar y retirar el premio, otorga de manera gratuita al ORGANIZADOR el derecho a publicitar su nombre e imagen, para la difusión en comerciales de televisión, radio, prensa escrita o redes sociales, por un plazo de 12 meses de finalizada la PROMOCIÓN. Esta cesión de derechos será otorgada al solo efecto de publicitar el resultado de la promoción de referencia, y no será utilizada para otros fines.</p>`],
    ["14. Privacidad", `
      <p>Los datos personales de los participantes que el ORGANIZADOR reciba o posea serán tratados de acuerdo a la legislación vigente en materia de protección de datos de carácter personal. El ORGANIZADOR se compromete a dar un tratamiento prudente y cuidadoso de los datos entregados por el PARTICIPANTE y almacenados al momento del registro de la PROMOCIÓN. En caso que el registro de participación sea realizado por medios electrónicos, el ORGANIZADOR informará al PARTICIPANTE del uso o destino que hará de la información personal recopilada, mediante mensaje que será publicado en la misma plataforma de registro (ver <a href="condiciones.html#privacidad">Aviso de privacidad</a>).</p>`],
    ["15. Modificaciones", `
      <p>El ORGANIZADOR podrá, previa autorización de CONAJZAR, modificar, extender, ampliar, suspender o cancelar esta PROMOCIÓN cuando circunstancias imprevistas así lo justifiquen. En todos los casos, las modificaciones introducidas deberán ajustarse a la legislación vigente y no afectarán derechos adquiridos.</p>`],
    ["16. Reglamento de la promoción", `
      <p>La participación en la promoción implica la aceptación de lo establecido en estas bases y condiciones, documento que estará a disposición de los participantes en el sitio web del organizador y en sus redes sociales. La eventual declaración de nulidad de una o más cláusulas de estas Bases y Condiciones no afectará la validez de las demás cláusulas.</p>`],
    ["17. Condiciones de uso de la plataforma web", `
      <p>Además de cumplir con lo establecido en las presentes Bases y Condiciones, el PARTICIPANTE se compromete a cumplir con los requisitos y disposiciones establecidas en el reglamento de <a href="condiciones.html">condiciones de uso de la plataforma web</a> que el ORGANIZADOR pone a disposición de los participantes durante la vigencia de la PROMOCIÓN.</p>`],
    ["18. Interpretación", `
      <p>Ante cualquier discrepancia o contradicción que pudiese existir entre las disposiciones establecidas en las presentes Bases y Condiciones y en los reglamentos de condiciones de uso mencionados en el artículo anterior, prevalecerá lo establecido en las presentes Bases y Condiciones.</p>`],
    ["19. Jurisdicción", `
      <p>Toda situación que pudiera derivar en un conflicto entre el ORGANIZADOR y el PARTICIPANTE podrá ser resuelta, a pedido de las partes, por la CONAJZAR. Queda además expedita la vía jurisdiccional, en caso que los interesados así lo consideren para la mejor defensa de sus derechos, y a tal efecto, se establecen los tribunales ordinarios de la ciudad de Asunción.</p>`],
    ["Anexo — Listado de premios", `
      <table class="tbl"><thead><tr><th>Premio</th><th>Sucursal</th><th>Cantidad</th><th>Fecha de sorteo</th></tr></thead>
      <tbody>${C.premios.map((p) => `<tr><td>${esc(p.titulo)} – ${esc(p.detalle)}</td><td>${esc(p.sucursal || "")}</td><td>1</td><td>${D(C.fechaSorteo, "fecha")}</td></tr>`).join("")}</tbody></table>`],
    ["Disposiciones CONAJZAR (Anexo I)", `
      <p><strong>1°</strong> El ORGANIZADOR reconoce y acepta: 1.1) a la Comisión Nacional de Juegos de Azar (CONAJZAR) como institución encargada de la supervisión, auditoría y control en lo referente al desarrollo y gestión del juego; 1.2) que toda situación no prevista en el reglamento del juego que pudiera derivar en un conflicto entre la firma y los participantes podrá ser resuelta a pedido de las partes por la CONAJZAR, quedando expedita la vía jurisdiccional; 1.3) que el juego, en cuanto a su alcance o incidencia, resulta solo a nivel nacional; 1.4) que el que tuviera o explotara comercialmente, por sí o por otro, juegos de azar clandestinos o no autorizados será castigado con pena privativa de libertad de hasta 5 (cinco) años o multa, conforme al Art. 17° numeral 1° de la Ley N° 4716/12.</p>
      <p><strong>3°</strong> Fecha cierta de entrega de la lista de ganadores a la CONAJZAR: <strong>${D(C.listaGanadores, "fecha")}</strong>. Los premios no entregados por no presentarse el ganador dentro del plazo establecido en el Art. 19° de la Ley N° 1016/97 serán destinados al financiamiento del FONARESS, conforme lo establece la Ley N° 4392/11 y su modificación, la Ley N° 6703/20.</p>
      <p><strong>4°</strong> Conforme al Art. 18 de la Ley N° 1016/1997, los premios consistentes en bienes muebles estarán depositados en lugares donde el público pueda examinarlos. Todos los premios son de propiedad del organizador o éste acredita la facultad suficiente para transferir el dominio. En los casos de premios cuya transferencia de dominio deba efectuarse por escritura pública, el organizador realizará la transferencia de la propiedad dentro del plazo máximo de siete (7) días de la fecha del sorteo, sin cargo para el beneficiario.</p>${authNum ? `
      <p>Certificado de autorización CONAJZAR N° ${authNum}.</p>` : ""}`],
  ];
  if (authNum) $("#authNum").innerHTML = ` — Certificado N° ${authNum}`;
  $("#footerLegal").innerHTML = `Promoción “${esc(C.nombre)}” organizada por ${esc(E.razonSocial)} (RUC ${esc(E.ruc)}). Autorizada por la CONAJZAR${authNum ? ` — Certificado N° ${authNum}` : ""}. Sorteo: ${D(C.fechaSorteo, "fecha")} · Lista de ganadores: ${D(C.listaGanadores, "fecha")}. Arts. 17, 18 y 19 de la Ley N° 1016/1997. Prohibida la participación de menores de 18 años. <a href="condiciones.html">Condiciones de uso y privacidad</a>.`;

  const faq = [
    ["¿Cuánto tengo que comprar para participar?", `Desde ${esc(C.montoMinimo)} en cualquier producto de las estaciones Tega Oil: combustible, lubricantes o tienda, con factura física.`],
    ["¿Por qué premio participo?", "Por el premio de la sucursal donde hiciste la compra: cada estación sortea su propio premio entre las facturas registradas de esa sucursal. Por eso es importante elegir bien la sucursal al registrar tu factura."],
    ["¿Cuántas veces puedo participar?", "Podés registrar una factura por día con tu cédula. Cada factura de Gs. 100.000 o más, registrada y aprobada, es un cupón más para el sorteo."],
    ["¿Cómo registro mi factura?", "En la sección “Registrá tu factura” de esta página: completás tus datos, sacás una foto clara de la factura y listo. Al terminar recibís tu número de cupón."],
    ["¿Cómo sé si mi factura fue aprobada?", "Nuestro equipo revisa cada factura. Podés ver el estado en “Consultar mis participaciones”, con tu cédula y el teléfono que registraste."],
    ["¿Cuándo y dónde es el sorteo?", `El ${D(C.fechaSorteo, "fecha")}${C.lugarSorteo ? ` en ${esc(C.lugarSorteo)}` : ""}. Lo vas a poder ver en vivo en esta misma página web. La lista de ganadores se publica el ${D(C.listaGanadores, "fecha")}.`],
    ["¿Cómo me entero si gané?", "Te llamamos al teléfono que registraste dentro de las 48 horas posteriores al sorteo. También publicamos la lista de ganadores (nombre, apellido y los 3 últimos dígitos de la cédula) en esta página y en nuestras redes."],
    ["¿Dónde puedo ver los premios?", "Están en exhibición en nuestras sucursales de San Lorenzo, Barcequillo, Tramo Luque – San Bernardino, Ypacaraí y Coronel Oviedo."],
    ["¿Qué necesito para retirar mi premio?", "Solo tu cédula de identidad. Tenés 60 días hábiles desde el sorteo para retirarlo."]
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
  if (social.length) $("#social").innerHTML = social.join("");
  else $("#social").remove();
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
