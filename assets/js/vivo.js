/* Sorteo en vivo — vista pública. Consulta el estado cada pocos segundos y, cuando el organizador
   sortea un premio desde el panel, muestra la ruleta + tómbola y revela el resultado. */
(function () {
  const API = "server/api.php";
  const C = window.SORTEO || {};
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const IMG = {
    "cuadriciclo": "assets/img/premios/cuadriciclo-au200.jpg",
    "moto-gris": "assets/img/premios/moto-cf125-gris.jpg",
    "moto-blanca-1": "assets/img/premios/moto-cf125-blanca.jpg",
    "moto-blanca-2": "assets/img/premios/moto-cf125-blanca.jpg",
    "moto-negra": "assets/img/premios/moto-cf125-negra.jpg",
  };
  const ROL = { ganador: "¡Ganador!", suplente1: "Suplente", suplente2: "2do suplente" };
  const ROL_S = { ganador: "Ganador", suplente1: "Suplente", suplente2: "Suplente 2" };
  const DURATION = 6500, POLL = 2500;

  let known = null;      // claves de resultados ya mostrados
  const pending = new Set(); // resultados que todavía no se revelaron (no se muestran en la lista)
  let queue = [], busy = false, sound = false, rotation = 0, lastReel = [], state = null, fails = 0;

  buildWheel();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) next(); });
  poll();
  setInterval(poll, POLL);

  /* ---------- Estado ---------- */
  async function poll() {
    try {
      const r = await fetch(`${API}?action=draw.public`, { cache: "no-store" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      fails = 0;
      state = d.draw;
      if (d.reel?.length) lastReel = d.reel;
      const all = [];
      state.prizes.forEach((p) => p.results.forEach((x) => all.push({ ...x, prize: p, key: p.id + ":" + x.rol })));
      if (known === null) {
        known = new Set(all.map((x) => x.key));       // al abrir la página no se re-animan los resultados anteriores
      } else {
        all.filter((x) => !known.has(x.key)).forEach((x) => { known.add(x.key); pending.add(x.key); queue.push(x); });
      }
      renderInfo();
      renderPrizes();
      next();
    } catch {
      if (++fails > 2) setLive("Sin conexión… reintentando", "");
    }
  }

  function setLive(text, cls) {
    $("#liveText").textContent = text;
    $("#liveBadge").className = "live" + (cls ? " " + cls : "");
  }

  function renderInfo() {
    const done = state.prizes.every((p) => !p.next);
    if (done && state.sealed) setLive("Sorteo finalizado", "is-done");
    else if (state.sealed) setLive("En vivo", "is-on");
    else setLive("Próximamente", "");

    $("#seal").innerHTML = state.sealed
      ? `<strong>${state.total.toLocaleString("es-PY")}</strong> cupones participan<br>Huella SHA-256: <code title="${esc(state.hash)}">${esc(state.hash.slice(0, 16))}…${esc(state.hash.slice(-8))}</code>`
      : "";
    if (busy) return;
    if (done && state.sealed) {
      $("#status").innerHTML = "<strong>¡Sorteo finalizado!</strong> Felicitaciones a los ganadores.";
      $("#sub").textContent = "Los ganadores serán contactados por teléfono dentro de las 48 horas.";
    } else if (state.sealed) {
      $("#status").innerHTML = "<strong>El sorteo está en curso</strong>";
      $("#sub").textContent = `${state.eligible.toLocaleString("es-PY")} cupones habilitados · la ruleta gira cuando se sortea cada premio`;
    } else {
      countdown();
    }
  }

  function countdown() {
    const day = C.fechaSorteo || "2027-03-31";
    const target = new Date(`${day}T${C.horaSorteo || "00:00"}:00-03:00`).getTime();
    let diff = target - Date.now();
    const fecha = new Date(`${day}T12:00:00-03:00`).toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Asuncion" });
    if (diff <= 0) {
      $("#status").innerHTML = "<strong>¡Hoy es el sorteo!</strong>";
      $("#sub").textContent = "Mantené esta página abierta: la ruleta empieza a girar cuando comience el sorteo.";
      return;
    }
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4);
    $("#status").innerHTML = `El sorteo es el <strong>${esc(fecha)}</strong>${C.lugarSorteo ? `<br><span style="font-size:.85em;color:var(--muted)">${esc(C.lugarSorteo)}</span>` : ""}`;
    $("#sub").innerHTML = `<span class="cd-mini"><span>${d}<small>días</small></span><span>${String(h).padStart(2, "0")}<small>horas</small></span><span>${String(m).padStart(2, "0")}<small>min</small></span></span>`;
  }

  function renderPrizes() {
    $("#prizes").innerHTML = state.prizes.map((p) => ({ ...p, results: p.results.filter((r) => !pending.has(p.id + ":" + r.rol)) })).map((p) => `
      <div class="pz__item">
        <img class="pz__img" src="${IMG[p.id] || ""}" alt="">
        <span><span class="pz__t">${esc(p.titulo)}</span><br><span class="pz__d">${esc(p.detalle)}</span></span>
        <span class="pz__res">${p.results.length
          ? p.results.map((r) => `<div class="${r.rol === "ganador" ? "" : "s"}"><b>${ROL_S[r.rol]}</b><span>${esc(r.nombre)} · ${esc(r.ci_mask)}</span></div>`).join("")
          : `<span class="pz__empty">Por sortear</span>`}</span>
      </div>`).join("");
  }

  /* ---------- Animación ---------- */
  async function next() {
    if (busy || !queue.length) return;
    // pestaña en segundo plano o resultados acumulados: se muestran sin animación (para no quedar atrasados)
    if (document.hidden || queue.length > 2) {
      while (queue.length > (document.hidden ? 0 : 1)) pending.delete(queue.shift().key);
      renderPrizes();
      if (!queue.length) return;
    }
    busy = true;
    const r = queue.shift();
    $("#status").innerHTML = `Sorteando: <strong>${esc(r.prize.titulo)}</strong> · ${esc(r.prize.detalle)}`;
    $("#sub").textContent = r.rol === "ganador" ? "Ganador" : "Suplente";
    const short = shortName(r.nombre);
    const wheel = $("#wheel"), from = rotation;
    rotation += 360 * 8 + Math.floor(Math.random() * 360);
    wheel.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${rotation}deg)` }], { duration: DURATION + 500, easing: "cubic-bezier(.15,.55,.12,1)", fill: "forwards" });
    $("#reel").classList.remove("is-done");
    await runReel(lastReel, short);
    $("#reel").classList.add("is-done");
    await wait(600);
    reveal(r);
    pending.delete(r.key);
    renderPrizes();
    await wait(7000);
    $("#reveal").hidden = true;
    busy = false;
    renderPrizes();
    renderInfo();
    next();
  }

  function runReel(names, winner) {
    const reel = $("#reel"), strip = $("#reelStrip");
    const h = reel.clientHeight;
    strip.style.setProperty("--item-h", h + "px");
    const pool = names.length ? names : ["…"];
    const items = [];
    for (let i = 0; i < 60; i++) items.push(pool[i % pool.length]);
    items.push(winner);
    strip.innerHTML = items.map((n) => `<div class="reel__item">${esc(n)}</div>`).join("");
    const anim = strip.animate([{ transform: "translateY(0)" }, { transform: `translateY(${-(items.length - 1) * h}px)` }],
      { duration: DURATION, easing: "cubic-bezier(.12,.62,.08,1)", fill: "forwards" });
    let last = 0;
    const loop = () => {
      if (anim.playState !== "running") return;
      const idx = Math.floor(-new DOMMatrixReadOnly(getComputedStyle(strip).transform).m42 / h);
      if (idx !== last) { last = idx; tick(1200 + Math.random() * 300); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return anim.finished;
  }

  function reveal(r) {
    $("#rvRol").textContent = ROL[r.rol];
    $("#rvRol").classList.toggle("is-sup", r.rol !== "ganador");
    $("#rvImg").src = IMG[r.prize.id] || "";
    $("#rvPrize").textContent = `${r.prize.titulo} · ${r.prize.detalle}`;
    $("#rvName").textContent = r.nombre;
    $("#rvMeta").innerHTML = `CI <b>${esc(r.ci_mask)}</b> · ${esc(r.sucursal)} · Cupón <b>${esc(r.numero)}</b>`;
    $("#reveal").hidden = false;
    fanfare();
    confetti(r.rol === "ganador" ? 200 : 80);
  }
  $("#rvClose").addEventListener("click", () => ($("#reveal").hidden = true));

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shortName = (full) => { const p = String(full).trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : p[0]; };

  /* ---------- Ruleta (decorativa) ---------- */
  function buildWheel() {
    const n = 24, r = 100, colors = ["#9803FB", "#2a0f45", "#B44DFF", "#1a1422"];
    let s = `<defs><radialGradient id="hub" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#1f1a28"/><stop offset="1" stop-color="#0b0a0d"/></radialGradient></defs><circle r="108" fill="#0b0a0d" stroke="#1EFBAB" stroke-width="2"/>`;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2, am = (a0 + a1) / 2;
      s += `<path d="M0 0 L${(r * Math.cos(a0)).toFixed(2)} ${(r * Math.sin(a0)).toFixed(2)} A${r} ${r} 0 0 1 ${(r * Math.cos(a1)).toFixed(2)} ${(r * Math.sin(a1)).toFixed(2)} Z" fill="${colors[i % 4]}" stroke="#0b0a0d" stroke-width=".8"/>`;
      s += `<path transform="translate(${(82 * Math.cos(am)).toFixed(2)} ${(82 * Math.sin(am)).toFixed(2)}) rotate(${((am * 180) / Math.PI + 90).toFixed(1)})" d="M0 -6 L5 0 L0 7 L-5 0 Z" fill="${i % 2 ? "#1EFBAB" : "#ffffff"}" opacity="${i % 2 ? 0.9 : 0.55}"/>`;
      s += `<circle cx="${(104 * Math.cos(a0)).toFixed(2)}" cy="${(104 * Math.sin(a0)).toFixed(2)}" r="2.2" fill="#BCE036"/>`;
    }
    s += `<circle r="40" fill="url(#hub)" stroke="#9803FB" stroke-width="1.5"/>`;
    $("#wheel").innerHTML = s;
  }

  /* ---------- Sonido (apagado por defecto: el navegador exige un toque) ---------- */
  let actx;
  function tick(freq = 1400, dur = 0.03, vol = 0.07) {
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
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tick(f, 0.35, 0.12), i * 140));
  $("#btnSound").addEventListener("click", (e) => { sound = !sound; e.target.textContent = sound ? "🔊 Sonido activado" : "🔇 Activar sonido"; if (sound) tick(880, 0.08); });

  function confetti(n) {
    const c = $("#confetti"), ctx = c.getContext("2d");
    c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const cols = ["#9803FB", "#B44DFF", "#DE44FA", "#1EFBAB", "#BCE036", "#ffffff"];
    const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.45, vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 18 - 6, s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => { p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (t - t0 < 4500 && !$("#reveal").hidden) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }
})();
