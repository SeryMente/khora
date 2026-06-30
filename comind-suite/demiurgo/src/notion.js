// Cliente Notion. Port fiel de notionFetch/getSeenIds/insertCalls/fetchGoal + sink de
// telemetria de background.js v3.32. Sustituye chrome.storage por estado en memoria + Logos.
const C = require("./config");
const { selName } = require("./parsers");
const logos = require("./logos");
const log = logos.log;

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
async function safeText(res){ try{ return (await res.text()).slice(0,300); }catch(e){ return ""; } }
function H(){ return { "Authorization": `Bearer ${C.TOKEN}`, "Notion-Version": C.NV, "Content-Type": "application/json" }; }

// Reintentos con respeto de 429/5xx + Retry-After (verbatim de v3.32).
async function notionFetch(url, opts, tries){
  tries = tries || 4;
  for(let i = 0; i < tries; i++){
    let res;
    try{ res = await fetch(url, opts); }
    catch(e){ if(i === tries-1) throw e; await sleep(500 * (i+1)); continue; }
    if(res.status === 429 || res.status >= 500){
      const ra = parseInt(res.headers.get("Retry-After") || "0", 10);
      await sleep(ra ? ra*1000 : 600 * (i+1));
      continue;
    }
    return res;
  }
  return null;
}

// Indice de duplicados: lee TODOS los Call ID ya en Notion (port de getSeenIds).
async function getSeenIds(){
  const seen = new Set();
  let cursor, pages = 0, ok = true;
  const MAX_PAGES = 600;
  do{
    const body = { page_size: 100 };
    if(cursor) body.start_cursor = cursor;
    let res;
    try{ res = await notionFetch(`${C.NOTION}/databases/${C.DB_ID}/query`, { method:"POST", headers:H(), body: JSON.stringify(body) }); }
    catch(e){ await log("error","getSeenIds red", String(e), "dedup"); ok = false; break; }
    if(!res || !res.ok){ await log("error","getSeenIds HTTP "+(res?res.status:"?"), res?await safeText(res):"", "dedup"); ok = false; break; }
    const j = await res.json();
    (j.results || []).forEach(p => {
      const t = p.properties && p.properties["Call ID"] && p.properties["Call ID"].title;
      const raw = t && t[0] && (t[0].plain_text || (t[0].text && t[0].text.content));
      const id = raw == null ? "" : String(raw).trim();
      if(id) seen.add(id);
    });
    cursor = j.has_more ? j.next_cursor : undefined;
    pages++;
    if(cursor) await sleep(150);
  } while(cursor && pages < MAX_PAGES);
  if(cursor) ok = false; // indice incompleto
  return { ok, seen };
}

// Insercion delta con ABORTO si el indice esta incompleto (port fiel: nunca duplica).
let _insertBusy = false;
async function insertCalls(calls){
  if(!calls || !calls.length) return { inserted:0, skipped:0 };
  if(_insertBusy){ await log("info","Insercion ya en curso; omito ronda de "+calls.length+" filas", null, "dedup"); return { inserted:0, skipped:0, deferred:true }; }
  _insertBusy = true;
  try{
    await log("info","Cotejando "+calls.length+" filas contra Notion...", null, "dedup");
    const idx = await getSeenIds();
    if(!idx.ok){
      await log("error","Indice de duplicados INCOMPLETO ("+idx.seen.size+" ids); ABORTO para no duplicar", null, "dedup");
      return { inserted:0, skipped:0, aborted:true };
    }
    const seen = idx.seen;
    let inserted = 0, skipped = 0;
    for(const c of calls){
      const key = c.id == null ? "" : String(c.id).trim();
      if(!key){ skipped++; continue; }
      if(seen.has(key)){ skipped++; continue; }
      const props = { "Call ID": { title: [{ text: { content: key } }] } };
      if(c.startISO) props["Fecha y hora"] = { date: { start: c.startISO } };
      if(c.end) props["Fin"] = { rich_text: [{ text: { content: String(c.end) } }] };
      if(typeof c.minutes === "number") props["Minutos"] = { number: c.minutes };
      const emp = selName(c.company); if(emp) props["Empresa"] = { select: { name: emp } };
      const srv = selName(c.service); if(srv) props["Servicio"] = { select: { name: srv } };
      if(typeof c.units === "number") props["Unidades pago"] = { number: c.units };
      let res;
      try{ res = await notionFetch(`${C.NOTION}/pages`, { method:"POST", headers:H(), body: JSON.stringify({ parent:{ database_id: C.DB_ID }, properties: props }) }); }
      catch(e){ await log("error","insert red id="+key, String(e), "notion"); continue; }
      if(res && res.ok){ inserted++; seen.add(key); }
      else { await log("error","insert HTTP "+(res?res.status:"?")+" id="+key, res?await safeText(res):"", "notion"); }
      await sleep(300); // respeta ~3/s de Notion
    }
    if(inserted) await log("ok","Insertadas "+inserted+" llamadas nuevas (saltadas "+skipped+")", null, "notion");
    else await log("info","Sin llamadas nuevas (saltadas "+skipped+")", null, "notion");
    return { inserted, skipped };
  } finally { _insertBusy = false; }
}

