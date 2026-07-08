// Cazagangas · celular.js (v1.0.0) — Caracteristicas para celulares.
// Backend puro, sin UI. Extrae specs reales del titulo/descripcion de un anuncio:
// marca, modelo, almacenamiento, RAM, salud de bateria, estado, y estado de bloqueo
// (liberado vs iCloud/FRP/operador/IMEI reportado). Expone window.CZG_celular.
(function () {
  "use strict";
  var VER = "1.0.0";

  function norm(s) {
    return (s == null ? "" : String(s)).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // marca -> palabras clave (orden importa: lo mas especifico primero)
  var MARCAS = [
    { marca: "iPhone",   familia: "Apple",    kw: ["iphone", "i phone"] },
    { marca: "Samsung",  familia: "Samsung",  kw: ["samsung galaxy", "galaxy", "samsung"] },
    { marca: "Xiaomi",   familia: "Xiaomi",   kw: ["redmi", "poco", "pocophone", "xiaomi", "mi "] },
    { marca: "Motorola", familia: "Motorola", kw: ["motorola", "moto g", "moto e", "moto edge", "moto "] },
    { marca: "Honor",    familia: "Honor",    kw: ["honor"] },
    { marca: "Huawei",   familia: "Huawei",   kw: ["huawei", "mate ", "p smart"] },
    { marca: "Realme",   familia: "Realme",   kw: ["realme"] },
    { marca: "Oppo",     familia: "Oppo",     kw: ["oppo"] },
    { marca: "Vivo",     familia: "Vivo",     kw: ["vivo "] },
    { marca: "Google",   familia: "Google",   kw: ["pixel"] },
    { marca: "Nokia",    familia: "Nokia",    kw: ["nokia"] },
    { marca: "ZTE",      familia: "ZTE",      kw: ["zte"] },
    { marca: "LG",       familia: "LG",       kw: ["lg "] }
  ];
  var MODIF = ["pro max", "pro", "max", "plus", "ultra", "mini", "lite", "note",
               "neo", "fe", "se", "prime", "power", "play", "edge", "fold", "flip", "turbo"];
  var CEL_KW = ["celular", "telefono", "smartphone", "iphone", "galaxy", "redmi",
                "xiaomi", "motorola", "moto g", "honor", "huawei", "realme", "oppo",
                "poco", "pixel", "nokia", "zte", "samsung"];
  var ACC_KW = ["funda", "mica", "case", "protector", "carcasa", "vidrio templado",
                "cristal templado", "cargador para", "cable para", "soporte para",
                "power bank", "audifonos", "manos libres"];

  function almacenamiento(t) {
    var g = t.match(/\b(8|16|32|64|128|256|512)\s*gb\b/);
    if (g) return g[1] + "GB";
    var tb = t.match(/\b(1|2)\s*tb\b/);
    if (tb) return tb[1] + "TB";
    return "";
  }
  function ram(t) {
    var m = t.match(/\b(\d{1,2})\s*(?:\+|\/)\s*(?:\d{2,4})\s*gb\b/); // "8+128", "6/128gb"
    if (m) return m[1] + "GB";
    var r = t.match(/\bram\s*(?:de\s*)?(\d{1,2})\s*gb\b/) || t.match(/\b(\d{1,2})\s*gb\s*(?:de\s*)?ram\b/);
    if (r) return (r[1] || r[2]) + "GB";
    return "";
  }
  function bateria(t) {
    var m = t.match(/(?:bateria|salud|capacidad)[^0-9]{0,18}?(\d{2,3})\s*%/) ||
            t.match(/(\d{2,3})\s*%[^0-9]{0,14}?(?:bateria|salud)/);
    if (m) { var n = parseInt(m[1], 10); if (n >= 30 && n <= 100) return n; }
    return null;
  }
  function lock(t) {
    if (/icloud|cuenta de icloud|bloqueado por icloud|id de apple|apple id/.test(t)) return { liberado: false, motivo: "iCloud" };
    if (/\bfrp\b|cuenta google|cuenta de google|bloqueo de cuenta/.test(t)) return { liberado: false, motivo: "Cuenta Google" };
    if (/reportad|imei reportad|lista negra|blacklist|bloqueado por robo/.test(t)) return { liberado: false, motivo: "IMEI reportado" };
    if (/solo telcel|solo att|solo at&t|solo movistar|solo unefon|solo bait|bloqueado a|para telcel|de telcel|amarrado a|operador telcel/.test(t)) return { liberado: false, motivo: "Atado a operador" };
    if (/liberado|liberada|desbloqueado|desbloqueada|para cualquier compania|cualquier compania|cualquier operador|factory unlocked|unlocked/.test(t)) return { liberado: true, motivo: "Liberado" };
    return { liberado: null, motivo: "" };
  }
  function estado(t) {
    if (/para piezas|por piezas|para refacc|no enciende|no prende|pantalla rota|no carga|para reparar|para reparacion/.test(t)) return "Por piezas";
    if (/sellado|nuevo en caja|nuevo sellado/.test(t) || (/\bnuevo\b|\bnueva\b/.test(t) && !/seminuevo|semi nuevo|como nuevo/.test(t))) return "Nuevo";
    if (/seminuevo|semi nuevo|como nuevo|excelente estado|impecable|poco uso/.test(t)) return "Seminuevo";
    if (/usado|de uso|detalle|rayon|rayit|raspad/.test(t)) return "Usado";
    return "";
  }
  function marcaModelo(t) {
    var found = null, base = "";
    for (var i = 0; i < MARCAS.length; i++) {
      var m = MARCAS[i];
      for (var j = 0; j < m.kw.length; j++) {
        var kw = norm(m.kw[j]);
        if (t.indexOf(kw) >= 0) { found = m; base = kw; break; }
      }
      if (found) break;
    }
    if (!found) return { marca: "", familia: "", modelo: "", num: "", mod: "" };
    var resto = t.slice(t.indexOf(base) + base.length);
    var num = "";
    var alpha = resto.match(/\b([sa]\d{1,2}|note\s*\d{1,2})\b/); // galaxy s23/a54/note 20
    var dig = resto.match(/\b(\d{1,4})\b/);
    if (alpha) num = alpha[1].replace(/\s+/g, " ").trim();
    else if (dig) num = dig[1];
    var mod = "";
    for (var k = 0; k < MODIF.length; k++) { if (resto.indexOf(MODIF[k]) >= 0) { mod = MODIF[k]; break; } }
    var modelo = (found.marca + " " + num + " " + mod).replace(/\s+/g, " ").trim();
    return { marca: found.marca, familia: found.familia, modelo: modelo, num: num, mod: mod };
  }

  function analizar(item) {
    var texto = ((item && (item.titulo || item.title)) || "") + " " +
                ((item && (item.descripcion || item.notas || item.desc)) || "");
    var t = norm(texto);
    var esAcc = ACC_KW.some(function (k) { return t.indexOf(norm(k)) >= 0; }) &&
                !/\b(celular|telefono|smartphone)\b/.test(t);
    var mm = marcaModelo(t);
    var es = !esAcc && CEL_KW.some(function (k) { return t.indexOf(norm(k)) >= 0; });
    var cap = almacenamiento(t);
    var lk = lock(t);
    var clave = es ? (norm(mm.marca) + "|" + mm.num + "|" + (mm.mod || "") + "|" + (cap || "-")) : "";
    return {
      esCelular: es,
      esAccesorio: esAcc,
      marca: mm.marca,
      familia: mm.familia,
      modelo: mm.modelo,
      claveModelo: clave,
      almacenamiento: cap,
      ram: ram(t),
      bateriaPct: bateria(t),
      liberado: lk.liberado,
      lockMotivo: lk.motivo,
      estado: estado(t),
      accesorios: /con caja|con cargador|todos sus accesorios|caja y accesorios|incluye cargador/.test(t),
      dualSim: /dual sim|doble sim|dos sim/.test(t),
      cincoG: /\b5g\b/.test(t)
    };
  }

  // resumen humano corto para la UI
  function resumen(a) {
    if (!a || !a.esCelular) return "";
    var p = [];
    if (a.modelo) p.push(a.modelo);
    if (a.almacenamiento) p.push(a.almacenamiento);
    if (a.ram) p.push(a.ram + " RAM");
    if (a.liberado === true) p.push("Liberado");
    else if (a.liberado === false) p.push("\u26a0 " + (a.lockMotivo || "Bloqueado"));
    if (a.bateriaPct != null) p.push("\ud83d\udd0b " + a.bateriaPct + "%");
    if (a.estado) p.push(a.estado);
    return p.join(" \u00b7 ");
  }

  // factor de calidad 0..1.2 (para comparar manzanas con manzanas / alimentar al aprendizaje)
  function factorCalidad(a) {
    if (!a || !a.esCelular) return 1;
    var f = 1;
    if (a.estado === "Por piezas") f *= 0.4;
    else if (a.estado === "Nuevo") f *= 1.18;
    else if (a.estado === "Seminuevo") f *= 1.06;
    if (a.liberado === false) f *= 0.7;
    else if (a.liberado === true) f *= 1.05;
    if (a.bateriaPct != null) f *= (0.7 + 0.3 * (a.bateriaPct / 100));
    return Math.round(f * 100) / 100;
  }

  window.CZG_celular = { VER: VER, esCelular: function (x) { return analizar({ titulo: x }).esCelular; }, analizar: analizar, resumen: resumen, factorCalidad: factorCalidad };
  try { console.log("[celular] specs de celular listo v" + VER); } catch (e) {}
})();
