/* cazagangas · purga.js — COSECHA BLINDADA: limpieza única de pools contaminados de desarrollo
   v1.0.0 — Borra UNA sola vez (flag-gated) los pools de captura y el mapa de
   sincronización viejos, para que el barrido fresco no arrastre datos sucios ni
   intente parchear páginas de Notion ya enviadas a la papelera. CONSERVA la
   configuración (zona, búsquedas, umbral, token). Debe cargar ANTES que el resto. */
(function () {
  "use strict";
  var VER = "1.0.0";
  // Cambia el sufijo (v1 -> v2 ...) para forzar otra purga en una futura cosecha blindada.
  var FLAG = "cazagangas.purga.v1";
  var SUCIOS = [
    "cazagangas.hallazgos",
    "cazagangas.descubrimiento",
    "cazagangas.enriquecidos",
    "cazagangas.corpus",
    "cazagangas.sonda",
    "cazagangas.espejo",
    "cazagangas.synced"
  ];

  function log() {
    try { console.log.apply(console, ["[CZG purga]"].concat([].slice.call(arguments))); } catch (e) {}
  }

  function aviso(txt, ok) {
    try {
      var b = document.body;
      if (!b) return;
      var n = document.getElementById("czg-purga-aviso");
      if (!n) {
        n = document.createElement("div");
        n.id = "czg-purga-aviso";
        b.insertBefore(n, b.firstChild);
      }
      n.style.cssText = ok
        ? "margin:8px 0;padding:8px 12px;border:1px solid #2a3a00;border-radius:8px;background:#0f1a00;color:#bf6;font:12px system-ui,sans-serif"
        : "margin:8px 0;padding:8px 12px;border:1px solid #3a2a00;border-radius:8px;background:#1a1400;color:#fc0;font:12px system-ui,sans-serif";
      n.textContent = txt;
    } catch (e) {}
  }

  function purgar() {
    chrome.storage.local.get(FLAG, function (r) {
      if (r && r[FLAG]) {
        log("ya aplicada (" + r[FLAG] + "), nada que purgar");
        window.CZG_purga = { VER: VER, hecha: true, ts: r[FLAG] };
        return;
      }
      chrome.storage.local.remove(SUCIOS, function () {
        var sello = {};
        sello[FLAG] = new Date().toISOString();
        chrome.storage.local.set(sello, function () {
          log("pools de desarrollo purgados:", SUCIOS.join(", "));
          window.CZG_purga = { VER: VER, hecha: true, ts: sello[FLAG], claves: SUCIOS.slice() };
          aviso("\uD83E\uDDF9 Cosecha blindada: " + SUCIOS.length + " pools de desarrollo purgados. Config intacta. Pulsa \"Cosechar ahora\" para el barrido limpio.", true);
        });
      });
    });
  }

  try {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      log("chrome.storage no disponible; purga omitida");
      window.CZG_purga = { VER: VER, hecha: false, err: "sin chrome.storage" };
      return;
    }
    purgar();
  } catch (e) {
    log("error", e);
    window.CZG_purga = { VER: VER, hecha: false, err: String(e) };
  }
})();