// Lee el objetivo diario desde Notion (port de fetchGoal).
async function fetchGoal(){
  try{
    const res = await notionFetch(`${C.NOTION}/databases/${C.DB_ID}/query`, { method:"POST", headers:H(), body: JSON.stringify({ page_size:5, filter:{ property:C.GOAL_PROP, number:{ is_not_empty:true } } }) });
    if(res && res.ok){
      const j = await res.json();
      for(const p of (j.results || [])){
        const n = p.properties && p.properties[C.GOAL_PROP] && p.properties[C.GOAL_PROP].number;
        if(typeof n === "number" && n > 0) return n;
      }
    }
  }catch(e){ await log("warn","fetchGoal excepcion", String(e), "notion"); }
  return C.GOAL_DEFAULT;
}

// Resuelve la base «Registro de actividad» por titulo (port de resolveActivityDb).
let _activityDbId = null;
async function resolveActivityDb(){
  if(_activityDbId) return _activityDbId;
  let res;
  try{ res = await notionFetch(`${C.NOTION}/search`, { method:"POST", headers:H(), body: JSON.stringify({ query:C.ACTIVITY_DB_TITLE, filter:{ property:"object", value:"database" }, page_size:25 }) }); }
  catch(e){ return null; }
  if(!res || !res.ok) return null;
  let j; try{ j = await res.json(); }catch(e){ return null; }
  const titleOf = d => ((d.title || []).map(x => (x.plain_text || (x.text && x.text.content) || "")).join("")).toLowerCase();
  const list = (j && j.results) || [];
  let pick = list.find(d => titleOf(d).indexOf("globo") >= 0 && titleOf(d).indexOf("registro de actividad") >= 0)
          || list.find(d => titleOf(d).indexOf("registro de actividad") >= 0);
  if(!pick) return null;
  _activityDbId = pick.id;
  return _activityDbId;
}

// Sink de telemetria que Logos usa para volcar cada evento (port de txProps + POST /pages).
function txProps(tx){
  const props = {
    "Evento": { title: [{ text: { content: (tx.msg || "(sin mensaje)").slice(0,200) } }] },
    "Severidad": { select: { name: logos.txSev(tx.level) } },
    "M\u00f3dulo": { select: { name: (logos.TX_MODS.indexOf(tx.mod) >= 0 ? tx.mod : "system") } },
    "Fecha y hora": { date: { start: new Date(tx.t).toISOString() } },
    "Epoch": { number: tx.t },
    "Versi\u00f3n": { rich_text: [{ text: { content: C.VERSION } }] },
    "Extensi\u00f3n": { select: { name: C.EXT_LABEL } },
    "Event ID": { rich_text: [{ text: { content: String(tx.eid) } }] },
  };
  if(tx.ctx) props["Contexto"] = { rich_text: [{ text: { content: String(tx.ctx).slice(0,1900) } }] };
  return props;
}
async function telemetrySink(tx){
  const dbId = await resolveActivityDb();
  if(!dbId) return { ok:false, transient:true };
  let res;
  try{ res = await notionFetch(`${C.NOTION}/pages`, { method:"POST", headers:H(), body: JSON.stringify({ parent:{ database_id: dbId }, properties: txProps(tx) }) }); }
  catch(e){ return { ok:false, transient:true }; }
  if(res && res.ok) return { ok:true };
  if(!res || res.status === 429 || res.status >= 500 || res.status === 404) return { ok:false, transient:true, status: res && res.status };
  return { ok:false, transient:false, status: res.status };
}
logos.setSink(telemetrySink);

module.exports = { notionFetch, getSeenIds, insertCalls, fetchGoal, resolveActivityDb, H };
