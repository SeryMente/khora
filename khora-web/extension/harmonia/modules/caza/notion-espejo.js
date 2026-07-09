// Cazagangas - notion-espejo.js (v0.2.0)
// Espejo Sonda -> Notion + HUD de verificacion visible (sin consola).
// Recibe los "comprables" de la Sonda y los refleja en las filas existentes de
// la base Hallazgos (Veredicto=Perseguir, Margen de reventa, Precio de
// referencia, Notas). Afloja el resultado en un panel visible y lo persiste en
// chrome.storage. El juez independiente lo lee el operador desde Notion (SQL) y
// desde este panel; nunca desde la consola.
(function () {
  "use strict";
  var VER = "0.2.0";
  var TOKEN = ""; // externalizado a chrome.storage.local (NOTION_TOKEN) — NUNCA hardcodeado en el repo
  function _czTok(){ try{ chrome.storage.local.get(["NOTION_TOKEN","cazagangas.token"], function(o){ TOKEN = (o && (o.NOTION_TOKEN || o["cazagangas.token"])) || ""; }); }catch(e){} }
  _czTok();
  try{ chrome.storage.onChanged.addListener(function(ch,area){ if(area==="local" && (ch.NOTION_TOKEN || ch["cazagangas.token"])) _czTok(); }); }catch(e){}
  var NV = "2022-06-28";
  var API = "https://api.notion.com/v1/pages/";
  var GAP = 420;
  var SYN = "cazagangas.synced";
  var HAL = "cazagangas.hallazgos";
  var OUT = "cazagangas.espejo";

  var glob = (typeof window !== "undefined") ? window : globalThis;
  var ultimo = null;
  var corriendo = false;

  function log() { try { console.log.apply(console, ["[CZG espejo]"].concat([].slice.call(arguments))); } catch (e) {} }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function gLocal(keys) { return new Promise(function (res) { try { chrome.storage.local.get(keys, function (o) { res(o || {}); }); } catch (e) { res({}); } }); }
  function sLocal(o) { return new Promise(function (res) { try { chrome.storage.local.set(o, function () { res(); }); } catch (e) { res(); } }); }
  function makeObj(k, v) { var o = {}; o[k] = v; return o; }

  function str(s) { return (s == null) ? "" : String(s); }
  function normUrl(u) { return str(u).split("?")[0].replace(/\/+$/, ""); }
  function itemIdDe(u) { var m = str(u).match(/\/item\/(\d+)/); return m ? m[1] : ""; }
  function esc(s) { return str(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function money(n) { if (n == null || n === "" || isNaN(n)) return "-"; var r = Math.round(Number(n)); try { return r.toLocaleString("es-MX") + " MXN"; } catch (e) { return r + " MXN"; } }
  function pick(o) { for (var i = 1; i < arguments.length; i++) { var k = arguments[i]; if (o && o[k] != null && o[k] !== "") return o[k]; } return null; }
  function numDe(v) { if (v == null) return null; if (typeof v === "number") return isNaN(v) ? null : v; var m = str(v).replace(/[^0-9.\-]/g, ""); if (m === "" || m === "-") return null; var n = parseFloat(m); return isNaN(n) ? null : n; }

  function aLista(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.lista)) return res.lista;
    if (Array.isArray(res.comprables)) return res.comprables;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.ultimas)) return res.ultimas;
    return [];
  }

  // Indice urlNorm/itemId -> pageId, PUENTEANDO el desajuste de llaves: synced
  // puede estar llaveado por h.id (hallazgo), no por url/itemId. Usamos
  // hallazgos (que tiene id + url) para tender el puente, y agregamos las llaves
  // directas del synced como respaldo.
  function indicePaginas(syn, hal) {
    var idx = {};
    function set(key, val) { if (key && val && !idx[key]) idx[key] = val; }
    var list = Array.isArray(hal) ? hal : (hal && typeof hal === "object" ? Object.keys(hal).map(function (k) { return hal[k]; }) : []);
    list.forEach(function (h) {
      if (!h || typeof h !== "object") return;
      var u = h.url || h.enlace || h.URL || "";
      var pid = (h.id != null && syn[h.id]) ? syn[h.id] : null;
      if (!pid && u) { pid = syn[u] || syn[normUrl(u)] || syn[itemIdDe(u)] || null; }
      if (pid && u) { set(normUrl(u), pid); set(itemIdDe(u), pid); }
    });
    Object.keys(syn || {}).forEach(function (k) {
      var pid = syn[k];
      set(k, pid);
      set(normUrl(k), pid);
      var iid = itemIdDe(k); if (iid) set(iid, pid);
    });
    return idx;
  }
  function resolver(idx, it) {
    var u = pick(it, "url", "href", "URL", "link", "enlace");
    if (u) { var p = idx[normUrl(u)] || idx[u] || idx[itemIdDe(u)]; if (p) return p; }
    return null;
  }

  function rt(s) { return [{ type: "text", text: { content: str(s).slice(0, 1900) } }]; }
  function propsDe(it) {
    var p = {};
    p["Veredicto"] = { select: { name: "Perseguir" } };
    var margen = numDe(pick(it, "margenNeto", "margen", "margenReventa"));
    if (margen != null) p["Margen de reventa"] = { number: margen };
    var ref = numDe(pick(it, "referencia", "ref", "precioRef", "mediana"));
    if (ref != null) p["Precio de referencia"] = { number: ref };
    var partes = [];
    var modelo = pick(it, "modelo", "titulo", "anuncio", "nombre"); if (modelo) partes.push(str(modelo));
    var estado = pick(it, "estado"); if (estado) partes.push("estado: " + estado);
    var riesgo = pick(it, "riesgo"); if (riesgo) partes.push("riesgo: " + riesgo);
    if (margen != null) partes.push("margen neto: " + money(margen));
    var comp = pick(it, "comparables"); if (comp != null) partes.push("comparables: " + comp);
    var conf = pick(it, "confianza"); if (conf) partes.push("confianza: " + conf);
    var prox = pick(it, "proximidad"); if (prox) partes.push("proximidad: " + prox);
    partes.push("[espejo Sonda v" + VER + "]");
    p["Notas"] = { rich_text: rt(partes.join(" - ")) };
    return p;
  }

  function patch(pageId, properties) {
    var i = 0;
    function intento() {
      i++;
      return fetch(API + pageId, {
        method: "PATCH",
        headers: { "Authorization": "Bearer " + TOKEN, "Notion-Version": NV, "Content-Type": "application/json" },
        body: JSON.stringify({ properties: properties })
      }).then(function (res) {
        if (res.ok) return true;
        if ((res.status === 429 || res.status >= 500) && i < 5) {
          var ra = parseFloat((res.headers && res.headers.get && res.headers.get("Retry-After")) || "0");
          return sleep(ra > 0 ? ra * 1000 : 700 * i).then(intento);
        }
        return Promise.resolve().then(function () { return res.json ? res.json() : {}; }).catch(function () { return {}; }).then(function (j) {
          throw new Error(String(res.status) + (j && j.message ? (" " + j.message) : ""));
        });
      }, function (e) {
        if (i < 5) return sleep(800 * i).then(intento);
        throw new Error("red: " + ((e && e.message) || e));
      });
    }
    return intento();
  }

  function sincronizarComprables(res) {
    if (!TOKEN) { try { render({ ts: Date.now(), ver: VER, comprables: aLista(res).length, ok: 0, sinFila: 0, err: aLista(res).length, fallas: [{ t: "(token)", r: "Falta NOTION_TOKEN (ponlo en Ajustes de la sombrilla)" }], huerfanos: [] }); } catch (e) {} return Promise.resolve(ultimo); }
    if (corriendo) return Promise.resolve(ultimo);
    corriendo = true;
    var lista = aLista(res);
    return gLocal([SYN, HAL]).then(function (o) {
      var syn = o[SYN] || {};
      var hal = o[HAL] || {};
      var idx = indicePaginas(syn, hal);
      var ok = 0, err = 0, sinFila = 0;
      var fallas = [], huerfanos = [];
      var seq = Promise.resolve();
      lista.forEach(function (it) {
        seq = seq.then(function () {
          var pid = resolver(idx, it);
          var titulo = pick(it, "modelo", "titulo", "anuncio", "nombre", "url") || "(sin titulo)";
          if (!pid) { sinFila++; huerfanos.push(str(titulo).slice(0, 60)); return; }
          return patch(pid, propsDe(it)).then(function () { ok++; }, function (e) {
            err++; fallas.push({ t: str(titulo).slice(0, 48), r: (e && e.message) || String(e) });
          }).then(function () { return sleep(GAP); });
        });
      });
      return seq.then(function () {
        var result = { ts: Date.now(), ver: VER, comprables: lista.length, ok: ok, sinFila: sinFila, err: err, fallas: fallas, huerfanos: huerfanos };
        ultimo = result;
        return sLocal(makeObj(OUT, result)).then(function () {
          try { render(result); } catch (e) {}
          log("ok " + ok + " / sin fila " + sinFila + " / err " + err);
          corriendo = false;
          return result;
        });
      });
    }).catch(function (e) {
      corriendo = false;
      var result = { ts: Date.now(), ver: VER, comprables: lista.length, ok: 0, sinFila: 0, err: lista.length, fallas: [{ t: "(global)", r: (e && e.message) || String(e) }], huerfanos: [] };
      ultimo = result;
      try { render(result); } catch (e2) {}
      return result;
    });
  }

  // ---- HUD visible ----
  function root() { return (typeof document !== "undefined" && (document.getElementById("czg-dash") || document.body)) || null; }
  function chip(label, val, color) {
    return "<div style='background:#0f2233;border:1px solid #1f3a52;border-radius:10px;padding:8px 14px;min-width:90px'>"
      + "<div style='font-size:20px;font-weight:800;color:" + color + "'>" + (val == null ? "-" : val) + "</div>"
      + "<div style='font-size:11px;opacity:.7'>" + label + "</div></div>";
  }
  function panel() {
    if (typeof document === "undefined") return null;
    var p = document.getElementById("czg-espejo-panel");
    if (p) return p;
    p = document.createElement("div");
    p.id = "czg-espejo-panel";
    p.style.cssText = "margin:12px 0;padding:12px;border:1px solid #1f3a52;border-radius:10px;background:#0b1622;color:#dce6f2;font:13px system-ui,sans-serif;max-width:1080px";
    p.innerHTML = "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'>"
      + "<b>Espejo Sonda -&gt; Notion <span id='czg-espejo-ver' style='opacity:.5'></span></b>"
      + "<button id='czg-espejo-refresh' style='cursor:pointer;border:1px solid #2c4a66;background:#13283d;color:#dce6f2;border-radius:8px;padding:6px 10px'>Refrescar</button>"
      + "</div><div id='czg-espejo-body'></div>";
    var r = root();
    var sonda = document.getElementById("czg-sonda-panel");
    if (sonda && sonda.parentNode) { sonda.parentNode.insertBefore(p, sonda.nextSibling); }
    else if (r && r.firstChild) { r.insertBefore(p, r.firstChild); }
    else if (r) { r.appendChild(p); }
    var btn = p.querySelector ? p.querySelector("#czg-espejo-refresh") : null;
    if (btn) btn.addEventListener("click", function () {
      if (glob.CZG_orq && typeof glob.CZG_orq.correr === "function") glob.CZG_orq.correr("espejo-manual");
      else if (glob.CZG_sonda && typeof glob.CZG_sonda.comprables === "function") glob.CZG_sonda.comprables().then(sincronizarComprables);
    });
    return p;
  }
  function render(r) {
    var p = panel();
    if (!p) return;
    var v = document.getElementById("czg-espejo-ver"); if (v) v.textContent = "v" + VER;
    var body = document.getElementById("czg-espejo-body");
    if (!body) return;
    if (!r) { body.innerHTML = "<div style='opacity:.6'>Sin corridas todavia. Corre la caceria o pulsa Refrescar.</div>"; return; }
    var stamp = new Date(r.ts).toLocaleTimeString("es-MX");
    var chips = chip("Comprables", r.comprables, "#8ab4ff")
      + chip("Reflejados (ok)", r.ok, "#37b85a")
      + chip("Sin fila", r.sinFila, r.sinFila > 0 ? "#e0a106" : "#6b7785")
      + chip("Errores", r.err, r.err > 0 ? "#ff6b6b" : "#6b7785");
    var extra = "";
    if (r.huerfanos && r.huerfanos.length) {
      extra += "<div style='margin-top:8px'><b style='color:#e0a106'>Sin fila en Notion (" + r.huerfanos.length + "):</b><ul style='margin:4px 0 0 18px;opacity:.85'>"
        + r.huerfanos.slice(0, 30).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>";
    }
    if (r.fallas && r.fallas.length) {
      extra += "<div style='margin-top:8px'><b style='color:#ff6b6b'>Errores (" + r.fallas.length + "):</b><ul style='margin:4px 0 0 18px;opacity:.85'>"
        + r.fallas.slice(0, 30).map(function (f) { return "<li>" + esc(f.t) + " - " + esc(f.r) + "</li>"; }).join("") + "</ul></div>";
    }
    body.innerHTML = "<div style='display:flex;gap:8px;flex-wrap:wrap'>" + chips + "</div>"
      + "<div style='margin-top:8px;opacity:.7'>Ultima corrida: " + stamp + "</div>" + extra;
  }
  function arranque() {
    try {
      panel();
      gLocal([OUT]).then(function (o) { render(o[OUT] || null); });
    } catch (e) { log("arranque HUD", e); }
  }

  glob.CZG_notion = {
    VER: VER,
    sincronizarComprables: sincronizarComprables,
    ultimo: function () { return ultimo; },
    render: render
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arranque);
    else arranque();
  }
})();