/* Panel — revisión de participaciones */
(function () {
  const { api, url, esc, $, toast, boot, bindCommon, fmtDate, fmtCi } = window.TG;
  const LABEL = { pendiente: "Pendiente", aprobada: "Aprobada", rechazada: "Rechazada" };
  const state = { estado: "pendiente", q: "", page: 1, rows: [], idx: -1, total: 0, per: 50, locked: false };

  bindCommon();
  boot(() => load());

  // ---------- Lista ----------
  async function load(keepIdx) {
    try {
      const d = await api("entries", { params: { estado: state.estado, q: state.q, page: state.page } });
      state.rows = d.entries; state.total = d.total; state.per = d.per;
      for (const k in d.counts) document.querySelectorAll(`[data-k="${k}"]`).forEach((n) => (n.textContent = d.counts[k].toLocaleString("es-PY")));
      const reg = d.registro;
      const b = $("#banner");
      b.hidden = reg.state === "abierto";
      b.innerHTML = reg.state === "pronto" ? "<strong>El registro todavía no está abierto al público.</strong> Se habilita automáticamente en la fecha de inicio."
        : "<strong>El registro está cerrado.</strong> " + (reg.open ? "" : "Las participaciones ya no se pueden modificar si la lista del sorteo está cerrada.");
      $("#btnWipe").hidden = !d.wipe_allowed;
      render();
      return keepIdx;
    } catch (e) { toast(e.message); }
  }

  function render() {
    const tb = $("#rows");
    tb.innerHTML = state.rows.map((r, i) => `
      <tr data-i="${i}">
        <td class="num">${esc(r.numero)}</td>
        <td class="hide-sm">${esc(fmtDate(r.created_at))}</td>
        <td class="who"><strong>${esc(r.nombre)} ${esc(r.apellido)}</strong>${flags(r, true)}</td>
        <td>${esc(fmtCi(r.ci))}</td>
        <td class="hide-sm">${esc(r.telefono)}</td>
        <td class="hide-sm sub">${esc(r.sucursal.split(" — ")[0])}</td>
        <td><span class="tag tag--${r.estado}">${LABEL[r.estado]}</span></td>
        <td class="open">Revisar →</td>
      </tr>`).join("");
    $("#empty").hidden = state.rows.length > 0;
    const pages = Math.ceil(state.total / state.per);
    $("#pager").innerHTML = pages > 1
      ? `<button class="linkbtn" data-p="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""}>← Anterior</button>
         <span>Página ${state.page} de ${pages} · ${state.total.toLocaleString("es-PY")} resultados</span>
         <button class="linkbtn" data-p="${state.page + 1}" ${state.page >= pages ? "disabled" : ""}>Siguiente →</button>`
      : (state.total ? `<span>${state.total.toLocaleString("es-PY")} resultado${state.total === 1 ? "" : "s"}</span>` : "");
    $("#btnExport").href = url("export", { estado: state.estado });
  }

  function flags(r, compact) {
    const f = [];
    if (+r.dup_foto) f.push(`<span class="flag" title="La misma foto se subió en otra participación">Foto repetida</span>`);
    if (+r.dup_nro) f.push(`<span class="flag" title="Otro registro tiene el mismo N° de factura">N° de factura repetido</span>`);
    if (!compact && +r.cargas_ci > 1) f.push(`<span class="flag flag--info">${r.cargas_ci} cargas con esta cédula</span>`);
    if (r.estado === "rechazada" && r.motivo) f.push(`<span class="flag flag--info">Motivo: ${esc(r.motivo)}</span>`);
    return f.length ? `<div>${f.join("")}</div>` : "";
  }

  $("#rows").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-i]");
    if (tr) open(+tr.dataset.i);
  });
  $("#pager").addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]");
    if (b && !b.disabled) { state.page = +b.dataset.p; load(); }
  });
  const setTab = (estado) => {
    state.estado = estado; state.page = 1;
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("is-active", b.dataset.estado === estado));
    load();
  };
  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setTab(b.dataset.estado); });
  document.querySelectorAll(".stat[data-estado]").forEach((s) => s.addEventListener("click", () => setTab(s.dataset.estado)));
  let qT;
  $("#search").addEventListener("input", (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim(); state.page = 1; load(); }, 300); });
  $("#search").addEventListener("submit", (e) => e.preventDefault());

  // ---------- Borrar datos de prueba ----------
  $("#btnWipe").addEventListener("click", () => { $("#wipeModal").hidden = false; $("#wipeError").hidden = true; $("#wipeForm").reset(); });
  $("#wipeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("test.wipe", { method: "POST", body: { confirm: e.target.confirm.value.trim() } });
      $("#wipeModal").hidden = true;
      toast("Datos de prueba borrados");
      state.page = 1;
      load();
    } catch (er) { $("#wipeError").textContent = er.message; $("#wipeError").hidden = false; }
  });

  // ---------- Revisión ----------
  const modal = $("#modal");
  function open(i) {
    const r = state.rows[i];
    if (!r) return;
    state.idx = i;
    $("#mNum").textContent = `Participación ${r.numero}`;
    $("#mTitle").textContent = `${r.nombre} ${r.apellido}`;
    const src = url("photo", { id: r.id });
    $("#mPhoto").src = src;
    $("#mPhotoLink").href = src;
    $("#mData").innerHTML = [
      ["Estado", `<span class="tag tag--${r.estado}">${LABEL[r.estado]}</span>`],
      ["Cédula", esc(fmtCi(r.ci))],
      ["Teléfono", `<a href="https://wa.me/595${esc(r.telefono.replace(/^0/, ""))}" target="_blank" rel="noopener" style="color:var(--green-2)">${esc(r.telefono)}</a>`],
      ["Email", esc(r.email) || "—"],
      ["Sucursal", esc(r.sucursal)],
      ["Cargada", esc(fmtDate(r.created_at))],
      ...(r.reviewed_by ? [["Revisada", `${esc(fmtDate(r.reviewed_at))} por ${esc(r.reviewed_by)}`]] : []),
    ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    $("#mFlags").innerHTML = flags(r, false);
    $("#mNro").value = r.nro_factura || "";
    $("#mReject").hidden = true;
    $("#mMotivoSel").value = "";
    $("#mMotivo").value = ""; $("#mMotivo").hidden = true;
    $("#mError").hidden = true;
    $("#mPending").hidden = r.estado === "pendiente";
    $("#mPrev").disabled = i <= 0;
    $("#mNext").disabled = i >= state.rows.length - 1;
    modal.hidden = false;
  }

  async function save(estado) {
    const r = state.rows[state.idx];
    if (!r || state.locked) return;
    let motivo = "";
    if (estado === "rechazada") {
      if ($("#mReject").hidden) { $("#mReject").hidden = false; $("#mMotivoSel").focus(); return; }
      motivo = $("#mMotivoSel").value === "otro" ? $("#mMotivo").value.trim() : $("#mMotivoSel").value;
      if (!motivo) { showErr("Elegí o escribí el motivo del rechazo."); return; }
    }
    state.locked = true;
    try {
      await api("review", { method: "POST", body: { id: r.id, estado, motivo, nro_factura: $("#mNro").value.trim() } });
      toast(estado === "aprobada" ? `✓ ${r.numero} aprobada` : estado === "rechazada" ? `✕ ${r.numero} rechazada` : `${r.numero} vuelve a pendiente`);
      const wasIdx = state.idx;
      const autoNext = $("#mAutoNext").checked;
      await load();
      if (!autoNext) { modal.hidden = true; return; }
      // en "Pendientes" la fila revisada desaparece: la siguiente queda en el mismo índice
      const next = state.estado === "pendiente" ? wasIdx : wasIdx + 1;
      if (state.rows[next]) open(next); else modal.hidden = true;
    } catch (e) { showErr(e.message); } finally { state.locked = false; }
  }
  const showErr = (m) => { $("#mError").textContent = m; $("#mError").hidden = false; };

  $("#mApprove").addEventListener("click", () => save("aprobada"));
  $("#mRejectBtn").addEventListener("click", () => save("rechazada"));
  $("#mPending").addEventListener("click", () => save("pendiente"));
  $("#mPrev").addEventListener("click", () => open(state.idx - 1));
  $("#mNext").addEventListener("click", () => open(state.idx + 1));
  $("#mMotivoSel").addEventListener("change", (e) => { $("#mMotivo").hidden = e.target.value !== "otro"; if (e.target.value === "otro") $("#mMotivo").focus(); });

  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") { modal.hidden = true; return; }
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "a") save("aprobada");
    else if (k === "r") save("rechazada");
    else if (e.key === "ArrowRight") open(state.idx + 1);
    else if (e.key === "ArrowLeft") open(state.idx - 1);
  });
})();

