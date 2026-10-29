// Servidor de desarrollo: sirve el sitio y simula server/api.php (en memoria) para probar
// registro, panel y sorteo sin PHP/MySQL. NO se usa en producción.
//   node _dev/mock-server.mjs [puerto] [--seed N]
// Panel de prueba: usuario "admin", contraseña "admin12345".
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2]) || 5088;
const seedIdx = process.argv.indexOf("--seed");
const SEED = seedIdx > 0 ? Number(process.argv[seedIdx + 1]) || 0 : 0;
const DATA = path.join(ROOT, "_dev", "data");
fs.mkdirSync(DATA, { recursive: true });

const PRIZES = [
  { id: "cuadriciclo", titulo: "Cuadriciclo AU200", detalle: "Color blanco / naranja · Año 2026" },
  { id: "moto-gris", titulo: "Moto CF 125", detalle: "Color gris · Año 2025" },
  { id: "moto-blanca-1", titulo: "Moto CF 125", detalle: "Color blanco · Año 2025" },
  { id: "moto-blanca-2", titulo: "Moto CF 125", detalle: "Color blanco · Año 2025" },
  { id: "moto-negra", titulo: "Moto CF 125", detalle: "Color negro · Año 2025" },
];
const ROLES = ["ganador", "suplente1"];
const SUCURSALES = [
  "San Lorenzo — Avda. Manuel Ortiz Guerrero esq. Puerto Rosario",
  "Barcequillo — Avda. Pratt Gill esq. Capitolio",
  "Tramo Luque – San Bernardino — Calle Vergel Luqueño",
  "Ypacaraí — Iturbe esq. Paraguay",
  "Coronel Oviedo — Dr. Blas Garay esq. Las Residentas",
];

const db = { entries: [], results: [], draw: null, log: [], seq: 0 };
const sessions = new Map(); // sid -> {csrf, auth, user}

const pyNow = () => new Date(Date.now() - 3 * 3600e3).toISOString().replace("T", " ").slice(0, 19);
const pyToday = () => pyNow().slice(0, 10);
const numero = (id) => "#" + String(id).padStart(6, "0");
const maskCi = (ci) => { const d = String(ci); if (d.length <= 3) return "***"; const rev = ("*".repeat(d.length - 3) + d.slice(-3)).split("").reverse().join(""); return rev.match(/.{1,3}/g).join(".").split("").reverse().join(""); };
const shortName = (n, a) => `${n.split(" ")[0]} ${a.trim()[0] ? a.trim()[0].toUpperCase() + "." : ""}`.trim();

if (SEED) {
  const N = ["Juan", "María", "Carlos", "Ana", "Luis", "Rosa", "Pedro", "Lucía", "Diego", "Sofía", "Jorge", "Laura", "Marcos", "Elena", "Hugo", "Paula", "Andrés", "Noelia", "Óscar", "Gabriela", "Ramón", "Fátima", "Nicolás", "Belén", "Rodrigo", "Liz", "Derlis", "Mirna", "Arnaldo", "Celeste"];
  const A = ["Benítez", "González", "Ramírez", "Villalba", "Giménez", "Martínez", "Duarte", "Ortiz", "Acosta", "Cáceres", "Rojas", "Báez", "Fernández", "Ayala", "Núñez", "Insfrán", "Sanabria", "Cabrera", "Riveros", "Galeano"];
  for (let i = 0; i < SEED; i++) {
    const person = i % Math.ceil(SEED / 2.5);
    const ci = String(1800000 + person * 7919);
    db.entries.push({
      id: ++db.seq, nombre: N[person % N.length], apellido: A[(person * 7) % A.length], ci, telefono: "0981" + String(100000 + person).slice(-6),
      email: "", sucursal: SUCURSALES[i % 5], fecha: `2026-11-${String(10 + (i % 18)).padStart(2, "0")}`, foto: "", foto_hash: crypto.randomBytes(8).toString("hex"),
      estado: i % 9 === 0 ? "pendiente" : i % 13 === 0 ? "rechazada" : "aprobada", motivo: i % 13 === 0 && i % 9 ? "Foto ilegible" : "", nro_factura: "",
      created_at: `2026-11-${String(10 + (i % 18)).padStart(2, "0")} 1${i % 10}:2${i % 6}:00`, reviewed_at: null, reviewed_by: "",
    });
  }
}

