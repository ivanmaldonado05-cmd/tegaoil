/* Sorteo en vivo — ruleta + tómbola de nombres.
   El ganador lo elige el servidor (azar criptográfico) apenas se toca GIRAR; la animación solo lo muestra. */
(function () {
  const { api, esc, $, toast, fmtDate } = window.TG;
  const IMG = {
    "cuadriciclo": "../assets/img/premios/cuadriciclo-au200.jpg",
    "moto-gris": "../assets/img/premios/moto-cf125-gris.jpg",
    "moto-blanca-1": "../assets/img/premios/moto-cf125-blanca.jpg",
    "moto-blanca-2": "../assets/img/premios/moto-cf125-blanca.jpg",
    "moto-negra": "../assets/img/premios/moto-cf125-negra.jpg",
  };
  const ROL = { ganador: "¡Ganador!", suplente1: "Suplente", suplente2: "2do suplente" };
  const ROL_BTN = { ganador: "Sortear GANADOR", suplente1: "Sortear SUPLENTE", suplente2: "Sortear 2do SUPLENTE" };
  const DURATION = 7500;

  let draw = null, selected = null, spinning = false, sound = true, rotation = 0;

  buildWheel();
  // el panel (admin.js) llama a TG_SORTEO.show() al abrir la pestaña "Sorteo"
  window.TG_SORTEO = { show: refresh };
  const visible = () => !$("#viewSorteo").hidden;

  /* ---------- Estado ---------- */
  async function refresh() {
    try {
      draw = (await api("draw.state")).draw;
    } catch (e) { return toast(e.message); }
    renderSeal();
    renderPrizes();
    renderSpin();
  }

  function renderSeal() {
    $("#sealBox").hidden = draw.sealed;
    $("#sbApproved").textContent = draw.approved.toLocaleString("es-PY");
    $("#sbPending").textContent = draw.pending.toLocaleString("es-PY");
    $("#btnSeal").disabled = draw.approved === 0;
    $("#seal").innerHTML = draw.sealed
      ? `<strong>${draw.total.toLocaleString("es-PY")}</strong> cupones · lista cerrada el ${esc(fmtDate(draw.sealed_at))}<br>Huella SHA-256: <code title="${esc(draw.hash)}">${esc(draw.hash.slice(0, 16))}…${esc(draw.hash.slice(-8))}</code>`
      : "";
  }

  function renderPrizes() {
    $("#prizes").innerHTML = draw.prizes.map((p) => {
      const done = !p.next, noSuc = !p.sucursal;
      const suc = noSuc ? `<span class="pz__suc pz__suc--none">Sin sucursal asignada</span>`
        : `<span class="pz__suc">📍 ${esc(p.sucursal.split(" — ")[0])} · ${p.eligible.toLocaleString("es-PY")} cupones</span>`;
      return `<button class="pz__item ${selected === p.id ? "is-active" : ""}" data-id="${p.id}" ${done || noSuc ? "disabled" : ""}>
        <img class="pz__img" src="${IMG[p.id] || ""}" alt="">
        <span><span class="pz__t">${esc(p.titulo)}</span><br><span class="pz__d">${esc(p.detalle)}</span><br>${suc}${done ? `<br><span class="pz__done">✓ Sorteado</span>` : ""}</span>
        <span class="pz__res">${p.results.map((r) => `<div class="${r.rol === "ganador" ? "" : "s"}"><b>${r.rol === "ganador" ? "Ganador" : r.rol === "suplente1" ? "Suplente" : "Suplente 2"}</b><span>${esc(r.nombre)} · ${esc(r.ci_mask)}</span></div>`).join("")}</span>
      </button>`;
    }).join("");
  }

  function renderSpin() {
    const p = draw.prizes.find((x) => x.id === selected);
    if (p && !p.next) selected = null;
    const cur = draw.prizes.find((x) => x.id === selected);
    $("#spinPrize").innerHTML = cur ? `<strong>${esc(cur.titulo)}</strong> · ${esc(cur.detalle)}<br><span class="spin__suc">Sucursal ${esc(cur.sucursal.split(" — ")[0])}</span>` : (draw.prizes.every((x) => !x.next) ? "¡Sorteo finalizado!" : "Elegí un premio");
    const btn = $("#btnSpin");
    btn.disabled = !cur || !draw.sealed || spinning || !cur.eligible;
    btn.textContent = cur ? ROL_BTN[cur.next] : "GIRAR";
    $("#spinPool").textContent = !draw.sealed ? "" : cur
      ? (cur.eligible ? `${cur.eligible.toLocaleString("es-PY")} cupones habilitados de esta sucursal` : "No quedan cupones habilitados en esta sucursal")
      : `${draw.eligible.toLocaleString("es-PY")} cupones habilitados en total`;
  }

  $("#prizes").addEventListener("click", (e) => {
    const b = e.target.closest(".pz__item");
    if (!b || b.disabled || spinning) return;
    selected = b.dataset.id;
    renderPrizes();
    renderSpin();
  });

  /* ---------- Cierre de lista ---------- */
  $("#btnSeal").addEventListener("click", async () => {
    $("#sealError").hidden = true;
    if (!confirm(`¿Cerrar la lista con ${draw.approved} participaciones aprobadas? Después no se puede modificar.`)) return;
    try {
      draw = (await api("draw.seal", { method: "POST" })).draw;
      renderSeal(); renderPrizes(); renderSpin();
      toast("Lista cerrada");
    } catch (e) { $("#sealError").textContent = e.message; $("#sealError").hidden = false; }
  });

  /* ---------- Ruleta (decorativa) ---------- */
  function buildWheel() {
    const n = 24, r = 100, svg = $("#wheel");
    const colors = ["#9803FB", "#2a0f45", "#B44DFF", "#1a1422"];
    let s = `<defs><radialGradient id="hub" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#1f1a28"/><stop offset="1" stop-color="#0b0a0d"/></radialGradient></defs>`;
    s += `<circle r="108" fill="#0b0a0d" stroke="#1EFBAB" stroke-width="2"/>`;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const x0 = r * Math.cos(a0), y0 = r * Math.sin(a0), x1 = r * Math.cos(a1), y1 = r * Math.sin(a1);
      s += `<path d="M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${colors[i % 4]}" stroke="#0b0a0d" stroke-width=".8"/>`;
      const am = (a0 + a1) / 2;
      // diamante (iso de Tega) en cada segmento
      const cx = 82 * Math.cos(am), cy = 82 * Math.sin(am), deg = (am * 180) / Math.PI + 90;
      s += `<path transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${deg.toFixed(1)})" d="M0 -6 L5 0 L0 7 L-5 0 Z" fill="${i % 2 ? "#1EFBAB" : "#ffffff"}" opacity="${i % 2 ? .9 : .55}"/>`;
    }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI - Math.PI / 2;
      s += `<circle cx="${(104 * Math.cos(a)).toFixed(2)}" cy="${(104 * Math.sin(a)).toFixed(2)}" r="2.2" fill="#BCE036"/>`;
    }
    s += `<circle r="40" fill="url(#hub)" stroke="#9803FB" stroke-width="1.5"/>`;
    svg.innerHTML = s;
  }

  /* ---------- Sonido ---------- */
  let actx;
  function tick(freq = 1400, dur = 0.03, vol = 0.08) {
    if (!sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "square"; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g).connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch {}
  }
  function fanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tick(f, 0.35, 0.12), i * 140)); }
  $("#btnSound").addEventListener("click", (e) => { sound = !sound; e.target.textContent = sound ? "🔊 Sonido" : "🔇 Sin sonido"; });

  /* ---------- Giro ---------- */
  $("#btnSpin").addEventListener("click", spin);
  document.addEventListener("keydown", (e) => {
    if (!visible()) return;
    if (e.code === "Space" && !$("#btnSpin").disabled && $("#reveal").hidden && document.activeElement.tagName !== "INPUT") { e.preventDefault(); spin(); }
    if (e.key.toLowerCase() === "p" && document.activeElement.tagName !== "INPUT") document.body.classList.toggle("is-presenting");
  });

  async function spin() {
    if (spinning || !selected) return;
    spinning = true;
    renderSpin();
    $("#reel").classList.remove("is-done");

    // la ruleta arranca a girar mientras el servidor elige
    const wheel = $("#wheel");
    const extra = 360 * 9 + Math.floor(Math.random() * 360);
    const from = rotation;
    rotation += extra;
    const wAnim = wheel.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${rotation}deg)` }],
      { duration: DURATION + 600, easing: "cubic-bezier(.15,.55,.12,1)", fill: "forwards" });

    let res;
    try {
      res = await api("draw.spin", { method: "POST", body: { prize_id: selected } });
    } catch (e) {
      wAnim.cancel();
      wheel.style.transform = `rotate(${from}deg)`;
      rotation = from;
      spinning = false;
      toast(e.message);
      return refresh();
    }

    await runReel(res.reel, res.result.short);
    $("#reel").classList.add("is-done");
    await new Promise((r) => setTimeout(r, 700));
    draw = res.draw;
    showReveal(res.result);
    spinning = false;
    renderSeal(); renderPrizes(); renderSpin();
  }

  function runReel(names, winner) {
    const reel = $("#reel"), strip = $("#reelStrip");
    const h = reel.clientHeight;
    strip.style.setProperty("--item-h", h + "px");
    // ~70 nombres pasando y el ganador al final
    const pool = names.length ? names : ["…"];
    const items = [];
    for (let i = 0; i < 70; i++) items.push(pool[i % pool.length]);
    items.push(winner);
    strip.innerHTML = items.map((n) => `<div class="reel__item">${esc(n)}</div>`).join("");
    const end = -(items.length - 1) * h;
    const anim = strip.animate([{ transform: "translateY(0)" }, { transform: `translateY(${end}px)` }],
      { duration: DURATION, easing: "cubic-bezier(.12,.62,.08,1)", fill: "forwards" });

    // tic en cada nombre que pasa
    let last = 0;
    const loop = () => {
      if (anim.playState !== "running") return;
      const y = new DOMMatrixReadOnly(getComputedStyle(strip).transform).m42;
      const idx = Math.floor(-y / h);
      if (idx !== last) { last = idx; tick(1200 + Math.random() * 300); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return anim.finished;
  }

  /* ---------- Revelación ---------- */
  function showReveal(r) {
    const sup = r.rol !== "ganador";
    $("#rvRol").textContent = ROL[r.rol];
    $("#rvRol").classList.toggle("is-sup", sup);
    $("#rvImg").src = IMG[r.prize.id] || "";
    $("#rvPrize").textContent = `${r.prize.titulo} · ${r.prize.detalle}`;
    $("#rvName").textContent = r.nombre;
    $("#rvMeta").innerHTML = `CI <b>${esc(r.ci_mask)}</b> · ${esc(r.sucursal.split(" — ")[0])} · Cupón <b>${esc(r.numero)}</b>`;
    $("#reveal").hidden = false;
    fanfare();
    confetti(sup ? 90 : 220);
  }
  $("#rvClose").addEventListener("click", () => { $("#reveal").hidden = true; });

  function confetti(n) {
    const c = $("#confetti"), ctx = c.getContext("2d");
    c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const cols = ["#9803FB", "#B44DFF", "#DE44FA", "#1EFBAB", "#BCE036", "#ffffff"];
    const ps = Array.from({ length: n }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .45,
      vx: (Math.random() - .5) * 18, vy: -Math.random() * 18 - 6,
      s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[(Math.random() * cols.length) | 0],
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => {
        p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (t - t0 < 4500 && !$("#reveal").hidden) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  /* ---------- Controles ---------- */
  $("#btnFull").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  document.addEventListener("fullscreenchange", () => document.body.classList.toggle("is-presenting", !!document.fullscreenElement));

  $("#btnReset").addEventListener("click", () => { $("#resetModal").hidden = false; $("#resetError").hidden = true; $("#resetForm").reset(); });
  $("#resetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      draw = (await api("draw.reset", { method: "POST", body: { confirm: e.target.confirm.value.trim() } })).draw;
      $("#resetModal").hidden = true;
      selected = null;
      renderSeal(); renderPrizes(); renderSpin();
      toast("Sorteo reiniciado");
    } catch (er) { $("#resetError").textContent = er.message; $("#resetError").hidden = false; }
  });
})();