/* ---------- Historial de acciones ---------- */
(function () {
  const { api, esc, $, toast, fmtDate } = window.TG;
  const btn = $("#btnLog");
  if (!btn) return;
  const ROL = { ganador: "ganador", suplente1: "suplente", suplente2: "suplente 2" };
  function describe(r) {
    let d = {};
    try { d = JSON.parse(r.detail); } catch { return { label: r.action, cls: "", text: r.detail }; }
    const num = (id) => "#" + String(id).padStart(6, "0");
    switch (r.action) {
      case "review": return { label: d.estado === "aprobada" ? "Aprobó" : d.estado === "rechazada" ? "Rechazó" : "Volvió a pendiente", cls: d.estado, text: `${num(d.id)}${d.motivo ? " — " + d.motivo : ""}${d.nro_factura ? " · factura " + d.nro_factura : ""}` };
      case "test.wipe": return { label: "Borró los datos de prueba", cls: "reset", text: "" };
      case "draw.seal": return { label: "Cerró la lista", cls: "sorteo", text: `${d.total} participaciones · huella ${String(d.hash).slice(0, 16)}…` };
      case "draw.spin": return { label: "Giro", cls: "sorteo", text: `${d.prize} · ${ROL[d.rol] || d.rol} · ${num(d.entry)} (entre ${d.pool})` };
      default: return { label: r.action, cls: "", text: typeof d === "object" ? JSON.stringify(d) : String(d) };
    }
  }
  btn.addEventListener("click", async () => {
    $("#logModal").hidden = false;
    $("#logList").innerHTML = '<p class="muted">Cargando…</p>';
    try {
      const { log } = await api("log");
      $("#logList").innerHTML = log.length ? log.map((r) => {
        const x = r.action === "draw.reset" ? { label: "Reinició el sorteo", cls: "reset", text: "Ensayo: resultados borrados" }
          : r.action === "password" ? { label: "Cambió la contraseña", cls: "", text: "" } : describe(r);
        return `<div class="log__row"><time>${esc(fmtDate(r.at))}</time><span class="log__a log__a--${x.cls}">${esc(x.label)}</span><span class="log__d">${esc(x.text)} · ${esc(r.user)}</span></div>`;
      }).join("") : '<p class="muted">Todavía no hay acciones registradas.</p>';
    } catch (e) { toast(e.message); }
  });
})();
