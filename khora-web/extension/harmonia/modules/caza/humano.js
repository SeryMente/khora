/* cazagangas - humano.js  COSECHA HUMANIZADA + OBSERVATORIO MARKETPLACE
   v2.4.0 - Scroll robustecido: empuje SIN retroceso, recuperacion progresiva ante lazy-load
   lento, y corre con la pestana visible aunque la ventana pierda foco (menos pausas falsas).
   Modo comida/largo: puede continuar sin foco; cierre honesto; no promete vencer bloqueo manual.
   Garantias: ritmo humano; centinela anti-bloqueo; no mensajes privados. */
(function () {
  "use strict";
  if (window.__czgHumano) return;
  window.__czgHumano = true;
  var VER = "2.4.0";
  var CFG = "cazagangas.config";
  var OBS = "cazagangas.observatorio";

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
  function chance(p) { return Math.random() < p; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function pausaHumana(base, spread) { var ms = base + Math.random() * spread; if (chance(0.06)) ms += rnd(500, 1400); return sleep(ms); }
  function norm(s) { try { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { return (s || "").toLowerCase(); } }
  function queryActual() { try { return (new URL(location.href)).searchParams.get("query") || ""; } catch (e) { return ""; } }
  function nowLocal() { try { return new Date().toLocaleString("sv-SE", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Mexico_City" }); } catch (e) { return new Date().toISOString(); } }
  function gLocal(k) { return new Promise(function (r) { try { chrome.storage.local.get(k, function (o) { r(o || {}); }); } catch (e) { r({}); } }); }
  function sLocal(o) { return new Promise(function (r) { try { chrome.storage.local.set(o, function () { r(); }); } catch (e) { r(); } }); }

  function enfocado() { if (permitirSinFocoActual) return true; try { return document.visibilityState === "visible"; } catch (e) { return true; } }
  function esperarFoco() {
    if (enfocado()) return Promise.resolve();
    marcarPausa();
    return new Promise(function (resolve) {
      var iv = setInterval(function () { if (enfocado()) { clearInterval(iv); marcarCorriendo(); resolve(); } }, 350);
    });
  }

  var tituloDeseado = null, tituloIV = null;
  function fijarTitulo(t) {
    tituloDeseado = t;
    try { document.title = t; } catch (e) {}
    if (!tituloIV) tituloIV = setInterval(function () { if (tituloDeseado && document.title !== tituloDeseado) { try { document.title = tituloDeseado; } catch (e) {} } }, 600);
  }
  function soltarTitulo() { tituloDeseado = null; if (tituloIV) { clearInterval(tituloIV); tituloIV = null; } }
  var estadoActual = null, pausaDesde = 0, pausaMs = 0, permitirSinFocoActual = false;
  function avisar(estado, extra) { if (estado === estadoActual) return; estadoActual = estado; try { chrome.runtime.sendMessage({ tipo: "czg-estado", estado: estado, extra: extra || "" }); } catch (e) {} }
  function marcarCorriendo(q) { if (pausaDesde) { pausaMs += Date.now() - pausaDesde; pausaDesde = 0; } fijarTitulo("\u25B6\u25B6CZG COSECHANDO" + (q ? " - " + q : "")); avisar("corriendo", q); hudActualizar("corriendo", q); }
  function marcarPausa() { if (!pausaDesde) pausaDesde = Date.now(); fijarTitulo("\u23F8\u23F8CZG PAUSA - vuelve a esta pestana"); avisar("pausado"); hudActualizar("pausado"); }

  var hudEl = null, hudPref = true;
  function hudCss(e) { return e === "corriendo" ? "#1f6f43" : (e === "pausado" ? "#b5791f" : (e === "bloqueo" ? "#a11111" : "#404040")); }
  function hudTxt(e, q) { return e === "corriendo" ? ("\u25B6 Cosechando" + (q ? " \u00b7 " + q : "")) : (e === "pausado" ? "\u275A\u275A EN PAUSA \u2014 vuelve a esta pestana" : (e === "bloqueo" ? ("\u26D4 Pausado por seguridad" + (q ? " \u00b7 " + q : "")) : "Cazagangas inactivo")); }
  function hudMount() {
    if (hudEl || !document.body) return;
    hudEl = document.createElement("div"); hudEl.id = "czg-hud";
    hudEl.style.cssText = "position:fixed;top:14px;right:14px;z-index:2147483647;font-family:system-ui,sans-serif;color:#fff;background:#404040;border-radius:12px;padding:9px 13px;box-shadow:0 4px 18px rgba(0,0,0,.28);font-size:13px;font-weight:700;max-width:300px;pointer-events:none;transition:background .25s";
    hudEl.innerHTML = '<div id="czg-hud-main">Cazagangas inactivo</div><div style="font-weight:500;font-size:10px;opacity:.85;margin-top:3px">foco=corre, sin foco=pausa · observatorio activo</div>';
    document.body.appendChild(hudEl);
  }
  function hudActualizar(e, q) { if (!hudPref) { if (hudEl) hudEl.style.display = "none"; return; } hudMount(); if (!hudEl) return; hudEl.style.display = "block"; hudEl.style.background = hudCss(e); var m = hudEl.querySelector("#czg-hud-main"); if (m) m.textContent = hudTxt(e, q); }
  function hudLeerPref() { try { chrome.storage.local.get("cazagangas.ui", function (o) { var u = (o && o["cazagangas.ui"]) || {}; hudPref = u.overlay !== false; hudActualizar(estadoActual || "inactivo"); }); } catch (e) {} }
  try { chrome.storage.onChanged.addListener(function (ch, area) { if (area === "local" && ch["cazagangas.ui"]) { var nv = ch["cazagangas.ui"].newValue || {}; hudPref = nv.overlay !== false; hudActualizar(estadoActual || "inactivo"); } }); } catch (e) {}

  function textoLineas(a) { return (a && a.innerText || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean); }
  function parseLugar(ls) {
    if (!ls || !ls.length) return { lugar: "", ciudad: "", estado: "" };
    for (var i = ls.length - 1; i >= 0; i--) {
      var s = ls[i];
      if (/,/.test(s) && !/^\$/.test(s)) {
        var p = s.split(","); return { lugar: s, ciudad: (p[0] || "").trim(), estado: (p.slice(1).join(",") || "").trim() };
      }
    }
    return { lugar: ls[ls.length - 1] || "", ciudad: "", estado: "" };
  }
  function esLocal(lugar, zonaTok) {
    var z = zonaTok || ""; if (!z) return true;
    var n = norm(lugar || "");
    if (!n) return true;
    if (n.indexOf(z) >= 0) return true;
    if (z.indexOf("queretaro") >= 0 && (n.indexOf("qro") >= 0 || n.indexOf("corregidora") >= 0 || n.indexOf("el marques") >= 0 || n.indexOf("santiago de queretaro") >= 0)) return true;
    return false;
  }
  function scrollEl() { try { return document.scrollingElement || document.documentElement || document.body; } catch (e) { return document.documentElement || document.body; } }
  function alturaPagina() { try { var se = scrollEl(); return Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement ? document.documentElement.scrollHeight : 0, se ? se.scrollHeight : 0); } catch (e) { return 0; } }
  function yActual() { try { var se = scrollEl(); return Math.max(window.scrollY || 0, se ? se.scrollTop || 0 : 0); } catch (e) { return window.scrollY || 0; } }
  function viewportH() { try { return window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 700; } catch (e) { return 700; } }
  function cercaDelFondo() { try { return (alturaPagina() - (yActual() + viewportH())) < 1400; } catch (e) { return false; } }
  function contarItems() { try { var s = {}, n = 0, a = document.querySelectorAll('a[href*="/marketplace/item/"]'); for (var i = 0; i < a.length; i++) { var m = (a[i].href || "").match(/\/marketplace\/item\/(\d+)/); if (m && !s[m[1]]) { s[m[1]] = 1; n++; } } return n; } catch (e) { return 0; } }
  function empujeExtra() {
    return esperarFoco().then(function () {
      var vh = viewportH();
      // SIN retroceso: empuje firme hacia abajo + senales de carga (anti "se devuelve").
      try {
        var se = scrollEl();
        window.scrollBy(0, Math.round(vh * 1.1));
        if (se) se.scrollTop = Math.min((se.scrollTop || 0) + Math.round(vh * 1.1), alturaPagina());
        window.dispatchEvent(new WheelEvent("wheel", { deltaY: vh, bubbles: true }));
      } catch (e) {}
      return sleep(rnd(360, 760)).then(function () {
        // segundo empuje: lleva el ultimo anuncio a la vista para gatillar el lazy-load.
        try {
          var as = document.querySelectorAll('a[href*="/marketplace/item/"]');
          var last = as.length ? as[as.length - 1] : null;
          if (last && last.scrollIntoView) last.scrollIntoView({ block: "end" });
          window.dispatchEvent(new WheelEvent("wheel", { deltaY: vh, bubbles: true }));
        } catch (e) {}
        return sleep(rnd(360, 720));
      });
    });
  }
  function esperarCrecimiento(prevAltura, prevConteo, tempo) {
    var intentos = 0, maxIntentos = 9;
    function recuperar() {
      // primeros intentos: empuje normal; tardios: salto duro al fondo para forzar carga.
      if (intentos < 4) return empujeExtra();
      return esperarFoco().then(function () {
        try { var se = scrollEl(); if (se) se.scrollTop = alturaPagina(); window.dispatchEvent(new WheelEvent("wheel", { deltaY: viewportH() * 1.5, bubbles: true })); } catch (e) {}
        return sleep(rnd(520, 1040));
      });
    }
    function paso() {
      return esperarFoco().then(function () {
        var h = alturaPagina(), c = contarItems();
        if (h > prevAltura + 50 || c > prevConteo) return { crecio: true, altura: h, conteo: c, intentos: intentos };
        if (intentos >= maxIntentos) return { crecio: false, altura: h, conteo: c, intentos: intentos };
        intentos++;
        return recuperar().then(function () { return sleep(rnd(600, 1200) * tempo); }).then(paso);
      });
    }
    return paso();
  }

  var FUERA_RX = /(fuera de tu b\u00fasqueda|fuera de tu busqueda|outside your search|resultados relacionados|related results)/i;
  function nodoFueraDeZona() {
    try { var els = document.querySelectorAll("span,div,h2,h3,h4"); for (var i = 0; i < els.length; i++) { var t = (els[i].textContent || "").trim(); if (t && t.length < 110 && FUERA_RX.test(t)) return els[i]; } } catch (e) {}
    return null;
  }
  function despuesDe(nodo, a) { if (!nodo) return false; try { return !!(nodo.compareDocumentPosition(a) & 4); } catch (e) { return false; } }

  function rasparObservado(frontera, zonaTok, runId, ronda) {
    var out = [], vistos = {}, anchors = document.querySelectorAll('a[href*="/marketplace/item/"]');
    var pos = 0, fronteraPos = null;
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i], m = (a.href || "").match(/\/marketplace\/item\/(\d+)/); if (!m) continue;
      var id = m[1]; if (vistos[id]) continue; vistos[id] = 1; pos++;
      var fueraPorFrontera = despuesDe(frontera, a); if (fueraPorFrontera && fronteraPos == null) fronteraPos = pos;
      var ls = textoLineas(a); var lugar = parseLugar(ls); var local = esLocal(lugar.lugar, zonaTok) && !fueraPorFrontera;
      var texto = a.innerText || ""; var pm = texto.match(/\$[\d.,]+/); var img = a.querySelector("img");
      var titulo = (img && img.getAttribute("alt")) || null;
      if (!titulo) { for (var j = 0; j < ls.length; j++) { if (!/^\$/.test(ls[j])) { titulo = ls[j]; break; } } }
      out.push({ id: id, url: "https://www.facebook.com/marketplace/item/" + id, precio: pm ? pm[0] : null, titulo: titulo, img: img ? img.src : null, lugar: lugar.lugar, ciudad: lugar.ciudad, estadoLugar: lugar.estado, posicion: pos, scrollDepth: Math.round(window.scrollY || 0), rondaScroll: ronda || 0, esLocal: !!local, fueraPorFrontera: !!fueraPorFrontera, runId: runId });
    }
    out._fronteraPos = fronteraPos;
    return out;
  }
  function raspar() { return rasparObservado(null, "", "manual", 0); }

  function jitterMouse() { try { var x = irnd(40, Math.max(60, window.innerWidth - 40)); var y = irnd(40, Math.max(60, window.innerHeight - 40)); var ev = new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true }); (document.elementFromPoint(x, y) || document.body).dispatchEvent(ev); } catch (e) {} }
  function scrollSuave(dy) {
    var pasos = irnd(7, 12), hecho = 0;
    return (function paso() {
      if (hecho >= pasos) return Promise.resolve();
      if (!enfocado()) { marcarPausa(); return esperarFoco().then(paso); }
      var frac = dy / pasos * rnd(0.88, 1.12); window.scrollBy(0, frac);
      try { window.dispatchEvent(new WheelEvent("wheel", { deltaY: frac, bubbles: true })); } catch (e) {}
      hecho++; return sleep(rnd(14, 38)).then(paso);
    })();
  }
  function empujarFondo(tempo) { return esperarFoco().then(function () { var vh = viewportH(); return scrollSuave(vh * rnd(0.95, 1.3)).then(function () { try { window.dispatchEvent(new WheelEvent("wheel", { deltaY: vh, bubbles: true })); } catch (e) {} return sleep(rnd(650, 1400) * tempo); }); }); }

  var ultimoBloqueo = null;
  function bloqueoFacebook() {
    try {
      var u = (location.href || "").toLowerCase(); if (u.indexOf("/checkpoint") >= 0) return "checkpoint"; if (/\/login(\/|\?|\.php|$)/.test(u)) return "muro de login";
      var t = ((document.body && document.body.innerText) || "").slice(0, 8000).toLowerCase();
      var senales = ["temporarily blocked", "you're temporarily blocked", "temporalmente bloqueado", "has infringido", "cuenta restringida", "account restricted", "we limit how often", "limitamos la frecuencia", "confirm your identity", "confirma tu identidad", "going too fast", "suspicious activity", "actividad sospechosa", "enter the code we sent", "te enviamos un codigo"];
      for (var i = 0; i < senales.length; i++) if (t.indexOf(senales[i]) >= 0) return "aviso: " + senales[i];
    } catch (e) {}
    return null;
  }
  function avisarBloqueo(motivo) { ultimoBloqueo = motivo; try { chrome.runtime.sendMessage({ tipo: "czg-bloqueo", motivo: motivo }); } catch (e) {} soltarTitulo(); hudActualizar("bloqueo", motivo); }

  function guardarObservatorio(run, items) {
    return gLocal(OBS).then(function (o) {
      var db = o[OBS] || { schemaVersion: 1, runs: [], byQuery: {} };
      db.schemaVersion = 1; db.runs = Array.isArray(db.runs) ? db.runs : []; db.byQuery = db.byQuery || {};
      var qKey = norm(run.query || ""); var q = db.byQuery[qKey] || { query: run.query || "", runs: 0, totalSeen: 0, seenIds: {}, lastPositions: {}, lastTop20: [] };
      var obs = [], nuevos = 0, repetidos = 0, locales = 0, foraneos = 0, topNew = 0, rankShiftSum = 0, rankShiftN = 0;
      items.forEach(function (it) {
        var was = !!q.seenIds[it.id], prev = q.lastPositions[it.id];
        if (it.esLocal) locales++; else foraneos++;
        if (!was) { nuevos++; if (it.posicion <= 10) topNew++; } else repetidos++;
        if (prev != null) { rankShiftSum += Math.abs(prev - it.posicion); rankShiftN++; }
        obs.push({ id: it.id, url: it.url, titulo: it.titulo, precio: it.precio, posicion: it.posicion, scrollDepth: it.scrollDepth, rondaScroll: it.rondaScroll, lugar: it.lugar, ciudad: it.ciudad, estado: it.estadoLugar, esLocal: it.esLocal, nuevo: !was, posicionAnterior: prev == null ? null : prev, rankShift: prev == null ? null : (it.posicion - prev), fueraPorFrontera: it.fueraPorFrontera });
      });
      var prevTop = q.lastTop20 || [], top = items.slice(0, 20).map(function (x) { return x.id; });
      var overlap = top.filter(function (id) { return prevTop.indexOf(id) >= 0; }).length;
      run.endedAt = Date.now(); run.endedLocal = nowLocal(); run.itemsVistos = items.length; run.itemsLocales = locales; run.itemsForaneos = foraneos; run.itemsNuevos = nuevos; run.itemsRepetidos = repetidos;
      run.topNewRate = Math.round((topNew / Math.max(1, Math.min(10, items.length))) * 100) / 100;
      run.overlapTop20 = Math.round((overlap / Math.max(1, Math.min(20, top.length))) * 100) / 100;
      run.rankShiftPromedio = rankShiftN ? Math.round((rankShiftSum / rankShiftN) * 10) / 10 : null;
      run.yieldLocal = run.scrollsEjecutados ? Math.round((locales / run.scrollsEjecutados) * 10) / 10 : locales;
      run.observations = obs.slice(0, 300);
      items.forEach(function (it) { q.seenIds[it.id] = 1; q.lastPositions[it.id] = it.posicion; });
      q.lastTop20 = top; q.runs = (q.runs || 0) + 1; q.totalSeen = Object.keys(q.seenIds).length;
      q.lastRun = { runId: run.runId, timestampLocal: run.endedLocal, itemsVistos: run.itemsVistos, itemsLocales: run.itemsLocales, itemsForaneos: run.itemsForaneos, itemsNuevos: run.itemsNuevos, fronteraDetectada: run.fronteraDetectada, fronteraPosicion: run.fronteraPosicion, topNewRate: run.topNewRate, overlapTop20: run.overlapTop20, rankShiftPromedio: run.rankShiftPromedio };
      db.byQuery[qKey] = q; db.runs.push(run); if (db.runs.length > 80) db.runs = db.runs.slice(db.runs.length - 80);
      var p = {}; p[OBS] = db; return sLocal(p).then(function () { return run; });
    });
  }

  function leerConfig() { return gLocal(CFG).then(function (o) { return (o && o[CFG]) || {}; }); }
  function cosecharHumano(query) { return leerConfig().then(function (cfg) { return correrCosecha(query || queryActual(), cfg || {}); }); }
  function correrCosecha(query, cfg) {
    ultimoBloqueo = null; pausaDesde = 0; pausaMs = 0; permitirSinFocoActual = !!(cfg && cfg.modoComida);
    var b0 = bloqueoFacebook(); if (b0) { avisarBloqueo(b0); return Promise.resolve(0); }
    var pararFuera = cfg.pararFueraZona !== false, zonaTok = norm(cfg.zona || "queretaro"), frontera = null, fueraDeZona = false;
    var runId = "run-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    var run = { runId: runId, query: query || "", zona: cfg.zona || "queretaro", startedAt: Date.now(), startedLocal: nowLocal(), sourceUrl: location.href, version: VER, modoComida: !!(cfg && cfg.modoComida), scrollsEjecutados: 0, fronteraDetectada: false, fronteraTexto: null, fronteraPosicion: null, stopReason: null };
    var rondasMeta = irnd(38, 68), tempo = rnd(0.8, 1.1), ronda = 0, sinCrecer = 0, ultimaAltura = alturaPagina(), ultimoConteo = contarItems(), t0 = Date.now(), MAX = 900000;
    marcarCorriendo(query);
    function tick() {
      return esperarFoco().then(function () {
        if (chance(0.05)) { jitterMouse(); return pausaHumana(500 * tempo, 1100 * tempo).then(seguir); }
        if (chance(0.05)) return scrollSuave(-irnd(80, 220)).then(function () { return pausaHumana(300 * tempo, 700 * tempo); }).then(seguir);
        var dy = irnd(640, 1040); if (chance(0.3)) jitterMouse();
        return scrollSuave(dy).then(function () { return pausaHumana(350 * tempo, 850 * tempo); }).then(function () {
          return empujarFondo(tempo).then(function () {
            run.scrollsEjecutados++;
            if (pararFuera) { var fr = nodoFueraDeZona(); if (fr) { frontera = fr; fueraDeZona = true; run.fronteraDetectada = true; run.fronteraTexto = (fr.textContent || "").trim().slice(0, 120); return fin(false, "frontera_zona"); } }
            var h0 = alturaPagina(), c0 = contarItems(), crecio0 = (h0 > ultimaAltura + 50) || (c0 > ultimoConteo);
            function aplicar(res) {
              var h = res && res.altura != null ? res.altura : h0, c = res && res.conteo != null ? res.conteo : c0;
              var crecio = crecio0 || (res && res.crecio) || (h > ultimaAltura + 50) || (c > ultimoConteo);
              if (crecio) { sinCrecer = 0; if (h > ultimaAltura) ultimaAltura = h; if (c > ultimoConteo) ultimoConteo = c; }
              else sinCrecer++;
              return seguir();
            }
            if (!crecio0 && cercaDelFondo()) return esperarCrecimiento(ultimaAltura, ultimoConteo, tempo).then(aplicar);
            return aplicar({ crecio: crecio0, altura: h0, conteo: c0 });
          });
        });
      });
    }
    function seguir() {
      ronda++;
      var bk = bloqueoFacebook(); if (bk) { avisarBloqueo(bk); return fin(true, "bloqueo"); }
      if (Date.now() - t0 > MAX) return fin(false, "max_tiempo");
      if (ronda >= rondasMeta && sinCrecer >= 4) return fin(false, "rondas_meta_estable");
      if (sinCrecer >= 14 && (ronda >= 28 || ultimoConteo >= 90)) return fin(false, "feed_estable_sin_nuevos");
      if (chance(0.015)) return sleep(rnd(5000, 11000) * tempo).then(tick);
      if (chance(0.05)) return pausaHumana(1500 * tempo, 3000 * tempo).then(tick);
      return tick();
    }
    function fin(porBloqueo, reason) {
      run.stopReason = reason || (porBloqueo ? "bloqueo" : "normal");
      var items = porBloqueo ? [] : rasparObservado(frontera, zonaTok, runId, ronda);
      run.fronteraPosicion = items._fronteraPos || null;
      var accionables = (pararFuera ? items.filter(function (it) { return it.esLocal; }) : items).map(function (it) { var x = {}; for (var k in it) x[k] = it[k]; return x; });
      if (!porBloqueo) { try { chrome.runtime.sendMessage({ tipo: "hallazgos", items: accionables, query: query }); } catch (e) {} }
      soltarTitulo(); if (fueraDeZona) { try { fijarTitulo("\u2705CZG fin de zona - " + (query || "")); setTimeout(soltarTitulo, 1500); } catch (e) {} }
      if (pausaDesde) { pausaMs += Date.now() - pausaDesde; pausaDesde = 0; }
      run.pausaMs = pausaMs;
      run.objectiveMet = !porBloqueo && ["frontera_zona", "max_tiempo", "rondas_meta_estable", "feed_estable_sin_nuevos", "normal"].indexOf(run.stopReason) >= 0;
      hudActualizar(porBloqueo ? "bloqueo" : "inactivo", porBloqueo ? ultimoBloqueo : null);
      return guardarObservatorio(run, items).then(function () { return { n: accionables.length, stopReason: run.stopReason, objectiveMet: !!run.objectiveMet, bloqueo: porBloqueo ? ultimoBloqueo : null, pausaMs: pausaMs, scrolls: run.scrollsEjecutados, vistos: items.length, locales: accionables.length }; });
    }
    return tick();
  }

  // Antes pausabamos al perder foco de ventana; ahora solo pausa si la pestana se OCULTA (visibilitychange).
  document.addEventListener("visibilitychange", function () { if (document.hidden && estadoActual) marcarPausa(); });
  var corriendo = false;
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg && msg.tipo === "cosecha-humana") {
      if (corriendo) { sendResponse({ ok: false, error: "ocupado" }); return true; }
      corriendo = true; var q = msg.query || queryActual();
      cosecharHumano(q).then(function (res) { corriendo = false; permitirSinFocoActual = false; soltarTitulo(); if (typeof res === "number") res = { n: res, objectiveMet: true, stopReason: "legacy" }; sendResponse({ ok: true, n: (res && res.n) || 0, stopReason: res && res.stopReason, objectiveMet: !!(res && res.objectiveMet), bloqueo: (res && res.bloqueo) || ultimoBloqueo, pausaMs: (res && res.pausaMs) || 0, scrolls: (res && res.scrolls) || 0, vistos: (res && res.vistos) || 0, locales: (res && res.locales) || 0 }); })
        .catch(function (e) { corriendo = false; permitirSinFocoActual = false; soltarTitulo(); sendResponse({ ok: false, error: String((e && e.message) || e) }); });
      return true;
    }
    if (msg && msg.tipo === "czg-ping") { sendResponse({ ok: true, ver: VER }); return true; }
  });
  try { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hudLeerPref); else hudLeerPref(); } catch (e) {}
  window.CZG_humano = { VER: VER, cosechar: cosecharHumano, enfocado: enfocado };
})();
