/* cazagangas - cosecha-auto.js  COSECHA HUMANA + LOGIN + ANTI-DETECCION
   v1.8.0 - OVERHAUL de UI "cabina oscura" (2026-06-22). Cambia SOLO el render:
     - Panel oscuro tipo instrumento: acento neon, metricas en monoespaciado,
       CTA con glow, estado en vivo, explicador "Como funciona?" y tooltips (i).
     - Stats HONESTAS (sin inventar): hallazgos = entradas locales reales,
       en Notion = filas sincronizadas reales, sesion = dias restantes de la cookie.
     - Toda la logica de cosecha/login/anti-deteccion intacta; IDs cableados 1:1.
     0) Verifica sesion de Facebook (chrome.cookies). Si no hay, abre login y BLOQUEA.
     1) Para cada termino abre la busqueda de Marketplace EN PRIMER PLANO (una sola
        pestana que navega) y deja que humano.js coseche HUMANIZADO y GATEADO POR FOCO
        (si pierdes el foco, PAUSA). Throttle aleatorio entre terminos. Orden barajado.
     2) Puntuar (CG_SCORING) -> 3) Crear filas (notion.js #cg-n-sync) ->
     4) Enriquecer (CZG_sonda + CZG_notion.sincronizarComprables).
   Indicadores a nivel de Chrome: badge de la extension (play/pausa) + notificaciones. */
