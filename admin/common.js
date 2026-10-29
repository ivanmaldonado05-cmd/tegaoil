/* Funciones compartidas del panel: API con sesión + CSRF, login, utilidades */
window.TG = (function () {
  const API = "../server/api.php";
  let csrf = "";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, el = document) => el.querySelector(s);

  async function api(action, { method = "GET", body, params } = {}) {
    const qs = new URLSearchParams({ action, ...(params || {}) });
    const opt = { method, credentials: "same-origin", headers: {} };
    if (method !== "GET") {
      opt.headers["X-CSRF"] = csrf;
      opt.headers["Content-Type"] = "application/json";
      opt.body = JSON.stringify(body || {});
    }
    const r = await fetch(`${API}?${qs}`, opt);
    const d = await r.json().catch(() => ({ ok: false, error: "Respuesta inválida del servidor." }));
    if (d.csrf) csrf = d.csrf;
    if (r.status === 401 && action !== "login") { location.reload(); throw new Error("Sesión vencida"); }
    if (!d.ok) throw new Error(d.error || "Error");
    return d;
  }

  const url = (action, params) => `${API}?${new URLSearchParams({ action, ...(params || {}) })}`;

  let toastT;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => (t.hidden = true), 2400);
  }

  /** Muestra login o app según la sesión. onReady se llama con el usuario logueado. */
  async function boot(onReady) {
    let s;
    try { s = await api("session"); } catch (e) {
      document.body.innerHTML = `<p style="padding:40px;text-align:center;color:#ff9aa5">No se pudo conectar con el servidor: ${esc(e.message)}</p>`;
      return;
    }
    const login = $("#login"), app = $("#app");
    if (s.auth) { login.hidden = true; app.hidden = false; onReady(s.user); return; }
    login.hidden = false;
    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("#loginError");
      err.hidden = true;
      try {
        await api("login", { method: "POST", body: { user: e.target.user.value.trim(), pass: e.target.pass.value } });
        login.hidden = true; app.hidden = false;
        onReady(e.target.user.value.trim());
      } catch (er) { err.textContent = er.message; err.hidden = false; }
    });
  }

  function bindCommon() {
    $("#btnLogout")?.addEventListener("click", async () => {
      try { await api("logout", { method: "POST" }); } finally { location.reload(); }
    });
    // cerrar modales
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) e.target.closest(".modal").hidden = true;
    });
    const pm = $("#passModal");
    if (pm) {
      $("#btnPass").addEventListener("click", () => { pm.hidden = false; $("#passForm").reset(); $("#passError").hidden = true; });
      $("#passForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await api("password", { method: "POST", body: { current: e.target.current.value, new: e.target.new.value } });
          pm.hidden = true;
          toast("Contraseña actualizada");
        } catch (er) { $("#passError").textContent = er.message; $("#passError").hidden = false; }
      });
    }
  }

  const fmtDate = (s) => {
    if (!s) return "";
    const d = new Date(String(s).replace(" ", "T") + (String(s).length <= 10 ? "T12:00:00" : "") + "-03:00");
    return isNaN(d) ? s : d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Asuncion" });
  };
  const fmtCi = (ci) => String(ci || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return { api, url, esc, $, toast, boot, bindCommon, fmtDate, fmtCi };
})();
