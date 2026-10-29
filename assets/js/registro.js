/* Registro de facturas — formulario público */
(function () {
  const API = "server/api.php";
  const $ = (s, el = document) => el.querySelector(s);
  const form = $("#regForm");
  if (!form) return;

  const status = $("#regStatus"), err = $("#regError"), submit = $("#regSubmit");
  const fileInput = $("#foto"), preview = $("#preview");
  const startedAt = Math.floor(Date.now() / 1000);
  let photoBlob = null;
  // PRUEBA TEMPORAL: ?prueba=LLAVE habilita el formulario antes del inicio (quitar después de la prueba)
  const testKey = new URLSearchParams(location.search).get("prueba") || "";

  const showError = (msg) => { err.textContent = msg; err.hidden = !msg; if (msg) err.scrollIntoView({ block: "center", behavior: "smooth" }); };
  const setStatus = (html, kind) => { status.innerHTML = html; status.className = "reg__status reg__status--" + kind; status.hidden = false; };
  const fmt = (iso) => new Date(iso).toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Asuncion" });

  // ---------- Estado del registro ----------
  fetch(`${API}?action=info`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => {
      const sel = form.elements.sucursal;
      d.sucursales.forEach((s) => sel.add(new Option(s, s)));
      if (!d.registro.open && !testKey) {
        form.hidden = true;
        setStatus(d.registro.state === "pronto"
          ? `<strong>El registro se habilita el ${fmt(d.registro.desde)}.</strong><br>Guardá tus facturas de compras desde esa fecha.`
          : `<strong>El registro de facturas está cerrado.</strong><br>¡Gracias por participar! Seguí nuestras redes para ver el sorteo.`, "info");
      }
    })
    .catch(() => {
      form.hidden = true;
      setStatus("<strong>El registro online estará disponible muy pronto.</strong>", "info");
    });

  // ---------- Formato de cédula y teléfono ----------
  form.elements.ci.addEventListener("input", (e) => {
    const d = e.target.value.replace(/\D/g, "").slice(0, 9);
    e.target.value = d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  });
  form.elements.telefono.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^\d +]/g, "").slice(0, 16);
  });

  // ---------- Foto: se comprime en el navegador ----------
  async function compress(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const max = 1800;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      if (Math.min(w, h) < 300) throw new Error("small");
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.82));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  fileInput.addEventListener("change", async () => {
    const f = fileInput.files[0];
    photoBlob = null;
    preview.hidden = true;
    if (!f) return;
    showError("");
    try {
      photoBlob = await compress(f);
    } catch (e) {
      fileInput.value = "";
      return showError(e.message === "small"
        ? "La foto es muy chica. Sacala más de cerca y con buena luz."
        : "No pudimos leer esa imagen. Probá sacar la foto de nuevo (formato JPG o PNG).");
    }
    const img = preview.querySelector("img");
    if (img.src) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(photoBlob);
    preview.hidden = false;
    $("#upload").classList.add("has-photo");
  });
  $("#changePhoto").addEventListener("click", () => fileInput.click());

  // ---------- Envío ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    const el = form.elements;
    const ci = el.ci.value.replace(/\D/g, ""), tel = el.telefono.value.replace(/\D/g, "");
    const checks = [
      [!el.nombre.value.trim(), "Escribí tu nombre.", el.nombre],
      [!el.apellido.value.trim(), "Escribí tu apellido.", el.apellido],
      [ci.length < 5, "Escribí tu número de cédula.", el.ci],
      [tel.length < 9, "Escribí un teléfono válido (ej. 0981 123 456).", el.telefono],
      [!el.sucursal.value, "Elegí la sucursal donde compraste.", el.sucursal],
      [el.email.value && !el.email.checkValidity(), "El email no es válido.", el.email],
      [!photoBlob, "Subí la foto de tu factura.", fileInput],
      [!el.mayor.checked, "Tenés que ser mayor de 18 años para participar.", el.mayor],
      [!el.bases.checked, "Tenés que aceptar las bases y condiciones.", el.bases],
      [!el.datos.checked, "Tenés que autorizar el uso de tus datos para el sorteo.", el.datos],
    ];
    const bad = checks.find((c) => c[0]);
    if (bad) { bad[2].focus?.(); return showError(bad[1]); }

    const fd = new FormData();
    ["nombre", "apellido", "email", "sucursal", "website"].forEach((k) => fd.append(k, el[k].value.trim()));
    fd.append("ci", ci);
    fd.append("telefono", tel);
    ["mayor", "bases", "datos"].forEach((k) => fd.append(k, el[k].checked ? "1" : ""));
    fd.append("t", String(startedAt));
    if (testKey) fd.append("test_key", testKey);
    fd.append("foto", photoBlob, "factura.jpg");

    submit.disabled = true;
    submit.textContent = "Enviando…";
    try {
      const r = await fetch(`${API}?action=register`, { method: "POST", body: fd });
      const d = await r.json().catch(() => ({ ok: false, error: "Error de conexión. Probá de nuevo." }));
      if (!d.ok) return showError(d.error || "No se pudo registrar. Probá de nuevo.");
      $("#okName").textContent = d.nombre;
      $("#okNum").textContent = d.numero;
      form.hidden = true;
      $("#regOk").hidden = false;
      $("#reg").scrollIntoView({ block: "start", behavior: "smooth" });
    } catch {
      showError("Error de conexión. Revisá tu internet y probá de nuevo.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Registrar factura";
    }
  });

  $("#regAgain").addEventListener("click", () => {
    // conserva los datos personales para la próxima carga; limpia la foto
    fileInput.value = "";
    photoBlob = null;
    preview.hidden = true;
    $("#upload").classList.remove("has-photo");
    $("#regOk").hidden = true;
    form.hidden = false;
  });

  // ---------- Consultar mis participaciones ----------
  const labels = { pendiente: "En revisión", aprobada: "Aprobada", rechazada: "Rechazada" };
  $("#mineForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("#mineOut");
    const ci = e.target.ci.value.replace(/\D/g, ""), tel = e.target.telefono.value.replace(/\D/g, "");
    if (!ci || !tel) return;
    out.innerHTML = '<p class="muted">Buscando…</p>';
    try {
      const r = await fetch(`${API}?action=check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ci, telefono: tel }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      if (!d.entries.length) { out.innerHTML = '<p class="muted">No encontramos participaciones con esa cédula y teléfono.</p>'; return; }
      const ok = d.entries.filter((x) => x.estado === "aprobada").length;
      out.innerHTML = `<p><strong>${ok}</strong> ${ok === 1 ? "participación" : "participaciones"} aprobada${ok === 1 ? "" : "s"} de ${d.entries.length} registrada${d.entries.length === 1 ? "" : "s"}.</p>
        <ul class="mine__list">${d.entries.map((x) => `<li><span class="mono">${x.numero}</span><span>${new Date(x.fecha + "T12:00:00-03:00").toLocaleDateString("es-PY")}</span><span class="tag tag--${x.estado}">${labels[x.estado]}</span>${x.motivo ? `<small>${x.motivo.replace(/[<>&]/g, "")}</small>` : ""}</li>`).join("")}</ul>`;
    } catch (er) {
      out.innerHTML = `<p class="form__error">${(er.message || "No se pudo consultar.").replace(/[<>&]/g, "")}</p>`;
    }
  });
})();
