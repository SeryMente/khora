// Cazagangas · aprendizaje.js (v1.1.0) — Bucle de aprendizaje de maquina (robustecido).
// El sistema aprende con el USO: PREDECIR -> REGISTRAR -> CONFRONTAR -> DESTILAR -> AJUSTAR.
// Modelo: regresion logistica online (SGD + L2) que produce una AFINIDAD 0..100.
//
// IMPORTANTE / honestidad de diseno:
//   · Es una CAPA DE AFINIDAD que reordena/sugiere. NO modifica scoring.js (el corte de
//     precio/percentil sigue intacto). Decision previa de no re-pesar el nucleo: respetada.
//   · Es REVERSIBLE: reset() borra todo lo aprendido y vuelve a los pesos base.
//   · Aprende de senales reales del pipeline: Contactado/Comprado/Vendido = positivo,
//     Descartado = negativo. Sin telemetria oculta; todo vive en chrome.storage.local.
// Expone window.CZG_aprendizaje.
(function () {
  "use strict";
  var VER = "1.1.0";
  var KEY_MODELO = "cazagangas.aprendizaje.modelo";
  var KEY_EVT    = "cazagangas.aprendizaje.eventos";
  var LR = 0.08, L2 = 0.0005, MAXEVT = 500;
  var WCLAMP = 8, MAXREG = 1000, LR_DECAY = 0.0004; // robustez: clamp de pesos, tope de pendientes, decaimiento de LR

  // Orden de features del vector x (bias incluido).
  var FEATS = ["bias", "score", "descuento", "margen", "perseguir", "riesgoAlto",
               "riesgoMedio", "esCelular", "liberado", "bloqueado", "almacenamiento",
               "seminuevo", "piezas", "bateria", "cerca"];

  // ---- estado en memoria (espejo de storage) ----
  var MODEL = null;       // {w, n, aciertos, logloss, ver, actualizado}
  var REG = {};           // predicciones pendientes por id (memoria): id -> {x, p}
  var REG_ORDEN = [];     // orden de insercion para podar REG y evitar fuga de memoria
  var cargado = false;

  function gl(k) { return new Promise(function (r) { try { chrome.storage.local.get(k, function (o) { r(o || {}); }); } catch (e) { r({}); } }); }
  function sl(o) { return new Promise(function (r) { try { chrome.storage.local.set(o, function () { r(); }); } catch (e) { r(); } }); }
  function sigmoid(z) { z = clamp(z, -30, 30); return 1 / (1 + Math.exp(-z)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function nz(v) { v = Number(v); return isFinite(v) ? v : 0; }

  function nuevoModelo() {
    var w = {};
    FEATS.forEach(function (f) { w[f] = 0; });
    // pesos base sensatos (priors), luego el uso los ajusta:
    w.bias = -0.2; w.score = 0.6; w.descuento = 0.8; w.margen = 0.4;
    w.perseguir = 0.5; w.riesgoAlto = -0.7; w.riesgoMedio = -0.25;
    w.esCelular = 0.05; w.liberado = 0.45; w.bloqueado = -0.9;
    w.almacenamiento = 0.2; w.seminuevo = 0.25; w.piezas = -0.6;
    w.bateria = 0.25; w.cerca = 0.3;
    return { w: w, n: 0, aciertos: 0, logloss: 0, ver: VER, actualizado: Date.now() };
  }

  // robustez: sanea un modelo cargado (NaN/Inf, pesos fuera de rango, faltantes, corrupcion).
  function sano(m) {
    if (!m || !m.w || typeof m.w !== "object") return nuevoModelo();
    var base = nuevoModelo();
    FEATS.forEach(function (f) {
      var v = Number(m.w[f]);
      m.w[f] = isFinite(v) ? clamp(v, -WCLAMP, WCLAMP) : base.w[f];
    });
    m.n = (isFinite(m.n) && m.n >= 0) ? m.n : 0;
    m.aciertos = (isFinite(m.aciertos) && m.aciertos >= 0) ? m.aciertos : 0;
    m.logloss = isFinite(m.logloss) ? m.logloss : 0;
    m.ver = VER; if (!m.actualizado) m.actualizado = Date.now();
    return m;
  }

  var listo = (function () {
    return gl(KEY_MODELO).then(function (o) {
      MODEL = sano(o[KEY_MODELO]); cargado = true; return true;
    }).catch(function () { MODEL = nuevoModelo(); cargado = true; return true; });
  })();

  function modelo() { return MODEL || (MODEL = nuevoModelo()); }

  function capTier(s) {
    if (!s) return 0;
    var t = String(s).toLowerCase();
    if (t.indexOf("tb") >= 0) return (parseInt(t, 10) || 1) * 1024;
    return parseInt(t, 10) || 0;
  }

  // ctx flexible: {score, pctDescuento, margen, riesgo, veredicto, cel, precioNum, precioRef, cerca}
  function featuresDe(ctx) {
    ctx = ctx || {};
    var cel = ctx.cel || {};
    var pct = (ctx.pctDescuento != null)
      ? ctx.pctDescuento
      : ((ctx.precioRef && ctx.precioNum) ? ((ctx.precioRef - ctx.precioNum) / ctx.precioRef * 100) : 0);
    var riesgo = String(ctx.riesgo == null ? "" : ctx.riesgo).toLowerCase();
    var x = {};
    x.bias = 1;
    x.score = clamp(nz(ctx.score) / 100, 0, 1);
    x.descuento = clamp(nz(pct) / 60, -1, 1.5);
    x.margen = clamp(nz(ctx.margen) / 1500, -1, 2);
    x.perseguir = (ctx.veredicto === "Perseguir") ? 1 : 0;
    x.riesgoAlto = /alto|da\u00f1|dani|bloque|pieza|reportad|robo/.test(riesgo) ? 1 : 0;
    x.riesgoMedio = /medio|duda|con riesgo/.test(riesgo) ? 1 : 0;
    x.esCelular = cel.esCelular ? 1 : 0;
    x.liberado = (cel.liberado === true) ? 1 : 0;
    x.bloqueado = (cel.liberado === false) ? 1 : 0;
    x.almacenamiento = clamp(capTier(cel.almacenamiento) / 512, 0, 1);
    x.seminuevo = (cel.estado === "Seminuevo" || cel.estado === "Nuevo") ? 1 : 0;
    x.piezas = (cel.estado === "Por piezas") ? 1 : 0;
    x.bateria = (cel.bateriaPct != null) ? clamp(cel.bateriaPct / 100, 0, 1) : 0.7;
    x.cerca = ctx.cerca ? 1 : 0;
    return x;
  }

  function dot(w, x) { var z = 0; for (var f in x) { if (x.hasOwnProperty(f)) z += nz(w[f]) * nz(x[f]); } return z; }

  // PREDECIR (sincrono): usa el modelo en memoria.
  function predecir(x) {
    var m = modelo();
    var p = sigmoid(dot(m.w, x));
    var contrib = [];
    for (var f in x) { if (f === "bias" || !x.hasOwnProperty(f)) continue; contrib.push({ f: f, v: (m.w[f] || 0) * x[f] }); }
    contrib.sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); });
    return { p: p, score: Math.round(p * 100), top: contrib.slice(0, 3), n: m.n };
  }

  // REGISTRAR (memoria): guarda la prediccion para confrontarla luego.
  function registrar(id, x, p) {
    if (!id || !x) return;
    if (!REG[id]) REG_ORDEN.push(id);
    REG[id] = { x: x, p: p };
    while (REG_ORDEN.length > MAXREG) { var viejo = REG_ORDEN.shift(); if (viejo !== id && REG[viejo]) delete REG[viejo]; }
  }

  // CONFRONTAR -> DESTILAR -> AJUSTAR: aprende del resultado real (y=1 interes, y=0 descarte).
  function confrontar(id, y, xFallback) {
    return listo.then(function () {
      var m = modelo();
      var r = (id && REG[id]) ? REG[id] : (xFallback ? { x: xFallback } : null);
      if (!r || !r.x) return { ok: false, motivo: "sin features" };
      var x = r.x;
      var p = sigmoid(dot(m.w, x));                 // DESTILAR: error de la prediccion
      if (!isFinite(p)) return { ok: false, motivo: "prediccion invalida" };
      var pred = p >= 0.5 ? 1 : 0;
      m.aciertos = (m.aciertos || 0) + (pred === y ? 1 : 0);
      var ll = -(y * Math.log(p + 1e-9) + (1 - y) * Math.log(1 - p + 1e-9));
      if (isFinite(ll)) m.logloss = ((m.logloss || 0) * (m.n || 0) + ll) / ((m.n || 0) + 1);
      var g = (y - p);                              // AJUSTAR: SGD con L2 + clamp + decaimiento
      var lrEff = LR / (1 + LR_DECAY * (m.n || 0));
      for (var f in x) {
        if (!x.hasOwnProperty(f)) continue;
        var xf = nz(x[f]);
        var reg = (f === "bias") ? 0 : L2 * (m.w[f] || 0);
        var nw = (m.w[f] || 0) + lrEff * (g * xf - reg);
        m.w[f] = isFinite(nw) ? clamp(nw, -WCLAMP, WCLAMP) : (m.w[f] || 0);
      }
      m.n = (m.n || 0) + 1; m.actualizado = Date.now(); m.ver = VER;
      if (id) delete REG[id];
      var ev;
      return gl(KEY_EVT).then(function (o) {
        ev = o[KEY_EVT]; if (!Array.isArray(ev)) ev = [];
        ev.push({ id: id || "", y: y, p: Math.round(p * 100), ts: Date.now() });
        if (ev.length > MAXEVT) ev = ev.slice(ev.length - MAXEVT);
        var save = {}; save[KEY_MODELO] = m; save[KEY_EVT] = ev;
        return sl(save);
      }).then(function () {
        return { ok: true, p: p, n: m.n, acc: m.n ? Math.round(m.aciertos / m.n * 100) : null };
      }).catch(function () {
        return { ok: true, p: p, n: m.n, persistido: false };
      });
    });
  }

  // ESTADO (sincrono): instantanea para la UI.
  function estado() {
    var m = modelo();
    var tops = [];
    for (var f in m.w) { if (f === "bias" || !m.w.hasOwnProperty(f)) continue; tops.push({ f: f, w: m.w[f] }); }
    tops.sort(function (a, b) { return Math.abs(b.w) - Math.abs(a.w); });
    return {
      n: m.n || 0,
      acc: m.n ? Math.round((m.aciertos || 0) / m.n * 100) : null,
      logloss: m.logloss || 0,
      top: tops.slice(0, 4),
      ver: VER,
      cargado: cargado
    };
  }

  // REVERSIBLE: borra todo lo aprendido.
  function reset() {
    MODEL = nuevoModelo(); REG = {};
    var o = {}; o[KEY_MODELO] = MODEL; o[KEY_EVT] = [];
    return sl(o).then(function () { return true; });
  }

  window.CZG_aprendizaje = {
    VER: VER,
    FEATS: FEATS,
    listo: listo,
    featuresDe: featuresDe,
    predecir: predecir,
    registrar: registrar,
    confrontar: confrontar,
    estado: estado,
    reset: reset
  };
  try { console.log("[aprendizaje] bucle de afinidad listo v" + VER); } catch (e) {}
})();
