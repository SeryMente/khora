// Cazagangas · background (service worker) v0.3.0 — PORTADO a la sombrilla Aisthesis
// Port fiel del background original. Cambios MINIMOS "imprescindibles para convivir"
// en el service worker UNICO de la sombrilla (core/shell.sw.js lo carga por importScripts):
//   · Envuelto en IIFE para no colisionar con el scope global del SW (globo, etc.).
//   · NO captura chrome.action.onClicked: el icono lo arbitra la sombrilla (abre el panel
//     unico); el cerebro "El Recorrido" se abre desde el panel o por mensaje.
//   · abrirCerebro() apunta a modules/caza/runtime.html (su nueva ubicacion).
//   · No auto-abre el cerebro en install/startup (lo abre el usuario desde el panel).
// Toda la logica (alarma watchdog 1 min, config default, guardar hallazgos, iniciar
// cosecha) se reproduce 1:1.
(function () {
  "use strict";
  const ALARMA = "cazagangas-watchdog";
  const CFG_KEY = "cazagangas.config";
  const HALL_KEY = "cazagangas.hallazgos";
  const CFG_DEFAULT = { zona: "queretaro", busquedas: ['webcam logitech c920','webcam logitech c270','camara web','microfono usb','headset usb','audifonos con microfono','monitor 22','monitor 24','teclado mecanico','mouse logitech','router wifi','repetidor wifi','ssd 240gb','ssd 480gb','memoria ram ddr4','taladro','rotomartillo','herramienta','multimetro','mochila','maleta','botas impermeables','tenis nike','bicicleta','lote ropa','remate','urge vender','mudanza'], categoriasActivas: ['trabajo','perifericos','redes','componentes','herramienta','uso_personal','reventa_baja'], umbral: 20, pararFueraZona: true, modoComida: true, maxBusquedas: 28, dbId: "f038f642-18e5-4eb0-ac6f-b4118ea4f0b0", token: "" };

  chrome.runtime.onInstalled.addListener(async () => {
    const r = await chrome.storage.local.get(CFG_KEY);
    const cur = r[CFG_KEY] || {};
    const needsDefaults = !cur.busquedas || !Array.isArray(cur.busquedas) || cur.busquedas.length === 0;
    if (!r[CFG_KEY] || needsDefaults) {
      await chrome.storage.local.set({ [CFG_KEY]: Object.assign({}, CFG_DEFAULT, cur, needsDefaults ? { busquedas: CFG_DEFAULT.busquedas, categoriasActivas: CFG_DEFAULT.categoriasActivas } : {}) });
    }
    chrome.alarms.create(ALARMA, { periodInMinutes: 1 });
  });

  chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create(ALARMA, { periodInMinutes: 1 });
  });

  chrome.alarms.onAlarm.addListener((a) => {
    if (a.name === ALARMA) { /* watchdog: mantiene vivo el SW */ }
  });

  // El "cerebro" (El Recorrido) se abre desde el panel de la sombrilla o por mensaje.
  async function abrirCerebro() {
    const url = chrome.runtime.getURL("modules/caza/runtime.html");
    const tabs = await chrome.tabs.query({});
    const ya = tabs.find(t => t.url && t.url.split("#")[0] === url);
    if (ya) { chrome.tabs.update(ya.id, { active: true }); return; }
    chrome.tabs.create({ url, pinned: true });
  }

  async function guardarHallazgos(nuevos, query) {
    const r = await chrome.storage.local.get(HALL_KEY);
    const h = r[HALL_KEY] || {};
    const ahora = new Date().toISOString();
    let nuevosCount = 0;
    for (const it of (nuevos || [])) {
      if (!it || !it.id) continue;
      if (!h[it.id]) nuevosCount++;
      h[it.id] = Object.assign({}, h[it.id], {
        id: it.id, url: it.url, titulo: it.titulo, precio: it.precio, img: it.img,
        query: query || it.query || "",
        visto: h[it.id] ? h[it.id].visto : ahora,
        actualizado: ahora,
      });
    }
    await chrome.storage.local.set({ [HALL_KEY]: h });
    return { total: Object.keys(h).length, nuevos: nuevosCount };
  }

  async function iniciarCosecha() {
    const tabs = await chrome.tabs.query({ url: "https://www.facebook.com/marketplace/*" });
    if (!tabs.length) return { ok: false, error: "No hay pestana de Marketplace abierta." };
    chrome.tabs.sendMessage(tabs[0].id, { tipo: "cosecha" });
    return { ok: true };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.tipo === "caza:abrir-cerebro") { abrirCerebro().then(() => sendResponse({ ok: true })); return true; }
    if (msg && msg.tipo === "iniciar-cosecha") { iniciarCosecha().then(sendResponse); return true; }
    if (msg && msg.tipo === "hallazgos") { guardarHallazgos(msg.items, msg.query).then(sendResponse); return true; }
  });
})();
