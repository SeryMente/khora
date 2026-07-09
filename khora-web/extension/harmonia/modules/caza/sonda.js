/* cazagangas.sonda - motor de valuacion y "vale la pena" (modelo+estado, barato-primero, cercania)
   v0.1.0 - backend puro, sin UI. Se transplantara a la fusion con Globo Scraper. */
(function () {
  "use strict";
  var VER = "0.1.0";

  var CFG_DEF = {
    colchonMin: 10,
    pasajeIda: 12,
    factorVentaRapida: 0.92,
    minMuestra: 4,
    muestraSolida: 6,
    margenFlaco: 80,
    pisoRatio: 0.20,
    anclas: ["centro", "centro historico", "gomez morin", "zaragoza", "pasteur",
             "alameda", "5 de mayo", "corregidora centro", "andador"],
    excluir: ["accesorio", "funda", "mica", "cargador", "cable", "control",
              "solo caja", "por partes", "por piezas", "para piezas",
              "para refacciones", "refaccion", "no sirve", "no enciende",
              "no prende", "para reparar", "pantalla rota", "danado", "maquillaje"],
    riesgoTokens: ["roto", "rota", "golpe", "estrellad", "fallo", "falla",
                   "bateria mala", "no carga", "icloud", "cuenta google",
                   "bloquead", "reportad", "a meses", "credito"],
    estadoBueno: ["nuevo", "sellado", "sellada", "como nuevo", "impecable",
                  "excelente estado", "poco uso", "con factura", "garantia"]
  };

  function cfg() { return Object.assign({}, CFG_DEF, (window.CZG_cfgSonda || {})); }

  function sinAcentos(s) {
    return (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function norm(s) {
    return sinAcentos(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  function aNum(p) {
    if (typeof p === "number") return p;
    var m = (p || "").toString().replace(/[^0-9]/g, "");
    return m ? parseInt(m, 10) : NaN;
  }

  var BRANDS = {
    iphone: ["iphone"],
    galaxy: ["samsung galaxy", "galaxy", "samsung"],
    xiaomi: ["redmi", "poco", "xiaomi"],
    motorola: ["motorola", "moto"],
    switch: ["nintendo switch", "switch"],
    playstation: ["playstation", "ps5", "ps4", "ps3"],
    xbox: ["xbox"],
    ipad: ["ipad"],
    applewatch: ["apple watch"],
    airpods: ["airpods"],
    macbook: ["macbook"],
    tablet: ["tablet", "tableta"],
    laptop: ["laptop", "notebook"]
  };
  var MODIF = ["pro max", "pro", "max", "plus", "mini", "ultra", "lite", "note",
               "neo", "fe", "se", "air", "oled", "slim"];

  function capDe(t) {
    var g = t.match(/\b(16|32|64|128|256|512)\s*gb\b/);
    if (g) return g[1] + "gb";
    var tb = t.match(/\b(1|2)\s*tb\b/);
    if (tb) return tb[1] + "tb";
    return "";
  }
  function estadoDe(titulo) {
    var t = norm(titulo), c = cfg(), i;
    for (i = 0; i < c.riesgoTokens.length; i++) if (t.indexOf(norm(c.riesgoTokens[i])) >= 0) return "riesgo";
    for (i = 0; i < c.estadoBueno.length; i++) if (t.indexOf(norm(c.estadoBueno[i])) >= 0) return "bueno";
    return "usado";
  }
  function modeloDe(titulo) {
    var t = norm(titulo), marca = null, base = null, k, i;
    for (k in BRANDS) {
      var kws = BRANDS[k];
      for (i = 0; i < kws.length; i++) {
        if (t.indexOf(norm(kws[i])) >= 0) { marca = k; base = norm(kws[i]); break; }
      }
      if (marca) break;
    }
    if (!marca) {
      var n0 = t.match(/[a-z]+\s+[a-z0-9]+/);
      return { marca: "otro", modelo: n0 ? n0[0] : (t.split(" ")[0] || "?"),
               capacidad: capDe(t), estado: estadoDe(titulo) };
    }
    var resto = t.slice(t.indexOf(base) + base.length);
    var num = resto.match(/\b(\d{1,4})\b/);
    var mod = "", j;
    for (j = 0; j < MODIF.length; j++) { if (resto.indexOf(MODIF[j]) >= 0) { mod = MODIF[j]; break; } }
    var modelo = (marca + " " + (num ? num[1] : "") + " " + mod).replace(/\s+/g, " ").trim();
    return { marca: marca, modelo: modelo, capacidad: capDe(t), estado: estadoDe(titulo) };
  }

  function excluido(it) {
    var t = norm((it.titulo || "") + " " + (it.notas || "")), c = cfg(), i;
    for (i = 0; i < c.excluir.length; i++) if (t.indexOf(norm(c.excluir[i])) >= 0) return true;
    return false;
  }
  function cerca(it) {
    var t = norm((it.zona || "") + " " + (it.titulo || "") + " " + (it.logistica || "") + " " + (it.notas || ""));
    var c = cfg(), i;
    if (t.indexOf("envio") >= 0 || t.indexOf("entrega") >= 0 || t.indexOf("a domicilio") >= 0) return true;
    for (i = 0; i < c.anclas.length; i++) if (t.indexOf(norm(c.anclas[i])) >= 0) return true;
    return false;
  }

  function pct(arr, p) {
    if (!arr.length) return NaN;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var idx = (a.length - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return a[lo];
    return a[lo] + (a[hi] - a[lo]) * (idx - lo);
  }
  function limpiar(precios) {
    if (!precios.length) return [];
    var med = pct(precios, 0.5), q1 = pct(precios, 0.25), q3 = pct(precios, 0.75);
    var iqr = q3 - q1, loT = q1 - 1.5 * iqr, hiT = q3 + 1.5 * iqr, piso = med * cfg().pisoRatio;
    return precios.filter(function (p) { return p >= Math.max(piso, loT) && p <= hiT; });
  }

  function evaluar(neto, riesgo, confianza, c) {
    if (!isFinite(neto)) return { ok: false, motivo: "sin referencia" };
    if (confianza === "baja") return { ok: false, motivo: "pocos comparables" };
    if (neto < c.colchonMin) return { ok: false, motivo: "margen < colchon" };
    if (neto <= c.margenFlaco && riesgo !== "bajo") return { ok: false, motivo: "margen flaco con riesgo" };
    if (riesgo === "alto" && neto < c.margenFlaco * 3) return { ok: false, motivo: "riesgo alto sin margen amplio" };
    return { ok: true, motivo: "ok" };
  }

  function valuar(items) {
    var c = cfg();
    var vivos = items.filter(function (it) { return !excluido(it); });
    vivos.forEach(function (it) { it._m = modeloDe(it.titulo); });
    var grupos = {};
    vivos.forEach(function (it) {
      var clave = it._m.modelo + "|" + (it._m.capacidad || "-");
      (grupos[clave] = grupos[clave] || []).push(it);
    });
    var ref = {};
    Object.keys(grupos).forEach(function (clave) {
      var limpios = grupos[clave]
        .filter(function (it) { return it._m.estado !== "riesgo"; })
        .map(function (it) { return it.precio; });
      var base = limpiar(limpios);
      ref[clave] = { mediana: pct(base, 0.5), n: base.length };
    });
    return vivos.map(function (it) {
      var clave = it._m.modelo + "|" + (it._m.capacidad || "-");
      var r = ref[clave] || { mediana: NaN, n: 0 };
      var reventa = isFinite(r.mediana) ? Math.round(r.mediana * c.factorVentaRapida) : NaN;
      var enCasa = cerca(it);
      var costos = enCasa ? 0 : c.pasajeIda * 2;
      var margenBruto = isFinite(reventa) ? (reventa - it.precio) : NaN;
      var margenNeto = isFinite(margenBruto) ? (margenBruto - costos) : NaN;
      var riesgo = it._m.estado === "riesgo" ? "alto" : (it._m.estado === "bueno" ? "bajo" : "medio");
      var confianza = r.n >= c.muestraSolida ? "alta" : (r.n >= c.minMuestra ? "media" : "baja");
      var v = evaluar(margenNeto, riesgo, confianza, c);
      return {
        titulo: it.titulo, modelo: it._m.modelo, capacidad: it._m.capacidad,
        estado: it._m.estado, riesgo: riesgo,
        precioCompra: it.precio,
        referencia: isFinite(r.mediana) ? Math.round(r.mediana) : null,
        reventaRapida: isFinite(reventa) ? reventa : null,
        margenBruto: isFinite(margenBruto) ? margenBruto : null,
        costos: costos,
        margenNeto: isFinite(margenNeto) ? margenNeto : null,
        comparables: r.n, confianza: confianza,
        proximidad: enCasa ? "cerca" : "excepcion",
        valeLaPena: v.ok, motivo: v.motivo, url: it.url, zona: it.zona
      };
    });
  }

  function pick(o, names) {
    for (var i = 0; i < names.length; i++) {
      var k = names[i];
      if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
    }
    return "";
  }
  function aItem(o) {
    return {
      titulo: pick(o, ["titulo", "title", "Anuncio", "nombre", "name"]),
      precio: aNum(pick(o, ["precio", "price", "Precio", "precioNum", "amount"])),
      url: pick(o, ["url", "href", "URL", "link", "enlace"]),
      zona: pick(o, ["zona", "Zona", "ubicacion", "location"]),
      notas: pick(o, ["notas", "Notas", "descripcion", "description", "desc"]),
      logistica: pick(o, ["logistica", "Logistica", "envio", "entrega"])
    };
  }
  function getLocal(keys) {
    return new Promise(function (res) {
      try { chrome.storage.local.get(keys, function (o) { res(o || {}); }); }
      catch (e) { res({}); }
    });
  }
  function cargarPool() {
    return getLocal(["cazagangas.corpus", "cazagangas.enriquecidos",
                     "cazagangas.hallazgos", "cazagangas.descubrimiento"]).then(function (o) {
      var raw = [];
      ["cazagangas.corpus", "cazagangas.enriquecidos", "cazagangas.hallazgos"].forEach(function (k) {
        var v = o[k];
        if (Array.isArray(v)) raw = raw.concat(v);
        else if (v && Array.isArray(v.items)) raw = raw.concat(v.items);
        else if (v && typeof v === "object") raw = raw.concat(Object.keys(v).map(function (kk) { return v[kk]; }));
      });
      var d = o["cazagangas.descubrimiento"];
      if (d && Array.isArray(d.cards)) raw = raw.concat(d.cards);
      if (d && d.porTermino) Object.keys(d.porTermino).forEach(function (t) {
        var cc = d.porTermino[t];
        if (cc && Array.isArray(cc.cards)) raw = raw.concat(cc.cards);
      });
      var seen = {}, items = [];
      raw.forEach(function (o2) {
        if (!o2 || typeof o2 !== "object") return;
        var it = aItem(o2);
        if (!it.titulo || !(it.precio > 0)) return;
        var id = it.url || (norm(it.titulo) + "|" + it.precio);
        if (seen[id]) return; seen[id] = 1;
        items.push(it);
      });
      return items;
    });
  }

  function comprables(opts) {
    opts = opts || {};
    return cargarPool().then(function (items) {
      var viables = valuar(items).filter(function (v) { return v.valeLaPena; });
      viables.sort(function (a, b) {
        if (a.precioCompra !== b.precioCompra) return a.precioCompra - b.precioCompra;
        return (b.margenNeto || 0) - (a.margenNeto || 0);
      });
      var top = opts.top ? viables.slice(0, opts.top) : viables;
      try { chrome.storage.local.set({ "cazagangas.sonda": { ts: Date.now(), n: top.length, items: top } }); } catch (e) {}
      window.CZG_sonda.ultimas = top;
      return top;
    });
  }
  function tabla(rows) {
    rows = rows || window.CZG_sonda.ultimas || [];
    try {
      console.table(rows.map(function (r) {
        return { modelo: r.modelo, cap: r.capacidad, compra: r.precioCompra,
                 reventa: r.reventaRapida, neto: r.margenNeto, conf: r.confianza,
                 prox: r.proximidad, riesgo: r.riesgo };
      }));
    } catch (e) { console.log(rows); }
    return rows.length;
  }
  function resumen(rows) {
    rows = rows || window.CZG_sonda.ultimas || [];
    return {
      comprables: rows.length,
      capitalSiTodo: rows.reduce(function (s, r) { return s + (r.precioCompra || 0); }, 0),
      gananciaNetaSiTodo: rows.reduce(function (s, r) { return s + (r.margenNeto || 0); }, 0),
      cercanos: rows.filter(function (r) { return r.proximidad === "cerca"; }).length
    };
  }

  window.CZG_sonda = {
    VER: VER, cargarPool: cargarPool, valuar: valuar, comprables: comprables,
    tabla: tabla, resumen: resumen, modeloDe: modeloDe, config: cfg, ultimas: []
  };
  console.log("[Sonda] cazagangas.sonda v" + VER + " listo. Corre: CZG_sonda.comprables().then(CZG_sonda.tabla)");
})();