/* ---------- utilidades HTTP ---------- */
function send(res, code, data, headers = {}) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(data));
}
const readBody = (req) => new Promise((ok) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => ok(Buffer.concat(c))); });

function parseMultipart(buf, ctype) {
  const boundary = "--" + /boundary=(?:"([^"]+)"|([^;]+))/.exec(ctype).slice(1).find(Boolean);
  const fields = {}, files = {};
  let pos = buf.indexOf(boundary) + boundary.length + 2;
  while (pos > boundary.length) {
    const next = buf.indexOf(boundary, pos);
    if (next < 0) break;
    const part = buf.subarray(pos, next - 2);
    const sep = part.indexOf("\r\n\r\n");
    const head = part.subarray(0, sep).toString();
    const body = part.subarray(sep + 4);
    const name = /name="([^"]*)"/.exec(head)?.[1];
    const filename = /filename="([^"]*)"/.exec(head)?.[1];
    if (filename !== undefined) files[name] = { filename, data: body, type: /Content-Type: (.+)/i.exec(head)?.[1]?.trim() };
    else if (name) fields[name] = body.toString();
    pos = next + boundary.length + 2;
  }
  return { fields, files };
}

function session(req, res) {
  let sid = /tgadmin=([a-f0-9]+)/.exec(req.headers.cookie || "")?.[1];
  if (!sid || !sessions.has(sid)) {
    sid = crypto.randomBytes(16).toString("hex");
    sessions.set(sid, { csrf: crypto.randomBytes(16).toString("hex"), auth: false, user: "" });
    res.setHeader("Set-Cookie", `tgadmin=${sid}; Path=/; HttpOnly; SameSite=Strict`);
  }
  return sessions.get(sid);
}

function drawState() {
  const drawn = new Set(db.results.map((r) => r.ci));
  const prizes = PRIZES.map((p) => {
    const res = db.results.filter((r) => r.prize_id === p.id).map((r) => {
      const e = db.entries.find((x) => x.id === r.entry_id);
      return { rol: r.rol, numero: numero(e.id), nombre: `${e.nombre} ${e.apellido}`, ci_mask: maskCi(e.ci), sucursal: e.sucursal, pool: r.pool, at: r.created_at };
    });
    return { ...p, results: res, next: ROLES[res.length] || null };
  });
  const snap = db.draw?.snapshot || [];
  return {
    sealed: !!db.draw, sealed_at: db.draw?.sealed_at || null, sealed_by: db.draw?.sealed_by || "", total: db.draw?.total || 0, hash: db.draw?.hash || "",
    eligible: db.draw ? snap.filter((r) => !drawn.has(r[1])).length : 0,
    pending: db.entries.filter((e) => e.estado === "pendiente").length, approved: db.entries.filter((e) => e.estado === "aprobada").length,
    prizes,
  };
}
const registro = () => ({ open: !db.draw, desde: "2026-11-10T00:00:00-03:00", hasta: "2027-03-31T23:59:59-03:00", state: db.draw ? "cerrado" : "abierto" });
const addLog = (user, action, detail) => db.log.unshift({ at: pyNow(), user, action, detail: typeof detail === "string" ? detail : JSON.stringify(detail) });
const csv = (rows) => "﻿" + rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");

