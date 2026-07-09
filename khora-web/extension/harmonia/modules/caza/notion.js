// Cazagangas - Capa 4 - notion.js (v0.4.2): escritor a Notion, panel minimo (sin campos)
(() => {
  let TOKEN = ""; // externalizado a chrome.storage.local (NOTION_TOKEN) — NUNCA hardcodeado en el repo
  function _czTok(){ try{ chrome.storage.local.get(["NOTION_TOKEN","cazagangas.token"], function(o){ TOKEN = (o && (o.NOTION_TOKEN || o["cazagangas.token"])) || ""; }); }catch(e){} }
  _czTok();
  try{ chrome.storage.onChanged.addListener(function(ch,area){ if(area==="local" && (ch.NOTION_TOKEN || ch["cazagangas.token"])) _czTok(); }); }catch(e){}
  const DB_HINT = "hallazgos"; // para reconocer la base por su titulo
  const API = "https://api.notion.com/v1/pages";
  const SEARCH = "https://api.notion.com/v1/search";
  const NV = "2022-06-28";
  const CFG = "cazagangas.config";
  const HALL = "cazagangas.hallazgos";
  const SYNC = "cazagangas.synced";
  const GAP_MS = 380; // ~2.6 req/s, bajo el techo de 3/s de Notion

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const gLocal = (k) => new Promise(r => chrome.storage.local.get(k, r));
  const gSync  = (k) => new Promise(r => chrome.storage.sync.get(k, r));
  const sLocal = (o) => new Promise(r => chrome.storage.local.set(o, r));
  const headers = () => ({ "Authorization":"Bearer "+TOKEN, "Notion-Version":NV, "Content-Type":"application/json" });

  async function getConfig(){
    const s = await gSync(CFG); const l = await gLocal(CFG);
    return Object.assign({ zona:"", dbId:"" }, s[CFG]||{}, l[CFG]||{});
  }
  async function saveConfig(patch){
    const l = await gLocal(CFG);
    await sLocal({ [CFG]: Object.assign({}, l[CFG]||{}, patch) });
  }
  async function getMap(key){
    const l = await gLocal(key);
    if (l[key] && Object.keys(l[key]).length) return l[key];
    const s = await gSync(key);
    return s[key] || l[key] || {};
  }
  function limpiaId(raw){
    if(!raw) return "";
    const s = String(raw).trim();
    const m = s.match(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i);
    if (m) return m[0].replace(/-/g, "");
    return s.replace(/[^0-9a-fA-F]/g, "").slice(0, 32);
  }
  function titulo(o){ return ((o && o.title) || []).map(t => t.plain_text || "").join("").toLowerCase(); }

  async function resolverDbId(cfg){
    if (cfg.dbId) return limpiaId(cfg.dbId);
    const res = await fetch(SEARCH, { method:"POST", headers:headers(), body: JSON.stringify({ query:"Cazagangas", filter:{ property:"object", value:"database" } }) });
    if (!res.ok) return "";
    const j = await res.json();
    const lista = j.results || [];
    const hit = lista.find(d => titulo(d).includes(DB_HINT)) || lista.find(d => titulo(d).includes("cazagangas")) || lista[0];
    if (hit && hit.id){ const id = limpiaId(hit.id); await saveConfig({ dbId:id }); return id; }
    return "";
  }
  function props(h, cfg){
    const p = {};
    p["Anuncio"] = { title: [{ text: { content: String(h.titulo || h.title || "Sin titulo").slice(0,1900) } }] };
    if (h.precioNum != null) p["Precio"] = { number: h.precioNum };
    if (h.precioRef != null) p["Precio de referencia"] = { number: h.precioRef };
    if (h.pctDescuento != null) p["% descuento"] = { number: h.pctDescuento / 100 }; // % de Notion usa fraccion: 0.62 => 62%
    if (h.score != null) p["Score"] = { number: h.score };
    if (h.margenReventa != null) p["Margen de reventa"] = { number: h.margenReventa };
    if (h.url) p["URL del anuncio"] = { url: h.url };
    const f = new Date(h.visto || h.actualizado || Date.now());
    if (!isNaN(f)) p["Fecha visto"] = { date: { start: f.toISOString().slice(0,10) } };
    if (cfg.zona) p["Zona / distancia"] = { rich_text: [{ text: { content: String(cfg.zona) } }] };
    p["Estatus"] = { status: { name: "Nuevo" } };
    if (h.logistica === "Envia") p["Log\u00edstica (sin moverme)"] = { select: { name: "Env\u00edo a domicilio" } };
    const n = [];
    if (h.etiqueta) n.push(h.etiqueta);
    if (h.comparables != null) n.push("comparables: " + h.comparables);
    if (h.grupo) n.push("busqueda: " + h.grupo);
    if (n.length) p["Notas"] = { rich_text: [{ text: { content: n.join(" - ").slice(0,1900) } }] };
    return p;
  }
  async function crear(h, dbId, cfg){
    const body = { parent: { database_id: dbId }, properties: props(h, cfg) };
    for (let i = 0; i < 5; i++){
      let res;
      try { res = await fetch(API, { method:"POST", headers:headers(), body: JSON.stringify(body) }); }
      catch(e){ await sleep(1200*(i+1)); continue; }
      if (res.ok){ const j = await res.json(); return { ok:true, id:j.id }; }
      if (res.status === 429 || res.status >= 500){
        const ra = parseFloat(res.headers.get("Retry-After")) || (1.5*(i+1));
        await sleep(ra*1000); continue;
      }
      let t=""; try{ t=await res.text(); }catch(e){}
      return { ok:false, status:res.status, error:t.slice(0,300) };
    }
    return { ok:false, status:0, error:"reintentos agotados" };
  }
  function status(m){ const s=$("#cg-n-status"); if(s) s.textContent=m; }
  async function sincronizar(){
    if (!TOKEN){ status("Falta NOTION_TOKEN. Ponlo en Ajustes de la sombrilla (pestana Ajustes) y reintenta."); return; }
    const cfg = await getConfig();
    status("Resolviendo la base en Notion...");
    const dbId = await resolverDbId(cfg);
    if (!dbId){ status("No encuentro la base. Conecta la integracion 'Cazagangas' a la base (... > Connections)."); return; }
    const hall = await getMap(HALL);
    const syn = (await gLocal(SYNC))[SYNC] || {};
    const pend = Object.values(hall)
      .filter(h => h && h.score!=null && h.precioNum!=null && !h.atipico && !syn[h.id])
      .sort((a,b)=>(b.score||0)-(a.score||0));
    if (!pend.length){ status("Base lista. Nada nuevo: lo puntuado ya esta en Notion."); return; }
    let ok=0, fail=0;
    for (let i=0;i<pend.length;i++){
      status("Subiendo "+(i+1)+"/"+pend.length+"  (ok "+ok+" / err "+fail+")");
      const r = await crear(pend[i], dbId, cfg);
      if (r.ok){ ok++; syn[pend[i].id]=r.id; await sLocal({ [SYNC]: syn }); }
      else { fail++; console.error("Cazagangas/Notion", r.status, r.error);
        if (r.status===401 || r.status===404){ status("Error "+r.status+": revisa el acceso de la integracion a la base. ("+r.error+")"); return; } }
      await sleep(GAP_MS);
    }
    status("Listo: "+ok+" subidos, "+fail+" con error. Total en Notion: "+Object.keys(syn).length+".");
  }
  function montar(){
    if ($("#cg-n-panel")) return;
    const w = document.createElement("div");
    w.id = "cg-n-panel";
    w.style.cssText = "margin:12px 0;padding:12px;border:1px solid #ccc;border-radius:8px;font-family:system-ui,sans-serif;max-width:680px";
    w.innerHTML =
      '<div style="font-weight:600;margin-bottom:8px">Capa 4 - Sincronizar a Notion</div>'+
      '<button id="cg-n-sync" style="padding:6px 14px;font-weight:600">Sincronizar</button>'+
      '<div id="cg-n-status" style="margin-top:8px;color:#444;font-size:13px">-</div>';
    document.body.appendChild(w);
    $("#cg-n-sync").addEventListener("click", sincronizar);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
})();