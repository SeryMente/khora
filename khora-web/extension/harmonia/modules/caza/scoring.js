// Cazagangas · Capa 3 · scoring (v0.3.3) — FIX MXN + outliers + curva de score repartida
const CG_SCORING = (() => {
  const RATIO_PISO = 0.20;
  const K_SCORE = 60; // pendiente de la curva: reparte el descuento sin saturar tan pronto

  function parsePrecio(v) {
    if (typeof v === "number") return v;
    if (!v) return null;
    const m = String(v).replace(/[^\d]/g, "");
    if (!m) return null;
    const n = parseInt(m, 10);
    return isNaN(n) ? null : n;
  }
  function percentil(ord, p) {
    if (!ord.length) return null;
    const idx = (ord.length - 1) * (p / 100);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return ord[lo];
    return ord[lo] + (ord[hi] - ord[lo]) * (idx - lo);
  }
  function estadisticasGrupo(precios) {
    const ord = precios.filter(n => n != null && n > 0).sort((a, b) => a - b);
    if (ord.length < 4) return null;
    const q1 = percentil(ord, 25), q3 = percentil(ord, 75);
    const iqr = q3 - q1;
    const fenceLow = q1 - 1.5 * iqr;
    const fenceHigh = q3 + 1.5 * iqr;
    const core = ord.filter(n => n >= fenceLow && n <= fenceHigh);
    const base = core.length >= 4 ? core : ord;
    return {
      n: base.length, bruto: ord.length,
      mediana: percentil(base, 50),
      q1: percentil(base, 25), q3: percentil(base, 75),
      p15: percentil(base, 15), p25: percentil(base, 25),
      fenceLow, fenceHigh,
    };
  }
  function puntuar(precio, st) {
    if (precio == null || !st || !st.mediana) return null;
    const desc = (st.mediana - precio) / st.mediana;
    return Math.max(0, Math.min(100, Math.round(50 + desc * K_SCORE)));
  }
  function piso(st) { return Math.max(st.fenceLow, st.mediana * RATIO_PISO); }
  function clasificar(precio, st) {
    if (precio == null || !st) return { etiqueta: "Sin datos", score: null, atipico: false };
    if (precio < piso(st)) return { etiqueta: "\u26a0\ufe0f Revisar (atipico)", score: null, atipico: true };
    if (precio > st.fenceHigh) return { etiqueta: "Caro", score: puntuar(precio, st), atipico: false };
    if (precio <= st.p25)    return { etiqueta: "\ud83d\udd25 Ganga", score: puntuar(precio, st), atipico: false };
    if (precio <= st.mediana) return { etiqueta: "Buen precio", score: puntuar(precio, st), atipico: false };
    if (precio <= st.q3)     return { etiqueta: "Justo", score: puntuar(precio, st), atipico: false };
    return { etiqueta: "Caro", score: puntuar(precio, st), atipico: false };
  }
  function logistica(item) {
    const txt = ((item.titulo || "") + " " + (item.descripcion || "")).toLowerCase();
    if (/env[ií]o|envio gratis|paqueter|mensajer|entrega a domicilio/.test(txt)) return "Envia";
    return "Verificar";
  }
  function puntuarTodos(hallazgos) {
    const items = Object.values(hallazgos || {});
    const grupos = {};
    for (const it of items) {
      const k = (it.query || "sin-query").toLowerCase();
      (grupos[k] = grupos[k] || []).push(it);
    }
    const out = {};
    for (const [k, arr] of Object.entries(grupos)) {
      const st = estadisticasGrupo(arr.map(it => parsePrecio(it.precio)));
      for (const it of arr) {
        const p = parsePrecio(it.precio);
        const cls = st ? clasificar(p, st) : { etiqueta: "Pocos comparables", score: null, atipico: false };
        const precioRef = st ? Math.round(st.mediana) : null;
        const valido = cls.score != null && p != null;
        out[it.id] = Object.assign({}, it, {
          precioNum: p,
          precioRef,
          pctDescuento: valido ? Math.round((st.mediana - p) / st.mediana * 100) : null,
          margenReventa: (valido && precioRef != null) ? precioRef - p : null,
          score: cls.score,
          etiqueta: cls.etiqueta,
          atipico: cls.atipico,
          logistica: logistica(it),
          grupo: k,
          comparables: st ? st.n : 0,
        });
      }
    }
    return out;
  }
  return { puntuarTodos, parsePrecio, estadisticasGrupo };
})();