/* ---------- API ---------- */
async function apiHandler(req, res, url) {
  const action = url.searchParams.get("action") || "";
  const s = session(req, res);
  const method = req.method;
  const fail = (code, error, extra = {}) => send(res, code, { ok: false, error, ...extra });
  const json = async () => { try { return JSON.parse((await readBody(req)).toString() || "{}"); } catch { return {}; } };

  if (action === "info") return send(res, 200, { ok: true, registro: registro(), sucursales: SUCURSALES });

  if (action === "register" && method === "POST") {
    if (!registro().open) return fail(403, "El registro ya está cerrado.");
    const { fields: f, files } = parseMultipart(await readBody(req), req.headers["content-type"] || "");
    if (f.website) return fail(400, "No se pudo registrar.");
    if (Date.now() / 1000 - Number(f.t || 0) < 4) return fail(400, "Revisá los datos y volvé a intentar.");
    const ci = (f.ci || "").replace(/\D/g, ""), tel = (f.telefono || "").replace(/\D/g, "");
    if (!f.nombre?.trim()) return fail(422, "Escribí tu nombre.");
    if (!f.apellido?.trim()) return fail(422, "Escribí tu apellido.");
    if (ci.length < 5 || ci.length > 9) return fail(422, "Número de cédula inválido.");
    if (tel.length < 9) return fail(422, "Número de teléfono inválido (ej. 0981 123 456).");
    if (!SUCURSALES.includes(f.sucursal)) return fail(422, "Elegí la sucursal donde compraste.");
    if (!f.mayor || !f.bases || !f.datos) return fail(422, "Tenés que aceptar las condiciones.");
    if (!files.foto?.data?.length) return fail(422, "Subí la foto de la factura.");
    if (db.entries.some((e) => e.ci === ci && e.fecha === pyToday())) return fail(409, "Ya registraste una factura hoy con esta cédula. Podés cargar la siguiente mañana.", { code: "daily" });
    const name = crypto.randomBytes(8).toString("hex") + ".jpg";
    fs.writeFileSync(path.join(DATA, name), files.foto.data);
    const e = { id: ++db.seq, nombre: f.nombre.trim(), apellido: f.apellido.trim(), ci, telefono: tel, email: (f.email || "").trim(), sucursal: f.sucursal, fecha: pyToday(),
      foto: name, foto_hash: crypto.createHash("sha256").update(files.foto.data).digest("hex"), estado: "pendiente", motivo: "", nro_factura: "", created_at: pyNow(), reviewed_at: null, reviewed_by: "" };
    db.entries.push(e);
    return send(res, 200, { ok: true, numero: numero(e.id), nombre: e.nombre });
  }

  if (action === "check" && method === "POST") {
    const b = await json();
    const ci = String(b.ci || "").replace(/\D/g, ""), tel = String(b.telefono || "").replace(/\D/g, "");
    const rows = db.entries.filter((e) => e.ci === ci && e.telefono === tel).reverse()
      .map((e) => ({ numero: numero(e.id), fecha: e.fecha, sucursal: e.sucursal, estado: e.estado, motivo: e.estado === "rechazada" ? e.motivo : "" }));
    return send(res, 200, { ok: true, entries: rows });
  }

  if (action === "draw.public") {
    const st = drawState();
    const prizes = st.prizes.map((p) => ({ id: p.id, titulo: p.titulo, detalle: p.detalle, next: p.next, results: p.results.map((r) => ({ ...r, sucursal: r.sucursal.split(" — ")[0] })) }));
    const snap = db.draw?.snapshot || [];
    const reel = snap.length ? Array.from({ length: Math.min(30, snap.length) }, () => { const id = snap[crypto.randomInt(snap.length)][0]; const e = db.entries.find((x) => x.id === id); return shortName(e.nombre, e.apellido); }) : [];
    return send(res, 200, { ok: true, draw: { sealed: st.sealed, sealed_at: st.sealed_at, total: st.total, hash: st.hash, eligible: st.eligible, count: db.results.length, prizes }, reel });
  }

  if (action === "session") return send(res, 200, { ok: true, auth: s.auth, csrf: s.csrf, user: s.user || null });

  const csrfOk = () => req.headers["x-csrf"] === s.csrf;
  if (action === "login" && method === "POST") {
    if (!csrfOk()) return fail(419, "Token inválido, recargá la página.");
    const b = await json();
    if (b.user !== "admin" || b.pass !== "admin12345") return fail(401, "Usuario o contraseña incorrectos.");
    s.auth = true; s.user = b.user; s.csrf = crypto.randomBytes(16).toString("hex");
    return send(res, 200, { ok: true, csrf: s.csrf, user: s.user });
  }

  if (!s.auth) return fail(401, "No autorizado");

  if (action === "entries") {
    const estado = url.searchParams.get("estado") || "", q = (url.searchParams.get("q") || "").toLowerCase(), page = Number(url.searchParams.get("page") || 1);
    let list = db.entries.filter((e) => !estado || e.estado === estado);
    if (q) {
      const d = q.replace(/\D/g, ""), num = q.replace("#", "").replace(/^0+/, "");
      list = list.filter((e) => `${e.nombre} ${e.apellido}`.toLowerCase().includes(q) || (d && (e.ci === d || e.telefono.includes(d))) || e.nro_factura === q || String(e.id) === num);
    }
    list = list.slice().reverse();
    const per = 50;
    const rows = list.slice((page - 1) * per, page * per).map((e) => ({
      ...e, numero: numero(e.id), foto: undefined, foto_hash: undefined,
      dup_foto: db.entries.filter((x) => x.foto_hash === e.foto_hash && x.id !== e.id).length,
      dup_nro: e.nro_factura ? db.entries.filter((x) => x.nro_factura === e.nro_factura && x.id !== e.id).length : 0,
      cargas_ci: db.entries.filter((x) => x.ci === e.ci).length,
    }));
    const c = (k) => db.entries.filter((e) => e.estado === k).length;
    return send(res, 200, { ok: true, entries: rows, total: list.length, page, per,
      counts: { pendiente: c("pendiente"), aprobada: c("aprobada"), rechazada: c("rechazada"), personas: new Set(db.entries.filter((e) => e.estado === "aprobada").map((e) => e.ci)).size },
      registro: registro() });
  }

  if (action === "photo") {
    const e = db.entries.find((x) => x.id === Number(url.searchParams.get("id")));
    const file = e?.foto ? path.join(DATA, e.foto) : path.join(ROOT, "assets/img/premios/moto-cf125-gris.jpg");
    res.writeHead(200, { "Content-Type": "image/jpeg" });
    return fs.createReadStream(file).pipe(res);
  }

  if (action === "export") {
    const estado = url.searchParams.get("estado") || "";
    const rows = db.entries.filter((e) => !estado || e.estado === estado).map((e) => [numero(e.id), e.created_at, e.nombre, e.apellido, e.ci, e.telefono, e.email, e.sucursal, e.estado, e.motivo, e.nro_factura]);
    res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="participaciones-${estado || "todas"}.csv"` });
    return res.end(csv([["N° participación", "Fecha de carga", "Nombre", "Apellido", "Cédula", "Teléfono", "Email", "Sucursal", "Estado", "Motivo", "N° factura"], ...rows]));
  }

  if (action === "log") return send(res, 200, { ok: true, log: db.log.slice(0, 300) });

  if (action === "draw.state") return send(res, 200, { ok: true, draw: drawState() });

  if (action === "draw.list") {
    if (!db.draw) return fail(409, "La lista todavía no está cerrada.");
    res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="lista-cerrada-sorteo.csv"' });
    return res.end(csv([[`Lista cerrada el ${db.draw.sealed_at} — ${db.draw.total} participaciones — huella SHA-256: ${db.draw.hash}`], ["N° participación", "Nombre", "Apellido", "Cédula", "Sucursal"],
      ...db.draw.snapshot.map(([id, ci]) => { const e = db.entries.find((x) => x.id === id); return [numero(id), e.nombre, e.apellido, ci, e.sucursal]; })]));
  }

  if (action === "draw.acta") {
    return send(res, 200, { ok: true, acta: {
      sealed_at: db.draw?.sealed_at || null, sealed_by: db.draw?.sealed_by || "", total: db.draw?.total || 0, hash: db.draw?.hash || "", prizes: PRIZES, generated_at: pyNow(),
      results: db.results.map((r) => { const e = db.entries.find((x) => x.id === r.entry_id); const p = PRIZES.find((x) => x.id === r.prize_id);
        return { prize_id: r.prize_id, premio: p.titulo, detalle: p.detalle, rol: r.rol, numero: numero(e.id), nombre: `${e.nombre} ${e.apellido}`, ci: e.ci, telefono: e.telefono, sucursal: e.sucursal, pool: r.pool, at: r.created_at, by: r.created_by }; }),
    } });
  }

  if (method !== "POST") return fail(405, "Método no permitido");
  if (!csrfOk()) return fail(419, "Token inválido, recargá la página.");
  const b = await json();

  switch (action) {
    case "logout": s.auth = false; return send(res, 200, { ok: true });
    case "review": {
      if (db.draw) return fail(422, "La lista del sorteo ya está cerrada: no se pueden cambiar participaciones.");
      const e = db.entries.find((x) => x.id === Number(b.id));
      if (!e) return fail(422, "No encontrada");
      if (b.estado === "rechazada" && !b.motivo) return fail(422, "Indicá el motivo del rechazo.");
      Object.assign(e, { estado: b.estado, motivo: b.estado === "rechazada" ? b.motivo : "", nro_factura: b.nro_factura || "", reviewed_at: pyNow(), reviewed_by: s.user });
      addLog(s.user, "review", { id: e.id, estado: b.estado, motivo: e.motivo, nro_factura: e.nro_factura });
      return send(res, 200, { ok: true });
    }
    case "draw.seal": {
      if (db.draw) return fail(422, "La lista ya está cerrada.");
      const snap = db.entries.filter((e) => e.estado === "aprobada").sort((a, b) => a.id - b.id).map((e) => [e.id, e.ci]);
      if (!snap.length) return fail(422, "No hay participaciones aprobadas.");
      const hash = crypto.createHash("sha256").update(snap.map((r) => r[0] + "|" + r[1]).join("\n")).digest("hex");
      db.draw = { sealed_at: pyNow(), sealed_by: s.user, total: snap.length, hash, snapshot: snap };
      addLog(s.user, "draw.seal", { total: snap.length, hash });
      return send(res, 200, { ok: true, draw: drawState() });
    }
    case "draw.spin": {
      const prize = PRIZES.find((p) => p.id === b.prize_id);
      if (!prize) return fail(422, "Premio inválido.");
      if (!db.draw) return fail(422, "Primero cerrá la lista de participantes.");
      const rol = ROLES[db.results.filter((r) => r.prize_id === prize.id).length];
      if (!rol) return fail(422, "Este premio ya tiene ganador y suplente.");
      const drawn = new Set(db.results.map((r) => r.ci));
      const pool = db.draw.snapshot.filter((r) => !drawn.has(r[1]));
      if (!pool.length) return fail(422, "No quedan participantes habilitados.");
      const pick = pool[crypto.randomInt(pool.length)];
      db.results.push({ prize_id: prize.id, rol, entry_id: pick[0], ci: pick[1], pool: pool.length, created_at: pyNow(), created_by: s.user });
      const w = db.entries.find((x) => x.id === pick[0]);
      addLog(s.user, "draw.spin", { prize: prize.id, rol, entry: pick[0], pool: pool.length });
      const reel = Array.from({ length: Math.min(40, pool.length) }, () => { const id = pool[crypto.randomInt(pool.length)][0]; const e = db.entries.find((x) => x.id === id); return shortName(e.nombre, e.apellido); });
      return send(res, 200, { ok: true, result: { prize, rol, numero: numero(w.id), nombre: `${w.nombre} ${w.apellido}`, short: shortName(w.nombre, w.apellido), ci_mask: maskCi(w.ci), sucursal: w.sucursal, pool: pool.length }, reel, draw: drawState() });
    }
    case "draw.reset":
      if (b.confirm !== "REINICIAR") return fail(422, "Escribí REINICIAR para confirmar.");
      db.results = []; db.draw = null;
      addLog(s.user, "draw.reset", "Sorteo reiniciado");
      return send(res, 200, { ok: true, draw: drawState() });
    case "password": return fail(422, "En el servidor de prueba la contraseña es fija (admin12345).");
  }
  return fail(404, "Acción desconocida");
}

/* ---------- Archivos estáticos ---------- */
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json" };
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.endsWith("/server/api.php")) return await apiHandler(req, res, url);
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || /[\\/](server|_dev)[\\/]/.test(file.slice(ROOT.length)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    send(res, 500, { ok: false, error: "Error del servidor de prueba: " + e.message });
  }
}).listen(PORT, () => console.log(`Tega Oil (mock) en http://localhost:${PORT}  ·  panel: /admin/  (admin / admin12345)${SEED ? `  ·  ${SEED} participaciones de ejemplo` : ""}`));