(function () {
  "use strict";
  var VER = "2.0.0";
  var CFG = "cazagangas.config", HAL = "cazagangas.hallazgos", SYN = "cazagangas.synced", UI = "cazagangas.ui", RUN = "cazagangas.runControl";
  var FB = "https://www.facebook.com";
  // Semillas orientadas a REVENTA de bajo capital: regalados / urgentes / liquidos.
  var SEMILLAS = ['webcam logitech c920','webcam logitech c270','camara web','microfono usb','headset usb','audifonos con microfono','monitor 22','monitor 24','teclado mecanico','mouse logitech','router wifi','repetidor wifi','ssd 240gb','ssd 480gb','memoria ram ddr4','taladro','rotomartillo','herramienta','multimetro','mochila','maleta','botas impermeables','tenis nike','bicicleta','lote ropa','remate','urge vender','mudanza'];
  var TOPE_DEF = 28;

  function $(s) { return document.querySelector(s); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function gLocal(k) { return new Promise(function (r) { try { chrome.storage.local.get(k, function (o) { r(o || {}); }); } catch (e) { r({}); } }); }
  function sLocal(o) { return new Promise(function (r) { try { chrome.storage.local.set(o, function () { r(); }); } catch (e) { r(); } }); }
  function setRun(patch) { var o = {}; o[RUN] = Object.assign({ updatedAt: Date.now(), version: VER }, patch || {}); return sLocal(o); }
  function nKeys(o) { return o ? Object.keys(o).length : 0; }
  function log() { try { console.log.apply(console, ["[CZG cosecha-auto]"].concat([].slice.call(arguments))); } catch (e) {} }

  // ---- badge + notificaciones (indicador a nivel de Chrome) ----
  function badge(text, color) {
    try { if (chrome.action) { chrome.action.setBadgeText({ text: text || "" }); if (color && chrome.action.setBadgeBackgroundColor) chrome.action.setBadgeBackgroundColor({ color: color }); } } catch (e) {}
  }
  function notif(titulo, msg) {
    try {
      if (chrome.notifications && chrome.notifications.create) {
        chrome.notifications.create("czg-" + Date.now(), { type: "basic", iconUrl: chrome.runtime.getURL("icon128.png"), title: titulo, message: msg }, function () { if (chrome.runtime && chrome.runtime.lastError) { /* sin icono: ignorar */ } });
      }
    } catch (e) {}
  }
  var ultimoEstado = null;
  var bloqueado = false, motivoBloqueo = null;
  try {
    chrome.runtime.onMessage.addListener(function (msg) {
      if (msg && msg.tipo === "czg-estado") {
        if (msg.estado === "pausado") { badge("\u275A\u275A", "#d98a00"); if (ultimoEstado !== "pausado") notif("Cazagangas en PAUSA", "La ventana perdio foco. Vuelve a la pestana de Facebook para continuar."); }
        else if (msg.estado === "corriendo") { badge("\u25B6", "#15803d"); }
        ultimoEstado = msg.estado;
      } else if (msg && msg.tipo === "czg-bloqueo") {
        // Centinela anti-bloqueo: Facebook pidio verificacion -> detener TODO y NO insistir.
        bloqueado = true; motivoBloqueo = msg.motivo || "";
        badge("\u26D4", "#a11111");
        notif("Cazagangas en PAUSA de seguridad", "Facebook pidio verificacion (" + motivoBloqueo + "). Detuve la cosecha para NO escalar el bloqueo. Resuelve en Facebook y reintenta mas tarde.");
      }
    });
  } catch (e) {}

  // ---- LOGIN / sesion Facebook (seguro: nunca exporta cookies) ----
  function getCookie(name) { return new Promise(function (res) { try { chrome.cookies.get({ url: FB, name: name }, function (c) { res(c || null); }); } catch (e) { res(null); } }); }
  function estadoSesion() {
    return getCookie("c_user").then(function (cu) {
      if (!cu) return { logueado: false };
      return getCookie("xs").then(function (xs) {
        var exp = (xs && xs.expirationDate) || (cu && cu.expirationDate) || null;
        return { logueado: true, exp: exp };
      });
    });
  }
  function diasRestantes(exp) { if (!exp) return null; return Math.max(0, (exp * 1000 - Date.now()) / 86400000); }
  function pintarSesion(s) {
    var el = $("#czg-auto-sesion"); var lb = $("#czg-auto-login"); var go = $("#czg-auto-go"); var stS = $("#czg-auto-st-ses"); if (!el) return;
    if (!s.logueado) {
      el.style.background = "rgba(179,38,30,.16)"; el.style.color = "#fda4a4";
      el.textContent = "\uD83D\uDD34 Sin sesion";
      if (stS) stS.textContent = "\u2014";
      if (lb) lb.style.display = "flex";
      if (go) { go.disabled = true; go.title = "Inicia sesion en Facebook primero"; go.style.opacity = ".5"; go.style.cursor = "not-allowed"; }
      return;
    }
    if (lb) lb.style.display = "none";
    if (go) { go.disabled = false; go.title = ""; go.style.opacity = "1"; go.style.cursor = "pointer"; }
    var d = diasRestantes(s.exp);
    var alerta = (d != null && d < 3);
    el.style.background = alerta ? "rgba(181,121,31,.16)" : "rgba(34,197,94,.12)";
    el.style.color = alerta ? "#fbbf6b" : "#7ee0a6";
    var dur = (d != null) ? (d >= 1 ? Math.round(d) + "d" : Math.round(d * 24) + "h") : "\u2014";
    if (stS) stS.textContent = dur;
    var txt = "\uD83D\uDFE2 Sesion activa";
    if (d != null) txt += " \u00b7 ~" + dur;
    if (alerta) txt += " \u26A0\uFE0F re-loguear";
    el.textContent = txt;
  }
  // Stats HONESTAS: solo refleja lo que existe de verdad en storage local.
  function refreshStats() {
    try {
      gLocal(HAL).then(function (o) { var e = $("#czg-auto-st-hal"); if (e) e.textContent = String(nKeys(o[HAL])); });
      gLocal(SYN).then(function (o) { var e = $("#czg-auto-st-syn"); if (e) e.textContent = String(nKeys(o[SYN])); });
    } catch (e) {}
  }
  function asegurarLogin() {
    return estadoSesion().then(function (s) {
      pintarSesion(s);
      if (s.logueado) return true;
      setStatus("No hay sesion de Facebook. Abriendo el login... inicia sesion y esto seguira solo.", 2);
      notif("Inicia sesion en Facebook", "Cazagangas necesita tu sesion para cosechar. Inicia sesion; la cosecha continua sola.");
      return new Promise(function (resolve) {
        chrome.tabs.create({ url: FB + "/login", active: true }, function () {
          var t0 = Date.now();
          (function poll() {
            estadoSesion().then(function (s2) {
              pintarSesion(s2);
              if (s2.logueado) { setStatus("Sesion detectada. Continuando...", 4); resolve(true); return; }
              if (Date.now() - t0 > 300000) { setStatus("No se detecto sesion (5 min). Reintenta cuando estes logueado."); resolve(false); return; }
              setTimeout(poll, 3000);
            });
          })();
        });
      });
    });
  }

  // ---- login manual (boton independiente de la cosecha) + preferencia de indicador ----
  function loginManual() {
    setStatus("Abriendo el login de Facebook... inicia sesion y se detecta solo.");
    notif("Inicia sesion en Facebook", "Tras iniciar sesion, vuelve al panel: la sesion queda guardada.");
    try {
      chrome.tabs.create({ url: FB + "/login", active: true }, function () {
        var t0 = Date.now();
        (function poll() {
          estadoSesion().then(function (s) {
            pintarSesion(s);
            if (s.logueado) { setStatus("\u2705 Sesion detectada. Ya puedes cosechar."); return; }
            if (Date.now() - t0 > 300000) { setStatus("No se detecto sesion (5 min). Reintenta cuando estes logueado."); return; }
            setTimeout(poll, 3000);
          });
        })();
      });
    } catch (e) { setStatus("No pude abrir el login: " + ((e && e.message) || e)); }
  }
  function overlayPref() { return gLocal(UI).then(function (o) { var u = o[UI] || {}; return u.overlay !== false; }); }
  function setOverlayPref(v) { return gLocal(UI).then(function (o) { var u = o[UI] || {}; u.overlay = !!v; var p = {}; p[UI] = u; return sLocal(p); }); }

  // ---- UI ----
  function setStatus(t, p) { var s = $("#czg-auto-status"); if (s) s.textContent = t; if (p != null) { var pr = $("#czg-auto-progress"); if (pr) pr.style.display = "block"; var b = $("#czg-auto-bar"); if (b) b.style.width = Math.max(0, Math.min(100, p)) + "%"; } log(t); }
  function disable(b) { document.querySelectorAll("#czg-auto button, #czg-auto input").forEach(function (x) { x.disabled = b; }); }
  function leerTerms(cfg) { var b = (cfg && cfg.busquedas && cfg.busquedas.length) ? cfg.busquedas.slice() : SEMILLAS.slice(); var ui = $("#czg-auto-max"); var tope = parseInt(ui && ui.value, 10); if (isNaN(tope) || tope < 1) tope = parseInt(cfg && cfg.maxBusquedas, 10) || TOPE_DEF; return b.slice(0, Math.min(tope, 28)); }
  function barajar(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ---- pestana en PRIMER PLANO (una sola, navega entre terminos) ----
  function abrirFg(url) { return new Promise(function (res) { chrome.tabs.create({ url: url, active: true }, function (t) { res(t); }); }); }
  function navegar(tabId, url) { return new Promise(function (res) { chrome.tabs.update(tabId, { url: url, active: true }, function (t) { res(t); }); }); }
  function cerrar(id) { return new Promise(function (res) { try { chrome.tabs.remove(id, function () { res(); }); } catch (e) { res(); } }); }
  function getTab(tabId) { return new Promise(function (res) { try { chrome.tabs.get(tabId, function (t) { if (chrome.runtime && chrome.runtime.lastError) res(null); else res(t || null); }); } catch (e) { res(null); } }); }
  function getWin(winId) { return new Promise(function (res) { try { chrome.windows.get(winId, function (w) { if (chrome.runtime && chrome.runtime.lastError) res(null); else res(w || null); }); } catch (e) { res(null); } }); }
  function tabTieneFoco(tabId) {
    return getTab(tabId).then(function (t) {
      if (!t || !t.active || t.discarded) return false;
      return getWin(t.windowId).then(function (w) { return !!(w && w.focused); });
    });
  }
  function esperarTabEnFoco(tabId, etiqueta, permitirSinFoco) {
    if (permitirSinFoco) {
      return getTab(tabId).then(function (t) {
        try { if (t && t.windowId != null) chrome.windows.update(t.windowId, { focused: true }); } catch (e) {}
        try { if (tabId != null) chrome.tabs.update(tabId, { active: true }); } catch (e) {}
        setStatus("Modo comida: continuo sin exigir foco visible " + (etiqueta || "") + ". No cierres Chrome ni suspendas el equipo.");
        return sleep(1200).then(function () { return true; });
      });
    }
    var avisado = false;
    function ciclo() {
      return tabTieneFoco(tabId).then(function (ok) {
        if (ok) { if (avisado) { badge("\u25B6", "#15803d"); notif("Cazagangas reanudado", "La pestana de Marketplace recupero foco. Sigo con la misma busqueda."); } return true; }
        if (!avisado) { avisado = true; badge("\u275A\u275A", "#d98a00"); setStatus("PAUSA: vuelve a la pestana de Marketplace para continuar " + (etiqueta || "") + ". No avanzo a la siguiente busqueda."); notif("Cazagangas en PAUSA", "No continuo la secuencia hasta que Marketplace vuelva a estar enfocado."); }
        return sleep(1000).then(ciclo);
      });
    }
    return ciclo();
  }
  function esperarCarga(tabId, timeoutMs) {
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (done) return; done = true; clearTimeout(to); try { chrome.tabs.onUpdated.removeListener(l); } catch (e) {} resolve(v); }
      var to = setTimeout(function () { fin(false); }, timeoutMs);
      function l(id, info) { if (id === tabId && info.status === "complete") fin(true); }
      chrome.tabs.onUpdated.addListener(l);
      chrome.tabs.get(tabId, function (t) { if (t && t.status === "complete") fin(true); });
    });
  }
  function cosechaHumanaEnTab(tabId, term, permitirSinFoco) {
    return esperarTabEnFoco(tabId, "antes de cosechar " + term, permitirSinFoco).then(function () {
      return new Promise(function (resolve) {
        var listo = false;
        try { chrome.tabs.sendMessage(tabId, { tipo: "cosecha-humana" }, function (r) { listo = true; if (chrome.runtime && chrome.runtime.lastError) { resolve({ ok: false, n: 0, error: "sin_respuesta_content_script", objectiveMet: false }); return; } resolve(Object.assign({ ok: !!(r && r.ok) }, r || {})); }); }
        catch (e) { resolve({ ok: false, n: 0, error: String((e && e.message) || e), objectiveMet: false }); return; }
        setTimeout(function () { if (!listo) resolve({ ok: false, n: 0, error: "timeout_content_script", objectiveMet: false }); }, 1200000);
      });
    });
  }

  // ---- pipeline ----
  function puntuar() { return gLocal(HAL).then(function (o) { try { if (window.CG_SCORING && typeof window.CG_SCORING.puntuarTodos === "function") { var p = window.CG_SCORING.puntuarTodos(o[HAL] || {}); return sLocal({ "cazagangas.hallazgos": p }); } } catch (e) { log("puntuar", e); } }); }
  function crearEnNotion(maxMs) {
    return gLocal(SYN).then(function (o) {
      var antes = nKeys(o[SYN]); var btn = $("#cg-n-sync"); if (!btn) { log("no #cg-n-sync"); return antes; }
      btn.click();
      var t0 = Date.now(), estable = 0, ultimo = antes;
      function ciclo() {
        return sleep(3000).then(function () { return gLocal(SYN); }).then(function (s) {
          var n = nKeys(s[SYN]);
          if (n > ultimo) { ultimo = n; estable = 0; } else { estable += 3000; }
          setStatus("Creando filas en Notion... (" + (n - antes) + " nuevas)", 95);
          if (estable >= 9000 && n > antes) return ultimo;
          if (estable >= 18000) return ultimo;
          if (Date.now() - t0 >= maxMs) return ultimo;
          return ciclo();
        });
      }
      return ciclo();
    });
  }
  function enriquecer() {
    try {
      if (window.CZG_sonda && typeof window.CZG_sonda.comprables === "function" && window.CZG_notion && typeof window.CZG_notion.sincronizarComprables === "function") {
        return Promise.resolve(window.CZG_sonda.comprables()).then(function (res) { return window.CZG_notion.sincronizarComprables(res); });
      }
    } catch (e) { log("enriquecer", e); }
    return Promise.resolve(null);
  }

  var corriendo = false, tabSesion = null;
  function correr() {
    if (corriendo) return;
    corriendo = true; bloqueado = false; motivoBloqueo = null; disable(true); badge("\u25B6", "#15803d"); setRun({ estado: "iniciando", motivo: "", indice: 0 });
    asegurarLogin().then(function (ok) {
      if (!ok) { corriendo = false; disable(false); badge("", null); return; }
      return gLocal(CFG).then(function (o) {
        var cfg = o[CFG] || {}; var zona = cfg.zona || "queretaro"; var modoComida = cfg.modoComida !== false;
        var terms = barajar(leerTerms(cfg));
        setStatus("Cosecha larga: " + terms.length + " busquedas en " + zona + (modoComida ? " (modo comida: sin pausa por foco)." : " (primer plano, gateada por foco)."), 6);
        var i = 0, total = 0, detenido = false;
        function paso() {
          if (i >= terms.length) return Promise.resolve();
          if (bloqueado || detenido) return Promise.resolve();   // compuerta: no insistir ni avanzar si hubo bloqueo o termino incompleto
          var term = terms[i];
          var url = FB + "/marketplace/" + encodeURIComponent(zona) + "/search/?query=" + encodeURIComponent(term);
          setStatus('Cosechando "' + term + '" (' + (i + 1) + "/" + terms.length + ") - manten enfocada la ventana de Facebook...", 6 + (i / terms.length) * 82);
          var prep = (tabSesion == null) ? abrirFg(url).then(function (t) { tabSesion = t && t.id; }) : navegar(tabSesion, url).then(function () {});
          return prep.then(function () {
            return setRun({ estado: "navegando", termino: term, indice: i + 1, totalTerminos: terms.length }).then(function () { return esperarCarga(tabSesion, 45000); })
              .then(function (loaded) { if (!loaded) throw new Error("marketplace_no_cargo"); return esperarTabEnFoco(tabSesion, "para asentar " + term, modoComida); })
              .then(function () { return sleep(rnd(3000, 6500)); })   // asentar como humano
              .then(function () { return cosechaHumanaEnTab(tabSesion, term, modoComida); })
              .then(function (res) {
                if (!res || !res.ok) throw new Error((res && res.error) || "cosecha_sin_respuesta");
                if (res.bloqueo) { bloqueado = true; motivoBloqueo = res.bloqueo; throw new Error("bloqueo:" + res.bloqueo); }
                if (!res.objectiveMet) throw new Error("objetivo_no_cumplido:" + (res.stopReason || "sin_reason"));
                total += res.n || 0;
                return setRun({ estado: "termino_ok", termino: term, indice: i + 1, encontrados: res.n || 0, stopReason: res.stopReason || "", pausaMs: res.pausaMs || 0, scrolls: res.scrolls || 0 });
              })
              .then(function () { return esperarTabEnFoco(tabSesion, "antes de pasar a la siguiente busqueda", modoComida); })
              .then(function () { return sleep(rnd(18000, 52000)); }) // throttle aleatorio entre terminos, pero sin perder foco
              .then(function () { return esperarTabEnFoco(tabSesion, "despues de la pausa entre busquedas", modoComida); })
              .then(function () { i++; return paso(); })
              .catch(function (e) { var msg = String((e && e.message) || e); log(term, e); detenido = true; bloqueado = bloqueado || msg.indexOf("bloqueo:") === 0; motivoBloqueo = motivoBloqueo || (bloqueado ? msg.replace(/^bloqueo:/, "") : ""); setStatus("DETENIDO: no avanzo a la siguiente busqueda porque '" + term + "' no cerro correctamente (" + msg + ").", 100); return setRun({ estado: "detenido", termino: term, indice: i + 1, motivo: msg }).then(function () {}); });
          });
        }
        return paso().then(function () {
          if (tabSesion != null) { cerrar(tabSesion); tabSesion = null; }
          setStatus("Puntuando hallazgos...", 88); return puntuar();
        }).then(function () {
          setStatus("Creando filas en Notion...", 92); return crearEnNotion(180000);
        }).then(function () {
          setStatus("Enriqueciendo (Veredicto/Margen)...", 97); return enriquecer();
        }).then(function () {
          refreshStats();
          if (bloqueado) {
            setStatus("\u26D4 Pausa de seguridad: Facebook pidio verificacion (" + (motivoBloqueo || "") + "). Guarde lo cosechado hasta ahi. Resuelvelo en Facebook y reintenta mas tarde.", 100);
            badge("\u26D4", "#a11111"); setRun({ estado: "bloqueado", motivo: motivoBloqueo || "" });
          } else if (detenido) {
            setStatus("\u23F8 Secuencia detenida: una busqueda no cumplio objetivo. No avance a la siguiente. Revisa Marketplace y reintenta.", 100);
            badge("\u275A\u275A", "#d98a00"); notif("Cazagangas detenido", "No avance la secuencia porque una busqueda no cerro correctamente."); setRun({ estado: "detenido_final" });
          } else {
            setStatus("\u2705 Cosecha humana terminada. Revisa Notion.", 100); badge("\u2713", "#15803d");
            notif("Cazagangas termino", "Cosecha completa. Revisa los hallazgos en Notion."); setRun({ estado: "completado", encontrados: total });
          }
        });
      });
    }).catch(function (e) { setStatus("ERROR: " + ((e && e.message) || e)); }).then(function () {
      corriendo = false; disable(false); setTimeout(function () { badge("", null); }, 8000);
    });
  }

  function montar() {
    if ($("#czg-auto")) return;
    var p = document.createElement("div");
    p.id = "czg-auto";
    if (!document.getElementById("czg-auto-css")) {
      var st = document.createElement("style"); st.id = "czg-auto-css";
      st.textContent = "#czg-auto{--bg:#0e1726;--bg2:#0b1422;--line:#1b2740;--txt:#e6edf6;--mut:#9fb3cc;--mut2:#64809e;--acc:#22c55e;--acc2:#4ade80;--neon:#7ee0a6;margin:16px 0;max-width:560px;background:var(--bg);border:1px solid var(--line);border-radius:16px;overflow:visible;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:var(--txt);box-shadow:0 18px 40px rgba(2,8,20,.45)}#czg-auto *{box-sizing:border-box}.czg-hd{display:flex;align-items:center;gap:11px;padding:14px 16px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#13203a,#0e1726)}.czg-mark{width:32px;height:32px;border-radius:9px;flex:none;background:#0c2a1d;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:inset 0 0 0 1px #1e5b3d,0 0 14px rgba(34,197,94,.25)}.czg-hd-t{flex:1;min-width:0;line-height:1.2}.czg-hd-t b{display:block;font-size:14px;font-weight:700;letter-spacing:.4px}.czg-hd-t span{display:block;font-size:9.5px;color:var(--mut2);text-transform:uppercase;letter-spacing:.12em;margin-top:2px}.czg-ver{font-family:ui-monospace,Menlo,monospace;font-size:10px;color:var(--neon);background:#0c2a1d;border:1px solid #1e5b3d;border-radius:6px;padding:2px 6px}.czg-bd{padding:16px;display:flex;flex-direction:column;gap:13px}details.czg-how{border:1px solid var(--line);border-radius:11px;background:var(--bg2);overflow:hidden}details.czg-how>summary{list-style:none;cursor:pointer;padding:9px 12px;font-size:12px;font-weight:600;color:var(--txt);display:flex;align-items:center;gap:7px}details.czg-how>summary::-webkit-details-marker{display:none}details.czg-how>summary .chev{margin-left:auto;color:var(--mut2);transition:transform .18s}details.czg-how[open]>summary .chev{transform:rotate(90deg)}.czg-how ol{margin:0;padding:2px 14px 12px 14px;list-style:none}.czg-how li{position:relative;padding:6px 0 6px 26px;font-size:11.5px;color:var(--mut);line-height:1.45}.czg-how li b{color:var(--txt);font-weight:600}.czg-how li .em{position:absolute;left:0;top:5px;font-size:13px}.czg-how li:not(:last-child){border-bottom:1px dashed var(--line)}.czg-row{display:flex;align-items:center;gap:8px}#czg-auto-sesion{display:inline-flex;align-items:center;gap:7px;font-family:ui-monospace,Menlo,monospace;font-size:11px;font-weight:600;padding:5px 11px;border-radius:999px;background:rgba(34,197,94,.12);color:var(--neon);white-space:nowrap}.czg-stat{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.czg-stat>div{background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:9px 6px;text-align:center}.czg-stat b{display:block;font-family:ui-monospace,Menlo,monospace;font-size:17px;color:#fff}.czg-stat small{font-size:9px;color:var(--mut2);text-transform:uppercase;letter-spacing:.08em}.czg-i{position:relative;width:17px;height:17px;border-radius:50%;border:1px solid var(--line);color:var(--mut2);font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;cursor:help;flex:none;background:var(--bg2)}.czg-i:hover{color:var(--neon);border-color:#1e5b3d}.czg-i .tip{visibility:hidden;opacity:0;position:absolute;right:-4px;bottom:24px;width:210px;background:#04111d;color:#dbe7f3;font-size:11px;font-weight:400;line-height:1.4;padding:8px 10px;border-radius:8px;box-shadow:0 8px 22px rgba(0,0,0,.5);border:1px solid #1b2740;transition:opacity .15s,transform .15s;transform:translateY(3px);z-index:5;text-align:left}.czg-i .tip:after{content:'';position:absolute;right:7px;bottom:-5px;width:10px;height:10px;background:#04111d;border-right:1px solid #1b2740;border-bottom:1px solid #1b2740;transform:rotate(45deg)}.czg-i:hover .tip{visibility:visible;opacity:1;transform:none}#czg-auto-go{flex:1;border:0;cursor:pointer;height:48px;border-radius:12px;color:#04130b;font-weight:800;font-size:14px;letter-spacing:.3px;background:linear-gradient(90deg,var(--acc),var(--acc2));box-shadow:0 0 0 1px #1e5b3d,0 8px 22px rgba(34,197,94,.35);display:flex;align-items:center;justify-content:center;gap:8px;transition:filter .15s,transform .06s}#czg-auto-go:hover:not(:disabled){filter:brightness(1.07)}#czg-auto-go:active{transform:translateY(1px)}#czg-auto-go:disabled{background:#1b2740;color:#5b7290;cursor:not-allowed;box-shadow:none}#czg-auto-login{width:100%;border:1px solid #1e5b3d;cursor:pointer;height:40px;border-radius:11px;background:#0c2a1d;color:var(--neon);font-size:13px;font-weight:600;align-items:center;justify-content:center;gap:7px;transition:filter .15s}#czg-auto-login:hover{filter:brightness(1.15)}#czg-auto-status{flex:1;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:var(--mut);background:var(--bg2);border:1px solid var(--line);border-radius:9px;padding:9px 11px;line-height:1.45;min-height:20px}#czg-auto-status b{color:var(--neon);font-weight:600}#czg-auto-progress{height:5px;border-radius:999px;background:var(--bg2);overflow:hidden;border:1px solid var(--line)}#czg-auto-bar{display:block;height:100%;width:0%;background:linear-gradient(90deg,var(--acc),#86efac)}.czg-foot{display:flex;align-items:center;gap:7px;font-size:10px;color:var(--mut2);line-height:1.4}.czg-foot .k{font-family:ui-monospace,Menlo,monospace;font-size:10px;background:var(--bg2);border:1px solid var(--line);border-radius:5px;padding:1px 5px;color:var(--mut)}details.czg-set{border-top:1px solid var(--line)}details.czg-set>summary{list-style:none;cursor:pointer;padding:11px 0 2px;font-size:11.5px;font-weight:600;color:var(--mut2);display:flex;align-items:center;gap:7px}details.czg-set>summary::-webkit-details-marker{display:none}details.czg-set>summary .chev{margin-left:auto;transition:transform .18s}details.czg-set[open]>summary .chev{transform:rotate(90deg)}.czg-set-body{padding:10px 0 2px;display:flex;flex-direction:column;gap:11px}.czg-set-body label{font-size:11.5px;color:var(--mut);font-weight:600}#czg-auto-max{width:64px;font-size:12px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg2);color:var(--txt);margin-left:6px}.czg-check{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--mut);font-weight:500;cursor:pointer}.czg-check input{width:auto}#czg-auto-recheck{align-self:flex-start;background:#0c2a1d;color:var(--neon);border:1px solid #1e5b3d;border-radius:9px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer}#czg-auto-recheck:hover{filter:brightness(1.15)}#czg-auto-hotkeys{padding:10px 12px;background:var(--bg2);border:1px solid var(--line);border-radius:10px;font-size:10.5px;color:var(--mut);line-height:1.7}#czg-auto-hotkeys b{color:var(--txt)}";
      (document.head || document.documentElement).appendChild(st);
    }
    p.innerHTML =
      '<div class="czg-hd">' +
        '<div class="czg-mark">\uD83D\uDC1C</div>' +
        '<div class="czg-hd-t"><b>Cazagangas</b><span>Cosecha \u00b7 Marketplace</span></div>' +
        '<div class="czg-ver">v' + VER + '</div>' +
      '</div>' +
      '<div class="czg-bd">' +
        '<details class="czg-how">' +
          '<summary>\uD83E\uDDED \u00bfC\u00f3mo funciona?<span class="chev">\u203a</span></summary>' +
          '<ol>' +
            '<li><span class="em">\uD83D\uDD10</span><b>Sesi\u00f3n.</b> Verifica que tu Facebook est\u00e9 abierto; si no, te lleva al login y espera.</li>' +
            '<li><span class="em">\uD83D\uDD0E</span><b>B\u00fasqueda.</b> Recorre tus t\u00e9rminos en Marketplace de tu zona, uno por uno, como una persona.</li>' +
            '<li><span class="em">\uD83E\uDDEE</span><b>An\u00e1lisis.</b> De cada anuncio calcula precio de referencia, margen de reventa y un score.</li>' +
            '<li><span class="em">\uD83C\uDFF7\uFE0F</span><b>Veredicto.</b> Marca cada hallazgo como Perseguir / Revisar / Evitar.</li>' +
            '<li><span class="em">\uD83D\uDDC2\uFE0F</span><b>Guardado.</b> Escribe los hallazgos en tu base de Notion, sin que hagas nada.</li>' +
            '<li><span class="em">\uD83D\uDEE1\uFE0F</span><b>Seguridad.</b> Hace pausas humanas y se detiene si Facebook sospecha. Nunca insiste.</li>' +
          '</ol>' +
        '</details>' +
        '<div class="czg-row">' +
          '<span id="czg-auto-sesion">Comprobando\u2026</span>' +
          '<span class="czg-i" style="margin-left:auto">i<span class="tip">Estado de tu sesi\u00f3n de Facebook. La extensi\u00f3n solo la <b>verifica</b>; nunca guarda tu contrase\u00f1a ni tus cookies.</span></span>' +
        '</div>' +
        '<div class="czg-stat">' +
          '<div><b id="czg-auto-st-hal">\u2014</b><small>hallazgos</small></div>' +
          '<div><b id="czg-auto-st-syn">\u2014</b><small>en Notion</small></div>' +
          '<div><b id="czg-auto-st-ses">\u2014</b><small>sesi\u00f3n</small></div>' +
        '</div>' +
        '<button id="czg-auto-login" style="display:none">\uD83D\uDD11 Iniciar sesi\u00f3n en Facebook</button>' +
        '<div class="czg-row">' +
          '<button id="czg-auto-go">\u26CF\uFE0F Cosechar ahora</button>' +
          '<span class="czg-i">i<span class="tip">Inicia el recorrido completo: busca, analiza, marca y guarda en Notion. Modo comida viene activo: puede continuar sin foco visible; no cierres Chrome ni suspendas el equipo.</span></span>' +
        '</div>' +
        '<div class="czg-row" style="align-items:flex-start">' +
          '<div id="czg-auto-status">Listo. Usa los t\u00e9rminos de tu configuraci\u00f3n, o las semillas de reventa si est\u00e1 vac\u00eda.</div>' +
          '<span class="czg-i">i<span class="tip">Te dice <b>en vivo</b> qu\u00e9 est\u00e1 haciendo: qu\u00e9 t\u00e9rmino busca y cu\u00e1ntos anuncios lleva.</span></span>' +
        '</div>' +
        '<div id="czg-auto-progress" style="display:none"><span id="czg-auto-bar"></span></div>' +
        '<div class="czg-foot">' +
          '<span>\uD83D\uDD0E Modo comida: corre largo sin foco visible</span>' +
          '<span class="k">Alt+Shift+C</span>' +
          '<span class="czg-i">i<span class="tip">Si cambias de ventana, la cosecha se <b>pausa sola</b> y se reanuda al volver. Es parte de la anti-detecci\u00f3n.</span></span>' +
        '</div>' +
        '<details class="czg-set">' +
          '<summary>\u2699\uFE0F Ajustes y atajos<span class="chev">\u203a</span></summary>' +
          '<div class="czg-set-body">' +
            '<label>M\u00e1ximo de b\u00fasquedas por cosecha<input id="czg-auto-max" type="number" value="' + TOPE_DEF + '" min="1" max="28"></label>' +
            '<label class="czg-check"><input id="czg-auto-overlay" type="checkbox" checked>Mostrar indicador en pantalla durante la cosecha</label>' +
            '<button id="czg-auto-recheck">Revisar sesi\u00f3n ahora</button>' +
            '<div id="czg-auto-hotkeys"><b>Atajos:</b><br>\u2022 <b>Alt+Shift+C</b> \u2014 ocultar/mostrar el indicador sobre Facebook.<br>\u2022 <b>Win+Alt+C</b> \u2014 ocultar/mostrar el overlay de escritorio (AutoHotkey, opcional).<br>\u2022 <b>Win+Alt+X</b> \u2014 cerrar el overlay de escritorio.<br>El indicador muestra \u25B6 cosechando / \u275A\u275A en pausa / \u26D4 pausado por seguridad.</div>' +
          '</div>' +
        '</details>' +
      '</div>';
    var dash = document.getElementById("czg-dash");
    if (dash && dash.parentNode) dash.parentNode.insertBefore(p, dash.nextSibling);
    else if (document.body.firstChild) document.body.insertBefore(p, document.body.firstChild);
    else document.body.appendChild(p);
    var b = $("#czg-auto-go"); if (b) b.addEventListener("click", correr);
    var lb = $("#czg-auto-login"); if (lb) lb.addEventListener("click", loginManual);
    var rc = $("#czg-auto-recheck"); if (rc) rc.addEventListener("click", function () { setStatus("Revisando sesion..."); estadoSesion().then(pintarSesion); });
    var ov = $("#czg-auto-overlay"); if (ov) { overlayPref().then(function (on) { ov.checked = on; }); ov.addEventListener("change", function () { setOverlayPref(ov.checked); setStatus(ov.checked ? "Indicador en pantalla: activado." : "Indicador en pantalla: desactivado."); }); }
    estadoSesion().then(pintarSesion);
    refreshStats();
    log("panel cabina oscura v" + VER);
  }

  window.CZG_cosechaAuto = { VER: VER, correr: correr, estadoSesion: estadoSesion };
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(montar, 700); });
    else setTimeout(montar, 700);
  }
})();
