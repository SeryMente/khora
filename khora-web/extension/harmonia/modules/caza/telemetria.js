// Cazagangas · telemetria.js — contrato de telemetria PORTABLE y reutilizable.
// Objetivo: recolectar datos UTILES al desarrollo (no analitica de usuario).
// Principios: NO-SIMULACION (si no hay canal remoto, lo dice y encola local),
// dedup, tope de cola (ring buffer), persistencia con throttle, salud visible.
// Uso:  CZ_TEL.init({app:"cazagangas",modulo:"shell",ver:"3.1.0"})
//       CZ_TEL.log("recorrido","info","escena",{escena:"cazar"})
//       CZ_TEL.health()  ->  {ok, cola, errores, estado, ...}
(function(){
  "use strict";
  if (window.CZ_TEL) return;

  var CONTRATO = "1.0";
  var KEY = "cazagangas.telemetry";
  var TOPE = 600;          // eventos maximos en cola (ring buffer)
  var DEDUP_MS = 4000;     // colapsa eventos identicos dentro de esta ventana
  var PERSIST_MS = 1500;   // throttle de escritura a storage

  var cfg = { app:"cazagangas", modulo:"", ver:"", fuente:"" };
  var cola = [];
  var stats = { info:0, warn:0, error:0 };
  var seq = 0;
  var persistTimer = null;
  var inicializado = false;
  var ultimoError = null;

  function ahora(){ return new Date().toISOString(); }
  function tieneStorage(){ try{ return !!(window.chrome && chrome.storage && chrome.storage.local); }catch(e){ return false; } }

  function recortaCtx(ctx){
    // Mantiene el contexto acotado y serializable (datos de desarrollo desechables).
    if (ctx == null) return null;
    try {
      var s = JSON.stringify(ctx);
      if (s.length > 800) s = s.slice(0,800) + "\u2026";
      return JSON.parse(s);
    } catch(e){ return { _noSerializable:true }; }
  }

  function programaPersistencia(){
    if (!tieneStorage()) return;          // sin storage: queda solo en memoria (honesto)
    if (persistTimer) return;
    persistTimer = setTimeout(function(){
      persistTimer = null;
      try {
        var payload = {}; payload[KEY] = {
          contrato: CONTRATO, app: cfg.app, ver: cfg.ver,
          actualizado: ahora(), stats: stats, eventos: cola
        };
        chrome.storage.local.set(payload, function(){ void chrome.runtime.lastError; });
      } catch(e){ /* reintento en el proximo log */ }
    }, PERSIST_MS);
  }

  function log(modulo, sev, msg, ctx){
    try {
      sev = (sev==="error"||sev==="warn") ? sev : "info";
      modulo = String(modulo||cfg.modulo||"app");
      msg = String(msg==null?"":msg);
      var t = Date.now();
      // dedup: mismo modulo+sev+msg dentro de la ventana => incrementa n
      var ult = cola.length ? cola[cola.length-1] : null;
      if (ult && ult.mod===modulo && ult.sev===sev && ult.msg===msg && (t - ult._t) < DEDUP_MS) {
        ult.n = (ult.n||1) + 1; ult.ts = ahora(); ult._t = t;
        if (ctx!=null) ult.ctx = recortaCtx(ctx);
      } else {
        var ev = {
          id: (++seq), ts: ahora(), sev: sev, mod: modulo,
          app: cfg.app, ver: cfg.ver, fuente: cfg.fuente || "",
          msg: msg, ctx: recortaCtx(ctx), n: 1, _t: t
        };
        cola.push(ev);
        if (cola.length > TOPE) cola.splice(0, cola.length - TOPE); // ring buffer
      }
      stats[sev] = (stats[sev]||0) + 1;
      if (sev==="error") ultimoError = { ts: ahora(), mod: modulo, msg: msg };
      programaPersistencia();
      return true;
    } catch(e){ return false; }
  }

  function init(opciones){
    opciones = opciones || {};
    cfg.app = opciones.app || cfg.app;
    cfg.modulo = opciones.modulo || cfg.modulo;
    cfg.ver = opciones.ver || cfg.ver;
    cfg.fuente = opciones.fuente || (location && location.href) || "";
    if (inicializado) return CZ_TEL;
    inicializado = true;
    // Restaura cola/contadores previos para no perder historial entre recargas.
    if (tieneStorage()) {
      try {
        chrome.storage.local.get([KEY], function(o){
          try {
            var prev = o && o[KEY];
            if (prev && prev.eventos && prev.eventos.length) {
              var base = prev.eventos.slice(-TOPE);
              cola = base.concat(cola);
              if (cola.length > TOPE) cola.splice(0, cola.length - TOPE);
            }
            if (prev && prev.stats) {
              stats.info += prev.stats.info||0; stats.warn += prev.stats.warn||0; stats.error += prev.stats.error||0;
            }
          } catch(e){}
        });
      } catch(e){}
    }
    return CZ_TEL;
  }

  // Reservado para cuando exista un destino auditable (Notion/endpoint). Hoy: NO hay
  // canal remoto => NO se simula envio; se reporta el estado real y queda en cola local.
  function flush(){
    return { enviados: 0, cola: cola.length, motivo: "sin canal remoto \u00b7 cola local", ok: true };
  }

  function health(){
    var errores = stats.error || 0;
    return {
      ok: errores === 0,
      estado: tieneStorage() ? "local" : "memoria",
      contrato: CONTRATO,
      app: cfg.app, ver: cfg.ver,
      cola: cola.length,
      info: stats.info||0, warn: stats.warn||0, error: errores,
      ultimoError: ultimoError
    };
  }

  function recent(n){ n = n||25; return cola.slice(-n).map(function(e){ var c={}; for(var k in e){ if(k!=="_t") c[k]=e[k]; } return c; }); }
  function clear(){ cola=[]; stats={info:0,warn:0,error:0}; ultimoError=null; programaPersistencia(); return true; }

  window.CZ_TEL = {
    CONTRATO: CONTRATO, KEY: KEY,
    init: init, log: log, health: health,
    recent: recent, flush: flush, clear: clear,
    info: function(m,msg,c){ return log(m,"info",msg,c); },
    warn: function(m,msg,c){ return log(m,"warn",msg,c); },
    error: function(m,msg,c){ return log(m,"error",msg,c); }
  };
})();
