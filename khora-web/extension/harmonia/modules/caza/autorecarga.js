/* cazagangas · autorecarga.js — AUTO-RECARGA EN DESARROLLO
   v1.0.0 — Recarga la extensión SOLA cuando un parche cambia los archivos en disco,
   para no tener que ir a chrome://extensions a pulsar "Actualizar".
   Cómo: compara la versión EN DISCO (fetch de manifest.json) contra la versión
   YA CARGADA en memoria. Si difieren -> chrome.runtime.reload().
   Seguro: tras recargar, disco == cargada, así que NO hay bucle. Solo actúa en
   extensión desempaquetada (si hay update_url, es de la tienda y se omite). */
(function () {
  "use strict";
  var VER = "1.0.0";
  var INTERVALO_MS = 4000;

  function log() {
    try { console.log.apply(console, ["[CZG autorecarga]"].concat([].slice.call(arguments))); } catch (e) {}
  }

  var man, cargada;
  try {
    man = chrome.runtime.getManifest();
    cargada = man && man.version;
  } catch (e) {
    log("sin manifest; omitida"); window.CZG_autorecarga = { VER: VER, activa: false }; return;
  }

  // Extensión de tienda (tiene update_url): no auto-recargar.
  if (man && man.update_url) {
    log("extensión de tienda; auto-recarga omitida");
    window.CZG_autorecarga = { VER: VER, activa: false };
    return;
  }
  if (!cargada) { window.CZG_autorecarga = { VER: VER, activa: false }; return; }

  function chequear() {
    try {
      fetch(chrome.runtime.getURL("manifest.json") + "?t=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (m) {
          if (m && m.version && m.version !== cargada) {
            log("disco=" + m.version + " cargada=" + cargada + " -> recargando");
            try { chrome.runtime.reload(); } catch (e) { log("reload fallo", e); }
          }
        })
        .catch(function () { /* silencioso */ });
    } catch (e) { /* silencioso */ }
  }

  window.CZG_autorecarga = { VER: VER, activa: true, cargada: cargada };
  setInterval(chequear, INTERVALO_MS);
  chequear();
})();
