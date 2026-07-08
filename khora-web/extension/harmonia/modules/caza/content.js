// Cazagangas · content (cosechador) v0.3.0
const CG_RONDAS = 25;
function dormir(ms) { return new Promise(r => setTimeout(r, ms)); }
function aleatorio(min, max) { return min + Math.random() * (max - min); }
function queryActual() {
  const u = new URL(location.href);
  return u.searchParams.get("query") || "";
}

// ===== ADAPTADOR FRAGIL (DOM de FB; ajustar SOLO aqui si rompe) =====
function rasparFeed() {
  const out = [];
  const vistos = new Set();
  const anchors = document.querySelectorAll('a[href*="/marketplace/item/"]');
  for (const a of anchors) {
    const m = a.href.match(/\/marketplace\/item\/(\d+)/);
    if (!m) continue;
    const id = m[1];
    if (vistos.has(id)) continue;
    vistos.add(id);
    const texto = a.innerText || "";
    const pm = texto.match(/\$[\d.,]+/);
    const precio = pm ? pm[0] : null;
    const img = a.querySelector("img");
    const titulo = (img && img.getAttribute("alt")) ||
      texto.split("\n").map(s => s.trim()).filter(Boolean).find(s => !/^\$/.test(s)) || null;
    out.push({ id, url: "https://www.facebook.com/marketplace/item/" + id, precio, titulo, img: img ? img.src : null });
  }
  return out;
}
// ===================================================================

async function cosechar() {
  const query = queryActual();
  for (let i = 0; i < CG_RONDAS; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await dormir(aleatorio(1500, 3500));
  }
  const items = rasparFeed();
  chrome.runtime.sendMessage({ tipo: "hallazgos", items, query });
  return items.length;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.tipo === "cosecha") { cosechar().then(n => sendResponse({ ok: true, n })); return true; }
});